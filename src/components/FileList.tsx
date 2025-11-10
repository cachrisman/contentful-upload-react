import { Trash2, ExternalLink, FileText, AlertCircle, Image, File, Music, Video, Archive, Clock } from 'lucide-react'
import { useAppStore, type UploadFile } from "../store/useAppStore";
import clsx from 'clsx'
import { toast } from 'sonner'

interface FileListProps {
  fillHeight?: boolean
}

export function FileList({ fillHeight = false }: FileListProps) {
  const { files, removeFile, isUploading, clearFiles, isDarkMode, getEstimatedCompletionTime } = useAppStore()

  const handleClearFiles = () => {
    clearFiles()
    toast.success('Files cleared')
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'processing': return 'status-processing'
      case 'completed': return 'status-completed'
      case 'failed': return 'status-failed'
      case 'cancelled': return 'status-cancelled'
      default: return 'status-pending'
    }
  }

  const getStatusText = (file: UploadFile) => {
    if (file.status === 'processing') {
      return `Processing... ${file.progress}%`
    }
    if (file.status === 'failed') {
      return `Failed: ${file.error}`
    }
    return file.status.charAt(0).toUpperCase() + file.status.slice(1)
  }

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
    if (type.startsWith('video/')) return <Video className="w-4 h-4 text-purple-500" />
    if (type.startsWith('audio/')) return <Music className="w-4 h-4 text-green-500" />
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return <Archive className="w-4 h-4 text-orange-500" />
    return <File className="w-4 h-4 text-gray-500" />
  }

  const getStatusPriority = (status: string) => {
    switch (status) {
      case 'processing': return 1
      case 'pending': return 2
      case 'failed': return 3
      case 'cancelled': return 4
      case 'completed': return 5
      default: return 6
    }
  }

  const sortedFiles = [...files].sort((a, b) => {
    // First sort by status priority
    const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status)
    if (statusDiff !== 0) return statusDiff
    
    // Then sort alphabetically by filename
    return a.file.name.localeCompare(b.file.name)
  })

  return (
    <div className={clsx('card', fillHeight && 'flex flex-col h-full min-h-0')}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Files ({files.length})
          </h2>
          {isUploading && getEstimatedCompletionTime() && (
            <div className={`flex items-center gap-1 text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Clock className="w-3 h-3" />
              <span>Est. completion: {new Date(getEstimatedCompletionTime()!).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        {files.length > 0 && (
          <button
            onClick={handleClearFiles}
            disabled={isUploading}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Files
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className={clsx('text-center py-12', fillHeight && 'flex-1 flex flex-col items-center justify-center')}>
          <FileText className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No files selected</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Drag and drop files or folders to get started</p>
        </div>
      ) : (
        <div className={clsx('overflow-x-auto', fillHeight && 'flex-1 min-h-0')}>
          <div className={clsx('overflow-y-auto', fillHeight ? 'h-full' : 'max-h-[60vh]')}>
            <table className="w-full">
              <thead className={clsx('sticky top-0 z-10', isDarkMode ? 'bg-gray-900' : 'bg-white')}>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-2.5 px-2 font-medium w-2/5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>File</th>
                  <th className={`text-left py-2.5 px-2 font-medium w-20 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Size</th>
                  <th className={`text-left py-2.5 px-2 font-medium w-10 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
                  <th className={`text-left py-2.5 px-2 font-medium w-32 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                  <th className={`text-left py-2.5 px-2 font-medium w-16 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiles.map((file) => (
                  <tr key={file.id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-100'
                  }`}>
                    <td className="py-2.5 px-2 w-2/5 max-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(file.file)}
                        <span 
                          className={`text-sm font-medium truncate flex-1 min-w-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                          title={file.file.name}
                        >
                          {file.file.name}
                        </span>
                      </div>
                    </td>
                    <td className={`py-2.5 px-2 w-20 text-sm text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatBytes(file.file.size)}
                    </td>
                    <td className={`py-2.5 px-2 w-10 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {file.file.type || 'Unknown'}
                    </td>
                    <td className="py-2.5 px-2 w-32">
                      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusClass(file.status))}>
                        {getStatusText(file)}
                      </span>
                      {file.status === 'processing' && (
                        <div className={`w-full rounded-full h-1 mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 w-16 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {file.status === 'completed' && file.contentfulUrl && (
                          <a
                            href={file.contentfulUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="View in Contentful"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {file.status === 'completed' && file.assetUrl && (
                          <a
                            href={file.assetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
                            title="View file"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {file.status === 'failed' && (
                          <div className="text-red-600" title={file.error}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          disabled={isUploading && file.status === 'processing'}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
