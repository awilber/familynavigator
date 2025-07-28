import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Document {
  id: string
  name: string
  type: 'court_order' | 'agreement' | 'financial' | 'medical' | 'communication' | 'other'
  uploadDate: string
  modifiedDate: string
  size: number
  url: string
  category: string
  tags: string[]
  description?: string
}

interface DocumentsState {
  documents: Document[]
  loading: boolean
  error: string | null
  selectedDocument: Document | null
  filter: {
    type: string | null
    category: string | null
    searchTerm: string
  }
}

const initialState: DocumentsState = {
  documents: [],
  loading: false,
  error: null,
  selectedDocument: null,
  filter: {
    type: null,
    category: null,
    searchTerm: ''
  }
}

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    fetchDocumentsStart: (state) => {
      state.loading = true
      state.error = null
    },
    fetchDocumentsSuccess: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload
      state.loading = false
    },
    fetchDocumentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    uploadDocument: (state, action: PayloadAction<Document>) => {
      state.documents.unshift(action.payload)
    },
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter(doc => doc.id !== action.payload)
    },
    setSelectedDocument: (state, action: PayloadAction<Document | null>) => {
      state.selectedDocument = action.payload
    },
    setFilter: (state, action: PayloadAction<Partial<DocumentsState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload }
    }
  }
})

export const {
  fetchDocumentsStart,
  fetchDocumentsSuccess,
  fetchDocumentsFailure,
  uploadDocument,
  deleteDocument,
  setSelectedDocument,
  setFilter
} = documentsSlice.actions

export default documentsSlice.reducer