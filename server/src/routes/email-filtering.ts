import express from 'express'
import { logger } from '../utils/logger'

const router = express.Router()

// GET /api/email-filtering/analysis - Get frequency analysis for UI
router.get('/analysis', async (req, res) => {
  try {
    const { sortBy = 'frequency' } = req.query
    logger.info(`[Email Filtering] Getting frequency analysis, sortBy: ${sortBy}`)
    
    // Import Database here to avoid circular imports
    const Database = require('sqlite3').Database
    const dbPath = require('path').join(__dirname, '..', '..', 'data', 'communications.db')
    const db = new Database(dbPath)
    
    // Extract all email addresses from metadata JSON (to/cc/bcc) and sender/recipient fields
    const query = `
      WITH email_extractions AS (
        -- Extract To addresses from metadata JSON
        SELECT DISTINCT
          TRIM(REPLACE(REPLACE(json_extract(metadata, '$.to[0]'), '"', ''), '<', '')) as email_address,
          direction,
          timestamp,
          'to' as address_type
        FROM communications 
        WHERE source = 'gmail'
          AND json_extract(metadata, '$.to[0]') IS NOT NULL
          AND json_extract(metadata, '$.to[0]') != ''
          AND json_extract(metadata, '$.to[0]') NOT LIKE '%example.com%'
          AND json_extract(metadata, '$.to[0]') NOT LIKE '%lawfirm.com%'
          AND json_extract(metadata, '$.to[0]') NOT LIKE '%familycourt.gov%'
          AND json_extract(metadata, '$.to[0]') NOT LIKE '%mediationservices.com%'
        
        UNION
        
        -- Extract CC addresses from metadata JSON (first CC address)
        SELECT DISTINCT
          TRIM(REPLACE(REPLACE(json_extract(metadata, '$.cc[0]'), '"', ''), '<', '')) as email_address,
          direction,
          timestamp,
          'cc' as address_type
        FROM communications 
        WHERE source = 'gmail'
          AND json_extract(metadata, '$.cc[0]') IS NOT NULL
          AND json_extract(metadata, '$.cc[0]') != ''
          AND json_extract(metadata, '$.cc[0]') NOT LIKE '%example.com%'
          AND json_extract(metadata, '$.cc[0]') NOT LIKE '%lawfirm.com%'
        
        UNION
        
        -- Extract sender addresses
        SELECT DISTINCT
          sender_email as email_address,
          direction,
          timestamp,
          'from' as address_type
        FROM communications 
        WHERE source = 'gmail'
          AND sender_email IS NOT NULL 
          AND sender_email != ''
          AND sender_email NOT LIKE '%example.com'
          AND sender_email NOT LIKE '%@lawfirm.com'
          AND sender_email NOT LIKE '%@familycourt.gov'
          AND sender_email NOT LIKE '%@mediationservices.com'
      )
      SELECT 
        LOWER(email_address) as email_address,
        email_address as display_name,
        COUNT(*) as total_message_count,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming_count,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        CASE 
          -- High-priority individuals get maximum legal score regardless of message count
          WHEN LOWER(email_address) LIKE '%awilber%' THEN 10
          WHEN LOWER(email_address) LIKE '%alexapowell%' THEN 10
          WHEN LOWER(email_address) LIKE '%elizabeth%' THEN 9
          -- Gmail addresses are generally higher priority for personal communications
          WHEN LOWER(email_address) LIKE '%@gmail.com' AND COUNT(*) > 5 THEN 8
          WHEN LOWER(email_address) LIKE '%@gmail.com' AND COUNT(*) > 1 THEN 6
          -- General scoring based on message count
          WHEN COUNT(*) > 50 THEN 10
          WHEN COUNT(*) > 20 THEN 8  
          WHEN COUNT(*) > 10 THEN 6
          WHEN COUNT(*) > 5 THEN 4
          ELSE 2
        END as legal_importance_score,
        CASE 
          WHEN julianday('now') - julianday(MAX(timestamp)) < 7 THEN 'daily'
          WHEN julianday('now') - julianday(MAX(timestamp)) < 30 THEN 'weekly'
          WHEN julianday('now') - julianday(MAX(timestamp)) < 90 THEN 'monthly'
          ELSE 'rarely'
        END as communication_frequency,
        SUBSTR(email_address, INSTR(email_address, '@') + 1) as domain
      FROM email_extractions
      WHERE email_address IS NOT NULL 
        AND email_address != ''
        AND email_address LIKE '%@%'
        AND LENGTH(email_address) > 3
      GROUP BY LOWER(email_address)
      HAVING COUNT(*) > 0
      ORDER BY ${
        sortBy === 'frequency' ? 'total_message_count DESC' :
        sortBy === 'recent' ? 'MAX(timestamp) DESC' :
        sortBy === 'legal_relevance' ? 'legal_importance_score DESC' :
        sortBy === 'alphabetical' ? 'email_address ASC' :
        'total_message_count DESC' // default to frequency
      }
    `
    
    db.all(query, [], (err: any, rows: any) => {
      if (err) {
        logger.error('[Email Filtering] Database query failed:', err)
        return res.status(500).json({
          success: false,
          error: 'Database query failed'
        })
      }
      
      logger.info(`[Email Filtering] Found ${rows.length} unique email addresses`)
      
      res.json({
        success: true,
        data: {
          emails: rows || [],
          sortBy: sortBy,
          totalCount: rows ? rows.length : 0
        }
      })
      
      db.close()
    })
    
  } catch (error) {
    logger.error('[Email Filtering] Failed to get frequency analysis:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get frequency analysis'
    })
  }
})

// GET /api/email-filtering/patterns - Get active filter patterns
router.get('/patterns', async (req, res) => {
  try {
    logger.info('[Email Filtering] Getting active patterns (placeholder)')
    
    res.json({
      success: true,
      data: [] // Empty patterns array
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to get patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get patterns'
    })
  }
})

// POST /api/email-filtering/patterns - Add filter patterns
router.post('/patterns', async (req, res) => {
  try {
    const { patterns } = req.body
    logger.info(`[Email Filtering] Adding ${patterns?.length || 0} filter patterns (placeholder)`)
    
    res.json({
      success: true,
      data: patterns || []
    })
  } catch (error) {
    logger.error('[Email Filtering] Failed to add patterns:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add patterns'
    })
  }
})

// GET /api/email-filtering/stats - Get filtering statistics
router.get('/stats', async (req, res) => {
  try {
    logger.info('[Email Filtering] Getting filtering statistics (placeholder)')
    
    res.json({
      success: true,
      data: {
        unique_addresses: 0,
        unique_domains: 0,
        total_messages: 0,
        active_patterns: 0
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

export default router