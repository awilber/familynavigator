import React from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import { useTheme } from '../theme/ThemeContext'

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme, currentTheme } = useTheme()

  return (
    <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
      <IconButton
        onClick={toggleTheme}
        sx={{
          color: 'var(--color-text-primary)',
          transition: 'var(--effect-transition-normal)',
          '&:hover': {
            backgroundColor: 'var(--color-background-elevated)',
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          }
        }}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        {isDarkMode ? (
          <Brightness7 sx={{ color: currentTheme.colors.accent.primary }} />
        ) : (
          <Brightness4 sx={{ color: currentTheme.colors.accent.primary }} />
        )}
      </IconButton>
    </Tooltip>
  )
}

export default ThemeToggle