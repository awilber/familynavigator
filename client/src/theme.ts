import { createTheme, ThemeOptions } from '@mui/material/styles'
import { useTheme as useCustomTheme } from './theme/ThemeContext'

// Create theme factory function that adapts to our custom theme
const createAdaptiveTheme = (isDarkMode: boolean, customTheme: any): ThemeOptions => ({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: customTheme.colors.accent.primary,
      light: customTheme.colors.accent.hover,
      dark: customTheme.colors.accent.active
    },
    secondary: {
      main: '#dc004e',
      light: '#e33371',
      dark: '#9a0036'
    },
    background: {
      default: customTheme.colors.background.primary,
      paper: customTheme.colors.background.secondary
    },
    text: {
      primary: customTheme.colors.text.primary,
      secondary: customTheme.colors.text.secondary
    },
    success: {
      main: customTheme.colors.status.success
    },
    warning: {
      main: customTheme.colors.status.warning
    },
    error: {
      main: customTheme.colors.status.error
    },
    info: {
      main: customTheme.colors.status.info
    }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          transition: 'var(--effect-transition-normal)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 'var(--effect-shadow-md)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'var(--effect-shadow-sm)',
          backgroundColor: 'var(--color-background-secondary)',
          color: 'var(--color-text-primary)',
          transition: 'var(--effect-transition-normal)',
          '&:hover': {
            boxShadow: 'var(--effect-shadow-md)',
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--color-background-elevated)',
          color: 'var(--color-text-primary)',
          boxShadow: 'var(--effect-shadow-sm)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--color-background-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-default)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            transition: 'var(--effect-transition-normal)',
            '& fieldset': {
              borderColor: 'var(--color-border-default)'
            },
            '&:hover fieldset': {
              borderColor: 'var(--color-border-hover)'
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--color-border-focus)'
            }
          },
          '& .MuiInputLabel-root': {
            color: 'var(--color-text-secondary)'
          }
        }
      }
    }
  }
})

// Hook to get adaptive Material-UI theme
export const useAdaptiveMuiTheme = () => {
  try {
    const { isDarkMode, currentTheme } = useCustomTheme()
    return createTheme(createAdaptiveTheme(isDarkMode, currentTheme))
  } catch {
    // Fallback theme if custom theme context is not available
    return createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#1976d2' }
      }
    })
  }
}

// Default theme export for backward compatibility
export const theme = createTheme(createAdaptiveTheme(false, {
  colors: {
    accent: { primary: '#1976d2', hover: '#42a5f5', active: '#1565c0' },
    background: { primary: '#ffffff', secondary: '#f5f5f5' },
    text: { primary: 'rgba(0, 0, 0, 0.87)', secondary: 'rgba(0, 0, 0, 0.6)' },
    status: {
      success: '#2e7d32',
      warning: '#f57f17',
      error: '#d32f2f',
      info: '#1976d2'
    }
  }
}))