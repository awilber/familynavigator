export interface ThemeColors {
  background: {
    primary: string
    secondary: string
    elevated: string
    overlay: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
  }
  accent: {
    primary: string
    hover: string
    active: string
    gradient: string
  }
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
  border: {
    default: string
    focus: string
    hover: string
  }
}

export interface ThemeEffects {
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  transitions: {
    fast: string
    normal: string
    slow: string
  }
  blur: {
    sm: string
    md: string
    lg: string
  }
}

export interface Theme {
  name: string
  displayName: string
  colors: ThemeColors
  effects: ThemeEffects
}

export interface ThemeContextType {
  currentTheme: Theme
  themeName: string
  availableThemes: Theme[]
  setTheme: (themeName: string) => void
  toggleTheme: () => void
  isDarkMode: boolean
}