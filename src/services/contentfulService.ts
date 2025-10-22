import { createClient, ClientAPI, Environment, Asset } from 'contentful-management'

export class ContentfulService {
  private client: ClientAPI | null = null
  private environment: Environment | null = null

  async connect(credentials: { spaceId: string; environmentId: string; token: string }) {
    try {
      this.client = createClient({
        accessToken: credentials.token,
        retryOnError: true,
        retryLimit: 5
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

  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<{
    success: boolean
    asset?: Asset
    error?: string
  }> {
    if (!this.environment) {
      return { success: false, error: 'Not connected to Contentful' }
    }

    try {
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

      onProgress?.(50)

      const processedAsset = await asset.processForAllLocales({
        processingCheckWait: 1000,
        processingCheckRetries: 30
      })

      onProgress?.(80)

      const publishedAsset = await processedAsset.publish()

      onProgress?.(100)

      return { success: true, asset: publishedAsset }
    } catch (error) {
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
}

export const contentfulService = new ContentfulService()
