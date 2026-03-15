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
  supplierName?: string | null
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
  userId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  shippingAddress: string
  amount: number
  totalAmount?: number
  subtotal?: number
  shippingFee?: number
  status: string
  paymentMethod: string | null
  note: string | null
  type?: string
  deliveryMethod?: string | null
  fulfillingWarehouse?: string
  customerCoords?: unknown
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

export interface ApiSalesCustomer {
  id: string | null
  userCode: string
  username: string
  fullName: string
  email: string
  phone: string
  role: 'user' | 'admin' | 'employee' | 'guest'
}

// ─── Transform helpers (snake_case → camelCase) ─────────────

function extractProductMeta(description?: string | null) {
  const raw = String(description || '')
  const segments = raw
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let supplierName: string | null = null
  const cleanSegments: string[] = []

  for (const segment of segments) {
    if (segment.startsWith('NCC:')) {
      supplierName = segment.slice(4).trim() || null
      continue
    }
    cleanSegments.push(segment)
  }

  return {
    supplierName,
    cleanDescription: cleanSegments.join(' | '),
  }
}

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
  const meta = extractProductMeta(raw.description)

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
    description: meta.cleanDescription,
    specs: raw.specs || {},
    features: raw.features || [],
    inStock: raw.in_stock,
    gender: raw.gender,
    badges: raw.badges || [],
    supplierName: raw.supplier_name ?? meta.supplierName,
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
  const customerName =
    raw.customer_name ||
    raw.customerName ||
    raw.booked_by ||
    raw.bookedBy ||
    raw.full_name ||
    raw.fullName ||
    raw.customer?.name ||
    raw.customer?.fullName ||
    ''

  const customerPhone =
    raw.customer_phone ||
    raw.customerPhone ||
    raw.phone ||
    raw.customer?.phone ||
    ''

  return {
    id: raw.id,
    bookingCode: raw.booking_code || raw.bookingCode || raw.code || '',
    courtId: raw.court_id,
    courtName: raw.court_name || '',
    branchName: raw.branch_name || '',
    userId: raw.user_id,
    customerName: customerName || 'Khách',
    customerPhone,
    bookingDate: raw.booking_date,
    timeStart: raw.time_start,
    timeEnd: raw.time_end,
    slots: raw.slots ?? raw.people ?? 1,
    amount: parseFloat(raw.amount ?? raw.total_amount ?? 0),
    status: raw.status,
    paymentMethod: raw.payment_method,
    note: raw.note,
    createdAt: raw.created_at,
  }
}

function transformOrder(raw: any): ApiOrder {
  const parseNumber = (value: any, fallback = 0) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const totalAmount = parseNumber(raw.total ?? raw.total_amount ?? raw.amount, 0)
  const shippingFee = parseNumber(raw.shipping_fee ?? raw.shippingFee, 0)
  const subtotal = parseNumber(raw.subtotal ?? raw.sub_total, Math.max(totalAmount - shippingFee, 0))

  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId ?? null,
    customerName: raw.customer_name ?? raw.customerName ?? '',
    customerPhone: raw.customer_phone ?? raw.customerPhone ?? '',
    customerEmail: raw.customer_email ?? raw.customerEmail ?? null,
    shippingAddress: raw.shipping_address ?? raw.customer_address ?? raw.shippingAddress ?? raw.customerAddress ?? '',
    amount: totalAmount,
    totalAmount,
    subtotal,
    shippingFee,
    status: raw.status ?? 'pending',
    paymentMethod: raw.payment_method ?? raw.paymentMethod ?? null,
    note: raw.note ?? null,
    type: raw.type ?? 'online',
    deliveryMethod: raw.delivery_method ?? raw.deliveryMethod ?? null,
    fulfillingWarehouse: raw.fulfilling_warehouse ?? raw.fulfillingWarehouse ?? '',
    customerCoords: raw.customer_coords ?? raw.customerCoords ?? null,
    items: (raw.items || []).map((item: any) => ({
      productId: item.product_id ?? item.productId,
      productName: item.product_name || item.productName || item.name,
      sku: item.sku,
      quantity: item.quantity ?? item.qty,
      price: parseNumber(item.price, 0),
    })),
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}

