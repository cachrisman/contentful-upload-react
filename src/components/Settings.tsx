import React from 'react'
import { Eye, EyeOff, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  canClose: boolean
}

export function Settings({ isOpen, onClose, canClose }: SettingsProps) {
  const {
    credentials,
    setCredentials,
    clearCredentials,
    parallelCount,
    setParallelCount,
    isUploading,
    isDarkMode,
    autoTagFromFolder,
    setAutoTagFromFolder
  } = useAppStore()

  const [showToken, setShowToken] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) {
      setShowToken(false)
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen || !canClose) return

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, canClose, onClose])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  const handleSave = () => {
    if (!credentials.spaceId || !credentials.environmentId || !credentials.token) {
      toast.error('Please fill in all credential fields')
      return
    }
    toast.success('Credentials saved successfully')
  }

  const handleClear = () => {
    clearCredentials()
    toast.success('Credentials cleared')
  }

  const handleModalClose = () => {
    if (canClose) {
      onClose()
    }
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canClose) return
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleParallelChange = (value: string) => {
    const parsedValue = parseInt(value, 10)
    if (!Number.isNaN(parsedValue)) {
      setParallelCount(parsedValue)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={handleOverlayClick}
    >
      <div className={`relative w-full max-w-3xl rounded-2xl shadow-2xl border ${
        isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <button
          type="button"
          onClick={handleModalClose}
          disabled={!canClose}
          className={`absolute right-4 top-4 rounded-full p-2 transition-colors ${
            canClose
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'cursor-not-allowed opacity-60'
          }`}
          aria-label={canClose ? 'Close settings' : 'Complete credentials to close'}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Settings</h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
              Manage your Contentful credentials and upload preferences.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="text-lg font-medium">Credentials</h3>
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Space ID</label>
                  <input
                    autoComplete="off"
                    type="text"
                    className="input"
                    placeholder="Enter Space ID"
                    value={credentials.spaceId}
                    onChange={(e) => setCredentials({ spaceId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Environment ID</label>
                  <input
                    autoComplete="off"
                    type="text"
                    className="input"
                    placeholder="e.g., master"
                    value={credentials.environmentId}
                    onChange={(e) => setCredentials({ environmentId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">CMA Token</label>
                  <div className="relative">
                    <input
                      autoComplete="off"
                      type={showToken ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Enter Content Management API Token"
                      value={credentials.token}
                      onChange={(e) => setCredentials({ token: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowToken((prev) => !prev)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Credentials
                </button>
              </form>
            </div>

            <div className={`rounded-xl border h-full ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="px-5 pt-5">
                <h3 className="text-lg font-medium">Upload Settings</h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure how many files upload concurrently.
                </p>
              </div>
              <div className="px-5 pb-5 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Parallel Uploads</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={parallelCount}
                    onChange={(e) => handleParallelChange(e.target.value)}
                    className="input w-24"
                    disabled={isUploading}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Number of simultaneous uploads (1-10)
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700'} text-sm`}>
                  High concurrency increases speed but may trigger API rate limits.
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoTagFromFolder"
                    checked={autoTagFromFolder}
                    onChange={(e) => setAutoTagFromFolder(e.target.checked)}
                    disabled={isUploading}
                    className="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700"
                  />
                  <div>
                    <label 
                      htmlFor="autoTagFromFolder" 
                      className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}
                    >
                      Tag based on folder name
                    </label>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      When enabled, dropping a folder automatically turns on tagging and uses the folder name for the tag.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
