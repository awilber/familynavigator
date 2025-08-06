import { emailPatternMatcher, PatternMatchResult } from './patternMatcher'
import { emailAnalyticsService } from './addressAnalytics'
import { databaseService } from '../database'
import { logger } from '../../utils/logger'

export interface DualLayerFilterConfig {
  syncFiltering: {
    enabled: boolean
    optimizeApiCalls: boolean
    maxQueryLength: number
  }
  displayFiltering: {
    enabled: boolean
    cacheResults: boolean
  }
  auditLogging: {
    enabled: boolean
    logLevel: 'basic' | 'detailed'
  }
}

export interface FilterApplicationResult {
  shouldInclude: boolean
  matchDetails: PatternMatchResult
  appliedFilters: string[]
  processingTime: number
  cacheHit?: boolean
}

export class DualLayerEmailFilter {
  private config: DualLayerFilterConfig
  private matchCache = new Map<string, FilterApplicationResult>()
  
  constructor(config: Partial<DualLayerFilterConfig> = {}) {
    this.config = {
      syncFiltering: {
        enabled: true,
        optimizeApiCalls: true,
        maxQueryLength: 8000, // Gmail API limit is ~8192 chars
        ...config.syncFiltering
      },
      displayFiltering: {
        enabled: true,
        cacheResults: true,
        ...config.displayFiltering
      },
      auditLogging: {
        enabled: true,
        logLevel: 'detailed',
        ...config.auditLogging
      }
    }
  }

  /**
   * Layer 1: Generate optimized Gmail API query for sync-time filtering
   */
  async generateSyncQuery(additionalFilters: string[] = []): Promise<{
    query: string
    patternCount: number
    optimized: boolean
    estimatedReduction: number
  }> {
    try {
      if (!this.config.syncFiltering.enabled) {
        logger.info('[Dual Filter] Sync filtering disabled, returning empty query')
        return { query: '', patternCount: 0, optimized: false, estimatedReduction: 0 }
      }

      const baseQuery = await emailPatternMatcher.generateGmailQuery()
      const combinedQuery = [...additionalFilters, baseQuery].filter(q => q.trim()).join(' AND ')
      
      const patterns = await emailPatternMatcher.getActivePatterns()
      
      // Estimate filtering reduction based on pattern specificity
      const estimatedReduction = this.estimateFilterReduction(patterns)
      
      // Check if query is too long and needs optimization
      let optimized = false
      let finalQuery = combinedQuery
      
      if (this.config.syncFiltering.optimizeApiCalls && 
          combinedQuery.length > this.config.syncFiltering.maxQueryLength) {
        
        logger.warn(`[Dual Filter] Query too long (${combinedQuery.length} chars), optimizing`)
        
        // Prioritize high-priority patterns and merge similar ones
        finalQuery = await this.optimizeGmailQuery(patterns, additionalFilters)
        optimized = true
      }
      
      logger.info(`[Dual Filter] Generated sync query: ${patterns.length} patterns, ${finalQuery.length} chars`)
      
      return {
        query: finalQuery,
        patternCount: patterns.length,
        optimized,
        estimatedReduction
      }
    } catch (error) {
      logger.error('[Dual Filter] Failed to generate sync query:', error)
      throw error
    }
  }

