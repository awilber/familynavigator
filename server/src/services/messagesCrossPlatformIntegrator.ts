import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface UnifiedContact {
  id: string // Unique cross-platform identifier
  messagesContact?: MessagesContact
  gmailContact?: GmailContact
  matchedIdentifiers: string[]
  confidence: number // 0-1 matching confidence
  primaryIdentifier: string
  displayName: string
  communicationChannels: CommunicationChannel[]
  totalInteractions: number
  lastInteraction: Date
  relationshipScore: number
}

interface MessagesContact {
  handleId: number
  identifier: string
  normalizedPhone?: string
  service: string
  messageCount: number
  lastSeen: Date | null
}

interface GmailContact {
  emailAddress: string
  displayName?: string
  emailCount: number
  lastSeen: Date | null
}

interface CommunicationChannel {
  type: 'messages' | 'email'
  identifier: string
  messageCount: number
  lastActivity: Date | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'rarely'
}

interface UnifiedConversation {
  id: string
  participants: UnifiedContact[]
  messagesThread?: MessagesThreadInfo
  emailThread?: EmailThreadInfo
  totalCommunications: number
  timeSpan: { start: Date, end: Date }
  communicationMix: {
    messagesCount: number
    emailCount: number
    messagesPercentage: number
    emailPercentage: number
  }
  relationship: RelationshipInsight
}

interface MessagesThreadInfo {
  chatId: number
  messageCount: number
  service: string
}

interface EmailThreadInfo {
  threadCount: number
  emailCount: number
  lastSubject?: string
}

interface RelationshipInsight {
  type: 'family' | 'friend' | 'professional' | 'legal' | 'business' | 'unknown'
  confidence: number
  indicators: string[]
  communicationPattern: 'formal' | 'casual' | 'mixed'
  priority: 'high' | 'medium' | 'low'
}

interface ContactMatchingOptions {
  phoneNumberFuzzyMatching: boolean
  emailDomainMatching: boolean
  nameBasedMatching: boolean
  minimumConfidence: number
}

