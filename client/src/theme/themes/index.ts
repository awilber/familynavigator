import { lightTheme } from './light'
import { darkTheme } from './dark'
import { Theme } from '../types'

export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme
}

export const availableThemes = Object.values(themes)
export const defaultTheme = 'dark'

export { lightTheme, darkTheme }