import { getGmailService } from './index'
import { EmailParser, ParsedEmailData } from './emailParser'
import { ContactRepository, CommunicationRepository } from '../database/repositories'
import { databaseService } from '../database'
import { logger } from '../../utils/logger'

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
  detailedErrors: SyncError[]
  currentOperation: string
  operationDetails: string
  messagesPerSecond: number
  estimatedTimeRemaining?: number
  rawApiResponses: ApiResponse[]
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  rateLimitStatus?: {
    remaining: number
    resetTime: Date
    dailyQuotaUsed: number
  }
}

export interface SyncError {
  timestamp: Date
  messageId?: string
  operation: string
  error: string
  stackTrace?: string
  apiResponse?: any
  retryCount: number
  isCritical: boolean
}

export interface ApiResponse {
  timestamp: Date
  endpoint: string
  method: string
  statusCode: number
  response: any
  responseTime: number
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
  private startTime?: Date
  private lastProgressUpdate?: Date

  constructor() {
    this.contactRepo = new ContactRepository()
    this.communicationRepo = new CommunicationRepository()
    this.progress = {
      status: 'idle',
      totalMessages: 0,
      processedMessages: 0,
      currentBatch: 0,
      totalBatches: 0,
      detailedErrors: [],
      currentOperation: 'Idle',
      operationDetails: 'Service ready to start sync',
      messagesPerSecond: 0,
      rawApiResponses: [],
      connectionStatus: 'disconnected'
    }
  }

  private logError(messageId: string | undefined, operation: string, error: any, isCritical: boolean = false): void {
    const syncError: SyncError = {
      timestamp: new Date(),
      messageId,
      operation,
      error: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      apiResponse: error.response || undefined,
      retryCount: 0,
      isCritical
    }

    this.progress.detailedErrors.push(syncError)
    
    // Keep only last 50 errors to prevent memory issues
    if (this.progress.detailedErrors.length > 50) {
      this.progress.detailedErrors = this.progress.detailedErrors.slice(-50)
    }

    // Enhanced error analysis for common Gmail API issues
    let errorAnalysis = ''
    let suggestedFix = ''
    
    if (error?.message?.includes('Metadata scope does not support') || 
        error?.cause?.message?.includes('Metadata scope does not support')) {
      errorAnalysis = 'OAUTH_SCOPE_INSUFFICIENT: Gmail API metadata scope cannot use query parameters'
      suggestedFix = 'Requires gmail.readonly scope for full message access'
      isCritical = true
    } else if (error?.code === 403 || error?.status === 403) {
      errorAnalysis = 'PERMISSION_DENIED: Insufficient Gmail API permissions'
      suggestedFix = 'Check OAuth scopes and re-authenticate if necessary'
    } else if (error?.code === 401 || error?.status === 401) {
      errorAnalysis = 'AUTHENTICATION_FAILED: Gmail API authentication invalid'
      suggestedFix = 'Token may be expired, re-authentication required'
    } else if (error?.code === 429 || error?.status === 429) {
      errorAnalysis = 'RATE_LIMIT_EXCEEDED: Gmail API quota exceeded'
      suggestedFix = 'Implement exponential backoff and reduce request frequency'
    }

    // Log to file and console
    const logMessage = `[Gmail Sync Error] ${operation}`
    const logData = {
      messageId,
      error: syncError.error,
      stackTrace: syncError.stackTrace,
      apiResponse: syncError.apiResponse,
      timestamp: syncError.timestamp,
      isCritical,
      errorAnalysis,
      suggestedFix,
      gmailApiError: {
        code: error?.code || error?.status,
        statusText: error?.statusText,
        method: error?.config?.method,
        url: error?.config?.url?.href || error?.config?.url,
        params: error?.config?.params,
        causedBy: error?.cause?.message
      }
    }

    if (isCritical) {
      logger.gmail.error(logMessage, logData)
    } else {
      logger.gmail.warn(logMessage, logData)
    }
  }

  private logApiCall(endpoint: string, method: string, statusCode: number, response: any, responseTime: number): void {
    const apiResponse: ApiResponse = {
      timestamp: new Date(),
      endpoint,
      method,
      statusCode,
      response: statusCode >= 400 ? response : 'Success', // Only log full response for errors
      responseTime
    }

    this.progress.rawApiResponses.push(apiResponse)

    // Keep only last 20 API responses
    if (this.progress.rawApiResponses.length > 20) {
      this.progress.rawApiResponses = this.progress.rawApiResponses.slice(-20)
    }

    // Log to file and console
    const logMessage = `[Gmail API] ${method} ${endpoint}: ${statusCode} (${responseTime}ms)`
    const logData = {
      endpoint,
      method,
      statusCode,
      responseTime,
      response: statusCode >= 400 ? response : undefined
    }

    if (statusCode >= 400) {
      logger.gmail.error(logMessage, logData)
    } else {
      logger.gmail.info(logMessage, logData)
    }
  }

  private updateOperation(operation: string, details: string): void {
    this.progress.currentOperation = operation
    this.progress.operationDetails = details
    
    // Log to file and console
    const logMessage = `[Gmail Sync] ${operation}: ${details}`
    logger.gmail.info(logMessage, {
      operation,
      details,
      progress: {
        status: this.progress.status,
        processedMessages: this.progress.processedMessages,
        totalMessages: this.progress.totalMessages,
        currentBatch: this.progress.currentBatch,
        totalBatches: this.progress.totalBatches
      }
    })
  }

  private calculateMessagesPerSecond(): void {
    if (this.startTime && this.progress.processedMessages > 0) {
      const elapsed = (Date.now() - this.startTime.getTime()) / 1000
      this.progress.messagesPerSecond = Math.round((this.progress.processedMessages / elapsed) * 100) / 100
      
      if (this.progress.messagesPerSecond > 0) {
        const remaining = this.progress.totalMessages - this.progress.processedMessages
        this.progress.estimatedTimeRemaining = Math.round(remaining / this.progress.messagesPerSecond)
      }
    }
  }

