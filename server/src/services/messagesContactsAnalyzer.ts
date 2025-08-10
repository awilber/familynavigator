import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface ContactInfo {
  id: number
  identifier: string
  displayName: string | null
  normalizedIdentifier: string
  type: 'phone' | 'email' | 'unknown'
  messageCount: number
  conversationCount: number
  firstSeen: Date | null
  lastSeen: Date | null
  isActive: boolean
  service: string | null
}

interface ContactStats {
  totalContacts: number
  phoneNumbers: number
  emailAddresses: number
  activeContacts: number
  topContacts: ContactInfo[]
  contactTypes: {
    individual: number
    group: number
    business: number
    unknown: number
  }
  serviceDistribution: {
    [service: string]: number
  }
}

export class MessagesContactsAnalyzer {
  private dbPath: string

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async analyzeContacts(): Promise<ContactStats> {
    console.log('[Contacts] Starting comprehensive contact analysis')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get all contacts with their message counts
      const contacts = await db.all(`
        SELECT 
          h.ROWID as id,
          h.id as identifier,
          h.uncanonicalized_id as uncanonicalized,
          h.service,
          COUNT(DISTINCT cmj.message_id) as messageCount,
          COUNT(DISTINCT cmj.chat_id) as conversationCount,
          MIN(m.date) as firstSeen,
          MAX(m.date) as lastSeen
        FROM handle h
        LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
        LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
        LEFT JOIN message m ON cmj.message_id = m.ROWID
        GROUP BY h.ROWID
        ORDER BY messageCount DESC
      `)

      const contactInfos: ContactInfo[] = contacts.map((contact: any) => ({
        id: contact.id,
        identifier: contact.identifier,
        displayName: contact.uncanonicalized || contact.identifier, // Use uncanonicalized as display name
        normalizedIdentifier: this.normalizeIdentifier(contact.identifier),
        type: this.detectIdentifierType(contact.identifier),
        messageCount: contact.messageCount || 0,
        conversationCount: contact.conversationCount || 0,
        firstSeen: contact.firstSeen ? this.convertAppleTimestamp(contact.firstSeen) : null,
        lastSeen: contact.lastSeen ? this.convertAppleTimestamp(contact.lastSeen) : null,
        isActive: (contact.messageCount || 0) >= 10,
        service: contact.service
      }))

      // Calculate statistics
      const totalContacts = contactInfos.length
      const phoneNumbers = contactInfos.filter(c => c.type === 'phone').length
      const emailAddresses = contactInfos.filter(c => c.type === 'email').length
      const activeContacts = contactInfos.filter(c => c.isActive).length
      const topContacts = contactInfos.slice(0, 20) // Top 20 by message count

      // Service distribution
      const serviceDistribution: { [service: string]: number } = {}
      contactInfos.forEach(contact => {
        const service = contact.service || 'Unknown'
        serviceDistribution[service] = (serviceDistribution[service] || 0) + 1
      })

      // Contact type analysis (simplified heuristic)
      const contactTypes = {
        individual: phoneNumbers + emailAddresses,
        group: 0, // Would need more complex analysis
        business: 0, // Would need pattern recognition
        unknown: totalContacts - phoneNumbers - emailAddresses
      }

      await db.close()

      return {
        totalContacts,
        phoneNumbers,
        emailAddresses,
        activeContacts,
        topContacts,
        contactTypes,
        serviceDistribution
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  async getContactDetails(contactId: number): Promise<ContactInfo | null> {
    console.log(`[Contacts] Getting details for contact: ${contactId}`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      const contact = await db.get(`
        SELECT 
          h.ROWID as id,
          h.id as identifier,
          h.uncanonicalized_id as uncanonicalized,
          h.service,
          COUNT(DISTINCT cmj.message_id) as messageCount,
          COUNT(DISTINCT cmj.chat_id) as conversationCount,
          MIN(m.date) as firstSeen,
          MAX(m.date) as lastSeen
        FROM handle h
        LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
        LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
        LEFT JOIN message m ON cmj.message_id = m.ROWID
        WHERE h.ROWID = ?
        GROUP BY h.ROWID
      `, [contactId])

      await db.close()

      if (!contact) {
        return null
      }

      return {
        id: contact.id,
        identifier: contact.identifier,
        displayName: contact.uncanonicalized || contact.identifier,
        normalizedIdentifier: this.normalizeIdentifier(contact.identifier),
        type: this.detectIdentifierType(contact.identifier),
        messageCount: contact.messageCount || 0,
        conversationCount: contact.conversationCount || 0,
        firstSeen: contact.firstSeen ? this.convertAppleTimestamp(contact.firstSeen) : null,
        lastSeen: contact.lastSeen ? this.convertAppleTimestamp(contact.lastSeen) : null,
        isActive: (contact.messageCount || 0) >= 10,
        service: contact.service
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private normalizeIdentifier(identifier: string): string {
    if (!identifier) return ''

    // Phone number normalization
    if (this.detectIdentifierType(identifier) === 'phone') {
      // Remove all non-digits
      const digitsOnly = identifier.replace(/\D/g, '')
      
      // Handle US numbers
      if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        return '+1' + digitsOnly.slice(1)
      } else if (digitsOnly.length === 10) {
        return '+1' + digitsOnly
      }
      
      // Return as-is for international numbers
      return '+' + digitsOnly
    }

    // Email normalization
    if (this.detectIdentifierType(identifier) === 'email') {
      return identifier.toLowerCase().trim()
    }

    return identifier
  }

  private detectIdentifierType(identifier: string): 'phone' | 'email' | 'unknown' {
    if (!identifier) return 'unknown'

    // Email detection
    if (identifier.includes('@') && identifier.includes('.')) {
      return 'email'
    }

    // Phone number detection (digits, spaces, dashes, parentheses, plus)
    if (/^[\+]?[\d\s\-\(\)\.]+$/.test(identifier) && identifier.replace(/\D/g, '').length >= 10) {
      return 'phone'
    }

    return 'unknown'
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Convert Apple nanosecond timestamp to JavaScript Date
    const appleEpochOffset = 978307200000 // milliseconds between Unix and Apple epochs
    return new Date(timestamp / 1000000 + appleEpochOffset)
  }

  async searchContacts(query: string, limit: number = 10): Promise<ContactInfo[]> {
    console.log(`[Contacts] Searching contacts: "${query}"`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      const contacts = await db.all(`
        SELECT 
          h.ROWID as id,
          h.id as identifier,
          h.uncanonicalized_id as uncanonicalized,
          h.service,
          COUNT(DISTINCT cmj.message_id) as messageCount,
          COUNT(DISTINCT cmj.chat_id) as conversationCount,
          MIN(m.date) as firstSeen,
          MAX(m.date) as lastSeen
        FROM handle h
        LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
        LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
        LEFT JOIN message m ON cmj.message_id = m.ROWID
        WHERE h.id LIKE ? OR h.uncanonicalized_id LIKE ?
        GROUP BY h.ROWID
        ORDER BY messageCount DESC
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, limit])

      await db.close()

      return contacts.map((contact: any) => ({
        id: contact.id,
        identifier: contact.identifier,
        displayName: contact.uncanonicalized || contact.identifier,
        normalizedIdentifier: this.normalizeIdentifier(contact.identifier),
        type: this.detectIdentifierType(contact.identifier),
        messageCount: contact.messageCount || 0,
        conversationCount: contact.conversationCount || 0,
        firstSeen: contact.firstSeen ? this.convertAppleTimestamp(contact.firstSeen) : null,
        lastSeen: contact.lastSeen ? this.convertAppleTimestamp(contact.lastSeen) : null,
        isActive: (contact.messageCount || 0) >= 10,
        service: contact.service
      }))

    } catch (error) {
      await db.close()
      throw error
    }
  }
}