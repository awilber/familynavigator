import { Contact, Communication, SearchFilters, ApiResponse, CommunicationStats } from '../types'

const API_BASE = 'http://localhost:7001/api'

class CommunicationsApi {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Contacts API
  async getContacts(search?: string): Promise<Contact[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await this.request<Contact[]>(`/contacts${params}`)
    return response.data
  }

  async getContact(id: number): Promise<Contact> {
    const response = await this.request<Contact>(`/contacts/${id}`)
    return response.data
  }

  async createContact(contact: Partial<Contact>): Promise<Contact> {
    const response = await this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    })
    return response.data
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact> {
    const response = await this.request<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async deleteContact(id: number): Promise<void> {
    await this.request(`/contacts/${id}`, {
      method: 'DELETE',
    })
  }

  async findOrCreateContact(email: string, name?: string): Promise<Contact> {
    const response = await this.request<Contact>('/contacts/find-or-create', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    })
    return response.data
  }

  // Communications API
  async getCommunications(
    filters?: SearchFilters,
    limit = 50,
    offset = 0
  ): Promise<{ communications: Communication[]; hasMore: boolean }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (filters?.source) params.set('source', filters.source)
    if (filters?.contact_id) params.set('contact_id', filters.contact_id.toString())
    if (filters?.direction) params.set('direction', filters.direction)
    if (filters?.message_type) params.set('message_type', filters.message_type)
    if (filters?.date_from) params.set('date_from', filters.date_from)
    if (filters?.date_to) params.set('date_to', filters.date_to)
    if (filters?.has_attachments) params.set('has_attachments', filters.has_attachments.toString())
    if (filters?.search_text) params.set('search', filters.search_text)

    const response = await this.request<Communication[]>(`/communications?${params}`)
    
    return {
      communications: response.data,
      hasMore: response.pagination?.hasMore || false,
    }
  }

  async getCommunication(id: number): Promise<Communication> {
    const response = await this.request<Communication>(`/communications/${id}`)
    return response.data
  }

  async getRecentCommunications(limit = 20): Promise<Communication[]> {
    const response = await this.request<Communication[]>(`/communications/recent?limit=${limit}`)
    return response.data
  }

  async getCommunicationStats(): Promise<CommunicationStats> {
    const response = await this.request<CommunicationStats>('/communications/stats')
    return response.data
  }

  async getThreadCommunications(threadId: string): Promise<Communication[]> {
    const response = await this.request<Communication[]>(`/communications/thread/${threadId}`)
    return response.data
  }

  async updateCommunication(id: number, updates: Partial<Communication>): Promise<Communication> {
    const response = await this.request<Communication>(`/communications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async deleteCommunication(id: number): Promise<void> {
    await this.request(`/communications/${id}`, {
      method: 'DELETE',
    })
  }
}

export const communicationsApi = new CommunicationsApi()