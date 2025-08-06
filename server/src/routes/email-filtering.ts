import express from 'express'
import { emailAnalyticsService } from '../services/email-filtering/addressAnalytics'
import { emailPatternMatcher } from '../services/email-filtering/patternMatcher'
import { dualLayerEmailFilter } from '../services/email-filtering/dualLayerFilter'
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
    const { limit = 20, threshold = 5 } = req.query
    logger.info(`[Email Filtering] Getting pattern suggestions: limit=${limit}, threshold=${threshold}`)
    
    const suggestions = await emailAnalyticsService.getSmartSuggestions(
      parseInt(limit as string),
      parseInt(threshold as string)
    )
    
    res.json({
      success: true,
      data: suggestions
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get suggestions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    })
  }
})

// POST /api/email-filtering/patterns - Add filter patterns
router.post('/patterns', async (req, res) => {
  try {
    const { patterns } = req.body
    logger.info(`[Email Filtering] Adding ${patterns?.length || 0} filter patterns`)
    
    const results = []
    for (const patternData of patterns) {
      const result = await emailPatternMatcher.addPattern(patternData.pattern, {
        patternType: patternData.patternType,
        fields: patternData.fields,
        priority: patternData.priority,
        legalRelevance: patternData.legalRelevance,
        caseReference: patternData.caseReference,
        createdBy: 'user'
      })
      results.push(result)
    }
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to add patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add patterns'
    })
  }
})

// POST /api/email-filtering/patterns/batch - Batch add patterns from email addresses
router.post('/patterns/batch', async (req, res) => {
  try {
    const { emailAddresses, fields = ['from', 'to', 'cc', 'bcc'] } = req.body
    logger.info(`[Email Filtering] Batch adding ${emailAddresses?.length || 0} email address patterns`)
    
    const results = []
    for (const email of emailAddresses) {
      const result = await emailPatternMatcher.addPattern(email, {
        fields,
        createdBy: 'user',
        legalRelevance: 'high'
      })
      results.push(result)
    }
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to batch add patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to batch add patterns'
    })
  }
})

// GET /api/email-filtering/patterns - Get active filter patterns
router.get('/patterns', async (req, res) => {
  try {
    logger.info('[Email Filtering] Getting active filter patterns')
    const patterns = await emailPatternMatcher.getActivePatterns()
    
    res.json({
      success: true,
      data: patterns
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get patterns'
    })
  }
})

// DELETE /api/email-filtering/patterns/:id - Remove filter pattern
router.delete('/patterns/:id', async (req, res) => {
  try {
    const { id } = req.params
    logger.info(`[Email Filtering] Removing filter pattern: ${id}`)
    
    await emailPatternMatcher.removePattern(parseInt(id), 'user')
    
    res.json({
      success: true,
      message: 'Pattern removed successfully'
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to remove pattern:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove pattern'
    })
  }
})

// GET /api/email-filtering/gmail-query - Generate Gmail API query
router.get('/gmail-query', async (req, res) => {
  try {
    logger.info('[Email Filtering] Generating Gmail API query')
    const query = await dualLayerEmailFilter.generateSyncQuery()
    
    res.json({
      success: true,
      data: query
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to generate Gmail query:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate Gmail query'
    })
  }
})

// POST /api/email-filtering/test - Test pattern against message
router.post('/test', async (req, res) => {
  try {
    const { message, patternId } = req.body
    logger.info(`[Email Filtering] Testing pattern ${patternId} against message`)
    
    const result = await emailPatternMatcher.matchMessage(message)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to test pattern:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to test pattern'
    })
  }
})

// GET /api/email-filtering/stats - Get filtering statistics
router.get('/stats', async (req, res) => {
  try {
    logger.info('[Email Filtering] Getting filtering statistics')
    
    // Get basic stats from the analytics service
    const stats = await emailAnalyticsService.getFilteringStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get filtering statistics'
    })
  }
})

// GET /api/email-filtering/audit - Get audit trail
router.get('/audit', async (req, res) => {
  try {
    const { limit = 100, offset = 0, operation = null } = req.query
    logger.info(`[Email Filtering] Getting audit trail: limit=${limit}, offset=${offset}`)
    
    // Implementation would query filter_application_log table
    res.json({
      success: true,
      data: {
        logs: [], // Would be populated from database
        total: 0
      }
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get audit trail:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get audit trail'
    })
  }
})

export default router