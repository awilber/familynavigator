import { databaseService } from '../database'
import { logger } from '../../utils/logger'
import crypto from 'crypto'

export interface FilterPattern {
  id?: number
  pattern: string
  patternType: 'exact' | 'domain' | 'wildcard' | 'regex'
  patternHash: string
  appliesToFields: string[]
  isActive: boolean
  priority: number
  autoDetected: boolean
  confidenceScore: number
  detectionMethod: string
  matchCount: number
  lastMatchedAt?: Date
  legalRelevance: 'high' | 'medium' | 'low'
  retentionPolicy: string
  caseReference?: string
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy?: string
}

export interface PatternMatchResult {
  matches: boolean
  matchedBy: FilterPattern[]
  matchDetails: Array<{
    pattern: FilterPattern
    field: string
    matchedValue: string
    confidence: number
  }>
}

export class EmailPatternMatcher {
  
  /**
   * Smart pattern detection - automatically determine pattern type
   */
  static detectPatternType(pattern: string): 'exact' | 'domain' | 'wildcard' | 'regex' {
    // Remove whitespace
    const cleanPattern = pattern.trim()
    
    // Domain pattern: starts with @ or ends with domain-like structure
    if (cleanPattern.startsWith('@') || 
        (cleanPattern.includes('.') && !cleanPattern.includes('*') && 
         !cleanPattern.includes('[') && !cleanPattern.includes('('))) {
      return 'domain'
    }
    
    // Wildcard pattern: contains * or ?
    if (cleanPattern.includes('*') || cleanPattern.includes('?')) {
      return 'wildcard'
    }
    
    // Regex pattern: contains regex special characters
    if (cleanPattern.includes('[') || cleanPattern.includes('(') || 
        cleanPattern.includes('^') || cleanPattern.includes('$') ||
        cleanPattern.includes('\\')) {
      return 'regex'
    }
    
    // Default to exact match
    return 'exact'
  }

  /**
   * Create pattern hash for deduplication
   */
  static createPatternHash(pattern: string, patternType: string, fields: string[]): string {
    const content = `${pattern}|${patternType}|${fields.join(',')}`
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Normalize email address for matching
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }

  /**
   * Check if email matches a specific pattern
   */
  static matchesPattern(email: string, pattern: FilterPattern): { matches: boolean; confidence: number } {
    const normalizedEmail = this.normalizeEmail(email)
    const normalizedPattern = pattern.pattern.toLowerCase().trim()
    
    try {
      switch (pattern.patternType) {
        case 'exact':
          return {
            matches: normalizedEmail === normalizedPattern,
            confidence: normalizedEmail === normalizedPattern ? 1.0 : 0.0
          }
          
        case 'domain':
          const domain = normalizedPattern.startsWith('@') 
            ? normalizedPattern.substring(1)
            : normalizedPattern
          const emailDomain = normalizedEmail.substring(normalizedEmail.indexOf('@') + 1)
          return {
            matches: emailDomain === domain,
            confidence: emailDomain === domain ? 0.95 : 0.0
          }
          
        case 'wildcard':
          // Convert wildcard to regex
          let regexPattern = normalizedPattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
          regexPattern = '^' + regexPattern + '$'
          
          const wildcardRegex = new RegExp(regexPattern, 'i')
          const wildcardMatches = wildcardRegex.test(normalizedEmail)
          return {
            matches: wildcardMatches,
            confidence: wildcardMatches ? 0.9 : 0.0
          }
          
        case 'regex':
          const regex = new RegExp(normalizedPattern, 'i')
          const regexMatches = regex.test(normalizedEmail)
          return {
            matches: regexMatches,
            confidence: regexMatches ? 0.85 : 0.0
          }
          
        default:
          return { matches: false, confidence: 0.0 }
      }
    } catch (error) {
      logger.warn(`[Pattern Matcher] Invalid pattern: ${pattern.pattern}`, error)
      return { matches: false, confidence: 0.0 }
    }
  }

