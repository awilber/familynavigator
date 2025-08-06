import express from 'express'
import { emailAnalyticsService } from '../services/email-filtering/addressAnalytics'
import { emailPatternMatcher } from '../services/email-filtering/patternMatcher'
import { logger } from '../utils/logger'

const router = express.Router()

// GET /api/email-filtering/analysis - Get frequency analysis for UI
router.get('/analysis', async (req, res) => {
  try {
    const { sortBy = 'frequency', limit = 50 } = req.query
    
    logger.info(`[Email Filtering] Getting frequency analysis: sortBy=${sortBy}, limit=${limit}`)
    
    const analysis = await emailAnalyticsService.getFrequencyAnalysis(
      sortBy as 'frequency' | 'alphabetical' | 'recent' | 'legal_relevance',
      parseInt(limit as string)
    )
    
    res.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get frequency analysis:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get frequency analysis'
    })
  }
})

// POST /api/email-filtering/rebuild-analytics - Rebuild email address analytics
router.post('/rebuild-analytics', async (req, res) => {
  try {
    logger.info('[Email Filtering] Starting analytics rebuild')
    
    await emailAnalyticsService.buildEmailAddressAnalytics()
    
    res.json({
      success: true,
      message: 'Email address analytics rebuilt successfully'
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to rebuild analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to rebuild analytics'
    })
  }
})

// GET /api/email-filtering/suggestions - Get smart pattern suggestions
router.get('/suggestions', async (req, res) => {
  try {
    logger.info('[Email Filtering] Getting pattern suggestions')
    
    const suggestions = await emailAnalyticsService.suggestFilterPatterns()
    
    res.json({
      success: true,
      data: suggestions
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get suggestions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get pattern suggestions'
    })
  }
})

// GET /api/email-filtering/patterns - Get all active filter patterns
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await emailPatternMatcher.getActivePatterns()
    
    res.json({
      success: true,
      data: patterns
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get filter patterns'
    })
  }
})

// POST /api/email-filtering/patterns - Add a new filter pattern
router.post('/patterns', async (req, res) => {
  try {
    const { 
      pattern, 
      patternType, 
      fields, 
      priority, 
      legalRelevance, 
      caseReference,
      createdBy = 'api'
    } = req.body
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required'
      })
    }
    
    logger.info(`[Email Filtering] Adding pattern: ${pattern} (${patternType})`)
    
    const newPattern = await emailPatternMatcher.addPattern(pattern, {
      patternType,
      fields,
      priority,
      legalRelevance,
      caseReference,
      createdBy
    })
    
    res.json({
      success: true,
      data: newPattern
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to add pattern:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add filter pattern'
    })
  }
})

// POST /api/email-filtering/patterns/batch - Add multiple patterns at once
router.post('/patterns/batch', async (req, res) => {
  try {
    const { patterns } = req.body
    
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Patterns array is required'
      })
    }
    
    logger.info(`[Email Filtering] Adding ${patterns.length} patterns in batch`)
    
    const results = []
    const errors = []
    
    for (const patternData of patterns) {
      try {
        const newPattern = await emailPatternMatcher.addPattern(patternData.pattern, {
          patternType: patternData.patternType,
          fields: patternData.fields,
          priority: patternData.priority,
          legalRelevance: patternData.legalRelevance,
          caseReference: patternData.caseReference,
          createdBy: patternData.createdBy || 'api_batch'
        })
        results.push(newPattern)
      } catch (error) {
        errors.push({
          pattern: patternData.pattern,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    res.json({
      success: true,
      data: {
        added: results,
        errors: errors,
        totalAdded: results.length,
        totalErrors: errors.length
      }
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to add batch patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add batch patterns'
    })
  }
})

// DELETE /api/email-filtering/patterns/:id - Remove a filter pattern
router.delete('/patterns/:id', async (req, res) => {
  try {
    const patternId = parseInt(req.params.id)
    const { removedBy = 'api' } = req.body
    
    logger.info(`[Email Filtering] Removing pattern ID: ${patternId}`)
    
    await emailPatternMatcher.removePattern(patternId, removedBy)
    
    res.json({
      success: true,
      message: 'Pattern removed successfully'
    })
  } catch (error) {
    logger.error(`[Email Filtering] Failed to remove pattern ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove filter pattern'
    })
  }
})

// POST /api/email-filtering/test-message - Test if a message matches filters
router.post('/test-message', async (req, res) => {
  try {
    const { senderEmail, recipientEmails, ccEmails, bccEmails } = req.body
    
    const testMessage = {
      sender_email: senderEmail,
      metadata: {
        to: recipientEmails || [],
        cc: ccEmails || [],
        bcc: bccEmails || []
      }
    }
    
    const matchResult = await emailPatternMatcher.matchMessage(testMessage)
    
    res.json({
      success: true,
      data: matchResult
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to test message:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to test message against filters'
    })
  }
})

// GET /api/email-filtering/gmail-query - Generate Gmail API query from active patterns
router.get('/gmail-query', async (req, res) => {
  try {
    const query = await emailPatternMatcher.generateGmailQuery()
    
    res.json({
      success: true,
      data: {
        query,
        patternCount: (await emailPatternMatcher.getActivePatterns()).length
      }
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to generate Gmail query:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate Gmail query'
    })
  }
})

// GET /api/email-filtering/stats - Get filtering statistics
router.get('/stats', async (req, res) => {
  try {
    const { databaseService } = require('../services/database')
    const db = await databaseService.getDatabase()
    
    const stats = await db.get(`
      SELECT 
        COUNT(DISTINCT email_address) as unique_addresses,
        COUNT(DISTINCT domain) as unique_domains,
        SUM(total_message_count) as total_messages,
        AVG(legal_importance_score) as avg_legal_score,
        COUNT(CASE WHEN communication_frequency = 'daily' THEN 1 END) as daily_contacts,
        COUNT(CASE WHEN legal_importance_score > 5 THEN 1 END) as high_legal_relevance
      FROM email_address_analytics
    `)
    
    const patternStats = await db.get(`
      SELECT 
        COUNT(*) as total_patterns,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_patterns,
        SUM(match_count) as total_matches,
        COUNT(CASE WHEN legal_relevance = 'high' THEN 1 END) as high_priority_patterns
      FROM email_filter_patterns
    `)
    
    res.json({
      success: true,
      data: {
        analytics: stats,
        patterns: patternStats
      }
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get filtering statistics'
    })
  }
})

// GET /api/email-filtering/audit-log - Get filtering audit trail
router.get('/audit-log', async (req, res) => {
  try {
    const { limit = 100, operation = null } = req.query
    const { databaseService } = require('../services/database')
    const db = await databaseService.getDatabase()
    
    let query = `
      SELECT 
        fal.*,
        efp.pattern,
        efp.pattern_type
      FROM filter_application_log fal
      LEFT JOIN email_filter_patterns efp ON fal.filter_pattern_id = efp.id
    `
    
    const params = []
    
    if (operation) {
      query += ` WHERE fal.operation_type = ?`
      params.push(operation)
    }
    
    query += ` ORDER BY fal.applied_at DESC LIMIT ?`
    params.push(parseInt(limit as string))
    
    const auditLog = await db.all(query, params)
    
    res.json({
      success: true,
      data: auditLog.map((log: any) => ({
        ...log,
        applied_at: new Date(log.applied_at)
      }))
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get audit log:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get audit log'
    })
  }
})

export default router