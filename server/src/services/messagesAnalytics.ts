import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface MessageStats {
  totalMessages: number
  totalConversations: number
  totalContacts: number
  dateRange: {
    earliest: Date | null
    latest: Date | null
    spanDays: number
  }
  messageTypes: {
    text: number
    attachments: number
    reactions: number
    stickers: number
    other: number
  }
  frequencyAnalysis: {
    dailyAverage: number
    weeklyAverage: number
    monthlyAverage: number
    peakDay: string
    peakCount: number
  }
  conversationStats: {
    averageLength: number
    longestConversation: number
    shortestConversation: number
    activeConversations: number
  }
}

interface FrequencyData {
  date: string
  count: number
  dayOfWeek: string
  month: string
  year: number
}

export class MessagesAnalytics {
  private dbPath: string

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async getMessageStatistics(): Promise<MessageStats> {
    console.log('[Analytics] Generating comprehensive message statistics')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Basic counts
      const totalMessages = await this.getTotalMessageCount(db)
      const totalConversations = await this.getTotalConversationCount(db)
      const totalContacts = await this.getTotalContactCount(db)
      
      // Date range analysis
      const dateRange = await this.getDateRangeAnalysis(db)
      
      // Message type distribution
      const messageTypes = await this.getMessageTypeDistribution(db)
      
      // Frequency analysis
      const frequencyAnalysis = await this.getFrequencyAnalysis(db, dateRange)
      
      // Conversation statistics
      const conversationStats = await this.getConversationStatistics(db)

      await db.close()

      return {
        totalMessages,
        totalConversations,
        totalContacts,
        dateRange,
        messageTypes,
        frequencyAnalysis,
        conversationStats
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async getTotalMessageCount(db: any): Promise<number> {
    const result = await db.get('SELECT COUNT(*) as count FROM message')
    return result?.count || 0
  }

  private async getTotalConversationCount(db: any): Promise<number> {
    const result = await db.get('SELECT COUNT(*) as count FROM chat')
    return result?.count || 0
  }

  private async getTotalContactCount(db: any): Promise<number> {
    const result = await db.get('SELECT COUNT(*) as count FROM handle')
    return result?.count || 0
  }

  private async getDateRangeAnalysis(db: any): Promise<MessageStats['dateRange']> {
    const result = await db.get(`
      SELECT 
        MIN(date) as earliest,
        MAX(date) as latest,
        COUNT(*) as total
      FROM message 
      WHERE date IS NOT NULL AND date > 0
    `)

    if (!result?.earliest || !result?.latest) {
      return {
        earliest: null,
        latest: null,
        spanDays: 0
      }
    }

    // Convert Apple timestamps (nanoseconds since 2001-01-01) to JavaScript dates
    const appleEpochOffset = 978307200000 // milliseconds between Unix and Apple epochs  
    const earliest = new Date(result.earliest / 1000000 + appleEpochOffset)
    const latest = new Date(result.latest / 1000000 + appleEpochOffset)
    const spanDays = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))

    return {
      earliest,
      latest,
      spanDays
    }
  }

  private async getMessageTypeDistribution(db: any): Promise<MessageStats['messageTypes']> {
    // Get basic message types
    const textMessages = await db.get(`
      SELECT COUNT(*) as count 
      FROM message 
      WHERE text IS NOT NULL AND text != ''
    `)

    const attachmentMessages = await db.get(`
      SELECT COUNT(*) as count 
      FROM message 
      WHERE cache_has_attachments = 1
    `)

    // Get associated_message_type for special message types
    const specialTypes = await db.all(`
      SELECT associated_message_type, COUNT(*) as count
      FROM message 
      WHERE associated_message_type IS NOT NULL 
      GROUP BY associated_message_type
    `)

    let reactions = 0
    let stickers = 0
    let other = 0

    specialTypes.forEach((type: any) => {
      switch (type.associated_message_type) {
        case 2000: // Reactions/tapbacks
        case 2001:
        case 2002:
        case 2003:
        case 2004:
        case 2005:
          reactions += type.count
          break
        case 1000: // Stickers
          stickers += type.count
          break
        default:
          other += type.count
          break
      }
    })

    return {
      text: textMessages?.count || 0,
      attachments: attachmentMessages?.count || 0,
      reactions,
      stickers,
      other
    }
  }