export class MessagesCrossPlatformIntegrator {
  private dbPath: string
  private defaultMatchingOptions: ContactMatchingOptions = {
    phoneNumberFuzzyMatching: true,
    emailDomainMatching: false,
    nameBasedMatching: true,
    minimumConfidence: 0.7
  }

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async unifyContacts(
    gmailContacts?: GmailContact[], 
    options?: Partial<ContactMatchingOptions>
  ): Promise<UnifiedContact[]> {
    console.log('[Integration] Starting cross-platform contact unification')
    
    const opts = { ...this.defaultMatchingOptions, ...options }
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get all Messages contacts
      const messagesContacts = await this.getMessagesContacts(db)
      
      // Create unified contact list
      const unifiedContacts: UnifiedContact[] = []
      const processedGmailContacts = new Set<string>()

      // Process Messages contacts first
      for (const msgContact of messagesContacts) {
        const unified: UnifiedContact = {
          id: `messages_${msgContact.handleId}`,
          messagesContact: msgContact,
          matchedIdentifiers: [msgContact.identifier],
          confidence: 1.0,
          primaryIdentifier: msgContact.identifier,
          displayName: this.extractDisplayName(msgContact.identifier),
          communicationChannels: [{
            type: 'messages',
            identifier: msgContact.identifier,
            messageCount: msgContact.messageCount,
            lastActivity: msgContact.lastSeen,
            frequency: this.calculateFrequency(msgContact.messageCount)
          }],
          totalInteractions: msgContact.messageCount,
          lastInteraction: msgContact.lastSeen || new Date(0),
          relationshipScore: this.calculateRelationshipScore(msgContact)
        }

        // Try to match with Gmail contacts
        if (gmailContacts) {
          const gmailMatch = this.findGmailMatch(msgContact, gmailContacts, opts)
          if (gmailMatch) {
            unified.gmailContact = gmailMatch.contact
            unified.confidence = gmailMatch.confidence
            unified.matchedIdentifiers.push(gmailMatch.contact.emailAddress)
            unified.id = `unified_${msgContact.handleId}_${gmailMatch.contact.emailAddress.replace('@', '_at_')}`
            
            // Add Gmail communication channel
            unified.communicationChannels.push({
              type: 'email',
              identifier: gmailMatch.contact.emailAddress,
              messageCount: gmailMatch.contact.emailCount,
              lastActivity: gmailMatch.contact.lastSeen,
              frequency: this.calculateFrequency(gmailMatch.contact.emailCount)
            })

            unified.totalInteractions += gmailMatch.contact.emailCount
            if (gmailMatch.contact.lastSeen && gmailMatch.contact.lastSeen > unified.lastInteraction) {
              unified.lastInteraction = gmailMatch.contact.lastSeen
            }

            processedGmailContacts.add(gmailMatch.contact.emailAddress)
          }
        }

        unifiedContacts.push(unified)
      }

      // Add remaining unmatched Gmail contacts
      if (gmailContacts) {
        for (const gmailContact of gmailContacts) {
          if (!processedGmailContacts.has(gmailContact.emailAddress)) {
            const unified: UnifiedContact = {
              id: `gmail_${gmailContact.emailAddress.replace('@', '_at_')}`,
              gmailContact: gmailContact,
              matchedIdentifiers: [gmailContact.emailAddress],
              confidence: 1.0,
              primaryIdentifier: gmailContact.emailAddress,
              displayName: gmailContact.displayName || this.extractDisplayName(gmailContact.emailAddress),
              communicationChannels: [{
                type: 'email',
                identifier: gmailContact.emailAddress,
                messageCount: gmailContact.emailCount,
                lastActivity: gmailContact.lastSeen,
                frequency: this.calculateFrequency(gmailContact.emailCount)
              }],
              totalInteractions: gmailContact.emailCount,
              lastInteraction: gmailContact.lastSeen || new Date(0),
              relationshipScore: this.calculateGmailRelationshipScore(gmailContact)
            }

            unifiedContacts.push(unified)
          }
        }
      }

      await db.close()

      // Sort by relationship score and total interactions
      return unifiedContacts.sort((a, b) => {
        const aScore = a.relationshipScore * 0.6 + (a.totalInteractions / 1000) * 0.4
        const bScore = b.relationshipScore * 0.6 + (b.totalInteractions / 1000) * 0.4
        return bScore - aScore
      })

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async getMessagesContacts(db: any): Promise<MessagesContact[]> {
    const contacts = await db.all(`
      SELECT 
        h.ROWID as handleId,
        h.id as identifier,
        h.uncanonicalized_id,
        h.service,
        COUNT(DISTINCT cmj.message_id) as messageCount,
        MAX(m.date) as lastSeen
      FROM handle h
      LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
      LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
      LEFT JOIN message m ON cmj.message_id = m.ROWID
      GROUP BY h.ROWID
      HAVING messageCount > 0
      ORDER BY messageCount DESC
    `)

    return contacts.map((contact: any) => ({
      handleId: contact.handleId,
      identifier: contact.identifier,
      normalizedPhone: this.normalizePhoneNumber(contact.identifier),
      service: contact.service || 'unknown',
      messageCount: contact.messageCount || 0,
      lastSeen: contact.lastSeen ? this.convertAppleTimestamp(contact.lastSeen) : null
    }))
  }

  private findGmailMatch(
    msgContact: MessagesContact, 
    gmailContacts: GmailContact[], 
    options: ContactMatchingOptions
  ): { contact: GmailContact, confidence: number } | null {
    let bestMatch: { contact: GmailContact, confidence: number } | null = null

    for (const gmailContact of gmailContacts) {
      let confidence = 0

      // Phone number matching (if Messages contact is a phone number)
      if (options.phoneNumberFuzzyMatching && msgContact.normalizedPhone) {
        const emailLocal = gmailContact.emailAddress.split('@')[0]
        const phoneDigits = msgContact.normalizedPhone.replace(/\D/g, '')
        
        // Check if email local part contains phone number
        if (emailLocal.includes(phoneDigits.slice(-4)) || emailLocal.includes(phoneDigits.slice(-7))) {
          confidence += 0.6
        }
      }

      // Email matching (if Messages contact is an email)
      if (msgContact.identifier.includes('@')) {
        if (msgContact.identifier.toLowerCase() === gmailContact.emailAddress.toLowerCase()) {
          confidence = 1.0 // Exact match
        } else if (options.emailDomainMatching) {
          const msgDomain = msgContact.identifier.split('@')[1]
          const gmailDomain = gmailContact.emailAddress.split('@')[1]
          if (msgDomain === gmailDomain) {
            confidence += 0.4
          }
        }
      }

      // Name-based matching
      if (options.nameBasedMatching && gmailContact.displayName) {
        const msgDisplayName = this.extractDisplayName(msgContact.identifier)
        const similarity = this.calculateNameSimilarity(msgDisplayName, gmailContact.displayName)
        confidence += similarity * 0.5
      }

      if (confidence >= options.minimumConfidence && confidence > (bestMatch?.confidence || 0)) {
        bestMatch = { contact: gmailContact, confidence }
      }
    }

    return bestMatch
  }

  private normalizePhoneNumber(identifier: string): string | null {
    // Remove all non-digits
    const digits = identifier.replace(/\D/g, '')
    
    if (digits.length < 10) return null
    
    // Handle US numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      return '+1' + digits.slice(1)
    } else if (digits.length === 10) {
      return '+1' + digits
    }
    
    return '+' + digits
  }

  private extractDisplayName(identifier: string): string {
    if (identifier.includes('@')) {
      return identifier.split('@')[0].replace(/[._]/g, ' ').trim()
    }
    
    // For phone numbers, return as-is or format nicely
    if (/^\+?[\d\s\-\(\)]+$/.test(identifier)) {
      return this.formatPhoneNumber(identifier)
    }
    
    return identifier
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
      const local = digits.slice(1)
      return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
    }
    
    return phone
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = name1.toLowerCase().trim()
    const clean2 = name2.toLowerCase().trim()
    
