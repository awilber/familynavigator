import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Incident {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  type: 'violation' | 'concern' | 'emergency' | 'communication' | 'other'
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'resolved' | 'escalated'
  involvedParties: string[]
  witnesses: string[]
  evidence: {
    documents: string[]
    communications: string[]
    photos: string[]
  }
  notes: string
  createdAt: string
  updatedAt: string
}

export interface IncidentsState {
  incidents: Incident[]
  loading: boolean
  error: string | null
  selectedIncident: Incident | null
  filter: {
    type: string | null
    severity: string | null
    status: string | null
    dateRange: { start: string | null; end: string | null }
  }
}

const initialState: IncidentsState = {
  incidents: [],
  loading: false,
  error: null,
  selectedIncident: null,
  filter: {
    type: null,
    severity: null,
    status: null,
    dateRange: { start: null, end: null }
  }
}

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    fetchIncidentsStart: (state) => {
      state.loading = true
      state.error = null
    },
    fetchIncidentsSuccess: (state, action: PayloadAction<Incident[]>) => {
      state.incidents = action.payload
      state.loading = false
    },
    fetchIncidentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    addIncident: (state, action: PayloadAction<Incident>) => {
      state.incidents.unshift(action.payload)
    },
    updateIncident: (state, action: PayloadAction<Incident>) => {
      const index = state.incidents.findIndex(i => i.id === action.payload.id)
      if (index !== -1) {
        state.incidents[index] = action.payload
      }
    },
    deleteIncident: (state, action: PayloadAction<string>) => {
      state.incidents = state.incidents.filter(i => i.id !== action.payload)
    },
    setSelectedIncident: (state, action: PayloadAction<Incident | null>) => {
      state.selectedIncident = action.payload
    },
    setFilter: (state, action: PayloadAction<Partial<IncidentsState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload }
    }
  }
})

export const {
  fetchIncidentsStart,
  fetchIncidentsSuccess,
  fetchIncidentsFailure,
  addIncident,
  updateIncident,
  deleteIncident,
  setSelectedIncident,
  setFilter
} = incidentsSlice.actions

export default incidentsSlice.reducer