  /**
   * Extract all email addresses from a message
   */
  static extractEmailsFromMessage(message: {
    sender_email?: string
    metadata?: {
      to?: string[]
      cc?: string[]
      bcc?: string[]
    }
  }): { field: string; email: string }[] {
    const emails: { field: string; email: string }[] = []
    
    // From field
    if (message.sender_email) {
      emails.push({ field: 'from', email: message.sender_email })
    }
    
    // To field
    if (message.metadata?.to) {
      for (const email of message.metadata.to) {
        if (email && email.includes('@')) {
          emails.push({ field: 'to', email })
        }
      }
    }
    
    // CC field
    if (message.metadata?.cc) {
      for (const email of message.metadata.cc) {
        if (email && email.includes('@')) {
          emails.push({ field: 'cc', email })
        }
      }
    }
    
    // BCC field
    if (message.metadata?.bcc) {
      for (const email of message.metadata.bcc) {
        if (email && email.includes('@')) {
          emails.push({ field: 'bcc', email })
        }
      }
    }
    
    return emails
  }

  private db: any = null
  
  constructor() {
    // Don't initialize database connection at construction time
  }

  private async ensureDatabase() {
    if (!this.db) {
      this.db = await databaseService.getDatabase()
    }
    return this.db
  }

  /**
   * Add or update a filter pattern
   */
  async addPattern(
    pattern: string, 
    options: {
      patternType?: 'exact' | 'domain' | 'wildcard' | 'regex'
      fields?: string[]
      priority?: number
      legalRelevance?: 'high' | 'medium' | 'low'
      caseReference?: string
      createdBy?: string
    } = {}
  ): Promise<FilterPattern> {
    const db = await this.ensureDatabase()
    
    const patternType = options.patternType || EmailPatternMatcher.detectPatternType(pattern)
    const fields = options.fields || ['from', 'to', 'cc', 'bcc']
    const patternHash = EmailPatternMatcher.createPatternHash(pattern, patternType, fields)
    
    // Check for existing pattern
    const existing = await db.get(
      'SELECT * FROM email_filter_patterns WHERE pattern_hash = ?',
      [patternHash]
    )
    
    if (existing) {
      logger.warn(`[Pattern Matcher] Pattern already exists: ${pattern}`)
      return this.formatPattern(existing)
    }
    
    // Insert new pattern
    const result = await db.run(`
      INSERT INTO email_filter_patterns (
        pattern, pattern_type, pattern_hash, applies_to_fields,
        is_active, priority, auto_detected, confidence_score,
        detection_method, legal_relevance, case_reference,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pattern,
      patternType,
      patternHash,
      JSON.stringify(fields),
      true,
      options.priority || 0,
      false,
      1.0,
      'user_input',
      options.legalRelevance || 'medium',
      options.caseReference || null,
      options.createdBy || 'system',
      options.createdBy || 'system'
    ])
    
    // Retrieve the created pattern
    const created = await db.get(
      'SELECT * FROM email_filter_patterns WHERE id = ?',
      [result.lastID]
    )
    
    logger.info(`[Pattern Matcher] Added new pattern: ${pattern} (ID: ${result.lastID})`)
    
    return this.formatPattern(created)
  }

  /**
   * Get all active filter patterns
   */
  async getActivePatterns(): Promise<FilterPattern[]> {
    const db = await this.ensureDatabase()
    
    const patterns = await db.all(`
      SELECT * FROM email_filter_patterns 
      WHERE is_active = true 
      ORDER BY priority DESC, created_at ASC
    `)
    
    return patterns.map((p: any) => this.formatPattern(p))
  }

  /**
   * Test if a message matches any active filters
   */
  async matchMessage(message: {
    sender_email?: string
    metadata?: {
      to?: string[]
      cc?: string[]  
      bcc?: string[]
    }
  }): Promise<PatternMatchResult> {
    const patterns = await this.getActivePatterns()
    const emails = EmailPatternMatcher.extractEmailsFromMessage(message)
    
    const matchedPatterns: FilterPattern[] = []
    const matchDetails: Array<{
      pattern: FilterPattern
      field: string
      matchedValue: string
      confidence: number
    }> = []
    
    for (const pattern of patterns) {
      for (const { field, email } of emails) {
        // Check if pattern applies to this field
        if (!pattern.appliesToFields.includes(field)) {
          continue
        }
        
        const matchResult = EmailPatternMatcher.matchesPattern(email, pattern)
        
        if (matchResult.matches) {
          if (!matchedPatterns.find(p => p.id === pattern.id)) {
            matchedPatterns.push(pattern)
          }
          
          matchDetails.push({
            pattern,
            field,
            matchedValue: email,
            confidence: matchResult.confidence
          })
          
          // Update pattern usage statistics
          await this.updatePatternUsage(pattern.id!)
        }
      }
    }
    
    return {
      matches: matchedPatterns.length > 0,
      matchedBy: matchedPatterns,
      matchDetails
    }
  }

  /**
   * Update pattern usage statistics
   */
  private async updatePatternUsage(patternId: number): Promise<void> {
    const db = await this.ensureDatabase()
    
    await db.run(`
      UPDATE email_filter_patterns 
      SET match_count = match_count + 1,
          last_matched_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [patternId])
  }

