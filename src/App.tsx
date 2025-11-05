import { useAppStore } from './store/useAppStore'
import { CredentialsForm } from './components/CredentialsForm'
import { FileDropzone } from './components/FileDropzone'
import { FileList } from './components/FileList'
import { UploadControls } from './components/UploadControls'
import { StatusLog } from './components/StatusLog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Settings, Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'

function App() {
  const { files, credentials, showSettings, setShowSettings, isDarkMode, setIsDarkMode } = useAppStore()
  
  const hasCredentials = credentials.spaceId && credentials.environmentId && credentials.token

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="relative my-6">
          <div className="flex items-center justify-between min-h-[80px]">
            <div className="flex-shrink-0">
              {hasCredentials && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={showSettings ? 'Hide settings (Ctrl+,)' : 'Show settings (Ctrl+,)'}
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {showSettings ? 'Hide Settings' : 'Settings'}
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
            <div className="flex-shrink-0">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Configuration or Status/Upload */}
          <div className="lg:col-span-1 space-y-6">
            {hasCredentials && !showSettings ? (
              // When credentials are saved and settings are hidden, show StatusLog and FileDropzone
              <>
                {files.length > 0 && <StatusLog isLeftColumn={true} />}
                <FileDropzone />
              </>
            ) : (
              // When settings are shown or no credentials, show settings panels
              <>
                <CredentialsForm />
                <UploadControls />
              </>
            )}
          </div>

          {/* Right Column - File Management */}
          <div className="space-y-6 lg:col-span-2">
            {hasCredentials && !showSettings ? (
              // When settings are hidden, show FileList if files exist, otherwise show StatusLog
              files.length > 0 ? <FileList /> : <StatusLog />
            ) : (
              // When settings are shown, show the original layout
              <>
                <StatusLog />
                <FileDropzone />
                {files.length > 0 && <FileList />}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
