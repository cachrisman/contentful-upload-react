import { useAppStore } from '../store/useAppStore'
import axios from 'axios'

class RateLimitInterceptor {
  private originalConsoleError: typeof console.error
  private originalConsoleWarn: typeof console.warn
  private originalFetch: typeof fetch
  private originalXMLHttpRequest: typeof XMLHttpRequest
  private originalAxios: unknown = null

  constructor() {
    this.originalConsoleError = console.error
    this.originalConsoleWarn = console.warn
    this.originalFetch = window.fetch
    this.originalXMLHttpRequest = window.XMLHttpRequest

    this.interceptConsole()
    this.interceptFetch()
    this.interceptXMLHttpRequest()
    this.interceptAxios()
    this.interceptGlobalErrors()
  }

  private interceptConsole() {
    // Store references to methods to avoid 'this' context issues
    const isRateLimitMessage = this.isRateLimitMessage.bind(this)
    const isXhrRateLimitError = this.isXhrRateLimitError.bind(this)
    const isAxiosStackError = this.isAxiosStackError.bind(this)
    
    // Intercept console.error to catch SDK warnings and axios errors
    console.error = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // Check for rate limit related messages or XHR errors
      if (isRateLimitMessage(message) || isXhrRateLimitError(message) || isAxiosStackError(args)) {
        // Increment rate limit counter
        const store = useAppStore.getState()
        store.incrementRateLimit()
        return // Don't log to console
      }
      
      // Log other errors normally
      this.originalConsoleError.apply(console, args)
    }

    // Intercept console.warn to catch SDK warnings
    console.warn = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // Check for rate limit related messages
      if (isRateLimitMessage(message)) {
        // Increment rate limit counter
        const store = useAppStore.getState()
        store.incrementRateLimit()
        return // Don't log to console
      }
      
