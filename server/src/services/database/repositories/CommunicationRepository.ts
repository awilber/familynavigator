import { Database } from 'sqlite'
import { databaseService } from '../index'

export interface Communication {
  id?: number
  source: 'gmail' | 'messages'
  source_id?: string
  contact_id?: number
  direction: 'incoming' | 'outgoing'
  timestamp: string
  subject?: string
  content?: string
  content_type?: string
  message_type?: 'direct' | 'third_party' | 'group'
  confidence_score?: number
  third_party_source?: string
  thread_id?: string
  metadata?: any
  encrypted_data?: Buffer
  checksum?: string
  created_at?: string
  updated_at?: string
}

export interface CommunicationWithContact extends Communication {
  contact_name?: string
  contact_display_name?: string
  contact_email?: string
}

export interface SearchFilters {
  source?: 'gmail' | 'messages'
  contact_id?: number
  direction?: 'incoming' | 'outgoing'
  message_type?: 'direct' | 'third_party' | 'group'
  date_from?: string
  date_to?: string
  has_attachments?: boolean
  search_text?: string
  gmail_query?: string
}

export class CommunicationRepository {
  private async getDb(): Promise<Database> {
    return await databaseService.getDatabase()
  }

  async create(communication: Communication): Promise<Communication> {
    const db = await this.getDb()
    
    // Encrypt sensitive content if encryption is enabled
    let encryptedData = null
    let content = communication.content
    
    if (communication.content && databaseService.encrypt) {
      const encrypted = databaseService.encrypt(communication.content)
      if (encrypted) {
        encryptedData = JSON.stringify(encrypted)
        content = undefined // Clear plaintext if encrypted
      }
    }

    const result = await db.run(
      `INSERT INTO communications 
       (source, source_id, contact_id, direction, timestamp, subject, content, 
        content_type, message_type, confidence_score, third_party_source, 
        thread_id, metadata, encrypted_data, checksum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        communication.source,
        communication.source_id || null,
        communication.contact_id || null,
        communication.direction,
        communication.timestamp,
        communication.subject || null,
        content,
        communication.content_type || 'text',
        communication.message_type || 'direct',
        communication.confidence_score || 1.0,
        communication.third_party_source || null,
        communication.thread_id || null,
        communication.metadata ? JSON.stringify(communication.metadata) : null,
        encryptedData,
        communication.checksum || null
      ]
    )

    if (!result.lastID) {
      throw new Error('Failed to create communication')
    }

    const created = await this.findById(result.lastID)
    if (!created) {
      throw new Error('Failed to retrieve created communication')
    }
    return created
  }

  async findById(id: number): Promise<Communication | null> {
    const db = await this.getDb()
    
    const comm = await db.get(
      'SELECT * FROM communications WHERE id = ?',
      [id]
    )

    if (!comm) {
      return null
    }

    return await this.decryptCommunication(comm)
  }

  private async decryptCommunication(comm: any): Promise<Communication> {
    // Decrypt content if encrypted
    if (comm.encrypted_data && databaseService.decrypt) {
      try {
        const encryptedInfo = JSON.parse(comm.encrypted_data)
        const decrypted = databaseService.decrypt(
          encryptedInfo.encrypted,
          encryptedInfo.iv,
          encryptedInfo.authTag
        )
        if (decrypted) {
          comm.content = decrypted
        }
      } catch (error) {
        console.error('Failed to decrypt communication content:', error)
      }
    }

    return {
      ...comm,
      metadata: comm.metadata ? JSON.parse(comm.metadata) : null,
      encrypted_data: undefined // Don't expose encrypted data
    }
  }

  async findBySource(source: string, sourceId: string): Promise<Communication | null> {
    const db = await this.getDb()
    
    const comm = await db.get(
      'SELECT * FROM communications WHERE source = ? AND source_id = ?',
      [source, sourceId]
    )

    if (!comm) {
      return null
    }

    return await this.decryptCommunication(comm)
  }

  async findByContact(contactId: number, limit = 50, offset = 0): Promise<Communication[]> {
    const db = await this.getDb()
    
    const comms = await db.all(
      `SELECT * FROM communications 
       WHERE contact_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [contactId, limit, offset]
    )

    const decryptedComms = []
    for (const comm of comms) {
      decryptedComms.push(await this.decryptCommunication(comm))
    }

    return decryptedComms
  }

