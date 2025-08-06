import { databaseService } from '../database'
import { logger } from '../../utils/logger'

export interface EmailAddressMetrics {
  email_address: string
  domain: string
  total_message_count: number
  incoming_count: number
  outgoing_count: number
  first_seen: Date
  last_seen: Date
  recent_activity_score: number
  communication_frequency: 'daily' | 'weekly' | 'monthly' | 'sporadic'
  legal_importance_score: number
  display_name?: string
  contact_id?: number
}

export interface FrequencyAnalysisResult {
  topAddresses: EmailAddressMetrics[]
  topDomains: { domain: string; count: number; addresses: string[] }[]
  recentlyActive: EmailAddressMetrics[]
  legallyRelevant: EmailAddressMetrics[]
  sortBy: 'frequency' | 'alphabetical' | 'recent' | 'legal_relevance'
}

export class EmailAddressAnalyticsService {
  
  /**
   * Analyze all existing communications to build email address frequency data
   */
  async buildEmailAddressAnalytics(): Promise<void> {
    const startTime = Date.now()
    logger.info('[Email Analytics] Starting comprehensive email address analysis')

    try {
      const db = await databaseService.getDatabase()
      
      // Get all unique email addresses from communications
      const emailData = await db.all(`
        WITH email_extraction AS (
          -- Extract FROM addresses
          SELECT 
            sender_email as email,
            'outgoing' as direction,
            timestamp,
            contact_name as display_name,
            contact_id,
            id as comm_id
          FROM communications 
          WHERE sender_email IS NOT NULL AND sender_email != ''
          
          UNION ALL
          
          -- Extract TO addresses from JSON metadata
          SELECT 
            json_extract(to_addr.value, '$') as email,
            'incoming' as direction,
            timestamp,
            NULL as display_name,
            NULL as contact_id,
            id as comm_id
          FROM communications c,
          json_each(json_extract(c.metadata, '$.to')) as to_addr
          WHERE json_extract(c.metadata, '$.to') IS NOT NULL
          
          UNION ALL
          
          -- Extract CC addresses
          SELECT 
            json_extract(cc_addr.value, '$') as email,
            'cc' as direction,
            timestamp,
            NULL as display_name,
            NULL as contact_id,
            id as comm_id
          FROM communications c,
          json_each(json_extract(c.metadata, '$.cc')) as cc_addr
          WHERE json_extract(c.metadata, '$.cc') IS NOT NULL
        ),
        address_stats AS (
          SELECT 
            LOWER(TRIM(email)) as email_address,
            SUBSTR(LOWER(TRIM(email)), INSTR(LOWER(TRIM(email)), '@') + 1) as domain,
            COUNT(*) as total_messages,
            SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming_count,
            SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing_count,
            MIN(timestamp) as first_seen,
            MAX(timestamp) as last_seen,
            MAX(display_name) as display_name,
            MAX(contact_id) as contact_id,
            -- Recent activity score (higher for recent communications)
            AVG(
              CASE 
                WHEN timestamp > datetime('now', '-7 days') THEN 10.0
                WHEN timestamp > datetime('now', '-30 days') THEN 5.0  
                WHEN timestamp > datetime('now', '-90 days') THEN 2.0
                ELSE 1.0
              END
            ) as recent_activity_score
          FROM email_extraction
          WHERE email IS NOT NULL 
            AND email != '' 
            AND email LIKE '%@%'
            AND LENGTH(email) > 5
          GROUP BY LOWER(TRIM(email))
        )
        SELECT 
          email_address,
          domain,
          total_messages,
          incoming_count,
          outgoing_count,
          first_seen,
          last_seen,
          recent_activity_score,
          display_name,
          contact_id,
          -- Communication frequency classification
          CASE 
            WHEN total_messages >= 30 AND last_seen > datetime('now', '-7 days') THEN 'daily'
            WHEN total_messages >= 10 AND last_seen > datetime('now', '-14 days') THEN 'weekly' 
            WHEN total_messages >= 3 AND last_seen > datetime('now', '-60 days') THEN 'monthly'
            ELSE 'sporadic'
          END as communication_frequency,
          -- Legal importance scoring based on frequency and keywords
          (
            (total_messages * 0.1) + 
            (recent_activity_score * 0.2) +
            CASE 
              WHEN domain LIKE '%law%' OR domain LIKE '%legal%' OR domain LIKE '%court%' THEN 5.0
              WHEN domain LIKE '%gmail.com%' OR domain LIKE '%yahoo.com%' THEN 1.0
              ELSE 2.0
            END
          ) / 10.0 as legal_importance_score
        FROM address_stats
        WHERE total_messages > 0
        ORDER BY total_messages DESC, recent_activity_score DESC
      `)

      logger.info(`[Email Analytics] Found ${emailData.length} unique email addresses`)

      // Clear existing analytics and rebuild
      await db.run('DELETE FROM email_address_analytics')
      
      // Insert analyzed data
      const insertStmt = await db.prepare(`
        INSERT INTO email_address_analytics (
          email_address, domain, total_message_count, incoming_count, outgoing_count,
          first_seen, last_seen, recent_activity_score, communication_frequency,
          contact_id, display_name, legal_importance_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const address of emailData) {
        await insertStmt.run(
          address.email_address,
          address.domain,
          address.total_messages,
          address.incoming_count,
          address.outgoing_count,
          address.first_seen,
          address.last_seen,
          address.recent_activity_score,
          address.communication_frequency,
          address.contact_id,
          address.display_name,
          address.legal_importance_score
        )
      }

      await insertStmt.finalize()

      const processingTime = Date.now() - startTime
      logger.info(`[Email Analytics] Analysis completed in ${processingTime}ms - ${emailData.length} addresses analyzed`)

    } catch (error) {
      logger.error('[Email Analytics] Failed to build analytics:', error)
      throw error
    }
  }

  /**
   * Get email addresses sorted by frequency for UI selection
   */
  async getFrequencyAnalysis(
    sortBy: 'frequency' | 'alphabetical' | 'recent' | 'legal_relevance' = 'frequency',
    limit: number = 50
  ): Promise<FrequencyAnalysisResult> {
    try {
      const db = await databaseService.getDatabase()

      // Build sort clause
      const sortClauses = {
        frequency: 'total_message_count DESC, recent_activity_score DESC',
        alphabetical: 'email_address ASC',
        recent: 'recent_activity_score DESC, last_seen DESC',
        legal_relevance: 'legal_importance_score DESC, total_message_count DESC'
      }

      const sortClause = sortClauses[sortBy]

      // Get top addresses
      const topAddresses = await db.all(`
        SELECT 
          email_address,
          domain,
          total_message_count,
          incoming_count,
          outgoing_count,
          first_seen,
          last_seen,
          recent_activity_score,
          communication_frequency,
          legal_importance_score,
          display_name,
          contact_id
        FROM email_address_analytics 
        ORDER BY ${sortClause}
        LIMIT ?
      `, [limit])

      // Get top domains
      const topDomains = await db.all(`
        SELECT 
          domain,
          COUNT(*) as count,
          SUM(total_message_count) as total_messages,
          GROUP_CONCAT(email_address, ', ') as addresses
        FROM email_address_analytics 
        GROUP BY domain
        ORDER BY SUM(total_message_count) DESC
        LIMIT 20
      `)

      // Get recently active addresses
      const recentlyActive = await db.all(`
        SELECT 
          email_address,
          domain,
          total_message_count,
          incoming_count,
          outgoing_count,
          first_seen,
          last_seen,
          recent_activity_score,
          communication_frequency,
          legal_importance_score,
          display_name,
          contact_id
        FROM email_address_analytics 
        WHERE recent_activity_score > 2.0
        ORDER BY recent_activity_score DESC, last_seen DESC
        LIMIT 25
      `)

      // Get legally relevant addresses
      const legallyRelevant = await db.all(`
        SELECT 
          email_address,
          domain,
          total_message_count,
          incoming_count,
          outgoing_count,
          first_seen,
          last_seen,
          recent_activity_score,
          communication_frequency,
          legal_importance_score,
          display_name,
          contact_id
        FROM email_address_analytics 
        WHERE legal_importance_score > 3.0
        ORDER BY legal_importance_score DESC
        LIMIT 25
      `)

      return {
        topAddresses: topAddresses.map(addr => ({
          ...addr,
          first_seen: new Date(addr.first_seen),
          last_seen: new Date(addr.last_seen)
        })),
        topDomains: topDomains.map(domain => ({
          domain: domain.domain,
          count: domain.count,
          addresses: domain.addresses.split(', ').slice(0, 5) // Limit for display
        })),
        recentlyActive: recentlyActive.map(addr => ({
          ...addr,
          first_seen: new Date(addr.first_seen),
          last_seen: new Date(addr.last_seen)
        })),
        legallyRelevant: legallyRelevant.map(addr => ({
          ...addr,
          first_seen: new Date(addr.first_seen),
          last_seen: new Date(addr.last_seen)
        })),
        sortBy
      }

    } catch (error) {
      logger.error('[Email Analytics] Failed to get frequency analysis:', error)
      throw error
    }
  }

  /**
   * Smart pattern detection from email addresses
   */
  async suggestFilterPatterns(): Promise<Array<{
    pattern: string
    patternType: 'exact' | 'domain' | 'wildcard'
    confidence: number
    reasoning: string
    estimatedMatches: number
  }>> {
    try {
      const db = await databaseService.getDatabase()
      const suggestions = []

      // Suggest high-frequency domains
      const topDomains = await db.all(`
        SELECT 
          domain,
          COUNT(*) as address_count,
          SUM(total_message_count) as total_messages,
          AVG(legal_importance_score) as avg_legal_score
        FROM email_address_analytics 
        WHERE total_message_count > 5
        GROUP BY domain
        HAVING COUNT(*) >= 2 OR SUM(total_message_count) > 20
        ORDER BY SUM(total_message_count) DESC
        LIMIT 10
      `)

      for (const domain of topDomains) {
        suggestions.push({
          pattern: `@${domain.domain}`,
          patternType: 'domain' as const,
          confidence: Math.min(0.9, (domain.total_messages / 100) + (domain.avg_legal_score / 10)),
          reasoning: `High activity domain: ${domain.total_messages} messages from ${domain.address_count} addresses`,
          estimatedMatches: domain.total_messages
        })
      }

      // Suggest individual high-importance addresses
      const topAddresses = await db.all(`
        SELECT 
          email_address,
          total_message_count,
          legal_importance_score,
          communication_frequency
        FROM email_address_analytics 
        WHERE legal_importance_score > 5.0 OR total_message_count > 50
        ORDER BY legal_importance_score DESC, total_message_count DESC
        LIMIT 15
      `)

      for (const address of topAddresses) {
        suggestions.push({
          pattern: address.email_address,
          patternType: 'exact' as const,
          confidence: Math.min(0.95, address.legal_importance_score / 10),
          reasoning: `High-importance contact: ${address.total_message_count} messages, ${address.communication_frequency} frequency`,
          estimatedMatches: address.total_message_count
        })
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence)

    } catch (error) {
      logger.error('[Email Analytics] Failed to suggest patterns:', error)
      throw error
    }
  }

  /**
   * Update analytics when new messages are processed
   */
  async updateAnalyticsForMessage(messageId: number, senderEmail: string, recipientEmails: string[]): Promise<void> {
    try {
      const db = await databaseService.getDatabase()
      const timestamp = new Date().toISOString()

      // Update or insert sender analytics
      if (senderEmail) {
        await db.run(`
          INSERT OR REPLACE INTO email_address_analytics (
            email_address, domain, total_message_count, outgoing_count, last_seen
          ) VALUES (
            ?, 
            ?,
            COALESCE((SELECT total_message_count FROM email_address_analytics WHERE email_address = ?), 0) + 1,
            COALESCE((SELECT outgoing_count FROM email_address_analytics WHERE email_address = ?), 0) + 1,
            ?
          )
        `, [
          senderEmail.toLowerCase(),
          senderEmail.substring(senderEmail.indexOf('@') + 1).toLowerCase(),
          senderEmail.toLowerCase(),
          senderEmail.toLowerCase(),
          timestamp
        ])
      }

      // Update recipient analytics
      for (const recipient of recipientEmails) {
        if (recipient && recipient.includes('@')) {
          await db.run(`
            INSERT OR REPLACE INTO email_address_analytics (
              email_address, domain, total_message_count, incoming_count, last_seen
            ) VALUES (
              ?, 
              ?,
              COALESCE((SELECT total_message_count FROM email_address_analytics WHERE email_address = ?), 0) + 1,
              COALESCE((SELECT incoming_count FROM email_address_analytics WHERE email_address = ?), 0) + 1,
              ?
            )
          `, [
            recipient.toLowerCase(),
            recipient.substring(recipient.indexOf('@') + 1).toLowerCase(),
            recipient.toLowerCase(),
            recipient.toLowerCase(),
            timestamp
          ])
        }
      }

    } catch (error) {
      logger.error(`[Email Analytics] Failed to update analytics for message ${messageId}:`, error)
      // Non-blocking - don't throw
    }
  }
}

export const emailAnalyticsService = new EmailAddressAnalyticsService()