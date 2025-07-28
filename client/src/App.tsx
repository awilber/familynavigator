import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store'
import Layout from './components/Layout'
import Login from './features/auth/Login'
import Dashboard from './features/dashboard/Dashboard'
import Communications from './features/communications/Communications'
import Documents from './features/documents/Documents'
import Incidents from './features/incidents/Incidents'
import Calendar from './features/calendar/Calendar'
import AIAssistant from './features/ai-assistant/AIAssistant'

function App() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/assistant" element={<AIAssistant />} />
      </Routes>
    </Layout>
  )
}

export default App