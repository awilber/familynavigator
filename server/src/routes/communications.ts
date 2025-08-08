import express from 'express'
import { ContactRepository, CommunicationRepository, SearchFilters } from '../services/database/repositories'

const router = express.Router()
const contactRepo = new ContactRepository()
const communicationRepo = new CommunicationRepository()

// GET /api/communications - Search communications with filters
router.get('/', async (req, res) => {
  try {
    const filters: SearchFilters = {}
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    // Parse query parameters
    if (req.query.source) filters.source = req.query.source as 'gmail' | 'messages'
    if (req.query.contact_id) filters.contact_id = parseInt(req.query.contact_id as string)
    if (req.query.direction) filters.direction = req.query.direction as 'incoming' | 'outgoing'
    if (req.query.message_type) filters.message_type = req.query.message_type as 'direct' | 'third_party' | 'group'
    if (req.query.date_from) filters.date_from = req.query.date_from as string
    if (req.query.date_to) filters.date_to = req.query.date_to as string
    if (req.query.has_attachments) filters.has_attachments = req.query.has_attachments === 'true'
    if (req.query.search) filters.search_text = req.query.search as string
    if (req.query.gmail_query) filters.gmail_query = req.query.gmail_query as string

    const communications = await communicationRepo.search(filters, limit, offset)
    
    res.json({
      success: true,
      data: communications,
      pagination: {
        limit,
        offset,
        hasMore: communications.length === limit
      }
    })
  } catch (error) {
    console.error('Error searching communications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to search communications'
    })
  }
})

// GET /api/communications/recent - Get recent communications
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const communications = await communicationRepo.getRecentCommunications(limit)
    
    res.json({
      success: true,
      data: communications
    })
  } catch (error) {
    console.error('Error fetching recent communications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent communications'
    })
  }
})

// GET /api/communications/stats - Get communication statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await communicationRepo.getCommunicationStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching communication stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communication statistics'
    })
  }
})

// GET /api/communications/:id - Get specific communication
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const communication = await communicationRepo.findById(id)
    
    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found'
      })
    }

    res.json({
      success: true,
      data: communication
    })
  } catch (error) {
    console.error('Error fetching communication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communication'
    })
  }
})

// GET /api/communications/thread/:threadId - Get communications in thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId
    const communications = await communicationRepo.findByThread(threadId)
    
    res.json({
      success: true,
      data: communications
    })
  } catch (error) {
    console.error('Error fetching thread communications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread communications'
    })
  }
})

// PUT /api/communications/:id - Update communication
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const updates = req.body

    const communication = await communicationRepo.update(id, updates)
    
    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found'
      })
    }

    res.json({
      success: true,
      data: communication
    })
  } catch (error) {
    console.error('Error updating communication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update communication'
    })
  }
})

// DELETE /api/communications/:id - Delete communication
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const deleted = await communicationRepo.delete(id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Communication not found'
      })
    }

    res.json({
      success: true,
      message: 'Communication deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting communication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete communication'
    })
  }
})

export default router