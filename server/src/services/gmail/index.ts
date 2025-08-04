import { google } from 'googleapis'
import { databaseService } from '../database'

interface GmailCredentials {
  client_id: string
  client_secret: string
  redirect_uri: string
}

interface StoredToken {
  access_token: string
  refresh_token: string
  scope: string
  token_type: string
  expiry_date: number
}

export class GmailService {
  private oauth2Client: any
  private gmail: any
  private credentials: GmailCredentials

  constructor(credentials: GmailCredentials) {
    this.credentials = credentials
    this.oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri
    )
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly'
      // Removed metadata scope as it conflicts with query parameters
      // readonly scope provides full read access including metadata
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<StoredToken> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens')
      }

      const storedToken: StoredToken = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token!,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || Date.now() + 3600000
      }

      // Store tokens securely in database
      await this.storeTokens(storedToken)
      
      // Set credentials for future API calls
      this.oauth2Client.setCredentials(tokens)

      return storedToken
    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  /**
   * Load stored tokens and set credentials
   */
  async loadStoredTokens(): Promise<boolean> {
    try {
      const db = await databaseService.getDatabase()
      const tokenRow = await db.get(
        'SELECT value FROM app_config WHERE key = ?',
        ['gmail_tokens']
      )

      if (!tokenRow) {
        return false
      }

      const tokens = JSON.parse(tokenRow.value) as StoredToken
      
      // Validate scope to ensure we have the correct permissions
      const requiredScope = 'https://www.googleapis.com/auth/gmail.readonly'
      const hasMetadataScope = tokens.scope && tokens.scope.includes('gmail.metadata')
      const hasReadonlyScope = tokens.scope && tokens.scope.includes('gmail.readonly')
      
      if (hasMetadataScope && !hasReadonlyScope) {
        console.log('Detected incompatible scope (metadata only). Forcing re-authentication...')
        // Clear the stored tokens to force re-authentication with correct scope
        await this.revokeAuth()
        return false
      }
      
      // Check if token is expired and try to refresh
      if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
        const refreshed = await this.refreshTokens(tokens)
        if (!refreshed) {
          return false
        }
      } else {
        this.oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        })
      }

      return true
    } catch (error) {
      console.error('Error loading stored tokens:', error)
      return false
    }
  }

  /**
   * Refresh expired access token
   */
  private async refreshTokens(storedToken: StoredToken): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: storedToken.refresh_token
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token')
      }

      const updatedToken: StoredToken = {
        ...storedToken,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date || Date.now() + 3600000
      }

      await this.storeTokens(updatedToken)
      this.oauth2Client.setCredentials(credentials)

      return true
    } catch (error) {
      console.error('Error refreshing tokens:', error)
      return false
    }
  }

  /**
   * Store tokens securely in database
   */
  private async storeTokens(tokens: StoredToken): Promise<void> {
    try {
      const db = await databaseService.getDatabase()
      
      // Encrypt the token data
      const encrypted = databaseService.encrypt(JSON.stringify(tokens))
      const tokenData = encrypted ? JSON.stringify(encrypted) : JSON.stringify(tokens)

      await db.run(
        `INSERT OR REPLACE INTO app_config (key, value, updated_at) 
         VALUES (?, ?, datetime('now'))`,
        ['gmail_tokens', tokenData]
      )
    } catch (error) {
      console.error('Error storing tokens:', error)
      throw new Error('Failed to store authentication tokens')
    }
  }

  /**
   * Get user's Gmail profile information
   */
  async getProfile(): Promise<any> {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' })
      return response.data
    } catch (error) {
      console.error('Error getting Gmail profile:', error)
      throw new Error('Failed to get Gmail profile')
    }
  }

  /**
   * List messages with optional query and pagination
   */
  async listMessages(options: {
    query?: string
    maxResults?: number
    pageToken?: string
    labelIds?: string[]
  } = {}): Promise<{
    messages: any[]
    nextPageToken?: string
    resultSizeEstimate: number
  }> {
    try {
      const {
        query = '',
        maxResults = 100,
        pageToken,
        labelIds
      } = options

      const params: any = {
        userId: 'me',
        maxResults,
        q: query
      }

      if (pageToken) params.pageToken = pageToken
      if (labelIds && labelIds.length > 0) params.labelIds = labelIds

      const response = await this.gmail.users.messages.list(params)
      
      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      }
    } catch (error) {
      console.error('Error listing messages:', error)
      throw new Error('Failed to list Gmail messages')
    }
  }

  /**
   * Get full message details
   */
  async getMessage(messageId: string, format: 'full' | 'metadata' | 'minimal' = 'full'): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: format
      })

      return response.data
    } catch (error) {
      console.error(`Error getting message ${messageId}:`, error)
      throw new Error(`Failed to get message: ${messageId}`)
    }
  }

  /**
   * Get messages in batch for efficiency
   */
  async getMessagesBatch(messageIds: string[], format: 'full' | 'metadata' | 'minimal' = 'metadata'): Promise<any[]> {
    try {
      const batchSize = 100 // Gmail API batch limit
      const results: any[] = []

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize)
        const batchPromises = batch.map(id => this.getMessage(id, format))
        
        // Add delay to respect rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            console.error(`Failed to get message ${batch[index]}:`, result.reason)
          }
        })
      }

      return results
    } catch (error) {
      console.error('Error getting messages batch:', error)
      throw new Error('Failed to get messages batch')
    }
  }

  /**
   * Get message history for incremental sync
   */
  async getHistory(startHistoryId: string, maxResults: number = 100): Promise<{
    history: any[]
    nextPageToken?: string
    historyId: string
  }> {
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        maxResults,
        historyTypes: ['messageAdded', 'messageDeleted']
      })

      return {
        history: response.data.history || [],
        nextPageToken: response.data.nextPageToken,
        historyId: response.data.historyId || startHistoryId
      }
    } catch (error) {
      console.error('Error getting history:', error)
      throw new Error('Failed to get Gmail history')
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const credentials = this.oauth2Client.credentials
    return !!(credentials && credentials.access_token)
  }

  /**
   * Revoke authentication
   */
  async revokeAuth(): Promise<void> {
    try {
      if (this.oauth2Client.credentials.access_token) {
        await this.oauth2Client.revokeCredentials()
      }
      
      // Clear stored tokens
      const db = await databaseService.getDatabase()
      await db.run('DELETE FROM app_config WHERE key = ?', ['gmail_tokens'])
      
    } catch (error) {
      console.error('Error revoking authentication:', error)
      throw new Error('Failed to revoke Gmail authentication')
    }
  }
}

// Singleton instance
let gmailService: GmailService | null = null

export const getGmailService = (): GmailService => {
  if (!gmailService) {
    const credentials: GmailCredentials = {
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:6000/api/gmail/callback'
    }

    if (!credentials.client_id || !credentials.client_secret) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.')
    }

    gmailService = new GmailService(credentials)
  }

  return gmailService
}