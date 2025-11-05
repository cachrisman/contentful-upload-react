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
  
  // UI state
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
  isConnecting: boolean
  setIsConnecting: (connecting: boolean) => void
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  isDarkMode: boolean
  setIsDarkMode: (dark: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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
      clearFiles: () => set({ files: [] }),
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
      
      // UI state
      isConnected: false,
      setIsConnected: (connected) => set({ isConnected: connected }),
      isConnecting: false,
      setIsConnecting: (connecting) => set({ isConnecting: connecting }),
      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),
      isDarkMode: false,
      setIsDarkMode: (dark) => set({ isDarkMode: dark })
    }),
    {
      name: 'contentful-uploader-storage',
      partialize: (state) => ({
        credentials: state.credentials,
        parallelCount: state.parallelCount,
        showSettings: state.showSettings,
        isDarkMode: state.isDarkMode,
        enableTagging: state.enableTagging,
        tagName: state.tagName
      })
    }
  )
)