  async findByThread(threadId: string): Promise<Communication[]> {
    const db = await this.getDb()
    
    const comms = await db.all(
      'SELECT * FROM communications WHERE thread_id = ? ORDER BY timestamp ASC',
      [threadId]
    )

    const decryptedComms = []
    for (const comm of comms) {
      decryptedComms.push(await this.decryptCommunication(comm))
    }

    return decryptedComms
  }

  async search(filters: SearchFilters, limit = 50, offset = 0): Promise<CommunicationWithContact[]> {
    const db = await this.getDb()
    
    const conditions = []
    const values = []

    if (filters.source) {
      conditions.push('c.source = ?')
      values.push(filters.source)
    }

    if (filters.contact_id) {
      conditions.push('c.contact_id = ?')
      values.push(filters.contact_id)
    }

    if (filters.direction) {
      conditions.push('c.direction = ?')
      values.push(filters.direction)
    }

    if (filters.message_type) {
      conditions.push('c.message_type = ?')
      values.push(filters.message_type)
    }

    if (filters.date_from) {
      conditions.push('c.timestamp >= ?')
      values.push(filters.date_from)
    }

    if (filters.date_to) {
      conditions.push('c.timestamp <= ?')
      values.push(filters.date_to)
    }

    if (filters.has_attachments) {
      conditions.push('EXISTS (SELECT 1 FROM attachments WHERE communication_id = c.id)')
    }

    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Add full-text search if provided
    if (filters.search_text) {
      if (whereClause) {
        whereClause += ' AND c.id IN (SELECT rowid FROM communications_fts WHERE communications_fts MATCH ?)'
      } else {
        whereClause = 'WHERE c.id IN (SELECT rowid FROM communications_fts WHERE communications_fts MATCH ?)'
      }
      values.push(filters.search_text)
    }

    // Add Gmail query parsing if provided
    if (filters.gmail_query) {
      const gmailConditions = this.parseGmailQuery(filters.gmail_query)
      if (gmailConditions.conditions.length > 0) {
        const conditionString = gmailConditions.conditions.join(' AND ')
        if (whereClause) {
          whereClause += ` AND (${conditionString})`
        } else {
          whereClause = `WHERE (${conditionString})`
        }
        values.push(...gmailConditions.values)
      }
    }

    values.push(limit, offset)

    const query = `
      SELECT c.*, 
             ct.name as contact_name,
             ct.display_name as contact_display_name,
             ct.primary_email as contact_email
      FROM communications c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      ${whereClause}
      ORDER BY c.timestamp DESC
      LIMIT ? OFFSET ?
    `

    const comms = await db.all(query, values)

    const decryptedComms = []
    for (const comm of comms) {
      const decrypted = await this.decryptCommunication(comm)
      decryptedComms.push({
        ...decrypted,
        contact_name: comm.contact_name,
        contact_display_name: comm.contact_display_name,
        contact_email: comm.contact_email
      })
    }

    return decryptedComms
  }

  async getRecentCommunications(limit = 20): Promise<CommunicationWithContact[]> {
    return await this.search({}, limit, 0)
  }

  async getCommunicationStats(): Promise<{
    total: number
    by_source: { source: string; count: number }[]
    by_direction: { direction: string; count: number }[]
    date_range: { earliest: string; latest: string }
  }> {
    const db = await this.getDb()

    const total = await db.get('SELECT COUNT(*) as count FROM communications')

    const bySource = await db.all(
      'SELECT source, COUNT(*) as count FROM communications GROUP BY source'
    )

    const byDirection = await db.all(
      'SELECT direction, COUNT(*) as count FROM communications GROUP BY direction'
    )

    const dateRange = await db.get(
      'SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM communications'
    )

    return {
      total: total.count,
      by_source: bySource,
      by_direction: byDirection,
      date_range: dateRange || { earliest: null, latest: null }
    }
  }

