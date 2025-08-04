import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {  ThemeContextType } from './types'
import { themes, availableThemes, defaultTheme } from './themes'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<string>(() => {
    // Check localStorage for saved theme preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('familynavigator-theme')
      if (savedTheme && themes[savedTheme]) {
        return savedTheme
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return defaultTheme
  })

  const currentTheme = themes[themeName] || themes[defaultTheme]

  // Apply CSS custom properties to document root
  useEffect(() => {
    const root = document.documentElement
    const theme = currentTheme

    // Apply color variables
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-background-${key}`, value)
    })

    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value)
    })

    Object.entries(theme.colors.accent).forEach(([key, value]) => {
      root.style.setProperty(`--color-accent-${key}`, value)
    })

    Object.entries(theme.colors.status).forEach(([key, value]) => {
      root.style.setProperty(`--color-status-${key}`, value)
    })

    Object.entries(theme.colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--color-border-${key}`, value)
    })

    // Apply effect variables
    Object.entries(theme.effects.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--effect-shadow-${key}`, value)
    })

    Object.entries(theme.effects.transitions).forEach(([key, value]) => {
      root.style.setProperty(`--effect-transition-${key}`, value)
    })

    Object.entries(theme.effects.blur).forEach(([key, value]) => {
      root.style.setProperty(`--effect-blur-${key}`, value)
    })

    // Set theme name for CSS selectors
    root.setAttribute('data-theme', themeName)
    
    // Update document background immediately
    document.body.style.backgroundColor = theme.colors.background.primary
    document.body.style.color = theme.colors.text.primary
    document.body.style.transition = 'background-color 0.3s ease-in-out, color 0.3s ease-in-out'

  }, [currentTheme, themeName])

  const setTheme = (newThemeName: string) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName)
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('familynavigator-theme', newThemeName)
      }
    }
  }

  const toggleTheme = () => {
    const nextTheme = themeName === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
  }

  const isDarkMode = themeName === 'dark'

  const value: ThemeContextType = {
    currentTheme,
    themeName,
    availableThemes,
    setTheme,
    toggleTheme,
    isDarkMode
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}