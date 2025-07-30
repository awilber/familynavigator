import { Database } from 'sqlite'
import { databaseService } from '../index'

export interface Contact {
  id?: number
  name: string
  display_name?: string
  primary_email?: string
  primary_phone?: string
  metadata?: any
  created_at?: string
  updated_at?: string
}

export interface ContactIdentifier {
  id?: number
  contact_id: number
  identifier_type: 'email' | 'phone' | 'name_variation'
  identifier_value: string
  confidence_score?: number
  verified?: boolean
  source?: string
  created_at?: string
}

export interface ContactWithIdentifiers extends Contact {
  identifiers: ContactIdentifier[]
  message_count?: number
  last_communication?: string
  first_communication?: string
}

export class ContactRepository {
  private async getDb(): Promise<Database> {
    return await databaseService.getDatabase()
  }

  async create(contact: Contact): Promise<Contact> {
    const db = await this.getDb()
    
    const result = await db.run(
      `INSERT INTO contacts (name, display_name, primary_email, primary_phone, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        contact.name,
        contact.display_name || null,
        contact.primary_email || null,
        contact.primary_phone || null,
        contact.metadata ? JSON.stringify(contact.metadata) : null
      ]
    )

    if (!result.lastID) {
      throw new Error('Failed to create contact')
    }

    const created = await this.findById(result.lastID)
    if (!created) {
      throw new Error('Failed to retrieve created contact')
    }
    return created
  }

  async findById(id: number): Promise<Contact | null> {
    const db = await this.getDb()
    
    const contact = await db.get(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    )

    if (!contact) {
      return null
    }

    return {
      ...contact,
      metadata: contact.metadata ? JSON.parse(contact.metadata) : null
    }
  }

  async findByEmail(email: string): Promise<Contact | null> {
    const db = await this.getDb()
    
    // First check primary email
    let contact = await db.get(
      'SELECT * FROM contacts WHERE primary_email = ?',
      [email]
    )

    // If not found, check contact identifiers
    if (!contact) {
      contact = await db.get(
        `SELECT c.* FROM contacts c
         JOIN contact_identifiers ci ON c.id = ci.contact_id
         WHERE ci.identifier_type = 'email' AND ci.identifier_value = ?`,
        [email]
      )
    }

    if (!contact) {
      return null
    }

    return {
      ...contact,
      metadata: contact.metadata ? JSON.parse(contact.metadata) : null
    }
  }

  async findByPhone(phone: string): Promise<Contact | null> {
    const db = await this.getDb()
    
    // First check primary phone
    let contact = await db.get(
      'SELECT * FROM contacts WHERE primary_phone = ?',
      [phone]
    )

    // If not found, check contact identifiers
    if (!contact) {
      contact = await db.get(
        `SELECT c.* FROM contacts c
         JOIN contact_identifiers ci ON c.id = ci.contact_id
         WHERE ci.identifier_type = 'phone' AND ci.identifier_value = ?`,
        [phone]
      )
    }

    if (!contact) {
      return null
    }

    return {
      ...contact,
      metadata: contact.metadata ? JSON.parse(contact.metadata) : null
    }
  }

  async findOrCreateByEmail(email: string, name?: string): Promise<Contact> {
    let contact = await this.findByEmail(email)
    
    if (!contact) {
      contact = await this.create({
        name: name || email,
        primary_email: email
      })
    }

    return contact
  }

  async addIdentifier(identifier: ContactIdentifier): Promise<ContactIdentifier> {
    const db = await this.getDb()
    
    const result = await db.run(
      `INSERT INTO contact_identifiers 
       (contact_id, identifier_type, identifier_value, confidence_score, verified, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        identifier.contact_id,
        identifier.identifier_type,
        identifier.identifier_value,
        identifier.confidence_score || 1.0,
        identifier.verified || false,
        identifier.source || null
      ]
    )

    if (!result.lastID) {
      throw new Error('Failed to add identifier')
    }

    const created = await db.get(
      'SELECT * FROM contact_identifiers WHERE id = ?',
      [result.lastID]
    )

    return created
  }

  async getIdentifiers(contactId: number): Promise<ContactIdentifier[]> {
    const db = await this.getDb()
    
    return await db.all(
      'SELECT * FROM contact_identifiers WHERE contact_id = ? ORDER BY confidence_score DESC',
      [contactId]
    )
  }

  async getContactWithIdentifiers(contactId: number): Promise<ContactWithIdentifiers | null> {
    const contact = await this.findById(contactId)
    if (!contact) {
      return null
    }

    const identifiers = await this.getIdentifiers(contactId)

    return {
      ...contact,
      identifiers
    }
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const db = await this.getDb()
    
    const contacts = await db.all(
      `SELECT DISTINCT c.* FROM contacts c
       LEFT JOIN contact_identifiers ci ON c.id = ci.contact_id
       WHERE c.name LIKE ? 
          OR c.display_name LIKE ? 
          OR c.primary_email LIKE ?
          OR ci.identifier_value LIKE ?
       ORDER BY c.name`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    )

    return contacts.map(contact => ({
      ...contact,
      metadata: contact.metadata ? JSON.parse(contact.metadata) : null
    }))
  }

  async getContactSummary(): Promise<ContactWithIdentifiers[]> {
    const db = await this.getDb()
    
    const contacts = await db.all(
      `SELECT c.*, 
              COUNT(comm.id) as message_count,
              MAX(comm.timestamp) as last_communication,
              MIN(comm.timestamp) as first_communication
       FROM contacts c
       LEFT JOIN communications comm ON c.id = comm.contact_id
       GROUP BY c.id
       ORDER BY message_count DESC, c.name`
    )

    const contactsWithIdentifiers: ContactWithIdentifiers[] = []
    
    for (const contact of contacts) {
      const identifiers = await this.getIdentifiers(contact.id)
      contactsWithIdentifiers.push({
        ...contact,
        metadata: contact.metadata ? JSON.parse(contact.metadata) : null,
        identifiers
      })
    }

    return contactsWithIdentifiers
  }

  async update(id: number, updates: Partial<Contact>): Promise<Contact | null> {
    const db = await this.getDb()
    
    const setClause = []
    const values = []
    
    if (updates.name !== undefined) {
      setClause.push('name = ?')
      values.push(updates.name)
    }
    if (updates.display_name !== undefined) {
      setClause.push('display_name = ?')
      values.push(updates.display_name)
    }
    if (updates.primary_email !== undefined) {
      setClause.push('primary_email = ?')
      values.push(updates.primary_email)
    }
    if (updates.primary_phone !== undefined) {
      setClause.push('primary_phone = ?')
      values.push(updates.primary_phone)
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
      `UPDATE contacts SET ${setClause.join(', ')} WHERE id = ?`,
      values
    )

    return await this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const db = await this.getDb()
    
    const result = await db.run('DELETE FROM contacts WHERE id = ?', [id])
    return (result.changes || 0) > 0
  }
}