  private async getFrequencyAnalysis(db: any, dateRange: MessageStats['dateRange']): Promise<MessageStats['frequencyAnalysis']> {
    if (!dateRange.earliest || !dateRange.latest || dateRange.spanDays === 0) {
      return {
        dailyAverage: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        peakDay: 'N/A',
        peakCount: 0
      }
    }

    // Get daily message counts (convert nanoseconds to seconds for SQLite)
    const dailyStats = await db.all(`
      SELECT 
        date(datetime(date / 1000000000 + 978307200, 'unixepoch')) as message_date,
        COUNT(*) as count
      FROM message 
      WHERE date IS NOT NULL AND date > 0
      GROUP BY date(datetime(date / 1000000000 + 978307200, 'unixepoch'))
      ORDER BY count DESC
      LIMIT 10
    `)

    const totalMessages = await this.getTotalMessageCount(db)
    const dailyAverage = Math.round(totalMessages / dateRange.spanDays)
    const weeklyAverage = dailyAverage * 7
    const monthlyAverage = dailyAverage * 30

    const peakDay = dailyStats[0]?.message_date || 'N/A'
    const peakCount = dailyStats[0]?.count || 0

    return {
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      peakDay,
      peakCount
    }
  }

  private async getConversationStatistics(db: any): Promise<MessageStats['conversationStats']> {
    const conversationLengths = await db.all(`
      SELECT 
        chat.ROWID,
        COUNT(message.ROWID) as message_count
      FROM chat
      LEFT JOIN chat_message_join ON chat.ROWID = chat_message_join.chat_id
      LEFT JOIN message ON chat_message_join.message_id = message.ROWID
      GROUP BY chat.ROWID
      HAVING COUNT(message.ROWID) > 0
      ORDER BY message_count DESC
    `)

    if (conversationLengths.length === 0) {
      return {
        averageLength: 0,
        longestConversation: 0,
        shortestConversation: 0,
        activeConversations: 0
      }
    }

    const lengths = conversationLengths.map((c: any) => c.message_count)
    const averageLength = Math.round(lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length)
    const longestConversation = Math.max(...lengths)
    const shortestConversation = Math.min(...lengths)
    const activeConversations = conversationLengths.filter((c: any) => c.message_count >= 10).length

    return {
      averageLength,
      longestConversation,
      shortestConversation,
      activeConversations
    }
  }

  async getFrequencyTimeline(days: number = 30): Promise<FrequencyData[]> {
    console.log(`[Analytics] Generating frequency timeline for last ${days} days`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      const timeline = await db.all(`
        SELECT 
          date(datetime(date / 1000000000 + 978307200, 'unixepoch')) as date,
          COUNT(*) as count,
          strftime('%w', datetime(date / 1000000000 + 978307200, 'unixepoch')) as day_of_week,
          strftime('%m', datetime(date / 1000000000 + 978307200, 'unixepoch')) as month,
          strftime('%Y', datetime(date / 1000000000 + 978307200, 'unixepoch')) as year
        FROM message 
        WHERE date IS NOT NULL AND date > 0
          AND datetime(date / 1000000000 + 978307200, 'unixepoch') >= datetime('now', '-${days} days')
        GROUP BY date(datetime(date / 1000000000 + 978307200, 'unixepoch'))
        ORDER BY date DESC
      `)

      await db.close()

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      return timeline.map((row: any) => ({
        date: row.date,
        count: row.count,
        dayOfWeek: dayNames[parseInt(row.day_of_week)],
        month: row.month,
        year: parseInt(row.year)
      }))

    } catch (error) {
      await db.close()
      throw error
    }
  }
}