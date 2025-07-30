// Communications feature module exports
export { default as CommunicationsView } from './components/CommunicationsView'
export { default as ContactsList } from './components/ContactsList'
export { default as CommunicationTimeline } from './components/CommunicationTimeline'

// Types
export type { Communication, Contact, SearchFilters } from './types'

// Services
export { communicationsApi } from './services/api'