import { createClient, ClientAPI, Environment, Asset, Tag } from 'contentful-management'
import { useAppStore } from '../store/useAppStore'

export class ContentfulService {
  private client: ClientAPI | null = null
  private environment: Environment | null = null

  async connect(credentials: { spaceId: string; environmentId: string; token: string }) {
    try {
      this.client = createClient({
        accessToken: credentials.token,
        retryOnError: true,
        retryLimit: 5,
        // Use response logger to intercept rate limit errors
        responseLogger: (response: unknown) => {
          if (typeof response === 'object' && response !== null && 'status' in response) {
            const responseWithStatus = response as { status: number }
            if (responseWithStatus.status === 429) {
              const store = useAppStore.getState()
              store.incrementRateLimit()
            }
          }
        },
        // Use request logger for debugging
        requestLogger: (config: unknown) => {
          // Only log in development mode
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            if (typeof config === 'object' && config !== null && 'method' in config && 'url' in config) {
              const configWithMethod = config as { method: string; url: string }
              console.debug('Contentful API Request:', configWithMethod.method?.toUpperCase(), configWithMethod.url)
            }
          }
        },
        // Custom log handler to intercept SDK warnings and errors
        logHandler: (level: string, data: unknown) => {
          const message = typeof data === 'string' ? data : String(data)
          
          // Check for rate limit related messages
          if (this.isRateLimitMessage(message)) {
            const store = useAppStore.getState()
            store.incrementRateLimit()
            return // Don't log rate limit messages
          }
          
          // Log other messages normally
          if (level === 'error') {
            console.error('Contentful SDK Error:', data)
          } else if (level === 'warning') {
            console.warn('Contentful SDK Warning:', data)
          } else {
            console.log('Contentful SDK Info:', data)
          }
        }
      })

      const space = await this.client.getSpace(credentials.spaceId)
      this.environment = await space.getEnvironment(credentials.environmentId)
      
      return { success: true, environment: this.environment }
    } catch (error) {
      console.error('Connection failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async uploadFile(file: File, onProgress?: (progress: number) => void, signal?: AbortSignal, tag?: Tag): Promise<{
    success: boolean
    asset?: Asset
    error?: string
  }> {
    if (!this.environment) {
      return { success: false, error: 'Not connected to Contentful' }
    }

    try {
      // Check if cancelled before starting
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }

      onProgress?.(10)

      const asset = await this.environment.createAssetFromFiles({
        fields: {
          title: { 'en-US': file.name },
          description: { 'en-US': file.name },
          file: {
            'en-US': {
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
              file
            }
          }
        }
      })

      // Check if cancelled after asset creation
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }

      onProgress?.(50)

      const processedAsset = await asset.processForAllLocales({
        processingCheckWait: 1000,
        processingCheckRetries: 30
      })

      // Check if cancelled after processing
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }

      onProgress?.(80)

      // Apply tag before publishing if provided
      let assetToPublish = processedAsset
      if (tag) {
        const tagResult = await this.applyTagToAsset(processedAsset, tag)
        if (tagResult.success && tagResult.asset) {
          assetToPublish = tagResult.asset
        } else {
          console.warn(`Failed to apply tag to asset ${processedAsset.sys.id}:`, tagResult.error)
        }
      }

      const publishedAsset = await assetToPublish.publish()

