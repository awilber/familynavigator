export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  mfaEnabled: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isActive: boolean
}

export interface Child {
  id: string
  userId: string
  firstName: string
  lastName?: string
  dateOfBirth?: Date
  medicalNotes?: string
  createdAt: Date
  updatedAt: Date
}

export type CommunicationType = 'email' | 'sms' | 'imessage' | 'our_family_wizard' | 'other'
export type CommunicationDirection = 'sent' | 'received'

export interface Communication {
  id: string
  userId: string
  type: CommunicationType
  direction: CommunicationDirection
  sender?: string
  recipient?: string
  subject?: string
  body?: string
  attachments: any[]
  metadata: Record<string, any>
  sentAt?: Date
  receivedAt?: Date
  importedAt: Date
  analysisResults: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    keywords?: string[]
    flags?: string[]
  }
  flagged: boolean
  flagReason?: string
  threadId?: string
  originalId?: string
  createdAt: Date
}

export type DocumentType = 'court_order' | 'agreement' | 'financial' | 'medical' | 'school' | 'legal' | 'correspondence' | 'other'

export interface Document {
  id: string
  userId: string
  title: string
  description?: string
  type?: DocumentType
  fileName: string
  fileSize?: number
  mimeType?: string
  s3Key: string
  s3Bucket: string
  checksum?: string
  encrypted: boolean
  ocrText?: string
  metadata: Record<string, any>
  tags: string[]
  relatedIncidentId?: string
  uploadedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type IncidentType = 'conflict' | 'violation' | 'concern' | 'positive' | 'neutral' | 'legal' | 'medical' | 'school' | 'other'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Incident {
  id: string
  userId: string
  title: string
  description: string
  incidentDate: Date
  incidentTime?: string
  location?: string
  type?: IncidentType
  severity?: IncidentSeverity
  partiesInvolved: string[]
  witnesses: string[]
  policeInvolved: boolean
  policeReportNumber?: string
  childInvolved: string[]
  evidence: {
    documentIds: string[]
    communicationIds: string[]
  }[]
  followUpRequired: boolean
  followUpNotes?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export type EventType = 'custody' | 'court' | 'medical' | 'school' | 'activity' | 'other'

export interface CalendarEvent {
  id: string
  userId: string
  title: string
  description?: string
  eventType?: EventType
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
  allDay: boolean
  location?: string
  childId?: string
  recurring: boolean
  recurrenceRule?: any
  reminderMinutes?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface AIConversation {
  id: string
  userId: string
  title?: string
  context: {
    documentIds: string[]
    incidentIds: string[]
    communicationIds: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface AIMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, any>
  createdAt: Date
}