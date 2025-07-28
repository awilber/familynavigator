import { Theme } from '../types'

export const darkTheme: Theme = {
  name: 'dark',
  displayName: 'Dark Mode',
  colors: {
    background: {
      primary: '#121212',
      secondary: '#1E1E1E',
      elevated: '#252525',
      overlay: 'rgba(0, 0, 0, 0.7)'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.60)',
      muted: 'rgba(255, 255, 255, 0.38)'
    },
    accent: {
      primary: '#5E9EFF',
      hover: '#7DB3FF',
      active: '#4A8FE7',
      gradient: 'linear-gradient(135deg, #5E9EFF 0%, #9D7EFF 100%)'
    },
    status: {
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA'
    },
    border: {
      default: 'rgba(255, 255, 255, 0.12)',
      focus: '#5E9EFF',
      hover: 'rgba(255, 255, 255, 0.24)'
    }
  },
  effects: {
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.6)',
      md: '0 4px 6px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.2)'
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