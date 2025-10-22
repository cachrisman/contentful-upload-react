import React from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, Play, Square, Loader2 } from 'lucide-react'
import { useAppStore, UploadFile } from '../store/useAppStore'
import { contentfulService } from '../services/contentfulService'
import toast from 'react-hot-toast'

export function FileDropzone() {
  const { 
    addFiles, 
    credentials, 
    files, 
    isUploading, 
    setIsUploading, 
    updateFileStatus,
    setIsConnected,
    setIsConnecting,
    isConnecting,
    isDarkMode,
    parallelCount
  } = useAppStore()

  const [isCancelled, setIsCancelled] = React.useState(false)

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('No files selected')
      return
    }

    addFiles(acceptedFiles)
    toast.success(`Added ${acceptedFiles.length} file(s)`)
  }, [addFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  })

  const isConfigured = credentials.spaceId && credentials.environmentId && credentials.token

  const handleUpload = async () => {
    if (!credentials.spaceId || !credentials.environmentId || !credentials.token) {
      toast.error('Please configure your credentials first')
      return
    }

    if (files.length === 0) {
      toast.error('No files to upload')
      return
    }

    setIsUploading(true)
    setIsConnecting(true)
    setIsCancelled(false)
    toast.loading('Connecting to Contentful...', { id: 'connection' })

    try {
      // Connect to Contentful
      const connection = await contentfulService.connect(credentials)
      
      if (!connection.success) {
        toast.error(`Connection failed: ${connection.error}`, { id: 'connection' })
        setIsUploading(false)
        setIsConnecting(false)
        return
      }

      setIsConnected(true)
      setIsConnecting(false)
      toast.success('Connected to Contentful!', { id: 'connection' })

      // Upload files with concurrency control
      const pendingFiles = files.filter(f => f.status === 'pending')
      const uploadPromises: Promise<void>[] = []
      const semaphore = new Semaphore(parallelCount)

      for (const file of pendingFiles) {
        const promise = uploadFileWithSemaphore(file, semaphore)
        uploadPromises.push(promise)
      }

      await Promise.all(uploadPromises)

      if (!isCancelled) {
        toast.success('All uploads completed!')
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setIsConnecting(false)
      setIsConnected(false)
    }
  }

  const uploadFileWithSemaphore = async (file: UploadFile, semaphore: Semaphore) => {
    await semaphore.acquire()
    
    try {
      updateFileStatus(file.id, { status: 'processing', progress: 0 })
      
      const result = await contentfulService.uploadFile(
        file.file,
        (progress) => updateFileStatus(file.id, { progress })
      )

      if (result.success && result.asset) {
        updateFileStatus(file.id, {
          status: 'completed',
          progress: 100,
          assetId: result.asset.sys.id,
          assetUrl: contentfulService.getAssetUrl(result.asset),
          contentfulUrl: contentfulService.getContentfulUrl(
            result.asset, 
            credentials.spaceId, 
            credentials.environmentId
          )
        })
        toast.success(`Uploaded: ${file.file.name}`)
      } else {
        updateFileStatus(file.id, {
          status: 'failed',
          error: result.error
        })
        toast.error(`Failed: ${file.file.name} - ${result.error}`)
      }
    } catch (error) {
      updateFileStatus(file.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      semaphore.release()
    }
  }

  const handleCancel = () => {
    setIsCancelled(true)
    setIsUploading(false)
    toast.error('Upload cancelled')
  }


  return (
    <div className="card">
      <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Files</h2>
      
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20' 
            : isDarkMode 
              ? 'border-gray-600 hover:border-gray-500' 
              : 'border-gray-300 hover:border-gray-400'
          }
          ${!isConfigured ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={!isConfigured} />
        
        <div className="flex flex-col items-center space-y-4">
          {isDragActive ? (
            <>
              <FolderOpen className="w-12 h-12 text-blue-500" />
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
                Drop files here...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Release to upload
              </p>
            </>
          ) : (
            <>
              <Upload className={`w-12 h-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Drag & drop files or folders here
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                or click to browse
              </p>
            </>
          )}
        </div>

        {!isConfigured && (
          <p className={`text-sm mt-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            Please configure your Contentful credentials first
          </p>
        )}
      </div>

      {/* Upload Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || !isConfigured}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isConnecting ? 'Connecting...' : isUploading ? 'Uploading...' : 'Start Upload'}
          </button>
          
          {isUploading && (
            <button
              onClick={handleCancel}
              className="btn btn-danger flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// Simple semaphore implementation for concurrency control
class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve)
    })
  }

  release(): void {
    this.permits++
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!
      this.permits--
      resolve()
    }
  }
}
