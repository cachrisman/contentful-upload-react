const STORAGE_KEY = 'contentful-uploader-storage'

const getStoredThemePreference = (): boolean | null => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (typeof parsed?.state?.isDarkMode === 'boolean') {
      return parsed.state.isDarkMode
    }
    return null
  } catch (error) {
    console.warn('Failed to read stored theme preference:', error)
    return null
  }
}

const getSystemThemePreference = (): boolean => {
  if (typeof window === 'undefined' || typeof matchMedia === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const applyThemeClass = (isDark: boolean) => {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export const getPreferredTheme = (): boolean => {
  const storedPreference = getStoredThemePreference()
  return storedPreference ?? getSystemThemePreference()
}

export const initializeTheme = () => {
  applyThemeClass(getPreferredTheme())
}
