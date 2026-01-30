// API 客户端配�?
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 获取认证 Token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token 过期，清除并跳转登录
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// 文件上传请求
async function uploadRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  return response.json();
}

// ==================== 认证 API ====================
export const authAPI = {
  login: (username: string, password: string) =>
    apiRequest<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  
  register: (username: string, password: string, full_name: string, agency_name: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name }),
      headers: { 'Content-Type': 'application/json' },
    }).then((res: any) => {
      // 注册后需要带 agency_name 参数
      return fetch(`${API_BASE_URL}/auth/register?agency_name=${encodeURIComponent(agency_name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, full_name }),
      }).then(r => r.json());
    }),
  
  getCurrentUser: (signal?: AbortSignal) => apiRequest('/auth/me', { method: 'GET', signal }),
};

// ==================== SKU API ====================
export const skuAPI = {
  list: (params?: {
    sku_type?: string;
    city?: string;
    tags?: string;
    status?: string;
    owner_type?: string;
    keyword?: string;
    skip?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    return apiRequest(`/skus?${query.toString()}`, { method: 'GET' });
  },
  
  get: (id: string) => apiRequest(`/skus/${id}`, { method: 'GET' }),
  
  create: (data: any) =>
    apiRequest('/skus', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/skus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest(`/skus/${id}`, { method: 'DELETE' }),
  
  updatePriceCalendar: (id: string, items: any[]) =>
    apiRequest(`/skus/${id}/price-calendar`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
  
  batchPricing: (sku_ids: string[], margin_percentage?: number, multiply_factor?: number, add_amount?: number) =>
    apiRequest('/skus/batch-pricing', {
      method: 'POST',
      body: JSON.stringify({ sku_ids, margin_percentage, multiply_factor, add_amount }),
    }),
  
  batchUpdate: (sku_ids: string[], updates: any) =>
    apiRequest('/skus/batch-update', {
      method: 'POST',
      body: JSON.stringify({ sku_ids, ...updates }),
    }),
  
  batchDelete: (sku_ids: string[]) =>
    apiRequest('/skus/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ sku_ids }),
    }),
};


// ==================== Product API ====================
export const productAPI = {
  list: (params?: { product_type?: string; city?: string; keyword?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    return apiRequest(`/products?${query.toString()}`, { method: 'GET' });
  },

  get: (id: string) => apiRequest(`/products/${id}`, { method: 'GET' }),

  create: (data: any) =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  createSku: (productId: string, data: any) =>
    apiRequest(`/products/${productId}/skus`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const importAPI = {
  extract: async (inputText?: string, file?: File) => {
    const formData = new FormData();
    if (inputText) {
      formData.append('input_text', inputText);
    }
    if (file) {
      formData.append('file', file);
    }
    return uploadRequest('/imports/extract', formData);
  },
  
  list: (status?: string, skip?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (skip !== undefined) query.append('skip', String(skip));
    if (limit !== undefined) query.append('limit', String(limit));
    return apiRequest(`/imports?${query.toString()}`, { method: 'GET' });
  },
  
  get: (id: string) => apiRequest(`/imports/${id}`, { method: 'GET' }),
  
  confirm: (id: string, extracted_fields: any, sku_type: string) =>
    apiRequest(`/imports/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ extracted_fields, sku_type }),
    }),
};

// ==================== 供应�?API ====================
export const vendorAPI = {
  list: (category?: string, status?: string, keyword?: string, skip?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (status) query.append('status', status);
    if (keyword) query.append('keyword', keyword);
    if (skip !== undefined) query.append('skip', String(skip));
    if (limit !== undefined) query.append('limit', String(limit));
    return apiRequest(`/vendors?${query.toString()}`, { method: 'GET' });
  },
  
  get: (id: string) => apiRequest(`/vendors/${id}`, { method: 'GET' }),
  
  create: (data: any) =>
    apiRequest('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  updateNote: (id: string, note: string) =>
    apiRequest(`/vendors/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }),
  
  delete: (id: string) =>
    apiRequest(`/vendors/${id}`, { method: 'DELETE' }),
  
  generateLogo: (id: string) =>
    apiRequest(`/vendors/${id}/generate-logo`, { method: 'POST' }),
};

// ==================== 报价�?API ====================
export const quotationAPI = {
  list: (status?: string, skip?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (skip !== undefined) query.append('skip', String(skip));
    if (limit !== undefined) query.append('limit', String(limit));
    return apiRequest(`/quotations?${query.toString()}`, { method: 'GET' });
  },
  
  get: (id: string) => apiRequest(`/quotations/${id}`, { method: 'GET' }),
  
  getItems: (id: string) => apiRequest(`/quotations/${id}/items`, { method: 'GET' }),
  
  create: (data: any) =>
    apiRequest('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  publish: (id: string) =>
    apiRequest(`/quotations/${id}/publish`, { method: 'POST' }),
  
  exportPDF: (id: string) => {
    const token = getAuthToken();
    window.open(`${API_BASE_URL}/quotations/${id}/export/pdf?token=${token}`, '_blank');
  },
  
  getShared: (shareToken: string) =>
    // 公开访问，无需认证
    fetch(`${API_BASE_URL}/share/quotations/${shareToken}`).then(r => r.json()),
};

// ==================== 文件上传 API ====================
export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadRequest<{ file_path: string; file_url: string }>('/upload', formData);
  },
};

export default {
  auth: authAPI,
  sku: skuAPI,
  product: productAPI,
  import: importAPI,
  vendor: vendorAPI,
  quotation: quotationAPI,
  upload: uploadAPI,
};






