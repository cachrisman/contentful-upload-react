import React from 'react'
import { useDropzone, type DropEvent, type FileRejection, type FileWithPath } from 'react-dropzone'
import { Upload, FolderOpen, Play, Square, Loader2 } from 'lucide-react'
import { useAppStore, type UploadFile } from '../store/useAppStore'
import { contentfulService } from '../services/contentfulService'
import type { Tag } from 'contentful-management'
import { toast } from 'sonner'

const CONNECTION_TOAST_ID = 'connection'

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
    parallelCount,
    setUploadStartTime,
    setUploadEndTime,
    setFirstEstimate,
    resetRateLimitCount,
    enableTagging,
    setEnableTagging,
    tagName,
    setTagName,
    autoTagFromFolder
  } = useAppStore()

  const [abortController, setAbortController] = React.useState<AbortController | null>(null)

  const onDrop = React.useCallback((
    acceptedFiles: FileWithPath[],
    _fileRejections: FileRejection[],
    _event: DropEvent
  ) => {
    if (acceptedFiles.length === 0) {
      toast.error('No files selected')
      return
    }

    type FileWithPossibleRelativePath = FileWithPath & { webkitRelativePath?: string }
    const getRelativePath = (file: FileWithPossibleRelativePath) => {
      if (file.path) return file.path
      if (file.webkitRelativePath) return file.webkitRelativePath
      return file.name
    }

    let folderDropped = false
    let skippedSubfolderFiles = 0
    const topFolderNames = new Set<string>()
    const filesFromTopFolders: File[] = []

    acceptedFiles.forEach((file) => {
      const relativePath = getRelativePath(file as FileWithPossibleRelativePath)
      const hasPathSegments = relativePath.includes('/')
      if (!hasPathSegments) {
        filesFromTopFolders.push(file)
        return
      }

      folderDropped = true
      const segments = relativePath.split('/').filter(Boolean)
      const [topFolder, ...rest] = segments
      if (topFolder) {
        topFolderNames.add(topFolder)
      }

      if (rest.length > 1) {
        skippedSubfolderFiles += 1
        return
      }

      filesFromTopFolders.push(file)
    })

    if (folderDropped && filesFromTopFolders.length === 0) {
      toast.warning('Subfolders detected. Only files in the top folder can be added. Drop each subfolder separately.')
      return
    }

    if (filesFromTopFolders.length === 0) {
      toast.error('No files selected')
      return
    }

    if (skippedSubfolderFiles > 0) {
      toast.warning(
        `Skipped ${skippedSubfolderFiles} file${skippedSubfolderFiles === 1 ? '' : 's'} inside subfolders. Drop each subfolder separately to upload them.`
      )
    }

    addFiles(filesFromTopFolders)
    toast.success(`Added ${filesFromTopFolders.length} file${filesFromTopFolders.length === 1 ? '' : 's'}`)

    if (folderDropped && autoTagFromFolder) {
      const primaryFolderName = topFolderNames.values().next().value as string | undefined
      const sanitizedTagName = primaryFolderName?.trim()
      if (sanitizedTagName) {
        setEnableTagging(true)
        setTagName(sanitizedTagName)
      }
    }
  }, [addFiles, autoTagFromFolder, setEnableTagging, setTagName])

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

    if (enableTagging && !tagName.trim()) {
      toast.error('Enter a tag name or disable tagging before uploading')
      return
    }

    setIsUploading(true)
    setIsConnecting(true)
    
    // Create abort controller locally to avoid React state timing issues
    const controller = new AbortController()
    setAbortController(controller)
    
    // Reset previous session timing before starting new session
    setUploadStartTime(undefined)
    setUploadEndTime(undefined)
    setFirstEstimate(undefined)
    setUploadStartTime(Date.now())
    resetRateLimitCount()

    toast.loading('Connecting to Contentful...', { id: CONNECTION_TOAST_ID })

    try {
      // Connect to Contentful
      const connection = await contentfulService.connect(credentials)
      
      if (!connection.success) {
        toast.error(`Connection failed: ${connection.error}`, { id: CONNECTION_TOAST_ID })
        setIsUploading(false)
        setIsConnecting(false)
        return
      }

      setIsConnected(true)
      setIsConnecting(false)
      toast.success('Connected to Contentful!', { id: CONNECTION_TOAST_ID })

      // Find or create private tag if tagging is enabled
      let tag: Tag | undefined = undefined
      if (enableTagging && tagName.trim()) {
        const tagResult = await contentfulService.findOrCreatePrivateTag(tagName.trim())
        if (tagResult.success && tagResult.tag) {
          tag = tagResult.tag
        } else {
          console.warn('Failed to find or create tag:', tagResult.error)
        }
      }

      // Upload files with concurrency control (using sorted order)
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

      const pendingFiles = sortedFiles.filter(f => f.status === 'pending')
      const uploadPromises: Promise<void>[] = []
      const semaphore = new Semaphore(parallelCount)

      for (const file of pendingFiles) {
        const promise = uploadFileWithSemaphore(file, semaphore, controller, tag)
        uploadPromises.push(promise)
      }

      await Promise.all(uploadPromises)
      
      // Set end time when all uploads complete
      setUploadEndTime(Date.now())

      if (!controller.signal.aborted) {
        toast.success('All uploads completed!')
      }
    } catch (error) {
      console.error('Upload session failed:', error)
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Upload failed: ${message}`)
      }
    } finally {
      setIsUploading(false)
      setIsConnecting(false)
      setIsConnected(false)
      setAbortController(null)
      // Don't reset timing here - let it persist for the session summary
    }
  }

  const uploadFileWithSemaphore = async (file: UploadFile, semaphore: Semaphore, abortController: AbortController, tag?: Tag) => {
    await semaphore.acquire()
    
    const startTime = Date.now()
    
    try {
      // Check if cancelled before starting
      if (abortController?.signal.aborted) {
        updateFileStatus(file.id, { status: 'cancelled' })
        return
      }

      updateFileStatus(file.id, { status: 'processing', progress: 0, startTime })
      
      const result = await contentfulService.uploadFile(
        file.file,
        (progress) => {
          // Check if cancelled during progress updates
          if (abortController?.signal.aborted) {
            updateFileStatus(file.id, { status: 'cancelled' })
            return
          }
          updateFileStatus(file.id, { progress })
        },
        abortController?.signal,
        tag
      )

      // Check if cancelled after upload
      if (abortController?.signal.aborted) {
        updateFileStatus(file.id, { status: 'cancelled' })
        return
      }

      const endTime = Date.now()
      const duration = endTime - startTime
      const uploadSpeed = file.file.size / duration // bytes per ms

      if (result.success && result.asset) {
        updateFileStatus(file.id, {
          status: 'completed',
          progress: 100,
          endTime,
          uploadSpeed: uploadSpeed * 1000, // convert to bytes per second
          assetId: result.asset.sys.id,
          assetUrl: contentfulService.getAssetUrl(result.asset),
          contentfulUrl: contentfulService.getContentfulUrl(
            result.asset, 
            credentials.spaceId, 
            credentials.environmentId
          )
        })
        
        toast.success(`Uploaded: ${file.file.name}`)

        // Capture first estimate after first file completes
        const { getEstimatedCompletionTime, firstEstimate } = useAppStore.getState()
        if (!firstEstimate) {
          const estimate = getEstimatedCompletionTime()
          if (estimate) {
            setFirstEstimate(estimate)
          }
        }
      } else {
        updateFileStatus(file.id, {
          status: 'failed',
          endTime,
          error: result.error
        })
        toast.error(`Failed: ${file.file.name} - ${result.error}`)
      }
    } catch (error) {
      const endTime = Date.now()
      if (abortController?.signal.aborted) {
        updateFileStatus(file.id, {
          status: 'cancelled',
          endTime
        })
      } else {
        console.error(`File upload failed for ${file.file.name}:`, error)
        updateFileStatus(file.id, {
          status: 'failed',
          endTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        toast.error(`Failed: ${file.file.name}`)
      }
    } finally {
      semaphore.release()
    }
  }

  const handleCancel = () => {
    setIsUploading(false)
    
    // Abort all ongoing uploads
    if (abortController) {
      abortController.abort()
    }
    
    // Update all processing files to cancelled status
    files.forEach(file => {
      if (file.status === 'processing') {
        updateFileStatus(file.id, { status: 'cancelled' })
      }
    })

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

      {/* Tagging Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="enableTagging"
            checked={enableTagging}
            onChange={(e) => setEnableTagging(e.target.checked)}
            disabled={isUploading}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700"
          />
          <label 
            htmlFor="enableTagging" 
            className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Add tag to uploaded assets
          </label>
        </div>
        
        {enableTagging && (
          <div>
            <label 
              htmlFor="tagName" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Tag Name
            </label>
            <input
              type="text"
              id="tagName"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Enter tag name..."
              disabled={isUploading}
              autoComplete="off"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              A private tag will be created and applied to all uploaded assets
            </p>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || !isConfigured || (enableTagging && !tagName.trim())}
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