      // Log other warnings normally
      this.originalConsoleWarn.apply(console, args)
    }
  }

  private interceptFetch() {
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await this.originalFetch(...args)
        
        // Check for 429 status
        if (response.status === 429) {
          const store = useAppStore.getState()
          store.incrementRateLimit()
        }
        
        return response
      } catch (error) {
        throw error
      }
    }
  }

  private interceptXMLHttpRequest() {
    const OriginalXHR = this.originalXMLHttpRequest
    
    window.XMLHttpRequest = class extends OriginalXHR {
      constructor() {
        super()
        
        // Store original methods
        const originalOpen = this.open
        const originalSend = this.send
        
        // Override open to track the request
        this.open = function(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
          return originalOpen.call(this, method, url, async ?? true, user, password)
        }
        
        // Override send to intercept responses
        this.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
          // Add event listeners for different response states
          this.addEventListener('load', () => {
            if (this.status === 429) {
              const store = useAppStore.getState()
              store.incrementRateLimit()
            }
          })
          
          this.addEventListener('error', () => {
            if (this.status === 429) {
              const store = useAppStore.getState()
              store.incrementRateLimit()
            }
          })
          
          this.addEventListener('readystatechange', () => {
            if (this.readyState === 4 && this.status === 429) {
              const store = useAppStore.getState()
              store.incrementRateLimit()
            }
          })
          
          return originalSend.call(this, body)
        }
      }
    }
  }

  private interceptAxios() {
    // Intercept axios globally to catch all 429 responses
    try {
      this.originalAxios = axios
      
      // Add global response interceptor
      axios.interceptors.response.use(
        (response) => {
          // Check for 429 status in successful responses
          if (response.status === 429) {
            const store = useAppStore.getState()
            store.incrementRateLimit()
          }
          return response
        },
        (error) => {
          // Check for 429 status in errors
          if (error.response?.status === 429) {
            const store = useAppStore.getState()
            store.incrementRateLimit()
          }
          return Promise.reject(error)
        }
      )
      
      // Override axios adapter to intercept at the lowest level
      const originalAdapter = axios.defaults.adapter
      if (originalAdapter && typeof originalAdapter === 'function') {
        axios.defaults.adapter = (config) => {
          return Promise.resolve(originalAdapter(config)).then(
            (response) => {
              if (response.status === 429) {
                const store = useAppStore.getState()
                store.incrementRateLimit()
              }
              return response
            },
            (error) => {
              if (error.response?.status === 429) {
                const store = useAppStore.getState()
                store.incrementRateLimit()
              }
              return Promise.reject(error)
            }
          )
        }
      }
    } catch (error) {
      console.debug('Axios interceptor setup failed:', error)
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

  private isXhrRateLimitError(message: string): boolean {
    // Check for XHR error patterns with 429 status
    const xhrPatterns = [
      'xhr.js:',
      '429 (Too Many Requests)',
      'dispatchXhrRequest',
      'XMLHttpRequest',
      'axios',
      'dispatchRequest',
      'Axios.js:',
      'raw.ts:',
      'asset.ts:',
      'make-request.ts:',
      'rest-adapter.ts:',
      'index.ts:',
      'create-environment-api.ts:',
      'upload.ts:',
      'contentful.com',
      'api.contentful.com',
      'upload.contentful.com'
    ]
    
    const lowerMessage = message.toLowerCase()
    const hasXhrPattern = xhrPatterns.some(pattern => lowerMessage.includes(pattern))
    const has429Status = message.includes('429')
    
    return hasXhrPattern && has429Status
  }

  private isAxiosStackError(args: unknown[]): boolean {
    // Check if this is an axios error with stack trace containing Contentful SDK files
    const message = args.join(' ')
    
    // Look for the specific pattern: xhr.js:198 with 429 status
    if (message.includes('xhr.js:198') && message.includes('429 (Too Many Requests)')) {
      return true
    }
    
    // Look for axios stack traces with Contentful SDK files
    const sdkFiles = [
      'asset.ts:',
      'raw.ts:',
      'make-request.ts:',
      'rest-adapter.ts:',
      'index.ts:',
      'create-environment-api.ts:',
      'upload.ts:',
      'contentfulService.ts:'
    ]
    
    return sdkFiles.some(file => message.includes(file)) && message.includes('429')
  }

  private interceptGlobalErrors() {
    // Store references to methods to avoid 'this' context issues
    const isRateLimitMessage = this.isRateLimitMessage.bind(this)
    const isXhrRateLimitError = this.isXhrRateLimitError.bind(this)
    
    // Override global error handler to catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason
      if (error && typeof error === 'object' && 'response' in error) {
        const errorWithResponse = error as { response?: { status: number } }
        if (errorWithResponse.response?.status === 429) {
          const store = useAppStore.getState()
          store.incrementRateLimit()
          event.preventDefault() // Prevent the error from being logged
        }
      }
    })

    // Override global error handler for general errors
    window.addEventListener('error', (event) => {
      const message = event.message || ''
      if (isRateLimitMessage(message) || isXhrRateLimitError(message)) {
        const store = useAppStore.getState()
        store.incrementRateLimit()
        event.preventDefault() // Prevent the error from being logged
      }
    })

    // Intercept console methods more aggressively
    this.interceptConsoleAggressively()
  }

  private interceptConsoleAggressively() {
    // Store references to methods to avoid 'this' context issues
    const isRateLimitMessage = this.isRateLimitMessage.bind(this)
    const isXhrRateLimitError = this.isXhrRateLimitError.bind(this)
    const isAxiosStackError = this.isAxiosStackError.bind(this)
    
    // Override console methods to be more aggressive about catching XHR errors
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    const originalConsoleLog = console.log

    console.error = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // Check for rate limit related messages or XHR errors
      if (isRateLimitMessage(message) || isXhrRateLimitError(message) || isAxiosStackError(args)) {
        // Increment rate limit counter
        const store = useAppStore.getState()
        store.incrementRateLimit()
        return // Don't log to console
      }
      
      // Log other errors normally
      originalConsoleError.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // Check for rate limit related messages
      if (isRateLimitMessage(message)) {
        // Increment rate limit counter
        const store = useAppStore.getState()
        store.incrementRateLimit()
        return // Don't log to console
      }
      
      // Log other warnings normally
      originalConsoleWarn.apply(console, args)
    }

    console.log = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // Check for rate limit related messages in logs too
      if (isRateLimitMessage(message) || isXhrRateLimitError(message)) {
        // Increment rate limit counter
        const store = useAppStore.getState()
        store.incrementRateLimit()
        return // Don't log to console
      }
      
      // Log other messages normally
      originalConsoleLog.apply(console, args)
    }
  }

  // Method to restore original functions (for cleanup if needed)
  public restore() {
    console.error = this.originalConsoleError
    console.warn = this.originalConsoleWarn
    window.fetch = this.originalFetch
    window.XMLHttpRequest = this.originalXMLHttpRequest
    
    // Restore axios interceptors if they were modified
    if (this.originalAxios) {
      axios.interceptors.response.clear()
    }
  }
}

// Create and export singleton instance
export const rateLimitInterceptor = new RateLimitInterceptor()