  /**
   * Layer 2: Apply display-time filtering to messages
   */
  async applyDisplayFilter(
    message: {
      id?: number
      sender_email?: string
      metadata?: {
        to?: string[]
        cc?: string[]
        bcc?: string[]
      }
    },
    filterScope: 'analysis' | 'reporting' | 'display' = 'display'
  ): Promise<FilterApplicationResult> {
    const startTime = Date.now()
    
    try {
      if (!this.config.displayFiltering.enabled) {
        return {
          shouldInclude: true,
          matchDetails: { matches: true, matchedBy: [], matchDetails: [] },
          appliedFilters: [],
          processingTime: Date.now() - startTime
        }
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(message, filterScope)
      if (this.config.displayFiltering.cacheResults && this.matchCache.has(cacheKey)) {
        const cached = this.matchCache.get(cacheKey)!
        logger.debug(`[Dual Filter] Cache hit for message ${message.id}`)
        return { ...cached, cacheHit: true, processingTime: Date.now() - startTime }
      }

      // Apply pattern matching
      const matchResult = await emailPatternMatcher.matchMessage(message)
      
      // Determine if message should be included
      const shouldInclude = matchResult.matches
      
      // Get applied filter names
      const appliedFilters = matchResult.matchedBy.map(p => p.pattern)
      
      const result: FilterApplicationResult = {
        shouldInclude,
        matchDetails: matchResult,
        appliedFilters,
        processingTime: Date.now() - startTime,
        cacheHit: false
      }
      
      // Cache result if enabled
      if (this.config.displayFiltering.cacheResults) {
        this.matchCache.set(cacheKey, result)
        
        // Limit cache size to prevent memory issues
        if (this.matchCache.size > 10000) {
          const firstKey = this.matchCache.keys().next().value
          if (firstKey !== undefined) {
            this.matchCache.delete(firstKey)
          }
        }
      }
      
      // Log audit trail if enabled
      if (this.config.auditLogging.enabled) {
        await this.logFilterApplication(message, result, filterScope)
      }
      
      return result
      
    } catch (error) {
      logger.error(`[Dual Filter] Failed to apply display filter to message ${message.id}:`, error)
      
      // Return permissive result on error to avoid breaking functionality
      return {
        shouldInclude: true,
        matchDetails: { matches: false, matchedBy: [], matchDetails: [] },
        appliedFilters: [],
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Batch apply display filtering to multiple messages for performance
   */
  async batchApplyDisplayFilter(
    messages: Array<{
      id?: number
      sender_email?: string
      metadata?: any
    }>,
    filterScope: 'analysis' | 'reporting' | 'display' = 'display'
  ): Promise<Array<{ message: any; result: FilterApplicationResult }>> {
    const startTime = Date.now()
    logger.info(`[Dual Filter] Batch filtering ${messages.length} messages for ${filterScope}`)
    
    const results = []
    
    // Process in chunks to avoid overwhelming the system
    const chunkSize = 100
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize)
      
      const chunkResults = await Promise.all(
        chunk.map(async (message) => ({
          message,
          result: await this.applyDisplayFilter(message, filterScope)
        }))
      )
      
      results.push(...chunkResults)
    }
    
    const processingTime = Date.now() - startTime
    const includedCount = results.filter(r => r.result.shouldInclude).length
    
    logger.info(`[Dual Filter] Batch filtering complete: ${includedCount}/${messages.length} included (${processingTime}ms)`)
    
    return results
  }

  /**
   * Integration with Gmail sync service
   */
  async shouldSyncMessage(
    gmailMessage: {
      id: string
      threadId: string
      labelIds?: string[]
      snippet?: string
      payload?: any
    }
  ): Promise<boolean> {
    try {
      // Extract email addresses from Gmail message payload
      const extractedEmails = this.extractEmailsFromGmailPayload(gmailMessage.payload)
      
      const message = {
        sender_email: extractedEmails.from,
        metadata: {
          to: extractedEmails.to,
          cc: extractedEmails.cc,
          bcc: extractedEmails.bcc
        }
      }
      
      const filterResult = await this.applyDisplayFilter(message, 'analysis')
      
      // Update analytics when processing Gmail messages
      if (filterResult.shouldInclude && extractedEmails.from) {
        await emailAnalyticsService.updateAnalyticsForMessage(
          0, // Message ID not available yet
          extractedEmails.from,
          [...(extractedEmails.to || []), ...(extractedEmails.cc || [])]
        )
      }
      
      return filterResult.shouldInclude
      
    } catch (error) {
      logger.error(`[Dual Filter] Error checking Gmail message ${gmailMessage.id}:`, error)
      // Return true on error to be permissive
      return true
    }
  }

  /**
   * Clear filter cache
   */
  clearCache(): void {
    this.matchCache.clear()
    logger.info('[Dual Filter] Filter cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hitRate: number
    memoryUsage: number
  } {
    return {
      size: this.matchCache.size,
      hitRate: 0, // Could track this with counters
      memoryUsage: JSON.stringify([...this.matchCache]).length
    }
  }

  // Private helper methods

  private generateCacheKey(message: any, scope: string): string {
    const key = `${scope}:${message.sender_email || ''}:${JSON.stringify(message.metadata || {})}`
    return Buffer.from(key).toString('base64').substring(0, 50)
  }

  private extractEmailsFromGmailPayload(payload: any): {
    from: string
    to: string[]
    cc: string[]
    bcc: string[]
  } {
    const result: { from: string; to: string[]; cc: string[]; bcc: string[] } = { 
      from: '', 
      to: [], 
      cc: [], 
      bcc: [] 
    }
    
    if (!payload?.headers) return result
    
    for (const header of payload.headers) {
      const name = header.name.toLowerCase()
      const value = header.value || ''
      
      switch (name) {
        case 'from':
          result.from = this.extractEmailFromHeader(value)
          break
        case 'to':
          result.to = this.extractEmailsFromHeader(value)
          break
        case 'cc':
          result.cc = this.extractEmailsFromHeader(value)
          break
        case 'bcc':
          result.bcc = this.extractEmailsFromHeader(value)
          break
      }
    }
    
    return result
  }

  private extractEmailFromHeader(headerValue: string): string {
    const match = headerValue.match(/<([^>]+)>/) || headerValue.match(/([^\s,]+@[^\s,]+)/)
    return match ? match[1] : headerValue.trim()
  }

  private extractEmailsFromHeader(headerValue: string): string[] {
    if (!headerValue) return []
    
    const emails = []
    const emailRegex = /([^\s,<>]+@[^\s,<>]+)/g
    let match
    
    while ((match = emailRegex.exec(headerValue)) !== null) {
      emails.push(match[1])
    }
    
    return emails
  }

  private estimateFilterReduction(patterns: any[]): number {
    // Rough estimation based on pattern specificity
    // Exact patterns: 95% reduction per address
    // Domain patterns: 70% reduction per domain
    // Wildcards: 30% reduction
    
    let totalReduction = 0
    for (const pattern of patterns) {
      switch (pattern.patternType) {
        case 'exact':
          totalReduction += 95
          break
        case 'domain':
          totalReduction += 70
          break
        case 'wildcard':
          totalReduction += 30
          break
        default:
          totalReduction += 20
      }
    }
    
    return Math.min(95, totalReduction) // Cap at 95%
  }

  private async optimizeGmailQuery(patterns: any[], additionalFilters: string[]): Promise<string> {
    // Sort by priority and merge similar patterns
    const highPriorityPatterns = patterns
      .filter(p => p.legalRelevance === 'high' || p.matchCount > 10)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10) // Limit to top 10 patterns
    
    const optimizedQuery = await this.buildQueryFromPatterns(highPriorityPatterns)
    return [...additionalFilters, optimizedQuery].filter(q => q.trim()).join(' AND ')
  }

  private async buildQueryFromPatterns(patterns: any[]): Promise<string> {
    const queryParts = []
    
    for (const pattern of patterns) {
      const queries = []
      
      for (const field of pattern.appliesToFields) {
        if (field !== 'bcc') { // Gmail doesn't support BCC searches
          const fieldQuery = `${field}:${pattern.pattern}`
          queries.push(fieldQuery)
        }
      }
      
      if (queries.length > 0) {
        queryParts.push(`(${queries.join(' OR ')})`)
      }
    }
    
    return queryParts.join(' OR ')
  }

  private async logFilterApplication(
    message: any,
    result: FilterApplicationResult,
    scope: string
  ): Promise<void> {
    try {
      const db = await databaseService.getDatabase()
      
      if (this.config.auditLogging.logLevel === 'basic' && !result.shouldInclude) {
        // Only log filtered out messages in basic mode
        return
      }
      
      await db.run(`
        INSERT INTO filter_application_log (
          operation_type, applied_to_table, record_count_affected,
          matches_found, processing_time_ms, success,
          applied_by, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `${scope}_filter`,
        'communications',
        1,
        result.matchDetails.matchDetails.length,
        result.processingTime,
        true,
        'dual_layer_filter',
        `session_${Date.now()}`
      ])
      
    } catch (error) {
      logger.error('[Dual Filter] Failed to log filter application:', error)
      // Don't throw - logging failures shouldn't break filtering
    }
  }
}

export const dualLayerEmailFilter = new DualLayerEmailFilter()