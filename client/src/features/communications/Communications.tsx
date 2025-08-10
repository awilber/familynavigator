import React from 'react'
import CommunicationsView from './components/CommunicationsView'
import EnhancedCommunicationsView from './components/EnhancedCommunicationsView'
import { useUIMode } from '../../contexts/UIModeContext'

const Communications: React.FC = () => {
  const { mode } = useUIMode()
  
  return mode === 'advanced' ? <EnhancedCommunicationsView /> : <CommunicationsView />
}

export default Communications