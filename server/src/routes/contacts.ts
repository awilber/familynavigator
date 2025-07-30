import express from 'express'
import { ContactRepository } from '../services/database/repositories'

const router = express.Router()
const contactRepo = new ContactRepository()

// GET /api/contacts - Get all contacts with search
router.get('/', async (req, res) => {
  try {
    const query = req.query.search as string

    let contacts
    if (query) {
      contacts = await contactRepo.searchContacts(query)
    } else {
      contacts = await contactRepo.getContactSummary()
    }
    
    res.json({
      success: true,
      data: contacts
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts'
    })
  }
})

// GET /api/contacts/summary - Get contact summary with message counts
router.get('/summary', async (req, res) => {
  try {
    const contacts = await contactRepo.getContactSummary()
    
    res.json({
      success: true,
      data: contacts
    })
  } catch (error) {
    console.error('Error fetching contact summary:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact summary'
    })
  }
})

// GET /api/contacts/:id - Get specific contact with identifiers
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const contact = await contactRepo.getContactWithIdentifiers(id)
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      })
    }

    res.json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error('Error fetching contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact'
    })
  }
})

// POST /api/contacts - Create new contact
router.post('/', async (req, res) => {
  try {
    const contactData = req.body
    
    // Validate required fields
    if (!contactData.name) {
      return res.status(400).json({
        success: false,
        error: 'Contact name is required'
      })
    }

    const contact = await contactRepo.create(contactData)
    
    res.status(201).json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error('Error creating contact:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'A contact with this email or phone already exists'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create contact'
    })
  }
})

// PUT /api/contacts/:id - Update contact
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const updates = req.body

    const contact = await contactRepo.update(id, updates)
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      })
    }

    res.json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error('Error updating contact:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'A contact with this email or phone already exists'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update contact'
    })
  }
})

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const deleted = await contactRepo.delete(id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      })
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    })
  }
})

// POST /api/contacts/:id/identifiers - Add identifier to contact
router.post('/:id/identifiers', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id)
    const identifierData = {
      ...req.body,
      contact_id: contactId
    }
    
    // Validate required fields
    if (!identifierData.identifier_type || !identifierData.identifier_value) {
      return res.status(400).json({
        success: false,
        error: 'Identifier type and value are required'
      })
    }

    const identifier = await contactRepo.addIdentifier(identifierData)
    
    res.status(201).json({
      success: true,
      data: identifier
    })
  } catch (error) {
    console.error('Error adding identifier:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'This identifier already exists for this contact'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to add identifier'
    })
  }
})

// POST /api/contacts/find-or-create - Find existing contact or create new one
router.post('/find-or-create', async (req, res) => {
  try {
    const { email, name } = req.body
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    const contact = await contactRepo.findOrCreateByEmail(email, name)
    
    res.json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error('Error finding or creating contact:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to find or create contact'
    })
  }
})

export default router