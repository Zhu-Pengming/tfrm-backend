// API服务层 - 统一管理所有后端接口调用
import env from '../config/env'

const API_BASE_URL = env.apiBaseUrl

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}

class ApiService {
  private token: string = ''
  private agencyId: string = ''
  private uploadQueue: Array<() => void> = []
  private isUploading: boolean = false
  private currentUploadTask: WechatMiniprogram.UploadTask | null = null
  private lastUploadTime: number = 0

  constructor() {
    this.loadToken()
  }

  private loadToken() {
    try {
      this.token = wx.getStorageSync('token') || ''
      this.agencyId = wx.getStorageSync('agency_id') || ''
    } catch (e) {
      console.error('加载token失败', e)
    }
  }

  setToken(token: string, agencyId: string) {
    this.token = token
    this.agencyId = agencyId
    wx.setStorageSync('token', token)
    wx.setStorageSync('agency_id', agencyId)
  }

  clearToken() {
    this.token = ''
    this.agencyId = ''
    wx.removeStorageSync('token')
    wx.removeStorageSync('agency_id')
  }

  private request<T>(options: RequestOptions & { contentType?: string }): Promise<T> {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data, needAuth = true, contentType = 'application/json' } = options
      
      const header: any = {
        'Content-Type': contentType
      }

      if (needAuth && this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }

      wx.request({
        url: `${API_BASE_URL}${url}`,
        method,
        data,
        header,
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(res.data as T)
          } else if (res.statusCode === 401) {
            this.clearToken()
            wx.showToast({ title: '登录已过期', icon: 'none' })
            wx.reLaunch({ url: '/pages/login/login' })
            reject(new Error('未授权'))
          } else {
            console.log('API Error Response:', res.statusCode, JSON.stringify(res.data, null, 2))
            const errorDetail = (res.data as any)?.detail
            const errorMsg = Array.isArray(errorDetail) 
              ? errorDetail.map(e => e.msg || e).join(', ')
              : errorDetail || '请求失败'
            wx.showToast({ title: errorMsg, icon: 'none' })
            reject(new Error(errorMsg))
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络错误', icon: 'none' })
          reject(err)
        }
      })
    })
  }

  // ========== 认证模块 ==========
  register(username: string, password: string, agencyName: string) {
    return this.request<{ message: string }>({
      url: `/auth/register?agency_name=${encodeURIComponent(agencyName)}`,
      method: 'POST',
      data: { username, password },
      needAuth: false
    })
  }

  login(username: string, password: string) {
    return this.request<{ access_token: string; token_type: string }>({
      url: '/auth/login',
      method: 'POST',
      data: { username, password },
      needAuth: false
    })
  }

  getUserInfo() {
    return this.request<{ username: string; agency_id: string; role: string }>({
      url: '/auth/me',
      method: 'GET'
    })
  }

  // ========== 导入模块 ==========
  createImport(inputText: string, inputFiles: string[] = []) {
    return this.request<{ id: string; status: string; created_at: string }>({
      url: '/imports',
      method: 'POST',
      data: { input_text: inputText, input_files: inputFiles }
    })
  }

  getImportTask(taskId: string) {
    return this.request<{
      id: string
      status: string
      extracted_fields: any
      evidence: any
      confidence: number
      error_message?: string
    }>({
      url: `/imports/${taskId}`,
      method: 'GET'
    })
  }

  listImports(limit: number = 20, offset: number = 0) {
    return this.request<any[]>({
      url: `/imports?limit=${limit}&offset=${offset}`,
      method: 'GET'
    })
  }

  confirmImport(taskId: string, skuType: string, extractedFields: any) {
    return this.request<{ message: string; sku_id: string }>({
      url: `/imports/${taskId}/confirm`,
      method: 'POST',
      data: { sku_type: skuType, extracted_fields: extractedFields }
    })
  }

  // ========== SKU模块 ==========
  listSkus(params?: {
    keyword?: string
    city?: string
    tags?: string
    sku_type?: string
    limit?: number
    offset?: number
  }) {
    const queryParts: string[] = []
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        }
      })
    }
    const queryString = queryParts.join('&')
    return this.request<any[]>({
      url: `/skus${queryString ? '?' + queryString : ''}`,
      method: 'GET'
    })
  }

  getSkuDetail(skuId: string) {
    return this.request<any>({
      url: `/skus/${skuId}`,
      method: 'GET'
    })
  }

  updateSku(skuId: string, data: any) {
    return this.request<any>({
      url: `/skus/${skuId}`,
      method: 'PUT',
      data
    })
  }

  deleteSku(skuId: string) {
    return this.request<{ message: string }>({
      url: `/skus/${skuId}`,
      method: 'DELETE'
    })
  }

  // ========== 报价模块 ==========
  createQuotation(data: {
    title: string
    items: Array<{ sku_id: string; quantity: number }>
    customer_name?: string
    customer_contact?: string
  }) {
    return this.request<{
      id: string
      title: string
      total_amount: number
      status: string
      items: any[]
    }>({
      url: '/quotations',
      method: 'POST',
      data
    })
  }

  getQuotation(quotationId: string) {
    return this.request<any>({
      url: `/quotations/${quotationId}`,
      method: 'GET'
    })
  }

  updateQuotation(quotationId: string, data: any) {
    return this.request<any>({
      url: `/quotations/${quotationId}`,
      method: 'PUT',
      data
    })
  }

  listQuotations(limit: number = 20, offset: number = 0) {
    return this.request<any[]>({
      url: `/quotations?limit=${limit}&offset=${offset}`,
      method: 'GET'
    })
  }

  publishQuotation(quotationId: string) {
    return this.request<{ message: string; url: string }>({
      url: `/quotations/${quotationId}/publish`,
      method: 'POST'
    })
  }

  // ========== 产品模块 ==========
  listProducts(params?: {
    keyword?: string
    product_type?: string
    limit?: number
    offset?: number
  }) {
    const queryParts: string[] = []
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        }
      })
    }
    const queryString = queryParts.join('&')
    return this.request<any[]>({
      url: `/products${queryString ? '?' + queryString : ''}`,
      method: 'GET'
    })
  }

  getProduct(productId: string) {
    return this.request<any>({
      url: `/products/${productId}`,
      method: 'GET'
    })
  }

  // ========== 供应商模块 ==========
  listVendors(params?: {
    keyword?: string
    category?: string
    limit?: number
    offset?: number
  }) {
    const queryParts: string[] = []
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        }
      })
    }
    const queryString = queryParts.join('&')
    return this.request<any[]>({
      url: `/vendors${queryString ? '?' + queryString : ''}`,
      method: 'GET'
    })
  }

  getVendor(vendorId: string) {
    return this.request<any>({
      url: `/vendors/${vendorId}`,
      method: 'GET'
    })
  }

  createVendor(data: {
    name: string
    contact: string
    phone: string
    email: string
    category: string[]
    specialties?: string[]
    address?: string
  }) {
    return this.request<any>({
      url: '/vendors',
      method: 'POST',
      data
    })
  }

  updateVendor(vendorId: string, data: any) {
    return this.request<any>({
      url: `/vendors/${vendorId}`,
      method: 'PUT',
      data
    })
  }

  deleteVendor(vendorId: string) {
    return this.request<{ message: string }>({
      url: `/vendors/${vendorId}`,
      method: 'DELETE'
    })
  }

  // ========== 文件上传 ==========
  private processUploadQueue() {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return
    }
    
    if (this.currentUploadTask) {
      try {
        this.currentUploadTask.abort()
        console.log('已中止之前的上传任务，等待2秒后继续')
      } catch (e) {
        console.warn('中止上传任务失败', e)
      }
      this.currentUploadTask = null
      
      setTimeout(() => {
        this.isUploading = true
        const nextUpload = this.uploadQueue.shift()
        if (nextUpload) {
          nextUpload()
        }
      }, 2000)
    } else {
      this.isUploading = true
      const nextUpload = this.uploadQueue.shift()
      if (nextUpload) {
        nextUpload()
      }
    }
  }

  uploadFile(filePath: string): Promise<{ url: string; file_id: string }> {
    return new Promise((resolve, reject) => {
      const executeUpload = () => {
        const header: any = {}
        if (this.token) {
          header['Authorization'] = `Bearer ${this.token}`
        }

        const cleanup = () => {
          this.currentUploadTask = null
          this.isUploading = false
          this.lastUploadTime = Date.now()
          setTimeout(() => this.processUploadQueue(), 100)
        }

        const now = Date.now()
        const timeSinceLastUpload = now - this.lastUploadTime
        const minDelay = 2000
        const actualDelay = Math.max(500, minDelay - timeSinceLastUpload)

        setTimeout(() => {
          try {
            this.currentUploadTask = wx.uploadFile({
              url: `${API_BASE_URL}/imports/upload`,
              filePath,
              name: 'file',
              header,
              success: (res) => {
                cleanup()
                
                if (res.statusCode === 200 || res.statusCode === 201) {
                  try {
                    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                    resolve(data)
                  } catch (e) {
                    console.error('解析响应失败', res.data)
                    reject(new Error('解析响应失败'))
                  }
                } else {
                  console.error('上传失败，状态码:', res.statusCode, '响应:', res.data)
                  const errorMsg = res.data ? (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)) : '上传失败'
                  reject(new Error(errorMsg))
                }
              },
              fail: (err) => {
                cleanup()
                console.error('上传请求失败', err)
                reject(new Error('网络错误，请检查连接'))
              }
            })
          } catch (e) {
            console.error('创建上传任务失败', e)
            cleanup()
            reject(new Error('创建上传任务失败'))
          }
        }, actualDelay)
      }

      this.uploadQueue.push(executeUpload)
      this.processUploadQueue()
    })
  }

  // ========== 批量定价 ==========
  batchPricing(skuIds: string[], marginPercent: number) {
    return this.request<{ message: string }>({
      url: '/skus/batch-pricing',
      method: 'POST',
      data: { sku_ids: skuIds, margin_percent: marginPercent }
    })
  }

  // ========== 创建SKU ==========
  createSku(data: any) {
    return this.request<any>({
      url: '/skus',
      method: 'POST',
      data
    })
  }

  // ========== AI提取 ==========
  extractWithAI(inputText: string, filePath: string | null): Promise<any> {
    return new Promise((resolve, reject) => {
      const header: any = {}
      if (this.token) {
        header['Authorization'] = `Bearer ${this.token}`
      }

      if (filePath) {
        const executeUpload = () => {
          const cleanup = () => {
            this.currentUploadTask = null
            this.isUploading = false
            setTimeout(() => this.processUploadQueue(), 100)
          }

          setTimeout(() => {
            try {
              this.currentUploadTask = wx.uploadFile({
                url: `${API_BASE_URL}/imports/extract`,
                filePath,
                name: 'file',
                header,
                timeout: 60000,
                success: (res) => {
                  cleanup()
                  
                  if (res.statusCode === 200 || res.statusCode === 201) {
                    try {
                      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                      resolve(data)
                    } catch (e) {
                      console.error('解析响应失败', res.data)
                      reject(new Error('解析响应失败'))
                    }
                  } else {
                    console.error('AI提取失败，状态码:', res.statusCode, '响应:', res.data)
                    reject(new Error('AI提取失败'))
                  }
                },
                fail: (err) => {
                  cleanup()
                  
                  console.error('AI提取请求失败', err)
                  if (err.errMsg && err.errMsg.includes('timeout')) {
                    reject(new Error('上传超时，请检查网络或重试'))
                  } else {
                    reject(new Error('网络错误，请检查连接'))
                  }
                }
              })
            } catch (e) {
              console.error('创建AI提取任务失败', e)
              cleanup()
              reject(new Error('创建上传任务失败'))
            }
          }, 500)
        }
        
        this.uploadQueue.push(executeUpload)
        this.processUploadQueue()
      } else {
        // Text mode: send as FormData using wx.request with proper content-type
        header['Content-Type'] = 'application/x-www-form-urlencoded'
        
        wx.request({
          url: `${API_BASE_URL}/imports/extract`,
          method: 'POST',
          data: { input_text: inputText },
          header,
          timeout: 60000,
          success: (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              resolve(res.data)
            } else {
              console.error('AI提取失败，状态码:', res.statusCode, '响应:', res.data)
              const errorDetail = (res.data as any)?.detail
              const errorMsg = Array.isArray(errorDetail) 
                ? errorDetail.map(e => e.msg || e).join(', ')
                : errorDetail || 'AI提取失败'
              reject(new Error(errorMsg))
            }
          },
          fail: (err) => {
            console.error('AI提取请求失败', err)
            if (err.errMsg && err.errMsg.includes('timeout')) {
              reject(new Error('上传超时，请检查网络或重试'))
            } else {
              reject(new Error('网络错误，请检查连接'))
            }
          }
        })
      }
    })
  }

  extractWithFileUrl(fileUrl: string): Promise<any> {
    return this.request({
      url: '/imports/extract',
      method: 'POST',
      data: { file_url: fileUrl }
    })
  }
}

export default new ApiService()
