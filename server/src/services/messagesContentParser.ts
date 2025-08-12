import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface ParsedMessage {
  id: number
  text: string | null
  type: MessageType
  timestamp: Date
  isFromMe: boolean
  hasAttachments: boolean
  attachmentCount: number
  attachmentTypes: string[]
  reactionType: ReactionType | null
  associatedMessageId: number | null
  threadOriginator: number | null
  service: string
  accountId: string | null
  sanitizedText: string | null
  contentSummary: string
}

interface AttachmentInfo {
  id: number
  messageId: number
  filename: string | null
  mimeType: string | null
  totalBytes: number
  isSticker: boolean
  transferState: number
  createdDate: Date | null
}

type MessageType = 'text' | 'attachment' | 'reaction' | 'sticker' | 'location' | 'contact' | 'payment' | 'game' | 'other'
type ReactionType = 'love' | 'like' | 'dislike' | 'laugh' | 'emphasize' | 'question' | null

interface MessageParsingOptions {
  includeAttachmentMetadata: boolean
  sanitizeContent: boolean
  extractMentions: boolean
  parseUrls: boolean
  maxTextLength: number
}

export class MessagesContentParser {
  private dbPath: string
  private defaultOptions: MessageParsingOptions = {
    includeAttachmentMetadata: true,
    sanitizeContent: true,
    extractMentions: false, // Disabled for privacy
    parseUrls: false, // Disabled for privacy
    maxTextLength: 10000
  }

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async parseMessage(messageId: number, options?: Partial<MessageParsingOptions>): Promise<ParsedMessage | null> {
    console.log(`[Parser] Parsing message: ${messageId}`)
    
    const opts = { ...this.defaultOptions, ...options }
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get message details
      const message = await db.get(`
        SELECT 
          m.ROWID as id,
          m.text,
          m.date,
          m.is_from_me,
          m.cache_has_attachments,
          m.associated_message_type,
          m.associated_message_guid,
          m.thread_originator_guid,
          m.service,
          m.account,
          m.balloon_bundle_id,
          m.associated_message_range_location,
          m.associated_message_range_length
        FROM message m
        WHERE m.ROWID = ?
      `, [messageId])

      if (!message) {
        await db.close()
        return null
      }

      // Parse message type and reaction
      const { type, reactionType } = this.parseMessageTypeAndReaction(message)
      
      // Get attachment information if needed
      let attachmentCount = 0
      let attachmentTypes: string[] = []
      
      if (opts.includeAttachmentMetadata && message.cache_has_attachments) {
        const attachmentInfo = await this.getMessageAttachments(db, messageId)
        attachmentCount = attachmentInfo.attachments.length
        attachmentTypes = attachmentInfo.types
      }

      // Parse and sanitize text content
      const sanitizedText = opts.sanitizeContent && message.text ? 
        this.sanitizeTextContent(message.text, opts.maxTextLength) : message.text

      // Generate content summary
      const contentSummary = this.generateContentSummary(message, type, attachmentCount, attachmentTypes)

      await db.close()

      return {
        id: message.id,
        text: message.text,
        type,
        timestamp: this.convertAppleTimestamp(message.date),
        isFromMe: Boolean(message.is_from_me),
        hasAttachments: Boolean(message.cache_has_attachments),
        attachmentCount,
        attachmentTypes,
        reactionType,
        associatedMessageId: message.associated_message_guid ? parseInt(message.associated_message_guid) : null,
        threadOriginator: message.thread_originator_guid ? parseInt(message.thread_originator_guid) : null,
        service: message.service || 'unknown',
        accountId: message.account,
        sanitizedText,
        contentSummary
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  async parseMessagesBatch(messageIds: number[], options?: Partial<MessageParsingOptions>): Promise<ParsedMessage[]> {
    console.log(`[Parser] Parsing ${messageIds.length} messages in batch`)
    
    const opts = { ...this.defaultOptions, ...options }
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Build query for batch processing
      const placeholders = messageIds.map(() => '?').join(',')
      const messages = await db.all(`
        SELECT 
          m.ROWID as id,
          m.text,
          m.date,
          m.is_from_me,
          m.cache_has_attachments,
          m.associated_message_type,
          m.associated_message_guid,
          m.thread_originator_guid,
          m.service,
          m.account,
          m.balloon_bundle_id
        FROM message m
        WHERE m.ROWID IN (${placeholders})
        ORDER BY m.date ASC
      `, messageIds)

      const parsedMessages: ParsedMessage[] = []

      for (const message of messages) {
        const { type, reactionType } = this.parseMessageTypeAndReaction(message)
        
        let attachmentCount = 0
        let attachmentTypes: string[] = []
        
        if (opts.includeAttachmentMetadata && message.cache_has_attachments) {
          const attachmentInfo = await this.getMessageAttachments(db, message.id)
          attachmentCount = attachmentInfo.attachments.length
          attachmentTypes = attachmentInfo.types
        }

        const sanitizedText = opts.sanitizeContent && message.text ? 
          this.sanitizeTextContent(message.text, opts.maxTextLength) : message.text

        const contentSummary = this.generateContentSummary(message, type, attachmentCount, attachmentTypes)

        parsedMessages.push({
          id: message.id,
          text: message.text,
          type,
          timestamp: this.convertAppleTimestamp(message.date),
          isFromMe: Boolean(message.is_from_me),
          hasAttachments: Boolean(message.cache_has_attachments),
          attachmentCount,
          attachmentTypes,
          reactionType,
          associatedMessageId: message.associated_message_guid ? parseInt(message.associated_message_guid) : null,
          threadOriginator: message.thread_originator_guid ? parseInt(message.thread_originator_guid) : null,
          service: message.service || 'unknown',
          accountId: message.account,
          sanitizedText,
          contentSummary
        })
      }

      await db.close()
      return parsedMessages

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async getMessageAttachments(db: any, messageId: number): Promise<{ attachments: AttachmentInfo[], types: string[] }> {
    const attachments = await db.all(`
      SELECT 
        a.ROWID as id,
        a.filename,
        a.mime_type,
        a.total_bytes,
        a.is_sticker,
        a.transfer_state,
        a.created_date
      FROM attachment a
      JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
      WHERE maj.message_id = ?
    `, [messageId])

    const attachmentInfos: AttachmentInfo[] = attachments.map((att: any) => ({
      id: att.id,
      messageId,
      filename: att.filename,
      mimeType: att.mime_type,
      totalBytes: att.total_bytes || 0,
      isSticker: Boolean(att.is_sticker),
      transferState: att.transfer_state || 0,
      createdDate: att.created_date ? this.convertAppleTimestamp(att.created_date) : null
    }))

    // Extract unique MIME types for summary
    const types = [...new Set(attachments.map((att: any) => 
      this.simplifyMimeType(att.mime_type)).filter(Boolean))] as string[]

    return { attachments: attachmentInfos, types }
  }

  private parseMessageTypeAndReaction(message: any): { type: MessageType, reactionType: ReactionType } {
    let type: MessageType = 'text'
    let reactionType: ReactionType = null

    // Check for attachments first
    if (message.cache_has_attachments) {
      type = 'attachment'
    }

    // Check for special message types
    if (message.associated_message_type) {
      switch (message.associated_message_type) {
        case 2000: reactionType = 'love'; type = 'reaction'; break
        case 2001: reactionType = 'like'; type = 'reaction'; break
        case 2002: reactionType = 'dislike'; type = 'reaction'; break
        case 2003: reactionType = 'laugh'; type = 'reaction'; break
        case 2004: reactionType = 'emphasize'; type = 'reaction'; break
        case 2005: reactionType = 'question'; type = 'reaction'; break
        case 1000: type = 'sticker'; break
        default: type = 'other'; break
      }
    }

    // Check for special content types via balloon bundle
    if (message.balloon_bundle_id) {
      if (message.balloon_bundle_id.includes('map')) type = 'location'
      else if (message.balloon_bundle_id.includes('contact')) type = 'contact'
      else if (message.balloon_bundle_id.includes('payment')) type = 'payment'
      else if (message.balloon_bundle_id.includes('game')) type = 'game'
      else type = 'other'
    }

    return { type, reactionType }
  }

  private simplifyMimeType(mimeType: string | null): string | null {
    if (!mimeType) return null

    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('text/')) return 'document'
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('contact')) return 'contact'
    if (mimeType.includes('location')) return 'location'
    
    return 'other'
  }

  private sanitizeTextContent(text: string, maxLength: number): string {
    if (!text) return ''

    // Remove potential sensitive patterns (very basic sanitization)
    let sanitized = text
      .trim()
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit excessive line breaks

    // Truncate if too long
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...'
    }

    return sanitized
  }

