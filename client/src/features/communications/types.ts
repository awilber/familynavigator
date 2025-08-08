export interface Contact {
  id: number
  name: string
  display_name?: string
  primary_email?: string
  primary_phone?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  identifiers?: ContactIdentifier[]
  message_count?: number
  last_communication?: string
  first_communication?: string
}

export interface ContactIdentifier {
  id: number
  contact_id: number
  identifier_type: 'email' | 'phone' | 'name_variation'
  identifier_value: string
  confidence_score: number
  verified: boolean
  source?: string
  created_at: string
}

export interface Communication {
  id: number
  source: 'gmail' | 'messages'
  source_id?: string
  contact_id?: number
  direction: 'incoming' | 'outgoing'
  timestamp: string
  subject?: string
  content?: string
  content_type: string
  message_type: 'direct' | 'third_party' | 'group'
  confidence_score: number
  third_party_source?: string
  thread_id?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  
  // Extended fields from joins
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

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  pagination?: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface CommunicationStats {
  total: number
  by_source: { source: string; count: number }[]
  by_direction: { direction: string; count: number }[]
  date_range: { earliest: string | null; latest: string | null }
}