    if (clean1 === clean2) return 1.0
    
    // Simple similarity check - could be enhanced with more sophisticated algorithms
    const words1 = clean1.split(/\s+/)
    const words2 = clean2.split(/\s+/)
    
    let matches = 0
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matches++
          break
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length)
  }

  private calculateFrequency(messageCount: number): CommunicationChannel['frequency'] {
    if (messageCount > 365) return 'daily'      // More than 1 per day average
    if (messageCount > 52) return 'weekly'      // More than 1 per week average  
    if (messageCount > 12) return 'monthly'     // More than 1 per month average
    return 'rarely'
  }

  private calculateRelationshipScore(contact: MessagesContact): number {
    let score = 0
    
    // Message frequency contribution
    score += Math.min(contact.messageCount / 100, 5) // Max 5 points for frequency
    
    // Recency contribution
    if (contact.lastSeen) {
      const daysAgo = (Date.now() - contact.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo < 30) score += 3
      else if (daysAgo < 90) score += 2
      else if (daysAgo < 365) score += 1
    }
    
    // Service type contribution (iMessage typically more personal)
    if (contact.service === 'iMessage') score += 2
    else if (contact.service === 'SMS') score += 1
    
    return Math.min(score, 10) // Cap at 10
  }

  private calculateGmailRelationshipScore(contact: GmailContact): number {
    let score = 0
    
    // Email frequency contribution
    score += Math.min(contact.emailCount / 50, 4) // Max 4 points for frequency
    
    // Recency contribution
    if (contact.lastSeen) {
      const daysAgo = (Date.now() - contact.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo < 30) score += 2
      else if (daysAgo < 90) score += 1
    }
    
    // Domain analysis for relationship type
    const domain = contact.emailAddress.split('@')[1]
    if (['gmail.com', 'yahoo.com', 'hotmail.com', 'icloud.com'].includes(domain)) {
      score += 1 // Personal email providers
    }
    
    return Math.min(score, 8) // Cap at 8 (slightly lower than Messages)
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Convert Apple nanosecond timestamp to JavaScript Date
    const appleEpochOffset = 978307200000 // milliseconds between Unix and Apple epochs
    return new Date(timestamp / 1000000 + appleEpochOffset)
  }

  async generateUnifiedTimelineData(unifiedContacts: UnifiedContact[]): Promise<{
    timelineEntries: Array<{
      date: Date
      type: 'message' | 'email'
      count: number
      topContacts: string[]
    }>
    summary: {
      totalCommunications: number
      messagesRatio: number
      emailRatio: number
      mostActivePeriod: string
      crossPlatformContacts: number
    }
  }> {
    console.log('[Integration] Generating unified timeline data')

    // This would integrate with actual Gmail data when available
    const messagesCount = unifiedContacts.reduce((sum, contact) => {
      const msgChannel = contact.communicationChannels.find(c => c.type === 'messages')
      return sum + (msgChannel?.messageCount || 0)
    }, 0)

    const emailCount = unifiedContacts.reduce((sum, contact) => {
      const emailChannel = contact.communicationChannels.find(c => c.type === 'email')
      return sum + (emailChannel?.messageCount || 0)
    }, 0)

    const crossPlatformContacts = unifiedContacts.filter(contact => 
      contact.communicationChannels.length > 1
    ).length

    const totalCommunications = messagesCount + emailCount

    return {
      timelineEntries: [], // Would be populated with actual timeline data
      summary: {
        totalCommunications,
        messagesRatio: totalCommunications > 0 ? messagesCount / totalCommunications : 0,
        emailRatio: totalCommunications > 0 ? emailCount / totalCommunications : 0,
        mostActivePeriod: 'Recent months', // Would be calculated from actual data
        crossPlatformContacts
      }
    }
  }

  getDataStructuresForLegalExport(): {
    contactSchema: object
    conversationSchema: object
    timelineSchema: object
  } {
    return {
      contactSchema: {
        id: 'string',
        displayName: 'string',
        identifiers: ['string'],
        communicationChannels: [{
          type: 'messages|email',
          identifier: 'string',
          messageCount: 'number',
          dateRange: { start: 'Date', end: 'Date' }
        }],
        relationship: {
          type: 'string',
          confidence: 'number',
          legalRelevance: 'high|medium|low'
        }
      },
      conversationSchema: {
        id: 'string',
        participants: ['contactId'],
        communicationType: 'messages|email|mixed',
        messageCount: 'number',
        timeSpan: { start: 'Date', end: 'Date' },
        legalSignificance: 'number',
        exportMetadata: {
          chainOfCustody: 'string',
          verificationHash: 'string'
        }
      },
      timelineSchema: {
        entries: [{
          timestamp: 'Date',
          type: 'message|email',
          participants: ['contactId'],
          contentSummary: 'string',
          attachmentCount: 'number',
          legalAnnotations: ['string']
        }],
        verificationInfo: {
          generatedDate: 'Date',
          sourceDatabase: 'string',
          integrityVerified: 'boolean'
        }
      }
    }
  }
}