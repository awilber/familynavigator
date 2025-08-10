import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store'
import { ThemeProvider } from './theme/ThemeContext'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import AdaptiveThemeProvider from './components/AdaptiveThemeProvider'
import { UIModeProvider } from './contexts/UIModeContext'
import Layout from './components/Layout'
import Login from './features/auth/Login'
import Dashboard from './features/dashboard/Dashboard'
import Communications from './features/communications/Communications'
import GmailPage from './features/communications/pages/GmailPage'
import TextMessagesPage from './features/communications/pages/TextMessagesPage'
import Documents from './features/documents/Documents'
import Incidents from './features/incidents/Incidents'
import Calendar from './features/calendar/Calendar'
import AIAssistant from './features/ai-assistant/AIAssistant'

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <ThemeProvider>
      <AdaptiveThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <UIModeProvider>
            {!isAuthenticated ? (
              <Login />
            ) : (
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/communications" element={<Communications />} />
                  <Route path="/communications/gmail" element={<GmailPage />} />
                  <Route path="/communications/messages" element={<TextMessagesPage />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/assistant" element={<AIAssistant />} />
                </Routes>
              </Layout>
            )}
          </UIModeProvider>
        </LocalizationProvider>
      </AdaptiveThemeProvider>
    </ThemeProvider>
  )
}

export default App