  /**
   * Start full Gmail sync
   */
  async startSync(options: SyncOptions = {}): Promise<void> {
    if (this.isRunning) {
      const errorMsg = 'Sync is already running. Stop the current sync before starting a new one.'
      this.logError(undefined, 'Start Sync', errorMsg, true)
      throw new Error(errorMsg)
    }

    try {
      this.isRunning = true
      this.shouldPause = false
      this.startTime = new Date()
      this.progress = {
        status: 'running',
        totalMessages: 0,
        processedMessages: 0,
        currentBatch: 0,
        totalBatches: 0,
        startTime: this.startTime,
        detailedErrors: [],
        currentOperation: 'Initializing',
        operationDetails: 'Starting Gmail sync process',
        messagesPerSecond: 0,
        rawApiResponses: [],
        connectionStatus: 'reconnecting'
      }

      this.updateOperation('Authentication Check', 'Verifying Gmail authentication')
      
      const gmailService = getGmailService()
      const startTime = Date.now()
      
      // Ensure authentication
      const isAuthenticated = await gmailService.loadStoredTokens()
      this.logApiCall('/oauth/verify', 'GET', isAuthenticated ? 200 : 401, 
        { authenticated: isAuthenticated }, Date.now() - startTime)
      
      if (!isAuthenticated) {
        this.progress.connectionStatus = 'disconnected'
        const errorMsg = 'Gmail authentication required. Please re-authenticate with Google to get correct permissions.'
        this.logError(undefined, 'Authentication Check', errorMsg, true)
        
        // Log scope validation details
        logger.gmail.info('[Gmail Sync] Scope Validation', {
          operation: 'Authentication Check',
          details: 'Token validation failed - likely due to insufficient scope permissions',
          recommendedAction: 'User should disconnect and reconnect Gmail account for proper oauth scope'
        })
        
        throw new Error(errorMsg)
      }

      this.progress.connectionStatus = 'connected'
      this.updateOperation('Query Building', `Building search query: "${options.query || 'all messages'}"`)

      // Build query for message filtering
      const query = this.buildQuery(options)
      
      this.updateOperation('Message Count Estimation', 'Getting total message count from Gmail API')
      const listStartTime = Date.now()
      
      // Get initial message list to estimate total
      const initialList = await gmailService.listMessages({
        query,
        maxResults: 1
      })

      this.logApiCall('/gmail/v1/users/me/messages', 'GET', 200, 
        { resultSizeEstimate: initialList.resultSizeEstimate }, Date.now() - listStartTime)

      this.progress.totalMessages = Math.min(
        initialList.resultSizeEstimate || 0,
        options.maxMessages || initialList.resultSizeEstimate || 0
      )

      const batchSize = options.batchSize || 100
      this.progress.totalBatches = Math.ceil(this.progress.totalMessages / batchSize)

      this.updateOperation('Sync Configuration', 
        `Found ${this.progress.totalMessages} messages, processing in ${this.progress.totalBatches} batches of ${batchSize}`)

      if (this.progress.totalMessages === 0) {
        this.updateOperation('No Messages Found', `No messages match the query: "${query}"`)
        this.progress.status = 'completed'
        this.progress.endTime = new Date()
        return
      }

      // Start syncing in batches
      await this.syncInBatches(gmailService, query, batchSize, options.maxMessages)

      this.progress.status = 'completed'
      this.progress.endTime = new Date()
      this.progress.connectionStatus = 'connected'
      
      this.updateOperation('Sync Completed', 
        `Successfully processed ${this.progress.processedMessages} messages with ${this.progress.detailedErrors.length} errors`)

    } catch (error: any) {
      this.progress.status = 'error'
      this.progress.error = error instanceof Error ? error.message : 'Unknown error occurred'
      this.progress.endTime = new Date()
      this.progress.connectionStatus = 'disconnected'
      
      this.logError(undefined, 'Gmail Sync', error, true)
      this.updateOperation('Sync Failed', `Sync terminated with error: ${this.progress.error}`)
      
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
        
        this.updateOperation('Fetching Message List', 
          `Getting batch ${this.progress.currentBatch}/${this.progress.totalBatches} (${batchSize} messages)`)
        
        const listStartTime = Date.now()
        
        // Get message list for this batch
        const messageList = await gmailService.listMessages({
          query,
          maxResults: batchSize,
          pageToken
        })

        this.logApiCall('/gmail/v1/users/me/messages', 'GET', 200, 
          { messagesCount: messageList.messages?.length || 0 }, Date.now() - listStartTime)

        if (!messageList.messages || messageList.messages.length === 0) {
          this.updateOperation('Batch Complete', 'No more messages to process')
          break
        }

        // Limit to maxMessages if specified
        let messagesToProcess = messageList.messages
        if (maxMessages && processedCount + messagesToProcess.length > maxMessages) {
          messagesToProcess = messagesToProcess.slice(0, maxMessages - processedCount)
          this.updateOperation('Message Limit Reached', 
            `Limited to ${maxMessages} messages as requested`)
        }

        this.updateOperation('Fetching Message Details', 
          `Getting full content for ${messagesToProcess.length} messages`)

        // Get full message details in batch
        const messageIds = messagesToProcess.map((msg: any) => msg.id)
        
        let fullMessages: any[] = []
        const batchStartTime = Date.now()
        
        try {
          fullMessages = await gmailService.getMessagesBatch(messageIds, 'full')
          this.logApiCall('/gmail/v1/users/me/messages/batch', 'POST', 200, 
            { batchSize: messageIds.length }, Date.now() - batchStartTime)
        } catch (batchError: any) {
          this.logError(undefined, 'Batch Fetch', batchError, false)
          
          // Fallback to individual message fetching
          this.updateOperation('Batch Fetch Failed', 'Falling back to individual message fetching')
          fullMessages = []
          
          for (const messageId of messageIds) {
            try {
              const msgStartTime = Date.now()
              const message = await gmailService.getMessage(messageId, 'full')
              fullMessages.push(message)
              this.logApiCall(`/gmail/v1/users/me/messages/${messageId}`, 'GET', 200, 
                'Success', Date.now() - msgStartTime)
            } catch (msgError: any) {
              this.logError(messageId, 'Individual Message Fetch', msgError, false)
            }
          }
        }

        // Process each message
        for (const message of fullMessages) {
          if (this.shouldPause) {
            this.updateOperation('Sync Paused', 'Processing paused by user request')
            break
          }

          try {
            this.updateOperation('Processing Message', 
              `Processing message ${this.progress.processedMessages + 1}/${this.progress.totalMessages} (ID: ${message.id})`)
            
            await this.processMessage(message)
            this.progress.processedMessages++
            processedCount++

            // Calculate performance metrics
            this.calculateMessagesPerSecond()

            // Update progress every 5 messages for better real-time feedback
            if (this.progress.processedMessages % 5 === 0) {
              await this.saveProgress()
            }

          } catch (error: any) {
            this.logError(message.id, 'Message Processing', error, false)
            // Continue with next message
          }
        }

        // Rate limiting - wait between batches
        this.updateOperation('Rate Limiting', 'Waiting 250ms between batches to respect API limits')
        await new Promise(resolve => setTimeout(resolve, 250))

        pageToken = messageList.nextPageToken
        if (!pageToken) {
          this.updateOperation('Page Complete', 'No more pages to process')
          break
        }

        this.updateOperation('Batch Complete', 
          `Completed batch ${this.progress.currentBatch}/${this.progress.totalBatches} (${this.progress.processedMessages} messages processed)`)

      } catch (error: any) {
        this.logError(undefined, `Batch ${this.progress.currentBatch} Processing`, error, false)
        
        // Wait longer before retrying
        this.updateOperation('Batch Error Recovery', 'Waiting 1000ms before retrying batch')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Continue with next batch
      }
    }
  }

  /**
   * Process a single Gmail message
   */
  private async processMessage(gmailMessage: any): Promise<void> {
    const messageId = gmailMessage.id || 'unknown'
    
    try {
      // Parse the Gmail message
      let parsedEmail: ParsedEmailData
      try {
        parsedEmail = await EmailParser.parseGmailMessage(gmailMessage)
      } catch (parseError: any) {
        this.logError(messageId, 'Email Parsing', parseError, false)
        throw new Error(`Failed to parse email: ${parseError.message}`)
      }
      
      // Extract contact information
      let contacts: any[], fromContact: any
      try {
        const contactInfo = EmailParser.extractContactInfo(parsedEmail)
        contacts = contactInfo.contacts
        fromContact = contactInfo.fromContact
      } catch (contactError: any) {
        this.logError(messageId, 'Contact Extraction', contactError, false)
        throw new Error(`Failed to extract contacts: ${contactError.message}`)
      }

      // Create or find from contact
      let fromContactRecord: any
      try {
        fromContactRecord = await this.contactRepo.findOrCreateByEmail(
          fromContact.email,
          fromContact.name
        )
      } catch (contactCreateError: any) {
        this.logError(messageId, 'From Contact Creation', contactCreateError, false)
        throw new Error(`Failed to create from contact ${fromContact.email}: ${contactCreateError.message}`)
      }

      // Create or find to contacts
      let toContactRecords: any[]
      try {
        toContactRecords = await Promise.all(
          contacts.map(async (contact, index) => {
            try {
              return await this.contactRepo.findOrCreateByEmail(contact.email, contact.name)
            } catch (toContactError: any) {
              this.logError(messageId, `To Contact Creation (${index})`, toContactError, false)
              throw new Error(`Failed to create to contact ${contact.email}: ${toContactError.message}`)
            }
          })
        )
      } catch (toContactsError: any) {
        this.logError(messageId, 'To Contacts Creation', toContactsError, false)
        throw toContactsError
      }

      // Determine communication direction
      let userEmail: string
      try {
        userEmail = await this.getUserEmail()
      } catch (userEmailError: any) {
        this.logError(messageId, 'User Email Retrieval', userEmailError, false)
        userEmail = 'unknown@example.com' // Fallback
      }

      const direction: 'incoming' | 'outgoing' = parsedEmail.from.toLowerCase().includes(userEmail.toLowerCase()) ? 'outgoing' : 'incoming'

      // Create communication record
      const communication = {
        source: 'gmail' as const,
        source_id: parsedEmail.messageId,
        contact_id: fromContactRecord.id,
        direction,
        timestamp: parsedEmail.date.toISOString(),
        subject: parsedEmail.subject || 'No Subject',
        content: this.extractBestContent(parsedEmail),
        content_type: 'email',
        message_type: 'direct' as const,
        confidence_score: 1.0,
        thread_id: parsedEmail.threadId,
        metadata: {
          labels: parsedEmail.labels || [],
          snippet: parsedEmail.snippet || '',
          inReplyTo: parsedEmail.inReplyTo,
          references: parsedEmail.references,
          attachmentCount: parsedEmail.attachments?.length || 0,
          to: parsedEmail.to || [],
          cc: parsedEmail.cc || [],
          bcc: parsedEmail.bcc || []
        }
      }

      // Save communication (will skip if already exists due to unique constraint)
      try {
        await this.communicationRepo.create(communication)
      } catch (saveError: any) {
        if (saveError.message?.includes('UNIQUE constraint failed')) {
          // This is expected for duplicate messages, not an error
          console.log(`Message ${messageId} already exists in database, skipping`)
        } else {
          this.logError(messageId, 'Communication Save', saveError, false)
          throw new Error(`Failed to save communication: ${saveError.message}`)
        }
      }

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