// ═══════════════════════════════════════════════════════════════
// BadmintonHub — API Service Layer
// Kết nối frontend Next.js với backend Express
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// ─── Token management ───────────────────────────────────────
let authToken: string | null = null

export function setToken(token: string | null) {
  authToken = token
  if (token) {
    if (typeof window !== 'undefined') localStorage.setItem('bh_token', token)
  } else {
    if (typeof window !== 'undefined') localStorage.removeItem('bh_token')
  }
}

export function getToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('bh_token')
  }
  return authToken
}

// ─── Base fetch helper ──────────────────────────────────────
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: any }> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })
    const json = await res.json()
    if (!res.ok) {
      return { success: false, message: json.message || `Error ${res.status}` }
    }
    return json
  } catch (err: any) {
    console.error('API Error:', err)
    return { success: false, message: 'Không thể kết nối server' }
  }
}

// ─── Type definitions (match frontend expectations) ─────────

export interface ApiBranch {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  email: string | null
}

export interface ApiCourt {
  id: number
  name: string
  branchId: number
  branch: string
  address: string
  lat: number
  lng: number
  type: string
  indoor: boolean
  price: number
  rating: number
  reviews: number
  image: string
  available: boolean
  amenities: string[]
  description: string
  hours: string
}

export interface ApiProduct {
  id: number
  sku: string
  name: string
  brand: string
  category: string
  price: number
  originalPrice: number | null
  rating: number
  reviews: number
  image: string | null
  description: string
  specs: Record<string, string>
  features: string[]
  inStock: boolean
  gender: string | null
  badges: string[]
}

export interface ApiUser {
  id: string
  username: string
  fullName: string
  email: string
  phone: string
  address: string | null
  gender: string | null
  dateOfBirth: string | null
  role: 'user' | 'admin' | 'employee' | 'guest'
  warehouseId: number | null
  createdAt: string
}

export interface ApiBooking {
  id: string
  courtId: number
  courtName: string
  branchName: string
  userId: string | null
  customerName: string
  customerPhone: string
  bookingDate: string
  timeStart: string
  timeEnd: string
  slots: number
  amount: number
  status: string
  paymentMethod: string | null
  note: string | null
  createdAt: string
}

export interface ApiOrder {
  id: string
  userId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  shippingAddress: string
  amount: number
  status: string
  paymentMethod: string | null
  note: string | null
  items: ApiOrderItem[]
  createdAt: string
}

export interface ApiOrderItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  price: number
}

// ─── Transform helpers (snake_case → camelCase) ─────────────

function transformCourt(raw: any): ApiCourt {
  return {
    id: raw.id,
    name: raw.name,
    branchId: raw.branch_id,
    branch: raw.branch_name || '',
    address: raw.branch_address || '',
    lat: parseFloat(raw.branch_lat || raw.lat || 0),
    lng: parseFloat(raw.branch_lng || raw.lng || 0),
    type: raw.type,
    indoor: raw.indoor,
    price: parseFloat(raw.price),
    rating: parseFloat(raw.rating) || 0,
    reviews: raw.reviews_count || 0,
    image: raw.image || '/placeholder-court.jpg',
    available: raw.available,
    amenities: raw.amenities || [],
    description: raw.description || '',
    hours: raw.hours || '06:00 - 22:00',
  }
}

function transformProduct(raw: any): ApiProduct {
  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.name,
    brand: raw.brand,
    category: raw.category,
    price: parseFloat(raw.price),
    originalPrice: raw.original_price ? parseFloat(raw.original_price) : null,
    rating: parseFloat(raw.rating) || 0,
    reviews: raw.reviews_count || 0,
    image: raw.image,
    description: raw.description || '',
    specs: raw.specs || {},
    features: raw.features || [],
    inStock: raw.in_stock,
    gender: raw.gender,
    badges: raw.badges || [],
  }
}

function transformUser(raw: any): ApiUser {
  return {
    id: raw.id,
    username: raw.username,
    fullName: raw.full_name,
    email: raw.email,
    phone: raw.phone,
    address: raw.address,
    gender: raw.gender,
    dateOfBirth: raw.date_of_birth,
    role: raw.role,
    warehouseId: raw.warehouse_id,
    createdAt: raw.created_at,
  }
}