      // Check if cancelled after publishing
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }

      onProgress?.(100)

      return { success: true, asset: publishedAsset }
    } catch (error) {
      // Don't log cancellation as an error
      if (signal?.aborted || (error instanceof Error && error.message === 'Upload cancelled')) {
        return { success: false, error: 'Upload cancelled' }
      }
      
      // Check for rate limit errors specifically
      if (this.isRateLimitError(error)) {
        const store = useAppStore.getState()
        store.incrementRateLimit()
        
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please wait a moment and try again.' 
        }
      }
      
      console.error('Upload failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  getAssetUrl(asset: Asset): string {
    const fileUrl = asset.fields.file['en-US']?.url
    if (!fileUrl) {
      throw new Error('Asset file URL not found')
    }
    return fileUrl.startsWith('http') ? fileUrl : `https:${fileUrl}`
  }

  getContentfulUrl(asset: Asset, spaceId: string, environmentId: string): string {
    return `https://app.contentful.com/spaces/${spaceId}/environments/${environmentId}/assets/${asset.sys.id}`
  }

  async checkTagExists(tagName: string): Promise<{
    success: boolean
    exists: boolean
    tag?: Tag
    error?: string
  }> {
    if (!this.environment) {
      return { success: false, exists: false, error: 'Not connected to Contentful' }
    }

    try {
      // Generate a unique tag ID based on the name
      const tagId = tagName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      
      // Try to get the tag
      const tag = await this.environment.getTag(tagId)
      return { success: true, exists: true, tag }
    } catch (error) {
      // If tag doesn't exist, Contentful will throw an error
      if (error instanceof Error && error.message.includes('not found')) {
        return { success: true, exists: false }
      }
      
      console.error('Tag check failed:', error)
      return { 
        success: false, 
        exists: false,
        error: error instanceof Error ? error.message : 'Tag check failed' 
      }
    }
  }

  async createPrivateTag(tagName: string): Promise<{
    success: boolean
    tag?: Tag
    error?: string
  }> {
    if (!this.environment) {
      return { success: false, error: 'Not connected to Contentful' }
    }

    try {
      // First check if tag already exists
      const checkResult = await this.checkTagExists(tagName)
      if (checkResult.success && checkResult.exists && checkResult.tag) {
        return { success: true, tag: checkResult.tag }
      }

      // Generate a unique tag ID based on the name
      const tagId = tagName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      
      const tag = await this.environment.createTag(tagId, tagName)

      return { success: true, tag }
    } catch (error) {
      console.error('Tag creation failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Tag creation failed' 
      }
    }
  }

  async applyTagToAsset(asset: Asset, tag: Tag): Promise<{
    success: boolean
    asset?: Asset
    error?: string
  }> {
    if (!this.environment) {
      return { success: false, error: 'Not connected to Contentful' }
    }

    try {
      // Update the asset with the tag
      asset.metadata = {
        tags: [
          {
            sys: {
              type: 'Link',
              linkType: 'Tag',
              id: tag.sys.id
            }
          }
        ]
      }

      const updatedAsset = await asset.update()

      return { success: true, asset: updatedAsset }
    } catch (error) {
      console.error('Tag application failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Tag application failed' 
      }
    }
  }

  private isRateLimitMessage(message: string): boolean {
    const rateLimitKeywords = [
      'rate limit',
      'rate-limit',
      'too many requests',
      '429',
      'quota exceeded',
      'throttle',
      'retry after',
      'retry-after',
      'rate limit exceeded',
      'rate limit hit',
      'rate limit reached',
      'api rate limit',
      'request limit',
      'request quota',
      'throttled',
      'rate limiting',
      'contentful rate limit',
      'management api rate limit'
    ]
    
    const lowerMessage = message.toLowerCase()
    return rateLimitKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error) return false
    
    // Check for HTTP 429 status
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const errorWithResponse = error as { response?: { status: number } }
      if (errorWithResponse.response?.status === 429) {
        return true
      }
    }
    
    // Check for rate limit in error message
    const message = error instanceof Error ? error.message : String(error)
    const rateLimitKeywords = [
      'rate limit',
      'rate-limit',
      'too many requests',
      '429',
      'quota exceeded',
      'throttle',
      'retry after',
      'retry-after',
      'rate limit exceeded',
      'rate limit hit',
      'rate limit reached',
      'api rate limit',
      'request limit',
      'request quota',
      'throttled',
      'rate limiting',
      'contentful rate limit',
      'management api rate limit'
    ]
    
    const lowerMessage = message.toLowerCase()
    return rateLimitKeywords.some(keyword => lowerMessage.includes(keyword))
  }
}

export const contentfulService = new ContentfulService()
