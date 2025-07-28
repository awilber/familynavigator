import { Theme } from '../types'

export const lightTheme: Theme = {
  name: 'light',
  displayName: 'Light Mode',
  colors: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.60)',
      muted: 'rgba(0, 0, 0, 0.38)'
    },
    accent: {
      primary: '#1976D2',
      hover: '#1565C0',
      active: '#0D47A1',
      gradient: 'linear-gradient(135deg, #1976D2 0%, #7B1FA2 100%)'
    },
    status: {
      success: '#2E7D32',
      warning: '#F57F17',
      error: '#D32F2F',
      info: '#1976D2'
    },
    border: {
      default: 'rgba(0, 0, 0, 0.12)',
      focus: '#1976D2',
      hover: 'rgba(0, 0, 0, 0.24)'
    }
  },
  effects: {
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1)'
    },
    transitions: {
      fast: 'all 0.15s ease-in-out',
      normal: 'all 0.3s ease-in-out',
      slow: 'all 0.5s ease-in-out'
    },
    blur: {
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(16px)'
    }
  }
}