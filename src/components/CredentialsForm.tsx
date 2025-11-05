import React from 'react'
import { Save, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import toast from 'react-hot-toast'

export function CredentialsForm() {
  const { credentials, setCredentials, clearCredentials, isDarkMode } = useAppStore()
  const [showToken, setShowToken] = React.useState(false)

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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Credentials</h2>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Space ID
            </label>
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
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Environment ID
            </label>
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
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              CMA Token
            </label>
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
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                ) : (
                  <Eye className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
