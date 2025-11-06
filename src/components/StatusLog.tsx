import { Activity, CheckCircle, XCircle, Clock, AlertTriangle, Timer } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface StatusLogProps {
  isLeftColumn?: boolean
}

export function StatusLog({ isLeftColumn = false }: StatusLogProps) {
  const { files, isUploading, isDarkMode, rateLimitCount, getEstimatedCompletionTime, uploadStartTime, uploadEndTime, firstEstimate, getSessionDuration } = useAppStore()

  const getStats = () => {
    const total = files.length
    const completed = files.filter(f => f.status === 'completed').length
    const failed = files.filter(f => f.status === 'failed').length
    const processing = files.filter(f => f.status === 'processing').length
    const pending = files.filter(f => f.status === 'pending').length

    return { total, completed, failed, processing, pending }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const isSessionComplete = () => {
    return !isUploading && uploadStartTime && (uploadEndTime || files.every(f => f.status === 'completed' || f.status === 'failed'))
  }

  const stats = getStats()

  return (
    <div className="card">
      <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Status</h2>
      
      <div className={`grid gap-4 mb-6 ${isLeftColumn ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Files</div>
        </div>
        
        <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Completed</div>
        </div>
        
        <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
          <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
        </div>
        
        <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.processing}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Processing</div>
        </div>
      </div>

      {isSessionComplete() && (
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Session Summary</h3>
          <div className="space-y-2">
            {uploadStartTime && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="w-4 h-4" />
                <span>Started: {formatTime(uploadStartTime)}</span>
              </div>
            )}
            {uploadEndTime && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="w-4 h-4" />
                <span>Completed: {formatTime(uploadEndTime)}</span>
              </div>
            )}
            {getSessionDuration() && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Timer className="w-4 h-4" />
                <span>Duration: {formatDuration(getSessionDuration()!)}</span>
              </div>
            )}
            {firstEstimate && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Clock className="w-4 h-4" />
                <span>First estimate: {formatTime(firstEstimate)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Upload in progress...</span>
          </div>
          {getEstimatedCompletionTime() && (
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Clock className="w-4 h-4" />
              <span>Est. completion: {new Date(getEstimatedCompletionTime()!).toLocaleTimeString()}</span>
            </div>
          )}
          {rateLimitCount > 0 && (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{rateLimitCount} rate limit(s) encountered</span>
            </div>
          )}
        </div>
      )}

      {stats.total > 0 && !isUploading && (
        <div className="space-y-2">
          {stats.completed > 0 && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{stats.completed} files uploaded successfully</span>
            </div>
          )}
          
          {stats.failed > 0 && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{stats.failed} files failed to upload</span>
            </div>
          )}
          
          {stats.pending > 0 && (
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm">{stats.pending} files pending</span>
            </div>
          )}
          {rateLimitCount > 0 && (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{rateLimitCount} rate limit(s) encountered</span>
            </div>
          )}
        </div>
      )}

      {stats.total === 0 && (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Activity className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p>No files selected</p>
          <p className="text-sm">Drag and drop files or folders to get started</p>
        </div>
      )}
    </div>
  )
}
