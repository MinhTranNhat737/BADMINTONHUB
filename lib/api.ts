// ═══════════════════════════════════════════════════════════════
// BadmintonHub — API Service Layer
// Kết nối frontend Next.js với backend Express (dùng axios)
// ═══════════════════════════════════════════════════════════════

import axios, { type AxiosRequestConfig } from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// ─── Axios instance ─────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor — tự động gắn token
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

// ─── Base API helper (dùng axios) ───────────────────────────
async function apiFetch<T = any>(
  endpoint: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: any }> {
  try {
    const config: AxiosRequestConfig = {
      url: endpoint,
      method: (options.method as any) || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers || {},
    }
    const res = await apiClient.request(config)
    return res.data
  } catch (err: any) {
    if (err.response) {
      // Server trả về lỗi (4xx, 5xx)
      return { success: false, message: err.response.data?.message || `Error ${err.response.status}` }
    }
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
  userCode: string
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
  updatedAt: string
}

export interface ApiBooking {
  id: string
  bookingCode: string
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
  orderCode: string
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
    userCode: raw.user_code || '',
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
    updatedAt: raw.updated_at || '',
  }
}

function transformBooking(raw: any): ApiBooking {
  return {
    id: raw.id,
    bookingCode: raw.booking_code || '',
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
    orderCode: raw.order_code || '',
    userId: raw.user_id,
    customerName: raw.customer_name,
    customerPhone: raw.customer_phone,
    customerEmail: raw.customer_email,
    shippingAddress: raw.shipping_address || raw.customer_address,
    amount: parseFloat(raw.total || raw.amount || 0),
    status: raw.status,
    paymentMethod: raw.payment_method,
    note: raw.note,
    items: (raw.items || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name || item.name,
      sku: item.sku,
      quantity: item.qty || item.quantity,
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
    amount: number; payment_method?: string; note?: string;
    user_id?: string
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

  checkin: async (data: { bookingId?: string; bookingCode?: string }) => {
    const res = await apiFetch<any>('/bookings/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data), message: res.message }
    }
    return { success: false, error: res.message }
  },

  createRecurring: async (data: {
    court_id: number; time_start: string; time_end: string;
    start_date: string; weeks: number;
    slots?: number; customer_name: string; customer_phone: string;
    amount: number; payment_method?: string; note?: string;
    user_id?: string
  }) => {
    const res = await apiFetch<any>('/bookings/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return { success: res.success, message: res.message, data: res.data, errors: (res as any).errors }
  },

  // Giữ chỗ (hold) — dùng khi khách đang chờ thanh toán
  createHold: async (data: {
    court_id: number; booking_date: string;
    time_start: string; time_end: string; slots?: number;
    customer_name: string; customer_phone: string;
    amount: number; payment_method?: string; note?: string;
  }) => {
    const res = await apiFetch<any>('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data), message: res.message }
    }
    return { success: false, error: res.message }
  },

  // Xác nhận thanh toán (hold/pending → confirmed)
  confirmPayment: async (id: string) => {
    const res = await apiFetch<any>(`/bookings/${id}/confirm-payment`, {
      method: 'PATCH',
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data), message: res.message }
    }
    return { success: false, error: res.message }
  },

  // Đổi lịch booking
  reschedule: async (id: string, data: {
    booking_date: string; time_start: string; time_end: string; amount?: number
  }) => {
    const res = await apiFetch<any>(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, booking: transformBooking(res.data), message: res.message }
    }
    return { success: false, error: res.message }
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
    customer_email?: string; customer_address?: string; shipping_address?: string;
    delivery_method?: string; pickup_branch_id?: number;
    subtotal?: number; shipping_fee?: number; total?: number;
    customer_coords?: { lat: number; lng: number } | null;
    fulfilling_warehouse?: string;
    payment_method?: string; note?: string;
    items: { product_id: number; quantity: number; price: number; product_name?: string }[]
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
    warehouse_id: number; sku: string; quantity: number; cost?: number; note?: string
  }) => {
    return apiFetch('/inventory/import', {
      method: 'POST',
      body: JSON.stringify({
        sku: data.sku,
        warehouseId: data.warehouse_id,
        qty: data.quantity,
        cost: data.cost || 0,
        note: data.note,
      }),
    })
  },

  exportStock: async (data: {
    warehouse_id: number; sku: string; quantity: number; cost?: number; note?: string
  }) => {
    return apiFetch('/inventory/export', {
      method: 'POST',
      body: JSON.stringify({
        sku: data.sku,
        warehouseId: data.warehouse_id,
        qty: data.quantity,
        cost: data.cost || 0,
        note: data.note,
      }),
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// TRANSFERS API
// ═══════════════════════════════════════════════════════════════

const toApiTransferStatus = (status?: string) => {
  if (!status) return status
  return status === 'in-transit' ? 'in_transit' : status
}

export const transferApi = {
  getAll: async (filters?: { status?: string; fromWarehouse?: number; toWarehouse?: number }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', toApiTransferStatus(filters.status) || filters.status)
    if (filters?.fromWarehouse) params.set('fromWarehouse', String(filters.fromWarehouse))
    if (filters?.toWarehouse) params.set('toWarehouse', String(filters.toWarehouse))
    const qs = params.toString()
    return apiFetch(`/transfers${qs ? '?' + qs : ''}`)
  },

  getById: async (id: string) => apiFetch(`/transfers/${id}`),

  create: async (data: {
    from_warehouse_id: number; to_warehouse_id: number;
    reason?: string; note?: string; pickup_method?: string;
    customer_name?: string; customer_phone?: string;
    items: { sku: string; name?: string; qty: number; available_at_request?: number }[]
  }) => {
    return apiFetch('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, status: string, exportedQtys?: Record<string, number>) => {
    return apiFetch(`/transfers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: toApiTransferStatus(status), exportedQtys }),
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
    supplier_id: number; warehouse_id: number; total_value?: number; note?: string;
    items: { sku: string; name?: string; quantity?: number; qty?: number; price?: number; unit_cost?: number }[]
  }) => {
    return apiFetch('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: data.supplier_id,
        warehouse_id: data.warehouse_id,
        total_value: data.total_value || data.items.reduce((s, i) => (i.qty || i.quantity || 0) * (i.unit_cost || i.price || 0), 0),
        note: data.note,
        items: data.items.map(i => ({
          sku: i.sku,
          name: i.name || i.sku,
          qty: i.qty || i.quantity || 0,
          unit_cost: i.unit_cost || i.price || 0,
        })),
      }),
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
    total?: number; discount?: number; final_total?: number;
    payment_method?: string; note?: string;
    items: { product_id?: number; product_name?: string; sku?: string; quantity?: number; qty?: number; price: number }[]
  }) => {
    const mappedItems = data.items.map(i => ({
      product_id: i.product_id || 0,
      product_name: i.product_name || i.sku || '',
      price: i.price,
      qty: i.qty || i.quantity || 0,
    }))
    const total = data.total || mappedItems.reduce((s, i) => s + i.price * i.qty, 0)
    const discount = data.discount || 0
    const finalTotal = data.final_total || (total - discount)
    return apiFetch('/sales-orders', {
      method: 'POST',
      body: JSON.stringify({
        branch_id: data.branch_id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        total,
        discount,
        final_total: finalTotal,
        payment_method: data.payment_method,
        note: data.note,
        items: mappedItems,
      }),
    })
  },

  approve: async (id: string, payload?: { payment_method?: string; note?: string }) => {
    return apiFetch(`/sales-orders/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    })
  },

  reject: async (id: string, reason?: string) => {
    return apiFetch(`/sales-orders/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reject_reason: reason }),
    })
  },

  complete: async (id: string) => {
    return apiFetch(`/sales-orders/${id}/complete`, {
      method: 'PATCH',
    })
  },
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT API (Admin)
// ═══════════════════════════════════════════════════════════════

export const userApi = {
  lookupByPhone: async (phone: string) => {
    const params = new URLSearchParams()
    params.set('phone', phone)
    const res = await apiFetch<any>(`/users/lookup/phone?${params.toString()}`)
    if (res.success) {
      const users = (res.data || []).map((u: any) => ({
        id: String(u.id),
        userCode: u.user_code || '',
        fullName: u.full_name || '',
        phone: u.phone || '',
        email: u.email || '',
        role: u.role || 'user',
      }))
      return { users }
    }
    return { users: [] }
  },

  getAll: async (filters?: { role?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters?.role) params.set('role', filters.role)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    const res = await apiFetch<any>(`/users${qs ? '?' + qs : ''}`)
    if (res.success) {
      const users = (res.data || []).map(transformUser)
      return { users, pagination: res.pagination }
    }
    return { users: [] }
  },

  getById: async (id: string): Promise<ApiUser | null> => {
    const res = await apiFetch<any>(`/users/${id}`)
    if (res.success && res.data) return transformUser(res.data)
    return null
  },

  create: async (data: {
    username: string; password: string; full_name: string;
    email: string; phone: string; role?: string;
    address?: string; gender?: string; date_of_birth?: string;
    warehouse_id?: number;
  }) => {
    const res = await apiFetch<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, user: transformUser(res.data) }
    }
    return { success: false, error: res.message }
  },

  update: async (id: string, data: Record<string, any>) => {
    const res = await apiFetch<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (res.success && res.data) {
      return { success: true, user: transformUser(res.data) }
    }
    return { success: false, error: res.message }
  },

  resetPassword: async (id: string, new_password: string) => {
    const res = await apiFetch<any>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password }),
    })
    return { success: res.success, message: res.message }
  },

  delete: async (id: string) => {
    return apiFetch(`/users/${id}`, { method: 'DELETE' })
  },
}

