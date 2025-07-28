import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Communication {
  id: string
  type: 'email' | 'text' | 'call' | 'other'
  sender: string
  recipient: string
  subject?: string
  content: string
  date: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  tags: string[]
  attachments?: string[]
}

interface CommunicationsState {
  communications: Communication[]
  loading: boolean
  error: string | null
  filter: {
    type: string | null
    dateRange: { start: string | null; end: string | null }
    sentiment: string | null
  }
}

const initialState: CommunicationsState = {
  communications: [],
  loading: false,
  error: null,
  filter: {
    type: null,
    dateRange: { start: null, end: null },
    sentiment: null
  }
}

const communicationsSlice = createSlice({
  name: 'communications',
  initialState,
  reducers: {
    fetchCommunicationsStart: (state) => {
      state.loading = true
      state.error = null
    },
    fetchCommunicationsSuccess: (state, action: PayloadAction<Communication[]>) => {
      state.communications = action.payload
      state.loading = false
    },
    fetchCommunicationsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    addCommunication: (state, action: PayloadAction<Communication>) => {
      state.communications.unshift(action.payload)
    },
    updateCommunication: (state, action: PayloadAction<Communication>) => {
      const index = state.communications.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.communications[index] = action.payload
      }
    },
    deleteCommunication: (state, action: PayloadAction<string>) => {
      state.communications = state.communications.filter(c => c.id !== action.payload)
    },
    setFilter: (state, action: PayloadAction<Partial<CommunicationsState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload }
    }
  }
})

export const {
  fetchCommunicationsStart,
  fetchCommunicationsSuccess,
  fetchCommunicationsFailure,
  addCommunication,
  updateCommunication,
  deleteCommunication,
  setFilter
} = communicationsSlice.actions

export default communicationsSlice.reducer