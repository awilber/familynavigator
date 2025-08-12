import express from 'express'
import { getGmailService } from '../services/gmail'
import { gmailSyncService, SyncOptions } from '../services/gmail/syncService'
import { databaseService } from '../services/database'
import { logger } from '../utils/logger'

const router = express.Router()

// GET /api/gmail/auth - Get OAuth authorization URL
router.get('/auth', async (req, res) => {
  try {
    const gmailService = getGmailService()
    const authUrl = gmailService.getAuthUrl()
    
    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Visit this URL to authorize Gmail access'
      }
    })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    })
  }
})

// GET /api/gmail/callback - OAuth callback handler
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      })
    }

    const gmailService = getGmailService()
    const tokens = await gmailService.exchangeCodeForTokens(code)
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3088'}/communications?gmail_auth=success`)
  } catch (error) {
    console.error('Error handling OAuth callback:', error)
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3088'}/communications?gmail_auth=error`)
  }
})

// GET /api/gmail/status - Check authentication status
router.get('/status', async (req, res) => {
  try {
    const gmailService = getGmailService()
    
    // Try to load stored tokens
    const isAuthenticated = await gmailService.loadStoredTokens()
    
    let profile = null
    if (isAuthenticated) {
      try {
        profile = await gmailService.getProfile()
      } catch (error) {
        console.error('Error getting profile:', error)
      }
    }

    res.json({
      success: true,
      data: {
        isAuthenticated,
        profile: profile ? {
          emailAddress: profile.emailAddress,
          messagesTotal: profile.messagesTotal,
          threadsTotal: profile.threadsTotal
        } : null
      }
    })
  } catch (error) {
    console.error('Error checking Gmail status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check Gmail status'
    })
  }
})

// GET /api/gmail/debug-tokens - Debug token information
router.get('/debug-tokens', async (req, res) => {
  try {
    const { databaseService } = require('../services/database')
    const db = await databaseService.getDatabase()
    
    const tokenRow = await db.get(
      'SELECT value FROM app_config WHERE key = ?',
      ['gmail_tokens']
    )
    
    if (!tokenRow) {
      return res.json({
        success: true,
        data: { message: 'No tokens found in database' }
      })
    }

    let parsedTokens
    try {
      // Handle encrypted tokens
      const possibleEncrypted = JSON.parse(tokenRow.value)
      
      // Check if it has encryption structure
      if (possibleEncrypted.encrypted && possibleEncrypted.iv && possibleEncrypted.authTag) {
        const decrypted = databaseService.decrypt(
          possibleEncrypted.encrypted,
          possibleEncrypted.iv,
          possibleEncrypted.authTag
        )
        parsedTokens = decrypted ? JSON.parse(decrypted) : possibleEncrypted
      } else {
        // Not encrypted, use directly
        parsedTokens = possibleEncrypted
      }
    } catch (parseError: any) {
      return res.json({
        success: true,
        data: { 
          message: 'Error parsing stored tokens',
          rawValue: tokenRow.value.substring(0, 100) + '...', // Truncate for security
          parseError: parseError.message
        }
      })
    }

    // Redact sensitive information but show structure and scope
    const debugInfo = {
      hasAccessToken: !!parsedTokens.access_token,
      hasRefreshToken: !!parsedTokens.refresh_token,
      scope: parsedTokens.scope,
      tokenType: parsedTokens.token_type,
      expiryDate: parsedTokens.expiry_date ? new Date(parsedTokens.expiry_date) : null,
      isExpired: parsedTokens.expiry_date ? parsedTokens.expiry_date <= Date.now() : false,
      scopeAnalysis: {
        hasMetadataScope: parsedTokens.scope?.includes('gmail.metadata'),
        hasReadonlyScope: parsedTokens.scope?.includes('gmail.readonly'),
        isOnlyMetadata: parsedTokens.scope === 'https://www.googleapis.com/auth/gmail.metadata'
      }
    }

    res.json({
      success: true,
      data: debugInfo
    })
  } catch (error) {
    console.error('Error debugging tokens:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to debug tokens'
    })
  }
})