function transformSalesCustomer(raw: any): ApiSalesCustomer {
  return {
    id: raw.id || null,
    userCode: raw.user_code || '',
    username: raw.username || '',
    fullName: raw.full_name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    role: raw.role || 'guest',
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

  create: async (data: {
    sku?: string
    name: string
    brand: string
    category: string
    price: number
    original_price?: number | null
    image?: string | null
    description?: string
    specs?: Record<string, string>
    features?: string[]
    in_stock?: boolean
    gender?: string | null
    badges?: string[]
  }) => {
    const res = await apiFetch<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (res.success && res.data) {
      return { success: true, product: transformProduct(res.data) }
    }
    return { success: false, error: res.message || 'Không thể tạo sản phẩm' }
  },

  uploadImage: async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await apiClient.post('/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data?.success && res.data?.data?.url) {
        return { success: true, url: String(res.data.data.url) }
      }

      return { success: false, error: res.data?.message || 'Không thể tải ảnh' }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || 'Không thể tải ảnh' }
    }
  },

  update: async (id: number, data: {
    name?: string
    brand?: string
    category?: string
    price?: number
    original_price?: number | null
    image?: string | null
    description?: string
    specs?: Record<string, string>
    features?: string[]
    in_stock?: boolean
    gender?: string | null
  }) => {
    const res = await apiFetch<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (res.success && res.data) {
      return { success: true, product: transformProduct(res.data) }
    }
    return { success: false, error: res.message || 'Không thể cập nhật sản phẩm' }
  },

  delete: async (id: number) => {
    const res = await apiFetch<any>(`/products/${id}`, {
      method: 'DELETE',
    })

    return { success: res.success, error: res.message }
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
    type?: 'online' | 'pos'
    delivery_method?: 'delivery' | 'pickup'
    deliveryMethod?: 'delivery' | 'pickup'
    pickup_branch_id?: number
    pickupBranchId?: number
    customer_coords?: unknown
    customerCoords?: unknown
    customer_name: string
    customer_phone: string
    customer_email?: string
    customer_address?: string
    shipping_address?: string
    payment_method?: string
    note?: string
    subtotal?: number
    shipping_fee?: number
    shippingFee?: number
    total?: number
    items: { product_id: number; product_name?: string; name?: string; qty?: number; quantity?: number; price: number }[]
  }) => {
    const mappedItems = (data.items || []).map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name || item.name || '',
      qty: item.qty ?? item.quantity ?? 0,
      price: item.price,
    }))

    const computedSubtotal = data.subtotal ?? mappedItems.reduce((sum, item) => sum + item.price * item.qty, 0)
    const computedShippingFee = data.shipping_fee ?? data.shippingFee ?? 0
    const computedTotal = data.total ?? (computedSubtotal + computedShippingFee)

    const payload = {
      type: data.type || 'online',
      delivery_method: data.delivery_method || data.deliveryMethod || 'delivery',
      pickup_branch_id: data.pickup_branch_id ?? data.pickupBranchId,
      customer_coords: data.customer_coords ?? data.customerCoords,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      customer_address: data.customer_address ?? data.shipping_address,
      payment_method: data.payment_method || 'cod',
      note: data.note,
      subtotal: computedSubtotal,
      shipping_fee: computedShippingFee,
      total: computedTotal,
      items: mappedItems,
    }

    const res = await apiFetch<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
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
        cost: data.cost,
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
    reason?: string; note?: string; pickup_method?: "employee" | "delivery" | "customer";
    customer_name?: string; customer_phone?: string;
    items: { sku: string; name?: string; qty: number; available_at_request?: number }[]
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

  searchCustomers: async (search: string): Promise<ApiSalesCustomer[]> => {
    const params = new URLSearchParams()
    params.set('search', search)
    const res = await apiFetch<any[]>(`/sales-orders/customers?${params.toString()}`)
    if (res.success && res.data) return res.data.map(transformSalesCustomer)
    return []
  },

  createWalkInAccount: async (data: { full_name: string; phone: string; create_account?: boolean }) => {
    const res = await apiFetch<any>('/sales-orders/customers/walk-in-account', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (res.success && res.data) {
      return {
        success: true,
        user: transformSalesCustomer(res.data.user || {}),
        credentials: res.data.credentials || null,
        existed: !!res.data.existed,
        message: res.message,
      }
    }

    return { success: false, error: res.message || 'Không thể cấp tài khoản khách lẻ' }
  },

  create: async (data: {
    branch_id: number; customer_name?: string; customer_phone?: string;
    total?: number; discount?: number; final_total?: number;
    payment_method?: string; note?: string;
    items: { product_id?: number; product_name?: string; sku?: string; quantity?: number; qty?: number; price: number }[]
  }) => {
    const mappedItems = data.items.map(i => ({
      product_id: typeof i.product_id === 'number' && i.product_id > 0 ? i.product_id : null,
      product_name: i.product_name || i.sku || '',
      price: i.price,
      qty: i.qty || i.quantity || 0,
    }))
    const total = data.total || mappedItems.reduce((sum, item) => sum + item.price * item.qty, 0)
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
    return apiFetch(`/sales-orders/${id}/complete`, { method: 'PATCH' })
  },
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT API (Admin)
// ═══════════════════════════════════════════════════════════════

export const userApi = {
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
