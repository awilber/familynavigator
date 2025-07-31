import express from 'express'
import { getGmailService } from '../services/gmail'
import { gmailSyncService, SyncOptions } from '../services/gmail/syncService'

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
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
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
    console.error('Error starting Gmail sync:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start Gmail sync'
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

export default router