function transformBooking(raw: any): ApiBooking {
  return {
    id: raw.id,
    courtId: raw.court_id,
    courtName: raw.court_name || '',
    branchName: raw.branch_name || '',
    userId: raw.user_id,
    customerName: raw.customer_name,
    customerPhone: raw.customer_phone,
    bookingDate: raw.booking_date,
    timeStart: raw.time_start,
    timeEnd: raw.time_end,
    slots: raw.slots,
    amount: parseFloat(raw.amount),
    status: raw.status,
    paymentMethod: raw.payment_method,
    note: raw.note,
    createdAt: raw.created_at,
  }
}

function transformOrder(raw: any): ApiOrder {
  return {
    id: raw.id,
    userId: raw.user_id,
    customerName: raw.customer_name,
    customerPhone: raw.customer_phone,
    customerEmail: raw.customer_email,
    shippingAddress: raw.shipping_address,
    amount: parseFloat(raw.amount),
    status: raw.status,
    paymentMethod: raw.payment_method,
    note: raw.note,
    items: (raw.items || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name || item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: parseFloat(item.price),
    })),
    createdAt: raw.created_at,
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════════════════

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiFetch<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (res.success && res.data) {
      setToken(res.data.token)
      return { success: true, user: transformUser(res.data.user), token: res.data.token }
    }
    return { success: false, error: res.message || 'Đăng nhập thất bại' }
  },

  register: async (data: {
    username: string; password: string; fullName: string;
    email: string; phone: string; address?: string;
    gender?: string; dateOfBirth?: string
  }) => {
    const res = await apiFetch<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: data.username,
        password: data.password,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
      }),
    })
    if (res.success && res.data) {
      setToken(res.data.token)
      return { success: true, user: transformUser(res.data.user), token: res.data.token }
    }
    return { success: false, error: res.message || 'Đăng ký thất bại' }
  },

  getProfile: async () => {
    const res = await apiFetch<any>('/auth/me')
    if (res.success && res.data) {
      return { success: true, user: transformUser(res.data) }
    }
    return { success: false, error: res.message }
  },

  updateProfile: async (data: {
    fullName?: string; email?: string; phone?: string;
    address?: string; gender?: string; dateOfBirth?: string
  }) => {
    const res = await apiFetch<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
      }),
    })
    if (res.success && res.data) {
      return { success: true, user: transformUser(res.data) }
    }
    return { success: false, error: res.message }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await apiFetch('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
    return { success: res.success, error: res.message }
  },
}

// ═══════════════════════════════════════════════════════════════
// BRANCHES API
// ═══════════════════════════════════════════════════════════════

export const branchApi = {
  getAll: async (): Promise<ApiBranch[]> => {
    const res = await apiFetch<any[]>('/branches')
    if (res.success && res.data) {
      return res.data.map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lat: parseFloat(b.lat),
        lng: parseFloat(b.lng),
        phone: b.phone,
        email: b.email,
      }))
    }
    return []
  },
}

// ═══════════════════════════════════════════════════════════════
// COURTS API
// ═══════════════════════════════════════════════════════════════

