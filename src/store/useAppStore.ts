import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error?: string
  assetId?: string
  assetUrl?: string
  contentfulUrl?: string
  startTime?: number
  endTime?: number
  estimatedTimeRemaining?: number
  uploadSpeed?: number // bytes per second
}

export interface Credentials {
  spaceId: string
  environmentId: string
  token: string
}

interface AppState {
  // Credentials
  credentials: Credentials
  setCredentials: (creds: Partial<Credentials>) => void
  clearCredentials: () => void
  
  // Files
  files: UploadFile[]
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  updateFileStatus: (id: string, updates: Partial<UploadFile>) => void
  
  // Upload state
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void
  
  // Settings
  parallelCount: number
  setParallelCount: (count: number) => void
  
  // Tagging
  enableTagging: boolean
  setEnableTagging: (enabled: boolean) => void
  tagName: string
  setTagName: (name: string) => void
  autoTagFromFolder: boolean
  setAutoTagFromFolder: (enabled: boolean) => void
  
  // UI state
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  isConnecting: boolean
  setIsConnecting: (connecting: boolean) => void
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  isDarkMode: boolean
  setIsDarkMode: (dark: boolean) => void
  
  // Rate limiting tracking
  rateLimitCount: number
  incrementRateLimit: () => void
  resetRateLimitCount: () => void
  
  // Upload timing
  uploadStartTime?: number
  uploadEndTime?: number
  firstEstimate?: number
  setUploadStartTime: (time?: number) => void
  setUploadEndTime: (time?: number) => void
  setFirstEstimate: (time?: number) => void
  getEstimatedCompletionTime: () => number | null
  getSessionDuration: () => number | null
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get): AppState => ({
      // Credentials
      credentials: {
        spaceId: '',
        environmentId: '',
        token: ''
      },
      setCredentials: (creds) => set((state) => ({
        credentials: { ...state.credentials, ...creds }
      })),
      clearCredentials: () => set({
        credentials: { spaceId: '', environmentId: '', token: '' }
      }),
      
      // Files
      files: [],
      addFiles: (newFiles) => {
        const existingIds = new Set(get().files.map(f => f.id))
        const uniqueFiles = newFiles.filter(file => {
          const id = `${file.name}-${file.size}-${file.lastModified}-${file.type}`
          return !existingIds.has(id)
        })
        
        const uploadFiles: UploadFile[] = uniqueFiles.map(file => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${file.type}`,
          file,
          status: 'pending',
          progress: 0
        }))
        
        set((state) => ({
          files: [...state.files, ...uploadFiles]
        }))
      },
      removeFile: (id) => set((state) => ({
        files: state.files.filter(f => f.id !== id)
      })),
      clearFiles: () => set({ 
        files: [], 
        uploadStartTime: undefined, 
        uploadEndTime: undefined,
        firstEstimate: undefined,
        rateLimitCount: 0
      }),
      updateFileStatus: (id, updates) => set((state) => ({
        files: state.files.map(f => f.id === id ? { ...f, ...updates } : f)
      })),
      
      // Upload state
      isUploading: false,
      setIsUploading: (uploading) => set({ isUploading: uploading }),
      
      // Settings
      parallelCount: 3,
      setParallelCount: (count) => set({ 
        parallelCount: Math.max(1, Math.min(10, Math.round(count))) 
      }),
      
      // Tagging
      enableTagging: false,
      setEnableTagging: (enabled) => set({ enableTagging: enabled }),
      tagName: '',
      setTagName: (name) => set({ tagName: name }),
      autoTagFromFolder: true,
      setAutoTagFromFolder: (enabled) => set({ autoTagFromFolder: enabled }),
      
      // UI state
      isConnected: false,
      setIsConnected: (connected) => set({ isConnected: connected }),
      isConnecting: false,
      setIsConnecting: (connecting) => set({ isConnecting: connecting }),
      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),
      isDarkMode: false,
      setIsDarkMode: (dark) => set({ isDarkMode: dark }),
      
      // Rate limiting tracking
      rateLimitCount: 0,
      incrementRateLimit: () => set((state) => ({ rateLimitCount: state.rateLimitCount + 1 })),
      resetRateLimitCount: () => set({ rateLimitCount: 0 }),
      
      // Upload timing
      uploadStartTime: undefined,
      uploadEndTime: undefined,
      firstEstimate: undefined,
      setUploadStartTime: (time) => set({ uploadStartTime: time }),
      setUploadEndTime: (time) => set({ uploadEndTime: time }),
      setFirstEstimate: (time) => set({ firstEstimate: time }),
      getEstimatedCompletionTime: () => {
        const state = get()
        if (!state.uploadStartTime || !state.isUploading) return null
        
        // Calculate average upload speed from completed files
        const completedFiles = state.files.filter(f => f.status === 'completed' && f.startTime && f.endTime)
        if (completedFiles.length === 0) return null
        
        // Use weighted average giving more weight to recent uploads
        // Calculate weighted average speed (more recent files have higher weight)
        let weightedSpeed = 0
        let totalWeight = 0
        completedFiles.forEach((file, index) => {
          const weight = completedFiles.length - index // More recent files have higher weight
          const fileSpeed = file.file.size / (file.endTime! - file.startTime!)
          weightedSpeed += fileSpeed * weight
          totalWeight += weight
        })
        
        const avgSpeed = weightedSpeed / totalWeight // bytes per ms
        
        // Calculate remaining work
        const remainingFiles = state.files.filter(f => f.status === 'pending' || f.status === 'processing')
        const remainingBytes = remainingFiles.reduce((sum, f) => sum + f.file.size, 0)
        
        // Apply efficiency factor based on parallel uploads (diminishing returns)
        const efficiencyFactor = Math.min(state.parallelCount * 0.8, 1.0) // Max 80% efficiency for parallel uploads
        
        // Estimate time remaining based on weighted average speed and parallel uploads
        const now = Date.now()
        const estimatedTimeRemaining = remainingBytes / (avgSpeed * state.parallelCount * efficiencyFactor)
        
        return now + estimatedTimeRemaining
      },
      getSessionDuration: () => {
        const state = get()
        if (!state.uploadStartTime) return null
        
        const endTime = state.uploadEndTime || Date.now()
        return endTime - state.uploadStartTime
      }
    }),
    {
      name: 'contentful-uploader-storage',
      partialize: (state) => ({
        credentials: state.credentials,
        parallelCount: state.parallelCount,
        showSettings: state.showSettings,
        isDarkMode: state.isDarkMode,
        enableTagging: state.enableTagging,
        tagName: state.tagName,
        autoTagFromFolder: state.autoTagFromFolder
      })
    }
  )
)
