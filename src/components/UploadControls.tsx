import { useAppStore } from '../store/useAppStore'

export function UploadControls() {
  const { 
    parallelCount, 
    setParallelCount,
    isUploading,
    isDarkMode
  } = useAppStore()

  return (
    <div className="card">
      <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Parallel Uploads
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={parallelCount}
            onChange={(e) => setParallelCount(parseInt(e.target.value))}
            className="input w-20"
            disabled={isUploading}
          />
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Number of simultaneous uploads (1-10)
          </p>
        </div>

      </div>
    </div>
  )
}
