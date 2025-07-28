import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/authSlice'
import communicationsReducer from './features/communications/communicationsSlice'
import documentsReducer from './features/documents/documentsSlice'
import incidentsReducer from './features/incidents/incidentsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    communications: communicationsReducer,
    documents: documentsReducer,
    incidents: incidentsReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch