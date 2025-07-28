import React from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useAdaptiveMuiTheme } from '../theme'

interface AdaptiveThemeProviderProps {
  children: React.ReactNode
}

const AdaptiveThemeProvider: React.FC<AdaptiveThemeProviderProps> = ({ children }) => {
  const adaptiveTheme = useAdaptiveMuiTheme()

  return (
    <ThemeProvider theme={adaptiveTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export default AdaptiveThemeProvider