// POST /api/gmail/revoke - Revoke Gmail authentication
router.post('/revoke', async (req, res) => {
  try {
    const gmailService = getGmailService()
    await gmailService.revokeAuth()
    
    res.json({
      success: true,
      message: 'Gmail authentication revoked successfully'
    })
  } catch (error) {
    console.error('Error revoking Gmail auth:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to revoke Gmail authentication'
    })
  }
})

// POST /api/gmail/sync - Start Gmail sync
router.post('/sync', async (req, res) => {
  try {
    const options: SyncOptions = {
      batchSize: parseInt(req.body.batchSize) || 100,
      maxMessages: req.body.maxMessages ? parseInt(req.body.maxMessages) : undefined,
      query: req.body.query || '',
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      filterPersons: req.body.filterPersons && Array.isArray(req.body.filterPersons) ? req.body.filterPersons : undefined,
      expandDateRange: req.body.expandDateRange || false
    }

    // Start sync in background
    gmailSyncService.startSync(options).catch(error => {
      console.error('Background sync failed:', error)
    })

    res.json({
      success: true,
      message: 'Gmail sync started successfully',
      data: gmailSyncService.getProgress()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start Gmail sync'
    const errorDetails = {
      timestamp: new Date().toISOString(),
      operation: 'Start Gmail Sync',
      stackTrace: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name || 'Unknown',
      syncProgress: gmailSyncService.getProgress(),
      requestBody: req.body
    }

    logger.gmail.error('Error starting Gmail sync', {
      error: errorMessage,
      details: errorDetails
    })

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    })
  }
})

// GET /api/gmail/sync/progress - Get sync progress
router.get('/sync/progress', async (req, res) => {
  try {
    const progress = gmailSyncService.getProgress()
    
    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('Error getting sync progress:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get sync progress'
    })
  }
})

// POST /api/gmail/sync/pause - Pause sync
router.post('/sync/pause', async (req, res) => {
  try {
    gmailSyncService.pauseSync()
    
    res.json({
      success: true,
      message: 'Gmail sync paused',
      data: gmailSyncService.getProgress()
    })
  } catch (error) {
    console.error('Error pausing Gmail sync:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to pause Gmail sync'
    })
  }
})

// POST /api/gmail/sync/resume - Resume sync
router.post('/sync/resume', async (req, res) => {
  try {
    const options: SyncOptions = {
      batchSize: parseInt(req.body.batchSize) || 100,
      resumeFromLastSync: true
    }

    // Resume sync in background
    gmailSyncService.resumeSync(options).catch(error => {
      console.error('Background sync resume failed:', error)
    })

    res.json({
      success: true,
      message: 'Gmail sync resumed',
      data: gmailSyncService.getProgress()
    })
  } catch (error) {
    console.error('Error resuming Gmail sync:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume Gmail sync'
    })
  }
})

// POST /api/gmail/sync/stop - Stop sync
router.post('/sync/stop', async (req, res) => {
  try {
    gmailSyncService.stopSync()
    
    res.json({
      success: true,
      message: 'Gmail sync stopped',
      data: gmailSyncService.getProgress()
    })
  } catch (error) {
    console.error('Error stopping Gmail sync:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to stop Gmail sync'
    })
  }
})

// POST /api/gmail/sync/incremental - Run incremental sync
router.post('/sync/incremental', async (req, res) => {
  try {
    // Start incremental sync in background
    gmailSyncService.incrementalSync().catch(error => {
      console.error('Incremental sync failed:', error)
    })

    res.json({
      success: true,
      message: 'Incremental sync started'
    })
  } catch (error) {
    console.error('Error starting incremental sync:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start incremental sync'
    })
  }
})

// GET /api/gmail/messages - List messages (for testing)
router.get('/messages', async (req, res) => {
  try {
    const gmailService = getGmailService()
    
    const isAuthenticated = await gmailService.loadStoredTokens()
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Gmail authentication required'
      })
    }

    const options = {
      query: req.query.q as string || '',
      maxResults: parseInt(req.query.maxResults as string) || 10,
      pageToken: req.query.pageToken as string
    }

    const messages = await gmailService.listMessages(options)
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error listing Gmail messages:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list Gmail messages'
    })
  }
})

