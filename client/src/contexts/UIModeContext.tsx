import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UIMode = 'classic' | 'advanced'

interface UIModeContextType {
  mode: UIMode
  setMode: (mode: UIMode) => void
  isAdvancedMode: boolean
  isClassicMode: boolean
}

const UIModeContext = createContext<UIModeContextType | undefined>(undefined)

interface UIModeProviderProps {
  children: ReactNode
}

export const UIModeProvider: React.FC<UIModeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<UIMode>('classic')

  // Load saved mode from localStorage on component mount
  useEffect(() => {
    const savedMode = localStorage.getItem('familynavigator-ui-mode') as UIMode
    if (savedMode === 'classic' || savedMode === 'advanced') {
      setModeState(savedMode)
    }
  }, [])

  // Save mode to localStorage whenever it changes
  const setMode = (newMode: UIMode) => {
    setModeState(newMode)
    localStorage.setItem('familynavigator-ui-mode', newMode)
  }

  const value: UIModeContextType = {
    mode,
    setMode,
    isAdvancedMode: mode === 'advanced',
    isClassicMode: mode === 'classic'
  }

  return (
    <UIModeContext.Provider value={value}>
      {children}
    </UIModeContext.Provider>
  )
}

export const useUIMode = (): UIModeContextType => {
  const context = useContext(UIModeContext)
  if (!context) {
    throw new Error('useUIMode must be used within a UIModeProvider')
  }
  return context
}

export default UIModeContext