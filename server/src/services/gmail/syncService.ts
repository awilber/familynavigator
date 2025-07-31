import { getGmailService } from './index'
import { EmailParser, ParsedEmailData } from './emailParser'
import { ContactRepository, CommunicationRepository } from '../database/repositories'
import { databaseService } from '../database'

export interface SyncProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  totalMessages: number
  processedMessages: number
  currentBatch: number
  totalBatches: number
  startTime?: Date
  endTime?: Date
  lastSyncedMessageId?: string
  error?: string
}

export interface SyncOptions {
  batchSize?: number
  maxMessages?: number
  query?: string
  startDate?: Date
  endDate?: Date
  resumeFromLastSync?: boolean
}

export class GmailSyncService {
  private contactRepo: ContactRepository
  private communicationRepo: CommunicationRepository
  private progress: SyncProgress
  private isRunning: boolean = false
  private shouldPause: boolean = false

  constructor() {
    this.contactRepo = new ContactRepository()
    this.communicationRepo = new CommunicationRepository()
    this.progress = {
      status: 'idle',
      totalMessages: 0,
      processedMessages: 0,
      currentBatch: 0,
      totalBatches: 0
    }
  }

  /**
   * Start full Gmail sync
   */
  async startSync(options: SyncOptions = {}): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sync is already running')
    }

    try {
      this.isRunning = true
      this.shouldPause = false
      this.progress = {
        status: 'running',
        totalMessages: 0,
        processedMessages: 0,
        currentBatch: 0,
        totalBatches: 0,
        startTime: new Date()
      }

      const gmailService = getGmailService()
      
      // Ensure authentication
      const isAuthenticated = await gmailService.loadStoredTokens()
      if (!isAuthenticated) {
        throw new Error('Gmail authentication required')
      }

      // Build query for message filtering
      const query = this.buildQuery(options)
      
      // Get initial message list to estimate total
      const initialList = await gmailService.listMessages({
        query,
        maxResults: 1
      })

      this.progress.totalMessages = Math.min(
        initialList.resultSizeEstimate,
        options.maxMessages || initialList.resultSizeEstimate
      )

      const batchSize = options.batchSize || 100
      this.progress.totalBatches = Math.ceil(this.progress.totalMessages / batchSize)

      console.log(`Starting Gmail sync: ${this.progress.totalMessages} messages in ${this.progress.totalBatches} batches`)

      // Start syncing in batches
      await this.syncInBatches(gmailService, query, batchSize, options.maxMessages)

      this.progress.status = 'completed'
      this.progress.endTime = new Date()
      
      console.log(`Gmail sync completed: ${this.progress.processedMessages} messages processed`)

    } catch (error) {
      this.progress.status = 'error'
      this.progress.error = error instanceof Error ? error.message : 'Unknown error'
      this.progress.endTime = new Date()
      
      console.error('Gmail sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Sync messages in batches with rate limiting
   */
  private async syncInBatches(
    gmailService: any,
    query: string,
    batchSize: number,
    maxMessages?: number
  ): Promise<void> {
    let pageToken: string | undefined
    let processedCount = 0

    while (processedCount < this.progress.totalMessages && !this.shouldPause) {
      try {
        this.progress.currentBatch++
        
        // Get message list for this batch
        const messageList = await gmailService.listMessages({
          query,
          maxResults: batchSize,
          pageToken
        })

        if (!messageList.messages || messageList.messages.length === 0) {
          break
        }

        // Limit to maxMessages if specified
        let messagesToProcess = messageList.messages
        if (maxMessages && processedCount + messagesToProcess.length > maxMessages) {
          messagesToProcess = messagesToProcess.slice(0, maxMessages - processedCount)
        }

        // Get full message details in batch
        const messageIds = messagesToProcess.map((msg: any) => msg.id)
        const fullMessages = await gmailService.getMessagesBatch(messageIds, 'full')

        // Process each message
        for (const message of fullMessages) {
          if (this.shouldPause) break

          try {
            await this.processMessage(message)
            this.progress.processedMessages++
            processedCount++

            // Update progress every 10 messages
            if (this.progress.processedMessages % 10 === 0) {
              await this.saveProgress()
            }

          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error)
            // Continue with next message
          }
        }

        // Rate limiting - wait between batches
        await new Promise(resolve => setTimeout(resolve, 250))

        pageToken = messageList.nextPageToken
        if (!pageToken) break

        console.log(`Processed batch ${this.progress.currentBatch}/${this.progress.totalBatches} (${this.progress.processedMessages} messages)`)

      } catch (error) {
        console.error(`Error processing batch ${this.progress.currentBatch}:`, error)
        
        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Continue with next batch
      }
    }
  }

  /**
   * Process a single Gmail message
   */
  private async processMessage(gmailMessage: any): Promise<void> {
    try {
      // Parse the Gmail message
      const parsedEmail = await EmailParser.parseGmailMessage(gmailMessage)
      
      // Extract contact information
      const { contacts, fromContact } = EmailParser.extractContactInfo(parsedEmail)

      // Create or find contacts
      const fromContactRecord = await this.contactRepo.findOrCreateByEmail(
        fromContact.email,
        fromContact.name
      )

      const toContactRecords = await Promise.all(
        contacts.map(contact => 
          this.contactRepo.findOrCreateByEmail(contact.email, contact.name)
        )
      )

      // Determine communication direction
      const userEmail = await this.getUserEmail()
      const direction: 'incoming' | 'outgoing' = parsedEmail.from.toLowerCase().includes(userEmail.toLowerCase()) ? 'outgoing' : 'incoming'

      // Create communication record
      const communication = {
        source: 'gmail' as const,
        source_id: parsedEmail.messageId,
        contact_id: fromContactRecord.id,
        direction,
        timestamp: parsedEmail.date.toISOString(),
        subject: parsedEmail.subject,
        content: this.extractBestContent(parsedEmail),
        content_type: 'email',
        message_type: 'direct' as const,
        confidence_score: 1.0,
        thread_id: parsedEmail.threadId,
        metadata: {
          labels: parsedEmail.labels,
          snippet: parsedEmail.snippet,
          inReplyTo: parsedEmail.inReplyTo,
          references: parsedEmail.references,
          attachmentCount: parsedEmail.attachments.length,
          to: parsedEmail.to,
          cc: parsedEmail.cc,
          bcc: parsedEmail.bcc
        }
      }

      // Save communication (will skip if already exists due to unique constraint)
      await this.communicationRepo.create(communication)

    } catch (error) {
      console.error(`Error processing message ${gmailMessage.id}:`, error)
      throw error
    }
  }

  /**
   * Extract the best available content from parsed email
   */
  private extractBestContent(parsedEmail: ParsedEmailData): string {
    // Prefer plain text, fall back to HTML converted to text
    if (parsedEmail.content.text) {
      return parsedEmail.content.text
    }

    if (parsedEmail.content.html) {
      return EmailParser.extractTextFromHtml(parsedEmail.content.html)
    }

    return parsedEmail.snippet || ''
  }

  /**
   * Get user's email address from Gmail profile
   */
  private async getUserEmail(): Promise<string> {
    try {
      const db = await databaseService.getDatabase()
      
      // Try to get cached user email
      const cached = await db.get('SELECT value FROM app_config WHERE key = ?', ['user_email'])
      if (cached) {
        return cached.value
      }

      // Get from Gmail API
      const gmailService = getGmailService()
      const profile = await gmailService.getProfile()
      const userEmail = profile.emailAddress

      // Cache for future use
      await db.run(
        'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, datetime("now"))',
        ['user_email', userEmail]
      )

      return userEmail
    } catch (error) {
      console.error('Error getting user email:', error)
      return 'unknown@example.com'
    }
  }

  /**
   * Build search query based on options
   */
  private buildQuery(options: SyncOptions): string {
    const queryParts: string[] = []

    if (options.query) {
      queryParts.push(options.query)
    }

    if (options.startDate) {
      const dateStr = options.startDate.toISOString().split('T')[0]
      queryParts.push(`after:${dateStr}`)
    }

    if (options.endDate) {
      const dateStr = options.endDate.toISOString().split('T')[0]
      queryParts.push(`before:${dateStr}`)
    }

    // Exclude spam and trash by default
    queryParts.push('-in:spam -in:trash')

    return queryParts.join(' ')
  }

  /**
   * Save sync progress to database
   */
  private async saveProgress(): Promise<void> {
    try {
      const db = await databaseService.getDatabase()
      await db.run(
        'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, datetime("now"))',
        ['gmail_sync_progress', JSON.stringify(this.progress)]
      )
    } catch (error) {
      console.error('Error saving sync progress:', error)
    }
  }

  /**
   * Load saved sync progress
   */
  async loadProgress(): Promise<SyncProgress> {
    try {
      const db = await databaseService.getDatabase()
      const saved = await db.get('SELECT value FROM app_config WHERE key = ?', ['gmail_sync_progress'])
      
      if (saved) {
        this.progress = JSON.parse(saved.value)
      }
    } catch (error) {
      console.error('Error loading sync progress:', error)
    }

    return this.progress
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress }
  }

  /**
   * Pause current sync
   */
  pauseSync(): void {
    if (this.isRunning) {
      this.shouldPause = true
      this.progress.status = 'paused'
    }
  }

  /**
   * Resume paused sync
   */
  async resumeSync(options: SyncOptions = {}): Promise<void> {
    if (this.progress.status === 'paused') {
      this.shouldPause = false
      await this.startSync({ ...options, resumeFromLastSync: true })
    }
  }

  /**
   * Stop current sync
   */
  stopSync(): void {
    this.shouldPause = true
    this.isRunning = false
    this.progress.status = 'idle'
  }

  /**
   * Incremental sync using Gmail history API
   */
  async incrementalSync(): Promise<void> {
    try {
      const gmailService = getGmailService()
      const isAuthenticated = await gmailService.loadStoredTokens()
      
      if (!isAuthenticated) {
        throw new Error('Gmail authentication required')
      }

      // Get last sync history ID
      const db = await databaseService.getDatabase()
      const lastSync = await db.get('SELECT value FROM app_config WHERE key = ?', ['gmail_last_history_id'])
      
      if (!lastSync) {
        console.log('No previous sync found, starting full sync')
        await this.startSync()
        return
      }

      const startHistoryId = lastSync.value
      console.log(`Starting incremental sync from history ID: ${startHistoryId}`)

      const history = await gmailService.getHistory(startHistoryId)
      
      if (history.history.length === 0) {
        console.log('No new messages found')
        return
      }

      // Process history changes
      for (const historyItem of history.history) {
        if (historyItem.messagesAdded) {
          for (const messageInfo of historyItem.messagesAdded) {
            try {
              const fullMessage = await gmailService.getMessage(messageInfo.message.id)
              await this.processMessage(fullMessage)
            } catch (error) {
              console.error(`Error processing new message ${messageInfo.message.id}:`, error)
            }
          }
        }

        // Handle message deletions if needed
        if (historyItem.messagesDeleted) {
          // Could implement deletion handling here
        }
      }

      // Update last sync history ID
      await db.run(
        'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, datetime("now"))',
        ['gmail_last_history_id', history.historyId]
      )

      console.log(`Incremental sync completed. New history ID: ${history.historyId}`)

    } catch (error) {
      console.error('Incremental sync failed:', error)
      throw error
    }
  }
}

// Singleton instance
export const gmailSyncService = new GmailSyncService()