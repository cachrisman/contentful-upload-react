import { useAppStore } from './store/useAppStore'
import { FileDropzone } from './components/FileDropzone'
import { StatusLog } from './components/StatusLog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Settings as SettingsIcon, Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { Settings } from './components/Settings'
import { Toaster } from 'sonner'
import './services/rateLimitInterceptor' // Initialize rate limit interceptor

function App() {
  const { credentials, showSettings, setShowSettings, isDarkMode, setIsDarkMode } = useAppStore()
  
  const hasCredentials = credentials.spaceId && credentials.environmentId && credentials.token
  const shouldShowSettings = showSettings

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Force settings modal open until required credentials are provided
  useEffect(() => {
    if (!hasCredentials && !showSettings) {
      setShowSettings(true)
    }
  }, [hasCredentials, showSettings, setShowSettings])

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto h-full p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="relative shrink-0">
            <div className="flex items-center justify-between min-h-20">
              <div className="shrink-0">
                {hasCredentials && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title={shouldShowSettings ? 'Hide settings (Ctrl+,)' : 'Show settings (Ctrl+,)'}
                  >
                    <SettingsIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {shouldShowSettings ? 'Hide Settings' : 'Settings'}
                    </span>
                  </button>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Contentful Asset Uploader
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Upload files and folders to your Contentful space with parallel processing
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isDarkMode ? 'Light' : 'Dark'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
            <div className="w-full lg:w-1/3 h-full">
              <FileDropzone />
            </div>
            <div className="w-full lg:w-2/3 h-full min-h-0">
              <StatusLog />
            </div>
          </div>

          <Settings 
            isOpen={shouldShowSettings} 
            onClose={() => setShowSettings(false)} 
            canClose={!!hasCredentials} 
          />
          <Toaster richColors position="top-right" theme={isDarkMode ? 'dark' : 'light'} />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