  /**
   * Remove a pattern
   */
  async removePattern(patternId: number, removedBy: string = 'system'): Promise<void> {
    const db = await this.ensureDatabase()
    
    // Instead of deleting, mark as inactive for audit trail
    await db.run(`
      UPDATE email_filter_patterns 
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ?
      WHERE id = ?
    `, [removedBy, patternId])
    
    logger.info(`[Pattern Matcher] Deactivated pattern ID: ${patternId}`)
  }

  /**
   * Format database pattern to interface
   */
  private formatPattern(dbPattern: any): FilterPattern {
    return {
      id: dbPattern.id,
      pattern: dbPattern.pattern,
      patternType: dbPattern.pattern_type,
      patternHash: dbPattern.pattern_hash,
      appliesToFields: JSON.parse(dbPattern.applies_to_fields || '["from","to","cc","bcc"]'),
      isActive: !!dbPattern.is_active,
      priority: dbPattern.priority || 0,
      autoDetected: !!dbPattern.auto_detected,
      confidenceScore: dbPattern.confidence_score || 1.0,
      detectionMethod: dbPattern.detection_method || 'unknown',
      matchCount: dbPattern.match_count || 0,
      lastMatchedAt: dbPattern.last_matched_at ? new Date(dbPattern.last_matched_at) : undefined,
      legalRelevance: dbPattern.legal_relevance || 'medium',
      retentionPolicy: dbPattern.retention_policy || 'permanent',
      caseReference: dbPattern.case_reference,
      createdAt: new Date(dbPattern.created_at),
      createdBy: dbPattern.created_by || 'system',
      updatedAt: new Date(dbPattern.updated_at || dbPattern.created_at),
      updatedBy: dbPattern.updated_by
    }
  }

  /**
   * Generate Gmail API query string from active patterns
   */
  async generateGmailQuery(): Promise<string> {
    const patterns = await this.getActivePatterns()
    
    const queryParts: string[] = []
    
    for (const pattern of patterns) {
      const queries: string[] = []
      
      for (const field of pattern.appliesToFields) {
        let fieldQuery = ''
        
        switch (field) {
          case 'from':
            fieldQuery = `from:${pattern.pattern}`
            break
          case 'to':
            fieldQuery = `to:${pattern.pattern}`
            break
          case 'cc':
            fieldQuery = `cc:${pattern.pattern}`
            break
          // Note: Gmail API doesn't support BCC searches
        }
        
        if (fieldQuery) {
          queries.push(fieldQuery)
        }
      }
      
      if (queries.length > 0) {
        queryParts.push(`(${queries.join(' OR ')})`)
      }
    }
    
    return queryParts.join(' OR ')
  }
}

export const emailPatternMatcher = new EmailPatternMatcher()