  private generateContentSummary(message: any, type: MessageType, attachmentCount: number, attachmentTypes: string[]): string {
    const parts: string[] = []

    // Add type information
    parts.push(`Type: ${type}`)

    // Add text length if present
    if (message.text) {
      parts.push(`Text: ${message.text.length} chars`)
    }

    // Add attachment info
    if (attachmentCount > 0) {
      parts.push(`Attachments: ${attachmentCount} (${attachmentTypes.join(', ')})`)
    }

    // Add service info
    if (message.service) {
      parts.push(`Service: ${message.service}`)
    }

    return parts.join(' | ')
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Convert Apple nanosecond timestamp to JavaScript Date
    const appleEpochOffset = 978307200000 // milliseconds between Unix and Apple epochs
    return new Date(timestamp / 1000000 + appleEpochOffset)
  }

  async getMessageTypes(): Promise<{ [key: string]: number }> {
    console.log('[Parser] Analyzing message type distribution')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get basic type distribution
      const results = await db.all(`
        SELECT 
          CASE 
            WHEN cache_has_attachments = 1 THEN 'attachment'
            WHEN associated_message_type >= 2000 AND associated_message_type <= 2005 THEN 'reaction'
            WHEN associated_message_type = 1000 THEN 'sticker'
            WHEN balloon_bundle_id IS NOT NULL THEN 'special'
            WHEN text IS NOT NULL AND text != '' THEN 'text'
            ELSE 'other'
          END as message_type,
          COUNT(*) as count
        FROM message
        GROUP BY message_type
        ORDER BY count DESC
      `)

      await db.close()

      const distribution: { [key: string]: number } = {}
      results.forEach((row: any) => {
        distribution[row.message_type] = row.count
      })

      return distribution

    } catch (error) {
      await db.close()
      throw error
    }
  }
}