  async update(id: number, updates: Partial<Communication>): Promise<Communication | null> {
    const db = await this.getDb()
    
    const setClause = []
    const values = []
    
    if (updates.contact_id !== undefined) {
      setClause.push('contact_id = ?')
      values.push(updates.contact_id)
    }
    if (updates.subject !== undefined) {
      setClause.push('subject = ?')
      values.push(updates.subject)
    }
    if (updates.content !== undefined) {
      // Handle encryption if enabled
      if (databaseService.encrypt) {
        const encrypted = databaseService.encrypt(updates.content)
        if (encrypted) {
          setClause.push('encrypted_data = ?', 'content = ?')
          values.push(JSON.stringify(encrypted), null)
        } else {
          setClause.push('content = ?')
          values.push(updates.content)
        }
      } else {
        setClause.push('content = ?')
        values.push(updates.content)
      }
    }
    if (updates.message_type !== undefined) {
      setClause.push('message_type = ?')
      values.push(updates.message_type)
    }
    if (updates.confidence_score !== undefined) {
      setClause.push('confidence_score = ?')
      values.push(updates.confidence_score)
    }
    if (updates.metadata !== undefined) {
      setClause.push('metadata = ?')
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null)
    }

    if (setClause.length === 0) {
      return await this.findById(id)
    }

    values.push(id)
    
    await db.run(
      `UPDATE communications SET ${setClause.join(', ')} WHERE id = ?`,
      values
    )

    return await this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const db = await this.getDb()
    
    const result = await db.run('DELETE FROM communications WHERE id = ?', [id])
    return (result.changes || 0) > 0
  }

  async bulkInsert(communications: Communication[]): Promise<number> {
    const db = await this.getDb()
    let inserted = 0

    await db.run('BEGIN TRANSACTION')

    try {
      for (const comm of communications) {
        try {
          await this.create(comm)
          inserted++
        } catch (error) {
          // Skip duplicates (source + source_id constraint)
          console.warn(`Skipping duplicate communication: ${comm.source}:${comm.source_id}`)
        }
      }

      await db.run('COMMIT')
      return inserted
    } catch (error) {
      await db.run('ROLLBACK')
      throw error
    }
  }

  private parseGmailQuery(query: string): { conditions: string[], values: any[] } {
    const conditions: string[] = []
    const values: any[] = []

    // Simple Gmail query parser for common operators
    // from:email - messages from specific email
    const fromMatch = query.match(/from:([^\s\)]+)/g)
    if (fromMatch) {
      const froms = fromMatch.map(match => match.replace('from:', ''))
      if (froms.length === 1) {
        conditions.push('JSON_EXTRACT(c.metadata, "$.from") LIKE ?')
        values.push(`%${froms[0]}%`)
      } else if (froms.length > 1) {
        const fromConditions = froms.map(() => 'JSON_EXTRACT(c.metadata, "$.from") LIKE ?')
        conditions.push(`(${fromConditions.join(' OR ')})`)
        froms.forEach(from => values.push(`%${from}%`))
      }
    }

    // to:email - messages to specific email
    const toMatch = query.match(/to:([^\s\)]+)/g)
    if (toMatch) {
      const tos = toMatch.map(match => match.replace('to:', ''))
      if (tos.length === 1) {
        conditions.push('(JSON_EXTRACT(c.metadata, "$.to") LIKE ? OR JSON_EXTRACT(c.metadata, "$.cc") LIKE ? OR JSON_EXTRACT(c.metadata, "$.bcc") LIKE ?)')
        values.push(`%${tos[0]}%`, `%${tos[0]}%`, `%${tos[0]}%`)
      } else if (tos.length > 1) {
        const toConditions = tos.map(() => '(JSON_EXTRACT(c.metadata, "$.to") LIKE ? OR JSON_EXTRACT(c.metadata, "$.cc") LIKE ? OR JSON_EXTRACT(c.metadata, "$.bcc") LIKE ?)')
        conditions.push(`(${toConditions.join(' OR ')})`)
        tos.forEach(to => values.push(`%${to}%`, `%${to}%`, `%${to}%`))
      }
    }

    // subject:text - messages with subject containing text
    const subjectMatch = query.match(/subject:"([^"]+)"/g) || query.match(/subject:([^\s\)]+)/g)
    if (subjectMatch) {
      const subjects = subjectMatch.map(match => 
        match.replace(/subject:"?([^"]+)"?/, '$1')
      )
      if (subjects.length === 1) {
        conditions.push('c.subject LIKE ?')
        values.push(`%${subjects[0]}%`)
      } else if (subjects.length > 1) {
        const subjectConditions = subjects.map(() => 'c.subject LIKE ?')
        conditions.push(`(${subjectConditions.join(' OR ')})`)
        subjects.forEach(subject => values.push(`%${subject}%`))
      }
    }

    return { conditions, values }
  }
}