export const courtApi = {
  getAll: async (filters?: { branchId?: number; type?: string; indoor?: boolean }): Promise<ApiCourt[]> => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.set('branchId', String(filters.branchId))
    if (filters?.type) params.set('type', filters.type)
    if (filters?.indoor !== undefined) params.set('indoor', String(filters.indoor))
    const qs = params.toString()
    const res = await apiFetch<any[]>(`/courts${qs ? '?' + qs : ''}`)
    if (res.success && res.data) {
      return res.data.map(transformCourt)
    }
    return []
  },

  getById: async (id: number): Promise<ApiCourt | null> => {
    const res = await apiFetch<any>(`/courts/${id}`)
    if (res.success && res.data) return transformCourt(res.data)
    return null
  },

  getSlots: async (courtId: number, date: string) => {
    const res = await apiFetch<any[]>(`/courts/${courtId}/slots?date=${date}`)
    if (res.success && res.data) return res.data
    return []
  },

  getReviews: async (courtId: number) => {
    const res = await apiFetch<any[]>(`/courts/${courtId}/reviews`)
    if (res.success && res.data) return res.data
    return []
  },

  createReview: async (courtId: number, data: { rating: number; content: string }) => {
    return apiFetch(`/courts/${courtId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS API
// ═══════════════════════════════════════════════════════════════

export const productApi = {
  getAll: async (filters?: {
    category?: string; brand?: string; gender?: string;
    search?: string; page?: number; limit?: number
  }): Promise<{ products: ApiProduct[]; pagination?: any }> => {
    const params = new URLSearchParams()
    if (filters?.category) params.set('category', filters.category)
    if (filters?.brand) params.set('brand', filters.brand)
    if (filters?.gender) params.set('gender', filters.gender)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    const res = await apiFetch<any>(`/products${qs ? '?' + qs : ''}`)
    if (res.success) {
      const products = (res.data || []).map(transformProduct)
      return { products, pagination: res.pagination }
    }
    return { products: [] }
  },

  getById: async (id: number): Promise<ApiProduct | null> => {
    const res = await apiFetch<any>(`/products/${id}`)
    if (res.success && res.data) return transformProduct(res.data)
    return null
  },

  getCategories: async (): Promise<string[]> => {
    const res = await apiFetch<string[]>('/products/categories')
    if (res.success && res.data) return res.data
    return []
  },

  getBrands: async (): Promise<string[]> => {
    const res = await apiFetch<string[]>('/products/brands')
    if (res.success && res.data) return res.data
    return []
  },
}

// ═══════════════════════════════════════════════════════════════
// BOOKINGS API
// ═══════════════════════════════════════════════════════════════

export const bookingApi = {
  getAll: async (filters?: {
    status?: string; branchId?: number; courtId?: number;
    date?: string; phone?: string; page?: number; limit?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.branchId) params.set('branchId', String(filters.branchId))
    if (filters?.courtId) params.set('courtId', String(filters.courtId))
    if (filters?.date) params.set('date', filters.date)
    if (filters?.phone) params.set('phone', filters.phone)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    const res = await apiFetch<any>(`/bookings${qs ? '?' + qs : ''}`)
    if (res.success) {
      const bookings = (res.data || []).map(transformBooking)
      return { bookings, pagination: res.pagination }
    }
    return { bookings: [] }
  },

  getMyBookings: async (): Promise<ApiBooking[]> => {
    const res = await apiFetch<any[]>('/bookings/my')
    if (res.success && res.data) return res.data.map(transformBooking)
    return []
  },

  getById: async (id: string): Promise<ApiBooking | null> => {
    const res = await apiFetch<any>(`/bookings/${id}`)
    if (res.success && res.data) return transformBooking(res.data)
    return null
  },

  create: async (data: {
    court_id: number; booking_date: string;
    time_start: string; time_end: string; slots: number;
    customer_name: string; customer_phone: string;
    amount: number; payment_method?: string; note?: string
  }) => {
    const res = await apiFetch<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data) }
    }
    return { success: false, error: res.message }
  },

  updateStatus: async (id: string, status: string) => {
    const res = await apiFetch<any>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data) }
    }
    return { success: false, error: res.message }
  },

  delete: async (id: string) => {
    return apiFetch(`/bookings/${id}`, { method: 'DELETE' })
  },
}

// ═══════════════════════════════════════════════════════════════
// ORDERS API
// ═══════════════════════════════════════════════════════════════

export const orderApi = {
  getAll: async (filters?: {
    status?: string; userId?: string; page?: number; limit?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.userId) params.set('userId', filters.userId)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    const res = await apiFetch<any>(`/orders${qs ? '?' + qs : ''}`)
    if (res.success) {
      const orders = (res.data || []).map(transformOrder)
      return { orders, pagination: res.pagination }
    }
    return { orders: [] }
  },

  getMyOrders: async (): Promise<ApiOrder[]> => {
    const res = await apiFetch<any[]>('/orders/my')
    if (res.success && res.data) return res.data.map(transformOrder)
    return []
  },

  getById: async (id: string): Promise<ApiOrder | null> => {
    const res = await apiFetch<any>(`/orders/${id}`)
    if (res.success && res.data) return transformOrder(res.data)
    return null
  },

  create: async (data: {
    customer_name: string; customer_phone: string;
    customer_email?: string; shipping_address: string;
    payment_method?: string; note?: string;
    items: { product_id: number; quantity: number; price: number }[]
  }) => {
    const res = await apiFetch<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, order: transformOrder(res.data) }
    }
    return { success: false, error: res.message }
  },

  updateStatus: async (id: string, status: string) => {
    return apiFetch(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY API
// ═══════════════════════════════════════════════════════════════

export const inventoryApi = {
  getAll: async (filters?: {
    warehouseId?: number; category?: string; search?: string; lowStock?: boolean
  }) => {
    const params = new URLSearchParams()
    if (filters?.warehouseId) params.set('warehouseId', String(filters.warehouseId))
    if (filters?.category) params.set('category', filters.category)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.lowStock) params.set('lowStock', 'true')
    const qs = params.toString()
    return apiFetch(`/inventory${qs ? '?' + qs : ''}`)
  },

  getByWarehouse: async (warehouseId: number) => {
    return apiFetch(`/inventory/warehouse/${warehouseId}`)
  },

  getWarehouses: async () => {
    return apiFetch('/inventory/warehouses')
  },

  getLowStock: async () => {
    return apiFetch('/inventory/low-stock')
  },

  getTransactions: async () => {
    return apiFetch('/inventory/transactions')
  },

  importStock: async (data: {
    warehouse_id: number; sku: string; quantity: number; note?: string
  }) => {
    return apiFetch('/inventory/import', {
      method: 'POST',
      body: JSON.stringify({
        sku: data.sku,
        warehouseId: data.warehouse_id,
        qty: data.quantity,
        note: data.note,
      }),
    })
  },

  exportStock: async (data: {
    warehouse_id: number; sku: string; quantity: number; note?: string
  }) => {
    return apiFetch('/inventory/export', {
      method: 'POST',
      body: JSON.stringify({
        sku: data.sku,
        warehouseId: data.warehouse_id,
        qty: data.quantity,
        note: data.note,
      }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// TRANSFERS API
// ═══════════════════════════════════════════════════════════════

export const transferApi = {
  getAll: async (filters?: { status?: string; fromWarehouse?: number; toWarehouse?: number }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.fromWarehouse) params.set('fromWarehouse', String(filters.fromWarehouse))
    if (filters?.toWarehouse) params.set('toWarehouse', String(filters.toWarehouse))
    const qs = params.toString()
    return apiFetch(`/transfers${qs ? '?' + qs : ''}`)
  },

  getById: async (id: string) => apiFetch(`/transfers/${id}`),

  create: async (data: {
    from_warehouse_id: number; to_warehouse_id: number;
    note?: string; items: { sku: string; quantity: number }[]
  }) => {
    return apiFetch('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, status: string) => {
    return apiFetch(`/transfers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDERS API
// ═══════════════════════════════════════════════════════════════

export const purchaseOrderApi = {
  getAll: async (filters?: { status?: string; supplierId?: number }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.supplierId) params.set('supplierId', String(filters.supplierId))
    const qs = params.toString()
    return apiFetch(`/purchase-orders${qs ? '?' + qs : ''}`)
  },

  getById: async (id: string) => apiFetch(`/purchase-orders/${id}`),

  getSuppliers: async () => apiFetch('/purchase-orders/suppliers'),

  create: async (data: {
    supplier_id: number; warehouse_id: number; note?: string;
    items: { sku: string; quantity: number; price: number }[]
  }) => {
    return apiFetch('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, status: string) => {
    return apiFetch(`/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// SALES ORDERS API
// ═══════════════════════════════════════════════════════════════

export const salesOrderApi = {
  getAll: async (filters?: { status?: string; branchId?: number }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.branchId) params.set('branchId', String(filters.branchId))
    const qs = params.toString()
    return apiFetch(`/sales-orders${qs ? '?' + qs : ''}`)
  },

  getById: async (id: string) => apiFetch(`/sales-orders/${id}`),

  create: async (data: {
    branch_id: number; customer_name?: string; customer_phone?: string;
    note?: string; items: { sku: string; quantity: number; price: number }[]
  }) => {
    return apiFetch('/sales-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  approve: async (id: string) => {
    return apiFetch(`/sales-orders/${id}/approve`, { method: 'PATCH' })
  },

  reject: async (id: string, reason?: string) => {
    return apiFetch(`/sales-orders/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  },
}