// GET /api/gmail/messages/:id - Get specific message (for testing)
router.get('/messages/:id', async (req, res) => {
  try {
    const gmailService = getGmailService()
    
    const isAuthenticated = await gmailService.loadStoredTokens()
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Gmail authentication required'
      })
    }

    const messageId = req.params.id
    const format = req.query.format as 'full' | 'metadata' | 'minimal' || 'metadata'
    
    const message = await gmailService.getMessage(messageId, format)
    
    res.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error('Error getting Gmail message:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get Gmail message'
    })
  }
})

// POST /api/gmail/process-filtered - Process emails with filtering
router.post('/process-filtered', async (req, res) => {
  const startTime = Date.now()
  const logFile = '/tmp/gmail-processing.log'
  
  const log = (message: string) => {
    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [Gmail] ${message}\n`
    console.log(logEntry.trim())
    require('fs').appendFileSync(logFile, logEntry)
  }
  
  try {
    const { filters } = req.body
    
    log('=== STARTING FILTERED EMAIL PROCESSING ===')
    log(`Request body: ${JSON.stringify(req.body, null, 2)}`)
    log(`Filters received: ${JSON.stringify(filters, null, 2)}`)
    
    const gmailService = getGmailService()
    log('Gmail service initialized')
    
    const isAuthenticated = await gmailService.loadStoredTokens()
    log(`Authentication check result: ${isAuthenticated}`)
    
    if (!isAuthenticated) {
      log('ERROR: Gmail authentication failed')
      return res.status(401).json({
        success: false,
        error: 'Gmail authentication required'
      })
    }

    // Build Gmail query from filters
    let query = ''
    const queryParts: string[] = []
    
    // Date filtering
    if (filters.startDate) {
      queryParts.push(`after:${filters.startDate}`)
      log(`Added start date filter: after:${filters.startDate}`)
    }
    
    if (filters.endDate) {
      queryParts.push(`before:${filters.endDate}`)
      log(`Added end date filter: before:${filters.endDate}`)
    }
    
    // Custom query
    if (filters.query) {
      queryParts.push(filters.query)
      log(`Added custom query: ${filters.query}`)
    }
    
    query = queryParts.join(' ')
    log(`Final Gmail query: "${query}"`)
    log(`Query parts: ${JSON.stringify(queryParts)}`)
    
    // Get filtered messages
    const listOptions = {
      q: query || undefined,
      maxResults: Math.min(filters.maxMessages || 100, 500) // Gmail API limit
    }
    log(`List options: ${JSON.stringify(listOptions)}`)
    
    log('About to call Gmail API listMessages...')
    const messageList = await gmailService.listMessages(listOptions)
    log(`Gmail API call completed. Response: ${JSON.stringify(messageList, null, 2)}`)
    
    const totalFound = messageList.messages?.length || 0
    log(`Found ${totalFound} messages matching filters`)
    
    if (totalFound === 0) {
      log('WARNING: No messages found matching the filters')
    }
    
    // Process a sample of messages for analysis and save to database
    const sampleSize = Math.min(totalFound, filters.batchSize || 10)
    const processedEmails: any[] = []
    const processedContacts = new Set<string>()
    
    log(`Processing ${sampleSize} messages for database storage...`)
    
    if (messageList.messages && messageList.messages.length > 0) {
      for (let i = 0; i < sampleSize; i++) {
        const messageId = messageList.messages[i].id
        if (!messageId) continue
        
        try {
          log(`Processing message ${i + 1}/${sampleSize}: ${messageId}`)
          const message = await gmailService.getMessage(messageId, 'metadata')
          
          // Extract email information
          const headers = message.payload?.headers || []
          const fromHeader = headers.find((h: any) => h.name === 'From')
          const toHeader = headers.find((h: any) => h.name === 'To')
          const subjectHeader = headers.find((h: any) => h.name === 'Subject')
          const dateHeader = headers.find((h: any) => h.name === 'Date')
          
          const emailInfo = {
            id: messageId,
            from: fromHeader?.value || 'Unknown',
            to: toHeader?.value || 'Unknown',
            subject: subjectHeader?.value || '(No Subject)',
            date: dateHeader?.value || 'Unknown',
            snippet: message.snippet || '',
            labelIds: message.labelIds || []
          }
          
          // Save to database
          try {
            const db = await databaseService.getDatabase()
            
            // Determine direction (incoming vs outgoing)
            const isOutgoing = emailInfo.from.includes('awilber@gmail.com') || emailInfo.from.includes('awilber@wiredtriangle.com')
            const direction = isOutgoing ? 'outgoing' : 'incoming'
            
            // Parse date
            let timestamp = new Date()
            if (emailInfo.date && emailInfo.date !== 'Unknown') {
              timestamp = new Date(emailInfo.date)
            }
            
            // Insert into communications table
            const insertQuery = `
              INSERT INTO communications (
                source, source_id, direction, timestamp, subject, content, 
                content_type, metadata, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `
            
            const metadata = JSON.stringify({
              from: emailInfo.from,
              to: emailInfo.to,
              labelIds: emailInfo.labelIds,
              messageId: messageId,
              threadId: message.threadId
            })
            
            await db.run(insertQuery, [
              'gmail',
              messageId,
              direction,
              timestamp.toISOString(),
              emailInfo.subject,
              emailInfo.snippet,
              'text',
              metadata
            ])
            
            log(`Saved email to database: ${emailInfo.subject.substring(0, 50)}...`)
            
          } catch (dbError) {
            const errorMsg = dbError instanceof Error ? dbError.message : String(dbError)
            log(`Database error for message ${messageId}: ${errorMsg}`)
          }
          
          processedEmails.push(emailInfo)
          
          // Track contacts
          if (fromHeader?.value) {
            processedContacts.add(fromHeader.value)
          }
          if (toHeader?.value) {
            processedContacts.add(toHeader.value)
          }
          
        } catch (msgError) {
          const errorMsg = msgError instanceof Error ? msgError.message : String(msgError)
          log(`Error processing message ${messageId}: ${errorMsg}`)
        }
      }
    }
    
    log(`Completed processing ${processedEmails.length} emails and saved to database`)
    
    // Create processing summary
    const result = {
      success: true,
      processedEmails: processedEmails.length,
      totalFilteredEmails: totalFound,
      processedContacts: processedContacts.size,
      filters: {
        dateRange: filters.startDate || filters.endDate ? 
          `${filters.startDate || 'beginning'} to ${filters.endDate || 'present'}` : 
          'No date filtering',
        maxEmails: listOptions.maxResults,
        query: query || 'No query filter',
        batchSize: filters.batchSize || 10
      },
      summary: {
        emailsSample: processedEmails.slice(0, 5).map(email => ({
          id: email.id,
          from: email.from.substring(0, 50) + (email.from.length > 50 ? '...' : ''),
          subject: email.subject.substring(0, 80) + (email.subject.length > 80 ? '...' : ''),
          date: email.date,
          snippet: email.snippet.substring(0, 100) + (email.snippet.length > 100 ? '...' : '')
        })),
        topContacts: Array.from(processedContacts).slice(0, 5).map(contact => ({
          email: contact.substring(0, 50) + (contact.length > 50 ? '...' : ''),
          type: contact.includes('@gmail.com') ? 'Gmail' : 'Other'
        }))
      }
    }
    
    console.log('[Gmail] Processing completed successfully')
    console.log(`[Gmail] Processed ${processedEmails.length} emails from ${totalFound} total filtered`)
    
    res.json(result)
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    
    log(`=== ERROR OCCURRED ===`)
    log(`Error message: ${errorMsg}`)
    log(`Error stack: ${errorStack}`)
    log(`Error type: ${typeof error}`)
    log(`Error object: ${JSON.stringify(error, null, 2)}`)
    log(`Total execution time: ${Date.now() - startTime}ms`)
    
    console.error('[Gmail] Error processing filtered emails:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process emails: ' + errorMsg,
      details: {
        message: errorMsg,
        stack: errorStack,
        executionTime: Date.now() - startTime
      }
    })
  }
})

export default router