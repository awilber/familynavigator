import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface ConversationThread {
  chatId: number
  displayName: string
  participants: Participant[]
  messageCount: number
  firstMessage: Date
  lastMessage: Date
  isGroupChat: boolean
  service: string
  chatIdentifier: string | null
  roomName: string | null
  messages: ThreadMessage[]
  conversationSummary: ConversationSummary
}

interface Participant {
  handleId: number
  identifier: string
  displayName: string
  service: string
  isMe: boolean
  messageCount: number
  lastSeen: Date | null
}

interface ThreadMessage {
  messageId: number
  text: string | null
  timestamp: Date
  isFromMe: boolean
  sender: Participant | null
  messageType: string
  hasAttachments: boolean
  replyToMessageId: number | null
  reactions: MessageReaction[]
}

interface MessageReaction {
  messageId: number
  reactionType: string
  fromParticipant: Participant
  timestamp: Date
}

interface ConversationSummary {
  totalMessages: number
  messagesPerParticipant: { [participantId: number]: number }
  timeSpan: { start: Date, end: Date, daysActive: number }
  messageFrequency: 'very_high' | 'high' | 'medium' | 'low' | 'rare'
  lastActivity: Date
  averageMessagesPerDay: number
  peakActivityPeriod: string
}

export class MessagesThreadingEngine {
  private dbPath: string

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async getConversationThread(chatId: number, messageLimit: number = 100): Promise<ConversationThread | null> {
    console.log(`[Threading] Reconstructing conversation thread: ${chatId}`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get chat basic info
      const chat = await db.get(`
        SELECT 
          c.ROWID as chatId,
          c.display_name,
          c.chat_identifier,
          c.service_name,
          c.room_name,
          c.group_id,
          COUNT(DISTINCT chj.handle_id) as participant_count
        FROM chat c
        LEFT JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
        WHERE c.ROWID = ?
        GROUP BY c.ROWID
      `, [chatId])

      if (!chat) {
        await db.close()
        return null
      }

      // Get participants
      const participants = await this.getChatParticipants(db, chatId)

      // Get messages with threading info
      const messages = await this.getChatMessages(db, chatId, messageLimit)

      // Get conversation statistics
      const summary = await this.generateConversationSummary(db, chatId, participants, messages)

      await db.close()

      return {
        chatId: chat.chatId,
        displayName: chat.display_name || this.generateChatDisplayName(participants),
        participants,
        messageCount: summary.totalMessages,
        firstMessage: summary.timeSpan.start,
        lastMessage: summary.timeSpan.end,
        isGroupChat: participants.length > 2,
        service: chat.service_name || 'unknown',
        chatIdentifier: chat.chat_identifier,
        roomName: chat.room_name,
        messages,
        conversationSummary: summary
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  async getAllConversations(limit: number = 50, sortBy: 'recent' | 'frequency' | 'participants' = 'recent'): Promise<ConversationThread[]> {
    console.log(`[Threading] Getting all conversations (limit: ${limit}, sort: ${sortBy})`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Build sort clause
      let orderBy = ''
      switch (sortBy) {
        case 'recent':
          orderBy = 'MAX(m.date) DESC'
          break
        case 'frequency':
          orderBy = 'COUNT(m.ROWID) DESC'
          break
        case 'participants':
          orderBy = 'COUNT(DISTINCT chj.handle_id) DESC'
          break
      }

      const chats = await db.all(`
        SELECT 
          c.ROWID as chatId,
          c.display_name,
          c.chat_identifier,
          c.service_name,
          c.room_name,
          COUNT(m.ROWID) as message_count,
          COUNT(DISTINCT chj.handle_id) as participant_count,
          MIN(m.date) as first_message,
          MAX(m.date) as last_message
        FROM chat c
        LEFT JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
        LEFT JOIN message m ON cmj.message_id = m.ROWID
        LEFT JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
        WHERE m.ROWID IS NOT NULL
        GROUP BY c.ROWID
        HAVING COUNT(m.ROWID) > 0
        ORDER BY ${orderBy}
        LIMIT ?
      `, [limit])

      const conversations: ConversationThread[] = []

      for (const chat of chats) {
        const participants = await this.getChatParticipants(db, chat.chatId)
        const messages: ThreadMessage[] = [] // Empty for list view performance
        
        const summary: ConversationSummary = {
          totalMessages: chat.message_count || 0,
          messagesPerParticipant: {},
          timeSpan: {
            start: this.convertAppleTimestamp(chat.first_message),
            end: this.convertAppleTimestamp(chat.last_message),
            daysActive: 0
          },
          messageFrequency: this.calculateFrequencyLevel(chat.message_count),
          lastActivity: this.convertAppleTimestamp(chat.last_message),
          averageMessagesPerDay: 0,
          peakActivityPeriod: 'unknown'
        }

        conversations.push({
          chatId: chat.chatId,
          displayName: chat.display_name || this.generateChatDisplayName(participants),
          participants,
          messageCount: chat.message_count || 0,
          firstMessage: this.convertAppleTimestamp(chat.first_message),
          lastMessage: this.convertAppleTimestamp(chat.last_message),
          isGroupChat: (chat.participant_count || 0) > 2,
          service: chat.service_name || 'unknown',
          chatIdentifier: chat.chat_identifier,
          roomName: chat.room_name,
          messages,
          conversationSummary: summary
        })
      }

      await db.close()
      return conversations

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async getChatParticipants(db: any, chatId: number): Promise<Participant[]> {
    const participants = await db.all(`
      SELECT 
        h.ROWID as handleId,
        h.id as identifier,
        h.uncanonicalized_id,
        h.service,
        COUNT(m.ROWID) as message_count,
        MAX(m.date) as last_seen
      FROM handle h
      JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
      LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
      LEFT JOIN message m ON cmj.message_id = m.ROWID AND m.handle_id = h.ROWID
      WHERE chj.chat_id = ?
      GROUP BY h.ROWID
      ORDER BY message_count DESC
    `, [chatId])

    return participants.map((p: any) => ({
      handleId: p.handleId,
      identifier: p.identifier,
      displayName: p.uncanonicalized_id || p.identifier,
      service: p.service || 'unknown',
      isMe: false, // Would need additional logic to determine this
      messageCount: p.message_count || 0,
      lastSeen: p.last_seen ? this.convertAppleTimestamp(p.last_seen) : null
    }))
  }

  private async getChatMessages(db: any, chatId: number, limit: number): Promise<ThreadMessage[]> {
    const messages = await db.all(`
      SELECT 
        m.ROWID as messageId,
        m.text,
        m.date as timestamp,
        m.is_from_me,
        m.handle_id,
        m.cache_has_attachments,
        m.associated_message_type,
        m.thread_originator_guid,
        h.id as sender_identifier,
        h.uncanonicalized_id as sender_display_name,
        h.service as sender_service
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      WHERE cmj.chat_id = ?
      ORDER BY m.date ASC
      LIMIT ?
    `, [chatId, limit])

    const threadMessages: ThreadMessage[] = []

    for (const msg of messages) {
      const sender: Participant | null = msg.handle_id ? {
        handleId: msg.handle_id,
        identifier: msg.sender_identifier,
        displayName: msg.sender_display_name || msg.sender_identifier,
        service: msg.sender_service || 'unknown',
        isMe: Boolean(msg.is_from_me),
        messageCount: 0, // Not calculated for individual messages
        lastSeen: null
      } : null

      threadMessages.push({
        messageId: msg.messageId,
        text: msg.text,
        timestamp: this.convertAppleTimestamp(msg.timestamp),
        isFromMe: Boolean(msg.is_from_me),
        sender,
        messageType: this.getMessageType(msg),
        hasAttachments: Boolean(msg.cache_has_attachments),
        replyToMessageId: msg.thread_originator_guid ? parseInt(msg.thread_originator_guid) : null,
        reactions: [] // Would need additional query for reactions
      })
    }

    return threadMessages
  }

  private async generateConversationSummary(
    db: any, 
    chatId: number, 
    participants: Participant[], 
    messages: ThreadMessage[]
  ): Promise<ConversationSummary> {
    // Get detailed statistics
    const stats = await db.get(`
      SELECT 
        COUNT(m.ROWID) as total_messages,
        MIN(m.date) as first_message,
        MAX(m.date) as last_message
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
    `, [chatId])

    const startDate = this.convertAppleTimestamp(stats.first_message)
    const endDate = this.convertAppleTimestamp(stats.last_message)
    const daysActive = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const averageMessagesPerDay = daysActive > 0 ? Math.round(stats.total_messages / daysActive) : 0

    // Get messages per participant
    const participantStats = await db.all(`
      SELECT 
        m.handle_id,
        COUNT(m.ROWID) as message_count
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ? AND m.handle_id IS NOT NULL
      GROUP BY m.handle_id
    `, [chatId])

    const messagesPerParticipant: { [participantId: number]: number } = {}
    participantStats.forEach((stat: any) => {
      messagesPerParticipant[stat.handle_id] = stat.message_count
    })

    return {
      totalMessages: stats.total_messages || 0,
      messagesPerParticipant,
      timeSpan: {
        start: startDate,
        end: endDate,
        daysActive
      },
      messageFrequency: this.calculateFrequencyLevel(stats.total_messages),
      lastActivity: endDate,
      averageMessagesPerDay,
      peakActivityPeriod: this.determinePeakActivity(averageMessagesPerDay)
    }
  }

  private generateChatDisplayName(participants: Participant[]): string {
    const nonMeParticipants = participants.filter(p => !p.isMe)
    
    if (nonMeParticipants.length === 0) {
      return 'Self Conversation'
    } else if (nonMeParticipants.length === 1) {
      return nonMeParticipants[0].displayName
    } else if (nonMeParticipants.length <= 3) {
      return nonMeParticipants.map(p => p.displayName.split(' ')[0]).join(', ')
    } else {
      return `Group Chat (${nonMeParticipants.length} people)`
    }
  }

  private calculateFrequencyLevel(messageCount: number): ConversationSummary['messageFrequency'] {
    if (messageCount > 1000) return 'very_high'
    if (messageCount > 500) return 'high'
    if (messageCount > 100) return 'medium'
    if (messageCount > 10) return 'low'
    return 'rare'
  }

  private determinePeakActivity(avgMessagesPerDay: number): string {
    if (avgMessagesPerDay > 50) return 'Very Active'
    if (avgMessagesPerDay > 20) return 'Active'
    if (avgMessagesPerDay > 5) return 'Moderate'
    if (avgMessagesPerDay > 1) return 'Light'
    return 'Minimal'
  }

  private getMessageType(message: any): string {
    if (message.associated_message_type >= 2000 && message.associated_message_type <= 2005) {
      return 'reaction'
    }
    if (message.associated_message_type === 1000) {
      return 'sticker'
    }
    if (message.cache_has_attachments) {
      return 'attachment'
    }
    if (message.text) {
      return 'text'
    }
    return 'other'
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Convert Apple nanosecond timestamp to JavaScript Date
    const appleEpochOffset = 978307200000 // milliseconds between Unix and Apple epochs
    return new Date(timestamp / 1000000 + appleEpochOffset)
  }

  async searchConversations(query: string, limit: number = 20): Promise<ConversationThread[]> {
    console.log(`[Threading] Searching conversations: "${query}"`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      const chats = await db.all(`
        SELECT DISTINCT
          c.ROWID as chatId,
          c.display_name,
          c.chat_identifier,
          c.service_name,
          COUNT(m.ROWID) as message_count,
          MAX(m.date) as last_message
        FROM chat c
        JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
        JOIN message m ON cmj.message_id = m.ROWID
        LEFT JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
        LEFT JOIN handle h ON chj.handle_id = h.ROWID
        WHERE 
          m.text LIKE ? OR 
          c.display_name LIKE ? OR
          h.id LIKE ? OR
          h.uncanonicalized_id LIKE ?
        GROUP BY c.ROWID
        ORDER BY last_message DESC
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit])

      const conversations: ConversationThread[] = []

      for (const chat of chats) {
        const participants = await this.getChatParticipants(db, chat.chatId)
        
        conversations.push({
          chatId: chat.chatId,
          displayName: chat.display_name || this.generateChatDisplayName(participants),
          participants,
          messageCount: chat.message_count || 0,
          firstMessage: new Date(), // Would need additional query
          lastMessage: this.convertAppleTimestamp(chat.last_message),
          isGroupChat: participants.length > 2,
          service: chat.service_name || 'unknown',
          chatIdentifier: chat.chat_identifier,
          roomName: null,
          messages: [],
          conversationSummary: {
            totalMessages: chat.message_count || 0,
            messagesPerParticipant: {},
            timeSpan: { start: new Date(), end: this.convertAppleTimestamp(chat.last_message), daysActive: 0 },
            messageFrequency: this.calculateFrequencyLevel(chat.message_count),
            lastActivity: this.convertAppleTimestamp(chat.last_message),
            averageMessagesPerDay: 0,
            peakActivityPeriod: 'unknown'
          }
        })
      }

      await db.close()
      return conversations

    } catch (error) {
      await db.close()
      throw error
    }
  }
}