// import { simpleParser, ParsedMail, AddressObject } from 'mailparser'

export interface ParsedEmailData {
  messageId: string
  threadId?: string
  subject?: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  date: Date
  content: {
    text?: string
    html?: string
  }
  attachments: {
    filename?: string
    contentType: string
    size: number
    data?: Buffer
  }[]
  inReplyTo?: string
  references?: string[]
  labels?: string[]
  snippet?: string
}

export class EmailParser {
  /**
   * Parse Gmail API message format to standardized email data
   */
  static async parseGmailMessage(gmailMessage: any): Promise<ParsedEmailData> {
    try {
      const headers = this.extractHeaders(gmailMessage.payload?.headers || [])
      const content = this.extractContent(gmailMessage.payload)
      const attachments = this.extractAttachments(gmailMessage.payload)

      return {
        messageId: gmailMessage.id,
        threadId: gmailMessage.threadId,
        subject: headers.subject,
        from: headers.from || '',
        to: this.parseAddresses(headers.to || ''),
        cc: headers.cc ? this.parseAddresses(headers.cc) : undefined,
        bcc: headers.bcc ? this.parseAddresses(headers.bcc) : undefined,
        date: headers.date ? new Date(headers.date) : new Date(parseInt(gmailMessage.internalDate)),
        content,
        attachments,
        inReplyTo: headers['in-reply-to'],
        references: headers.references ? headers.references.split(' ').filter(Boolean) : undefined,
        labels: gmailMessage.labelIds,
        snippet: gmailMessage.snippet
      }
    } catch (error) {
      console.error('Error parsing Gmail message:', error)
      throw new Error(`Failed to parse message ${gmailMessage.id}`)
    }
  }

  /**
   * Extract headers from Gmail message payload
   */
  private static extractHeaders(headers: any[]): Record<string, string> {
    const headerMap: Record<string, string> = {}
    
    headers.forEach(header => {
      if (header.name && header.value) {
        headerMap[header.name.toLowerCase()] = header.value
      }
    })

    return headerMap
  }

  /**
   * Extract text and HTML content from Gmail message payload
   */
  private static extractContent(payload: any): { text?: string; html?: string } {
    const content: { text?: string; html?: string } = {}

    if (!payload) return content

    // Handle simple message (single part)
    if (payload.body?.data) {
      const mimeType = payload.mimeType?.toLowerCase()
      const decodedData = this.decodeBase64Url(payload.body.data)

      if (mimeType === 'text/plain') {
        content.text = decodedData
      } else if (mimeType === 'text/html') {
        content.html = decodedData
      }
    }

    // Handle multipart message
    if (payload.parts && Array.isArray(payload.parts)) {
      this.extractMultipartContent(payload.parts, content)
    }

    return content
  }

  /**
   * Recursively extract content from multipart message
   */
  private static extractMultipartContent(parts: any[], content: { text?: string; html?: string }): void {
    parts.forEach(part => {
      const mimeType = part.mimeType?.toLowerCase()

      if (part.body?.data) {
        const decodedData = this.decodeBase64Url(part.body.data)

        if (mimeType === 'text/plain' && !content.text) {
          content.text = decodedData
        } else if (mimeType === 'text/html' && !content.html) {
          content.html = decodedData
        }
      }

      // Recursively process nested parts
      if (part.parts && Array.isArray(part.parts)) {
        this.extractMultipartContent(part.parts, content)
      }
    })
  }

  /**
   * Extract attachment information from Gmail message payload
   */
  private static extractAttachments(payload: any): ParsedEmailData['attachments'] {
    const attachments: ParsedEmailData['attachments'] = []

    if (!payload) return attachments

    const processParts = (parts: any[]) => {
      parts.forEach(part => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            contentType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0
          })
        }

        if (part.parts && Array.isArray(part.parts)) {
          processParts(part.parts)
        }
      })
    }

    if (payload.parts && Array.isArray(payload.parts)) {
      processParts(payload.parts)
    }

    return attachments
  }

  /**
   * Parse email addresses from string format
   */
  private static parseAddresses(addressString: string): string[] {
    if (!addressString) return []

    // Simple email extraction - could be enhanced with proper parsing
    const emailRegex = /([^<\s]+@[^>\s]+)/g
    const matches = addressString.match(emailRegex)
    return matches || []
  }

  /**
   * Decode base64url encoded data
   */
  private static decodeBase64Url(data: string): string {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
      // Add padding if necessary
      const padded = base64 + '==='.slice((base64.length + 3) % 4)
      
      return Buffer.from(padded, 'base64').toString('utf-8')
    } catch (error) {
      console.error('Error decoding base64url data:', error)
      return ''
    }
  }

  /**
   * Extract plain text from HTML content
   */
  static extractTextFromHtml(html: string): string {
    if (!html) return ''

    // Basic HTML tag removal - could be enhanced with proper HTML parser
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Parse using mailparser library for more robust parsing
   */
  static async parseWithMailparser(rawEmail: string): Promise<any> {
    try {
      // For now, return null - can be implemented later with proper mailparser setup
      return null
    } catch (error) {
      console.error('Error parsing with mailparser:', error)
      throw new Error('Failed to parse email with mailparser')
    }
  }

  /**
   * Extract contact information from email
   */
  static extractContactInfo(parsedEmail: ParsedEmailData): {
    contacts: { email: string; name?: string }[]
    fromContact: { email: string; name?: string }
  } {
    const contacts: { email: string; name?: string }[] = []
    
    // Extract from address
    const fromEmail = parsedEmail.from
    const fromContact = { email: fromEmail, name: this.extractNameFromAddress(fromEmail) }

    // Extract to addresses
    parsedEmail.to.forEach(email => {
      contacts.push({ email, name: this.extractNameFromAddress(email) })
    })

    // Extract cc addresses
    parsedEmail.cc?.forEach(email => {
      contacts.push({ email, name: this.extractNameFromAddress(email) })
    })

    // Extract bcc addresses
    parsedEmail.bcc?.forEach(email => {
      contacts.push({ email, name: this.extractNameFromAddress(email) })
    })

    return { contacts, fromContact }
  }

  /**
   * Extract display name from email address
   */
  private static extractNameFromAddress(address: string): string | undefined {
    if (!address) return undefined

    // Extract name from "Name <email@domain.com>" format
    const nameMatch = address.match(/^([^<]+)<[^>]+>$/)
    if (nameMatch) {
      return nameMatch[1].trim().replace(/^["']|["']$/g, '')
    }

    // Extract name from email if it looks like a name
    const emailMatch = address.match(/^([^@]+)@/)
    if (emailMatch) {
      const localPart = emailMatch[1]
      // Convert dots and underscores to spaces, capitalize words
      const possibleName = localPart
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Only return if it looks like a real name (not just random characters)
      if (possibleName.includes(' ') && possibleName.length > 3) {
        return possibleName
      }
    }

    return undefined
  }
}