"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { formatHDReference, formatVND } from "@/lib/utils"
import { productApi, salesOrderApi, orderApi, inventoryApi, type ApiSalesCustomer } from "@/lib/api"
import { useInventory } from "@/lib/inventory-context"
import { cn } from "@/lib/utils"
import { printOrderInvoice } from "@/lib/print-utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  Search, ShoppingCart, Plus, Trash2, CheckCircle2, AlertTriangle,
  DollarSign, Receipt, Printer, User, CreditCard, Banknote, Smartphone,
  FileText, ArrowDownToLine, ArrowUpFromLine, Package, Clock, XCircle,
  Eye, Truck, MapPin, Phone, ClipboardList, Filter, ChevronsUpDown, Check, Warehouse
} from "lucide-react"

interface CartItem {
  productId: number
  name: string
  price: number
  qty: number
  sku?: string
  category?: string
}

interface SaleRecord {
  id: string
  date: string
  time: string
  customer: string
  items: CartItem[]
  total: number
  discount: number
  finalTotal: number
  paymentMethod: string
  note: string
}

interface SalesOrder {
  id: string
  displayCode: string
  date: string
  time: string
  customer: string
  phone: string
  items: CartItem[]
  total: number
  discount: number
  finalTotal: number
  orderType: "delivery_cod" | "pay_at_shop"
  fulfillmentMode: "warehouse_delivery" | "shop_direct" | "shop_transfer"
  paymentStatus: "unpaid" | "paid"
  fulfillWarehouseId?: number
  fulfillWarehouseName?: string
  transferSourceWarehouseId?: number
  transferSourceWarehouseName?: string
  transferRequestId?: string
  transferStatus?: string
  expectedPickupDate?: string
  paymentMethod: string
  note: string
  status: "pending" | "approved" | "waiting_transfer" | "waiting_payment" | "rejected" | "exported"
  createdBy: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectReason?: string
  exportSlipId?: string
}

interface ExportSlip {
  id: string
  orderId: string
  orderCode?: string
  date: string
  items: { name: string; qty: number; price: number; sku?: string; category?: string }[]
  total: number
  customer: string
  note: string
  status: "pending" | "completed"
  createdBy: string
  completedAt?: string
  completedBy?: string
  warehouseId?: number
  warehouseName?: string
}

interface WarrantyInfo {
  taxCode: string
  companyName: string
  companyAddress: string
  companyEmail: string
}

type CustomerMode = "retail_account" | "walk_in" | "business"
type PurchaseType = "delivery_cod" | "pay_at_shop"

interface OnlineOrder {
  id: string
  displayCode: string
  items: { productId: number; name: string; price: number; qty: number }[]
  customer: { name: string; phone: string; email: string; address: string }
  note: string
  subtotal: number
  shippingFee: number
  total: number
  paymentMethod: string
  status: "pending" | "processing" | "shipping" | "delivered" | "cancelled"
  createdAt: string
  userId: string
  type: "online"
}

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800", icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  waiting_transfer: { label: "Chờ điều chuyển", color: "bg-purple-100 text-purple-800", icon: <Truck className="h-3.5 w-3.5" /> },
  waiting_payment: { label: "Chờ thanh toán", color: "bg-sky-100 text-sky-800", icon: <CreditCard className="h-3.5 w-3.5" /> },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
  exported: { label: "Đã xuất kho", color: "bg-green-100 text-green-800", icon: <Package className="h-3.5 w-3.5" /> },
  processing: { label: "Đang xử lý", color: "bg-blue-100 text-blue-800", icon: <Package className="h-3.5 w-3.5" /> },
  shipping: { label: "Đang giao", color: "bg-purple-100 text-purple-800", icon: <Truck className="h-3.5 w-3.5" /> },
  delivered: { label: "Đã giao", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
}

const slipStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xuất", color: "bg-amber-100 text-amber-800" },
  completed: { label: "Đã xuất", color: "bg-green-100 text-green-800" },
}

const paymentLabels: Record<string, string> = {
  cash: "Tiền mặt", cod: "COD", momo: "MoMo", vnpay: "VNPay", bank: "Chuyển khoản",
  "Tiền mặt": "Tiền mặt", "MoMo": "MoMo", "VNPay": "VNPay", "Chuyển khoản": "Chuyển khoản", "COD": "COD",
}

export default function EmployeeSales() {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerMode, setCustomerMode] = useState<CustomerMode>("retail_account")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerResults, setCustomerResults] = useState<ApiSalesCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<ApiSalesCustomer | null>(null)
  const [walkInCreateAccount, setWalkInCreateAccount] = useState(true)
  const [walkInCredentials, setWalkInCredentials] = useState<{ username: string; password: string } | null>(null)
  const [businessInfo, setBusinessInfo] = useState<WarrantyInfo>({
    taxCode: "",
    companyName: "",
    companyAddress: "",
    companyEmail: "",
  })
  const [taxLookupState, setTaxLookupState] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("pay_at_shop")
  const [preferredSourceWarehouseId, setPreferredSourceWarehouseId] = useState<string>("")
  const [note, setNote] = useState("")
  const [saleSuccess, setSaleSuccess] = useState(false)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null)

  // Orders & Slips state
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [exportSlips, setExportSlips] = useState<ExportSlip[]>([])
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([])
  const [orderSearch, setOrderSearch] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")
  const [slipSearch, setSlipSearch] = useState("")
  const [slipStatusFilter, setSlipStatusFilter] = useState("all")
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SalesOrder | null>(null)
  const [selectedOnlineOrder, setSelectedOnlineOrder] = useState<OnlineOrder | null>(null)
  const [selectedSlipDetail, setSelectedSlipDetail] = useState<ExportSlip | null>(null)
  const [warehouseOptions, setWarehouseOptions] = useState<{ id: number; name: string; branchId: number | null }[]>([])
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState<string>("all")

  // Load data from API + localStorage fallback
  const [products, setProducts] = useState<{id: number; sku?: string; name: string; price: number; brand: string; inStock: boolean}[]>([])
  const mapApiSalesOrder = (o: any): SalesOrder => {
    const items = (o.items || []).map((i: any) => ({
      productId: i.product_id || 0,
      name: i.product_name || i.name || "",
      price: Number(i.price || 0),
      qty: Number(i.qty || i.quantity || 0),
      sku: i.sku || i.product_sku,
      category: i.category || "",
    }))
    const total = Number(o.total ?? items.reduce((sum: number, item: CartItem) => sum + item.price * item.qty, 0))
    const discount = Number(o.discount ?? 0)
    const finalTotal = Number(o.final_total ?? (total - discount))
    const rawStatus = String(o.status || "pending")
    const status: SalesOrder["status"] =
      rawStatus === "approved" || rawStatus === "waiting_transfer" || rawStatus === "waiting_payment" || rawStatus === "rejected" || rawStatus === "exported"
        ? rawStatus
        : "pending"

    const rawOrderType = String(o.order_type || "pay_at_shop")
    const orderType: SalesOrder["orderType"] = rawOrderType === "delivery_cod" ? "delivery_cod" : "pay_at_shop"

    const rawFulfillment = String(o.fulfillment_mode || "shop_direct")
    const fulfillmentMode: SalesOrder["fulfillmentMode"] =
      rawFulfillment === "warehouse_delivery" || rawFulfillment === "shop_transfer" ? rawFulfillment : "shop_direct"

    const rawPaymentStatus = String(o.payment_status || "unpaid")
    const paymentStatus: SalesOrder["paymentStatus"] = rawPaymentStatus === "paid" ? "paid" : "unpaid"

    return {
      id: String(o.id),
      displayCode: formatHDReference(o.sales_code || o.id, o.created_at),
      date: o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "",
      time: o.created_at ? new Date(o.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
      customer: o.customer_name || "Khách lẻ",
      phone: o.customer_phone || "",
      items,
      total,
      discount,
      finalTotal,
      orderType,
      fulfillmentMode,
      paymentStatus,
      fulfillWarehouseId: o.fulfill_warehouse_id ? Number(o.fulfill_warehouse_id) : undefined,
      fulfillWarehouseName: o.fulfill_warehouse_name || undefined,
      transferSourceWarehouseId: o.transfer_source_warehouse_id ? Number(o.transfer_source_warehouse_id) : undefined,
      transferSourceWarehouseName: o.transfer_source_warehouse_name || undefined,
      transferRequestId: o.transfer_request_id || undefined,
      transferStatus: o.transfer_status || undefined,
      expectedPickupDate: o.expected_pickup_date || undefined,
      paymentMethod: o.payment_method || "",
      note: o.note || "",
      status,
      createdBy: o.employee_name || o.created_by_name || o.createdBy || o.created_by || "Nhân viên",
    }
  }

  useEffect(() => {
    productApi.getAll().then(res => {
      const list = Array.isArray(res) ? res : (res.products || [])
      setProducts(list.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: p.price,
        brand: p.brand || "",
        inStock: p.inStock ?? p.in_stock ?? true,
      })))
    }).catch(() => {})

    inventoryApi.getWarehouses().then((res: any) => {
      if (res?.success && Array.isArray(res.data)) {
        setWarehouseOptions(res.data.map((warehouse: any) => ({
          id: Number(warehouse.id),
          name: String(warehouse.name || ""),
          branchId: warehouse.branch_id ? Number(warehouse.branch_id) : null,
        })))
      }
    }).catch(() => {})
  }, [])

  // Mặc định chọn kho của nhân viên khi có dữ liệu
  useEffect(() => {
    if (user?.warehouseId && warehouseOptions.length > 0 && inventoryWarehouseFilter === "all") {
      const empWarehouseExists = warehouseOptions.some(w => w.id === Number(user.warehouseId))
      if (empWarehouseExists) {
        setInventoryWarehouseFilter(String(user.warehouseId))
      }
    }
  }, [user?.warehouseId, warehouseOptions])

  useEffect(() => {
    const loadData = async () => {
      try {
        const soRes = await salesOrderApi.getAll()
        if (soRes.success && soRes.data) {
          setSalesOrders(soRes.data.map(mapApiSalesOrder))
        }
      } catch {}
      try {
        const orRes = await orderApi.getAll()
        if (orRes.orders) {
          setOnlineOrders(orRes.orders.map((o: any) => ({
            id: String(o.id), items: (o.items || []).map((i: any) => ({ productId: i.productId || i.product_id, name: i.productName || i.name || "", price: i.price || 0, qty: i.quantity || i.qty || 0 })),
            displayCode: formatHDReference(o.orderCode || o.order_code || o.code || o.id, o.createdAt || o.created_at),
            customer: { name: o.customerName || "", phone: o.customerPhone || "", email: o.customerEmail || "", address: o.shippingAddress || "" },
            note: o.note || "", subtotal: o.subtotal || o.totalAmount || o.amount || 0, shippingFee: o.shippingFee || 0, total: o.totalAmount || o.amount || 0,
            paymentMethod: o.paymentMethod || "", status: o.status || "", createdAt: o.createdAt || "",
            userId: o.userId || "", type: "online" as const, deliveryMethod: o.deliveryMethod || "delivery",
          })))
        }
      } catch {}
      // Export slips from localStorage for now (no backend endpoint)
      try {
        const storedSlips = localStorage.getItem("exportSlips")
        if (storedSlips) setExportSlips(JSON.parse(storedSlips))
      } catch {}
    }
    loadData()
    const handleFocus = () => loadData()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  // Also reload after a sale is made
  useEffect(() => {
    if (saleSuccess) {
      salesOrderApi.getAll().then((res: any) => {
        if (res.success && res.data) {
          setSalesOrders(res.data.map(mapApiSalesOrder))
        }
      }).catch(() => {})
    }
  }, [saleSuccess])

  useEffect(() => {
    if (customerMode !== "retail_account") return

    const keyword = customerSearch.trim()
    if (keyword.length < 2) {
      setCustomerResults([])
      return
    }

    const timer = setTimeout(async () => {
      const list = await salesOrderApi.searchCustomers(keyword)
      setCustomerResults(list)
    }, 250)

    return () => clearTimeout(timer)
  }, [customerSearch, customerMode])

  const normalizePhone = (value: string) => value.replace(/\D/g, "")

  const clearCustomerSelection = () => {
    setSelectedCustomer(null)
    setCustomerResults([])
    setCustomerSearch("")
  }

  const handleTaxCodeLookup = async () => {
    const taxCode = normalizePhone(businessInfo.taxCode)
    if (taxCode.length < 10) {
      setTaxLookupState("error")
      return
    }

    setTaxLookupState("loading")
    try {
      const candidateName = `Doanh nghiệp MST ${taxCode}`
      setBusinessInfo((prev) => ({
        ...prev,
        taxCode,
        companyName: prev.companyName || candidateName,
      }))
      setTaxLookupState("ok")
    } catch {
      setTaxLookupState("error")
    }
  }

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(o => {
      if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false
      if (orderSearch
        && !o.id.toLowerCase().includes(orderSearch.toLowerCase())
        && !o.displayCode.toLowerCase().includes(orderSearch.toLowerCase())
        && !o.customer.toLowerCase().includes(orderSearch.toLowerCase())) return false
      return true
    })
  }, [salesOrders, orderStatusFilter, orderSearch])

  // Kho của nhân viên đang đăng nhập - dùng cho filter phiếu xuất kho
  const userWarehouseId = user?.warehouseId ? Number(user.warehouseId) : undefined

  const filteredExportSlips = useMemo(() => {
    // Lọc phiếu xuất kho: chỉ hiển thị phiếu của kho mình (fulfillWarehouseId = userWarehouseId)
    return exportSlips.filter(s => {
      // Kiểm tra phiếu xuất kho thuộc kho của mình
      if (s.warehouseId && s.warehouseId !== userWarehouseId) return false
      // Nếu không có warehouseId trong phiếu, kiểm tra qua đơn hàng liên kết
      if (!s.warehouseId) {
        const linkedOrder = salesOrders.find(o => o.id === s.orderId || o.exportSlipId === s.id)
        if (linkedOrder && linkedOrder.fulfillWarehouseId !== userWarehouseId) return false
      }
      if (slipStatusFilter !== "all" && s.status !== slipStatusFilter) return false
      if (slipSearch && !s.id.toLowerCase().includes(slipSearch.toLowerCase()) && !s.orderId.toLowerCase().includes(slipSearch.toLowerCase())) return false
      return true
    })
  }, [exportSlips, slipStatusFilter, slipSearch, userWarehouseId, salesOrders])

  const pendingOrdersCount = salesOrders.filter(o => o.status === "pending").length
  // Chỉ đếm phiếu pending của kho mình
  const pendingSlipsCount = useMemo(() => {
    return exportSlips.filter(s => {
      if (s.status !== "pending") return false
      if (s.warehouseId && s.warehouseId !== userWarehouseId) return false
      if (!s.warehouseId) {
        const linkedOrder = salesOrders.find(o => o.id === s.orderId || o.exportSlipId === s.id)
        if (linkedOrder && linkedOrder.fulfillWarehouseId !== userWarehouseId) return false
      }
      return true
    }).length
  }, [exportSlips, userWarehouseId, salesOrders])

  const availableProducts = products.filter(p => p.inStock)

  const filteredProducts = availableProducts.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Tổng kho: aggregate inventory items by SKU across all warehouses ────
  const { inventory: inventoryItems } = useInventory()
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [comboOpen, setComboOpen] = useState(false)
  const [comboSku, setComboSku] = useState("")

  /** All unique categories from inventory */
  const inventoryCategories = useMemo(() => {
    const cats = new Set(inventoryItems.map(i => i.category))
    return Array.from(cats).sort()
  }, [inventoryItems])

  /** Aggregated view: one row per SKU with totals across all warehouses */
  interface AggregatedItem {
    sku: string
    name: string
    category: string
    totalOnHand: number
    totalAvailable: number
    unitCost: number
    retailPrice: number
    productId?: number
    warehouses: { name: string; available: number }[]
  }

  const aggregatedInventory: AggregatedItem[] = useMemo(() => {
    // Lọc theo kho nếu có chọn kho cụ thể
    const filteredByWarehouse = inventoryWarehouseFilter === "all"
      ? inventoryItems
      : inventoryItems.filter(item => item.warehouseId === Number(inventoryWarehouseFilter))

    const map = new Map<string, AggregatedItem>()
    for (const item of filteredByWarehouse) {
      const existing = map.get(item.sku)
      if (existing) {
        existing.totalOnHand += item.onHand
        existing.totalAvailable += item.available
        existing.warehouses.push({ name: item.warehouse, available: item.available })
      } else {
        // Match to retail product if available
        const retailBySku = products.find(p => p.sku && p.sku === item.sku)
        const retailByName = products.find(p =>
          p.name.toLowerCase().includes(item.name.toLowerCase().split(" ").slice(0, 3).join(" ")) ||
          item.name.toLowerCase().includes(p.name.toLowerCase().split(" ").slice(0, 3).join(" "))
        )
        const retail = retailBySku || retailByName
        map.set(item.sku, {
          sku: item.sku,
          name: item.name,
          category: item.category,
          totalOnHand: item.onHand,
          totalAvailable: item.available,
          unitCost: item.unitCost,
          retailPrice: retail?.price ?? Math.round(item.unitCost * 1.4),
          productId: retail?.id,
          warehouses: [{ name: item.warehouse, available: item.available }],
        })
      }
    }
    return Array.from(map.values())
  }, [inventoryItems, products, inventoryWarehouseFilter])

  const filteredInventory = useMemo(() => {
    return aggregatedInventory.filter(item => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return item.name.toLowerCase().includes(s) || item.sku.toLowerCase().includes(s) || item.category.toLowerCase().includes(s)
      }
      return true
    })
  }, [aggregatedInventory, categoryFilter, search])

  const warehouseNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const warehouse of warehouseOptions) {
      map.set(warehouse.id, warehouse.name)
    }
    return map
  }, [warehouseOptions])

  const cartSkuQtyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of cart) {
      if (!item.sku) continue
      map.set(item.sku, (map.get(item.sku) || 0) + item.qty)
    }
    return map
  }, [cart])

  const hasEnoughStockInWarehouse = (warehouseId?: number) => {
    if (!warehouseId || cartSkuQtyMap.size === 0) return false
    for (const [sku, qty] of cartSkuQtyMap.entries()) {
      const available = inventoryItems
        .filter(inv => inv.warehouseId === warehouseId && inv.sku === sku)
        .reduce((sum, inv) => sum + inv.available, 0)
      if (available < qty) return false
    }
    return true
  }

  const employeeWarehouseId = user?.warehouseId ? Number(user.warehouseId) : undefined
  const employeeWarehouseOption = warehouseOptions.find(warehouse => warehouse.id === employeeWarehouseId)
  const employeeBranchId = employeeWarehouseOption?.branchId || undefined

  const eligibleWarehouseOptions = useMemo(() => {
    if (cartSkuQtyMap.size === 0) return [] as { id: number; name: string; branchId: number | null }[]
    const eligible = warehouseOptions.filter(warehouse => hasEnoughStockInWarehouse(warehouse.id))

    // Sắp xếp: kho nhân viên > kho tổng (branchId null) > kho khác
    return eligible.sort((a, b) => {
      // Kho nhân viên ưu tiên cao nhất
      if (a.id === employeeWarehouseId) return -1
      if (b.id === employeeWarehouseId) return 1
      // Kho tổng (branchId null hoặc tên chứa "Tổng") ưu tiên thứ 2
      const aIsMain = a.branchId === null || a.name.toLowerCase().includes("tổng")
      const bIsMain = b.branchId === null || b.name.toLowerCase().includes("tổng")
      if (aIsMain && !bIsMain) return -1
      if (bIsMain && !aIsMain) return 1
      return 0
    })
  }, [warehouseOptions, cartSkuQtyMap, inventoryItems, employeeWarehouseId])

  const shopHasEnoughStock = useMemo(() => {
    if (!employeeWarehouseId) return false
    if (cartSkuQtyMap.size === 0) return true
    return hasEnoughStockInWarehouse(employeeWarehouseId)
  }, [employeeWarehouseId, cartSkuQtyMap, inventoryItems])

  const transferSourceOptions = useMemo(() => {
    return eligibleWarehouseOptions.filter(warehouse => warehouse.id !== employeeWarehouseId)
  }, [eligibleWarehouseOptions, employeeWarehouseId])

  useEffect(() => {
    if (purchaseType === "delivery_cod") {
      if (eligibleWarehouseOptions.length === 0) {
        setPreferredSourceWarehouseId("")
        return
      }

      const currentId = Number(preferredSourceWarehouseId || 0)
      const exists = eligibleWarehouseOptions.some(warehouse => warehouse.id === currentId)
      if (!exists) {
        // Ưu tiên: kho nhân viên > kho tổng > kho đầu tiên (đã được sort)
        const employeeWarehouse = eligibleWarehouseOptions.find(w => w.id === employeeWarehouseId)
        if (employeeWarehouse) {
          setPreferredSourceWarehouseId(String(employeeWarehouse.id))
        } else {
          // Đã sort nên phần tử đầu là kho tổng hoặc kho ưu tiên nhất
          setPreferredSourceWarehouseId(String(eligibleWarehouseOptions[0].id))
        }
      }
      return
    }

    if (shopHasEnoughStock) {
      setPreferredSourceWarehouseId("")
      return
    }

    if (transferSourceOptions.length === 0) {
      setPreferredSourceWarehouseId("")
      return
    }

    const currentId = Number(preferredSourceWarehouseId || 0)
    const exists = transferSourceOptions.some(warehouse => warehouse.id === currentId)
    if (!exists) {
      // Ưu tiên kho tổng trước cho điều chuyển (đã được sort)
      setPreferredSourceWarehouseId(String(transferSourceOptions[0].id))
    }
  }, [purchaseType, eligibleWarehouseOptions, transferSourceOptions, preferredSourceWarehouseId, shopHasEnoughStock, employeeWarehouseId])

  // Tự động chuyển sang COD nếu kho mình hết hàng (không thể thanh toán tại shop)
  useEffect(() => {
    if (cart.length > 0 && !shopHasEnoughStock && purchaseType === "pay_at_shop") {
      setPurchaseType("delivery_cod")
    }
  }, [shopHasEnoughStock, cart.length])

  const selectedSourceWarehouseId = preferredSourceWarehouseId ? Number(preferredSourceWarehouseId) : undefined

  const orderRouting = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expectedPickupDate = tomorrow.toISOString().split("T")[0]

    if (purchaseType === "delivery_cod") {
      if (!selectedSourceWarehouseId) {
        return {
          valid: false,
          message: "Chưa chọn kho xuất cho giao hàng thu tiền",
        }
      }

      return {
        valid: true,
        orderType: "delivery_cod" as const,
        fulfillmentMode: "warehouse_delivery" as const,
        fulfillWarehouseId: selectedSourceWarehouseId,
        transferSourceWarehouseId: undefined,
        expectedPickupDate: undefined,
        paymentMethodLabel: "COD",
      }
    }

    if (!employeeWarehouseId) {
      return {
        valid: false,
        message: "Tài khoản chưa được gán kho chi nhánh",
      }
    }

    if (shopHasEnoughStock) {
      return {
        valid: true,
        orderType: "pay_at_shop" as const,
        fulfillmentMode: "shop_direct" as const,
        fulfillWarehouseId: employeeWarehouseId,
        transferSourceWarehouseId: undefined,
        expectedPickupDate: undefined,
        paymentMethodLabel: paymentMethod === "cash" ? "Tiền mặt" : paymentMethod === "momo" ? "MoMo" : paymentMethod === "vnpay" ? "VNPay" : "Chuyển khoản",
      }
    }

    if (!selectedSourceWarehouseId) {
      return {
        valid: false,
        message: "Không còn kho nguồn đủ hàng để điều chuyển về shop",
      }
    }

    return {
      valid: true,
      orderType: "pay_at_shop" as const,
      fulfillmentMode: "shop_transfer" as const,
      fulfillWarehouseId: employeeWarehouseId,
      transferSourceWarehouseId: selectedSourceWarehouseId,
      expectedPickupDate,
      paymentMethodLabel: paymentMethod === "cash" ? "Tiền mặt" : paymentMethod === "momo" ? "MoMo" : paymentMethod === "vnpay" ? "VNPay" : "Chuyển khoản",
    }
  }, [purchaseType, selectedSourceWarehouseId, employeeWarehouseId, shopHasEnoughStock, paymentMethod])

  const addInventoryItemToCart = (item: AggregatedItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name)
      if (existing) {
        return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, {
        productId: item.productId ?? 0,
        name: item.name,
        price: item.retailPrice,
        qty: 1,
        sku: item.sku,
        category: item.category,
      }]
    })
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const discountAmount = useMemo(() => {
    if (discountType === "percent") return Math.round(cartTotal * discount / 100)
    return discount
  }, [cartTotal, discount, discountType])
  const finalTotal = cartTotal - discountAmount

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id)
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, sku: product.sku }]
    })
  }

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId))
    } else {
      setCart(prev => prev.map(item => item.productId === productId ? { ...item, qty } : item))
    }
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId))
  }

  const handleConfirmSale = async () => {
    if (cart.length === 0) return
    if (!orderRouting.valid) {
      alert(orderRouting.message)
      return
    }

    let resolvedName = customerName.trim()
    let resolvedPhone = normalizePhone(customerPhone)
    let enrichedNote = note.trim()
    let generatedCredentials: { username: string; password: string } | null = null

    if (customerMode === "retail_account") {
      if (selectedCustomer) {
        resolvedName = selectedCustomer.fullName || resolvedName
        resolvedPhone = normalizePhone(selectedCustomer.phone || resolvedPhone)
      }
      resolvedName = resolvedName || "Khách lẻ"
    }

    if (customerMode === "walk_in") {
      if (!resolvedPhone) return

      if (walkInCreateAccount) {
        const accountResult = await salesOrderApi.createWalkInAccount({
          full_name: resolvedName || `Khách vãng lai ${resolvedPhone.slice(-4)}`,
          phone: resolvedPhone,
          create_account: true,
        })

        if (!accountResult.success || !accountResult.user) return

        resolvedName = accountResult.user.fullName || resolvedName || `Khách vãng lai ${resolvedPhone.slice(-4)}`
        resolvedPhone = normalizePhone(accountResult.user.phone || resolvedPhone)
        generatedCredentials = accountResult.credentials || null
        if (generatedCredentials) {
          const credentialNote = `TKKH ${generatedCredentials.username}/${generatedCredentials.password}`
          enrichedNote = [credentialNote, enrichedNote].filter(Boolean).join(" | ")
        }
      } else {
        resolvedName = resolvedName || `Khách vãng lai ${resolvedPhone.slice(-4)}`
      }
    }

    if (customerMode === "business") {
      const taxCode = normalizePhone(businessInfo.taxCode)
      resolvedName = businessInfo.companyName.trim() || resolvedName || "Khách doanh nghiệp"

      const vatPayload = [
        `VAT-MST:${taxCode || "N/A"}`,
        `CTY:${businessInfo.companyName || resolvedName}`,
        `EMAIL:${businessInfo.companyEmail || ""}`,
        `ADDR:${businessInfo.companyAddress || ""}`,
      ].join(";")

      enrichedNote = [vatPayload, enrichedNote].filter(Boolean).join(" | ")
    }

    if (orderRouting.fulfillmentMode === "shop_transfer" && orderRouting.expectedPickupDate) {
      enrichedNote = [`HEN-LAY:${orderRouting.expectedPickupDate}`, enrichedNote].filter(Boolean).join(" | ")
    }

    if (!resolvedName) resolvedName = "Khách lẻ"

    const paymentLabel = orderRouting.paymentMethodLabel || "Tiền mặt"

    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    const sale: SaleRecord = {
      id: `HD-${yy}${mm}${dd}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
      date: now.toISOString().split("T")[0],
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      customer: resolvedName,
      items: [...cart],
      total: cartTotal,
      discount: discountAmount,
      finalTotal,
      paymentMethod: paymentLabel,
      note: enrichedNote,
    }

    // Save as pending sales order via API
    try {
      const res: any = await salesOrderApi.create({
        branch_id: employeeBranchId || 1,
        order_type: orderRouting.orderType,
        fulfillment_mode: orderRouting.fulfillmentMode,
        fulfill_warehouse_id: orderRouting.fulfillWarehouseId,
        transfer_source_warehouse_id: orderRouting.transferSourceWarehouseId,
        expected_pickup_date: orderRouting.expectedPickupDate,
        customer_name: resolvedName,
        customer_phone: resolvedPhone || undefined,
        total: cartTotal,
        discount: discountAmount,
        final_total: finalTotal,
        payment_status: "unpaid",
        payment_method: paymentLabel,
        note: enrichedNote || undefined,
        items: cart.map(c => ({
          product_id: c.productId > 0 ? c.productId : undefined,
          product_name: c.name,
          sku: c.sku,
          qty: c.qty,
          price: c.price,
        })),
      })
      if (res?.data?.sales_code) sale.id = res.data.sales_code
      if (!res?.success) return
    } catch {
      return
    }

    setWalkInCredentials(generatedCredentials)

    setSalesHistory(prev => [sale, ...prev])
    setLastSale(sale)
    setSaleSuccess(true)

    // Reset form
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setCustomerSearch("")
    setSelectedCustomer(null)
    setCustomerResults([])
    setBusinessInfo({ taxCode: "", companyName: "", companyAddress: "", companyEmail: "" })
    setTaxLookupState("idle")
    setDiscount(0)
    setPurchaseType("pay_at_shop")
    setPreferredSourceWarehouseId("")
    setPaymentMethod("cash")
    setNote("")

    setTimeout(() => setSaleSuccess(false), 4000)
    router.push("/employee/approval")
  }

  const paymentMethods = [
    { value: "cash", label: "Tiền mặt", icon: <Banknote className="h-4 w-4" /> },
    { value: "momo", label: "MoMo", icon: <Smartphone className="h-4 w-4" /> },
    { value: "vnpay", label: "VNPay", icon: <CreditCard className="h-4 w-4" /> },
    { value: "bank", label: "Chuyển khoản", icon: <DollarSign className="h-4 w-4" /> },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold">Bán hàng</h1>
          <p className="text-sm text-muted-foreground">Tạo đơn bán hàng và thanh toán</p>
        </div>
      </div>

      {saleSuccess && lastSale && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200 mb-6">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Tạo đơn thành công! Mã hóa đơn: <strong>{lastSale.id}</strong> — đang chờ duyệt
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Tổng tiền: {formatVND(lastSale.finalTotal)} • Khách hàng: {lastSale.customer} • {lastSale.paymentMethod}
            </p>
            {walkInCredentials && (
              <p className="text-xs text-blue-700 mt-1">
                Tài khoản khách: <strong>{walkInCredentials.username}</strong> / <strong>{walkInCredentials.password}</strong>
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => router.push("/employee/approval")}>
            Xem duyệt đơn
          </Button>
        </div>
      )}

      <Tabs defaultValue="pos">
        <TabsList className="mb-4">
          <TabsTrigger value="pos" className="gap-1.5"><ShoppingCart className="h-3.5 w-3.5" /> Bán hàng</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Danh sách đơn
            {pendingOrdersCount > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] rounded-full bg-amber-500 text-white text-[10px] px-1.5">{pendingOrdersCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="slips" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Phiếu xuất kho
            {pendingSlipsCount > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] rounded-full bg-orange-500 text-white text-[10px] px-1.5">{pendingSlipsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Lịch sử bán</TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Product List — Tổng kho */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-blue-600" />
                    {inventoryWarehouseFilter === "all"
                      ? "Tổng kho"
                      : warehouseOptions.find(w => w.id === Number(inventoryWarehouseFilter))?.name || "Kho"}
                    — Chọn sản phẩm
                    <Badge variant="secondary" className="ml-auto text-xs font-normal">
                      {aggregatedInventory.length} SKU
                    </Badge>
                  </CardTitle>

                  {/* Filters row: Warehouse + Search + Category combobox */}
                  <div className="flex items-center gap-2 mt-2">
                    {/* Warehouse filter - ưu tiên kho nhân viên */}
                    <Select value={inventoryWarehouseFilter} onValueChange={setInventoryWarehouseFilter}>
                      <SelectTrigger className="w-[160px] h-9 text-xs">
                        <Warehouse className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <SelectValue placeholder="Chọn kho" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Kho của nhân viên (ưu tiên đầu) */}
                        {user?.warehouseId && warehouseOptions.find(w => w.id === Number(user.warehouseId)) && (
                          <SelectItem value={String(user.warehouseId)} className="text-xs font-medium text-blue-600">
                            ⭐ {warehouseOptions.find(w => w.id === Number(user.warehouseId))?.name} (Kho của tôi)
                          </SelectItem>
                        )}
                        <SelectItem value="all" className="text-xs">Tất cả kho</SelectItem>
                        {/* Kho tổng (branchId null) */}
                        {warehouseOptions
                          .filter(w => (w.branchId === null || w.name.toLowerCase().includes("tổng")) && w.id !== Number(user?.warehouseId))
                          .map(w => (
                            <SelectItem key={w.id} value={String(w.id)} className="text-xs">
                              {w.name}
                            </SelectItem>
                          ))}
                        {/* Kho khác */}
                        {warehouseOptions
                          .filter(w => w.branchId !== null && !w.name.toLowerCase().includes("tổng") && w.id !== Number(user?.warehouseId))
                          .map(w => (
                            <SelectItem key={w.id} value={String(w.id)} className="text-xs">
                              {w.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm theo tên, mã SKU, danh mục..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Category Combobox */}
                    <Popover open={comboOpen} onOpenChange={setComboOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-[180px] justify-between text-xs h-9">
                          <Filter className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          {categoryFilter === "all" ? "Tất cả danh mục" : categoryFilter}
                          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Tìm danh mục..." className="h-8 text-xs" />
                          <CommandList>
                            <CommandEmpty>Không tìm thấy.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => { setCategoryFilter("all"); setComboOpen(false) }}
                                className="text-xs"
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5", categoryFilter === "all" ? "opacity-100" : "opacity-0")} />
                                Tất cả danh mục
                              </CommandItem>
                              {inventoryCategories.map(cat => (
                                <CommandItem
                                  key={cat}
                                  value={cat}
                                  onSelect={() => { setCategoryFilter(cat); setComboOpen(false) }}
                                  className="text-xs"
                                >
                                  <Check className={cn("mr-2 h-3.5 w-3.5", categoryFilter === cat ? "opacity-100" : "opacity-0")} />
                                  {cat}
                                  <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                                    {aggregatedInventory.filter(i => i.category === cat).length}
                                  </Badge>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-24">Mã SKU</TableHead>
                          <TableHead className="text-xs">Sản phẩm</TableHead>
                          <TableHead className="text-xs">Danh mục</TableHead>
                          <TableHead className="text-xs text-center">Tồn kho</TableHead>
                          <TableHead className="text-xs text-right">Giá bán</TableHead>
                          <TableHead className="text-xs w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventory.map(item => {
                          const inCart = cart.find(c => c.name === item.name)
                          const isLow = item.totalAvailable <= 5
                          const isOut = item.totalAvailable === 0
                          return (
                            <TableRow key={item.sku} className={cn(
                              "hover:bg-muted/50",
                              inCart && "bg-blue-50/50",
                              isOut && "opacity-50"
                            )}>
                              <TableCell>
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{item.sku}</code>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-medium">{item.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {item.warehouses.map(w => (
                                    <span key={w.name} className="text-[10px] text-muted-foreground">
                                      {w.name.replace("Kho ", "")}: <strong className={w.available === 0 ? "text-red-500" : ""}>{w.available}</strong>
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  "text-sm font-semibold",
                                  isOut ? "text-red-500" : isLow ? "text-amber-600" : "text-green-600"
                                )}>
                                  {item.totalAvailable}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm font-semibold text-primary">
                                {formatVND(item.retailPrice)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={inCart ? "secondary" : "default"}
                                  className="h-7 text-xs"
                                  onClick={() => addInventoryItemToCart(item)}
                                  disabled={isOut}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {inCart ? `(${inCart.qty})` : "Thêm"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {filteredInventory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Không tìm thấy sản phẩm trong kho
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart / Invoice */}
            <div className="lg:col-span-2">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" /> Hóa đơn
                    {cart.length > 0 && (
                      <Badge className="ml-auto bg-blue-600">{cart.length} SP</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Loại khách hàng</Label>
                      <Select
                        value={customerMode}
                        onValueChange={(value: CustomerMode) => {
                          setCustomerMode(value)
                          clearCustomerSelection()
                          setWalkInCredentials(null)
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail_account">Khách lẻ có tài khoản</SelectItem>
                          <SelectItem value="walk_in">Khách lẻ vãng lai</SelectItem>
                          <SelectItem value="business">Khách doanh nghiệp (VAT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {customerMode === "retail_account" && (
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <div>
                          <Label className="text-xs">Tìm tài khoản (tên/sđt/mã KH)</Label>
                          <Input
                            placeholder="Nhập tối thiểu 2 ký tự"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>

                        {customerResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto rounded border bg-background">
                            {customerResults.map((customer) => (
                              <button
                                key={`${customer.id || customer.userCode}-${customer.phone}`}
                                type="button"
                                className="w-full text-left px-2.5 py-2 text-xs hover:bg-muted border-b last:border-b-0"
                                onClick={() => {
                                  setSelectedCustomer(customer)
                                  setCustomerName(customer.fullName)
                                  setCustomerPhone(customer.phone)
                                  setCustomerSearch(`${customer.fullName} • ${customer.phone}`)
                                  setCustomerResults([])
                                }}
                              >
                                <p className="font-medium">{customer.fullName || "(Chưa có tên)"}</p>
                                <p className="text-muted-foreground">{customer.phone} {customer.userCode ? `• ${customer.userCode}` : ""}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedCustomer && (
                          <div className="flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs">
                            <span>Đã chọn: <strong>{selectedCustomer.fullName}</strong> ({selectedCustomer.phone})</span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={clearCustomerSelection}>Bỏ chọn</Button>
                          </div>
                        )}
                      </div>
                    )}

                    {customerMode === "walk_in" && (
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Tên khách</Label>
                            <Input
                              placeholder="Khách vãng lai"
                              value={customerName}
                              onChange={e => setCustomerName(e.target.value)}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Số điện thoại</Label>
                            <Input
                              placeholder="SĐT"
                              value={customerPhone}
                              onChange={e => setCustomerPhone(normalizePhone(e.target.value))}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded border px-2.5 py-2">
                          <div>
                            <p className="text-xs font-medium">Cấp tài khoản cho khách vãng lai</p>
                            <p className="text-[11px] text-muted-foreground">Tự tạo username/password để khách mua sau tiện hơn</p>
                          </div>
                          <Switch checked={walkInCreateAccount} onCheckedChange={setWalkInCreateAccount} />
                        </div>
                      </div>
                    )}

                    {customerMode === "business" && (
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Tên doanh nghiệp</Label>
                            <Input
                              placeholder="Công ty..."
                              value={businessInfo.companyName}
                              onChange={(e) => setBusinessInfo((prev) => ({ ...prev, companyName: e.target.value }))}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Mã số thuế</Label>
                            <div className="mt-1 flex gap-2">
                              <Input
                                placeholder="Nhập MST"
                                value={businessInfo.taxCode}
                                onChange={(e) => setBusinessInfo((prev) => ({ ...prev, taxCode: normalizePhone(e.target.value) }))}
                                className="h-8 text-xs"
                              />
                              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={handleTaxCodeLookup}>
                                Tra MST
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Email nhận VAT</Label>
                            <Input
                              placeholder="ketoan@company.vn"
                              value={businessInfo.companyEmail}
                              onChange={(e) => setBusinessInfo((prev) => ({ ...prev, companyEmail: e.target.value }))}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">SĐT liên hệ</Label>
                            <Input
                              placeholder="SĐT"
                              value={customerPhone}
                              onChange={e => setCustomerPhone(normalizePhone(e.target.value))}
                              className="h-8 text-xs mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Địa chỉ xuất hóa đơn</Label>
                          <Input
                            placeholder="Địa chỉ công ty"
                            value={businessInfo.companyAddress}
                            onChange={(e) => setBusinessInfo((prev) => ({ ...prev, companyAddress: e.target.value }))}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        {taxLookupState !== "idle" && (
                          <p className={cn("text-[11px]", taxLookupState === "ok" ? "text-green-600" : taxLookupState === "loading" ? "text-blue-600" : "text-red-600")}>
                            {taxLookupState === "loading" ? "Đang tra thông tin MST..." : taxLookupState === "ok" ? "Đã cập nhật thông tin MST." : "MST chưa hợp lệ, vui lòng kiểm tra lại."}
                          </p>
                        )}
                      </div>
                    )}

                    {customerMode === "retail_account" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Khách hàng</Label>
                          <div className="relative mt-1">
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Khách lẻ"
                              value={customerName}
                              onChange={e => setCustomerName(e.target.value)}
                              className="h-8 text-xs pl-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Số điện thoại</Label>
                          <Input
                            placeholder="SĐT"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(normalizePhone(e.target.value))}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Items */}
                  {cart.length === 0 ? (
                    <div className="py-8 text-center">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                      <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào</p>
                      <p className="text-xs text-muted-foreground mt-1">Chọn sản phẩm từ danh sách bên trái</p>
                    </div>
                  ) : (
                    <div className="max-h-[260px] overflow-y-auto space-y-2">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatVND(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline" size="icon" className="h-6 w-6"
                              onClick={() => updateQty(item.productId, item.qty - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={item.qty}
                              onChange={e => updateQty(item.productId, parseInt(e.target.value) || 0)}
                              className="h-6 w-10 text-xs text-center p-0"
                              min={1}
                            />
                            <Button
                              variant="outline" size="icon" className="h-6 w-6"
                              onClick={() => updateQty(item.productId, item.qty + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <p className="text-xs font-semibold w-20 text-right">{formatVND(item.price * item.qty)}</p>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Discount */}
                  {cart.length > 0 && (
                    <>
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <Label className="text-xs">Kiểu mua hàng</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={purchaseType === "pay_at_shop" ? "default" : "outline"}
                            className={cn("h-8 text-xs", purchaseType === "pay_at_shop" ? "bg-blue-600 hover:bg-blue-700" : "")}
                            onClick={() => setPurchaseType("pay_at_shop")}
                            disabled={cart.length > 0 && !shopHasEnoughStock}
                            title={cart.length > 0 && !shopHasEnoughStock ? "Kho của bạn hết hàng, chỉ có thể giao hàng COD từ kho khác" : ""}
                          >
                            Thanh toán tại shop
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={purchaseType === "delivery_cod" ? "default" : "outline"}
                            className={cn("h-8 text-xs", purchaseType === "delivery_cod" ? "bg-blue-600 hover:bg-blue-700" : "")}
                            onClick={() => setPurchaseType("delivery_cod")}
                          >
                            Giao hàng thu tiền
                          </Button>
                        </div>

                        {/* Cảnh báo khi kho mình hết hàng */}
                        {cart.length > 0 && !shopHasEnoughStock && (
                          <div className="flex items-start gap-2 rounded border border-orange-200 bg-orange-50 px-2.5 py-2 text-xs text-orange-800">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                              Kho của bạn ({employeeWarehouseOption?.name || "kho chi nhánh"}) không đủ hàng.
                              Đơn sẽ được xuất từ kho khác và chỉ hỗ trợ <strong>Giao hàng COD</strong>.
                            </span>
                          </div>
                        )}

                        {purchaseType === "delivery_cod" ? (
                          <div className="space-y-2">
                            <Label className="text-xs">Kho xuất cho giao vận lấy hàng</Label>
                            <Select value={preferredSourceWarehouseId} onValueChange={setPreferredSourceWarehouseId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Chọn kho xuất" />
                              </SelectTrigger>
                              <SelectContent>
                                {eligibleWarehouseOptions.map(warehouse => (
                                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                                    {warehouse.name}
                                    {warehouse.id === employeeWarehouseId && " ⭐"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedSourceWarehouseId === employeeWarehouseId ? (
                              <p className="text-[11px] text-green-600">Xuất từ kho của bạn • Giao vận tới lấy hàng tại shop.</p>
                            ) : (
                              <div className="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs text-blue-800">
                                <Warehouse className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>
                                  Phiếu xuất kho sẽ gửi tới <strong>{warehouseNameById.get(selectedSourceWarehouseId || 0) || "kho đã chọn"}</strong>.
                                  Kho xác nhận xuất hàng xong mới giao cho vận chuyển.
                                </span>
                              </div>
                            )}
                          </div>
                        ) : shopHasEnoughStock ? (
                          <div className="rounded border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-800">
                            Còn hàng tại kho shop ({employeeWarehouseOption?.name || user?.warehouse || "Kho chi nhánh"}) • có thể xuất trực tiếp sau khi xác nhận thanh toán.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-xs">Kho nguồn điều chuyển về shop</Label>
                            <Select value={preferredSourceWarehouseId} onValueChange={setPreferredSourceWarehouseId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Chọn kho nguồn điều chuyển" />
                              </SelectTrigger>
                              <SelectContent>
                                {transferSourceOptions.map(warehouse => (
                                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                                    {warehouse.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>Đơn sẽ chờ kho nguồn xuất điều chuyển và kho đích xác nhận nhập trước khi cho phép xác nhận thanh toán/xuất kho.</span>
                            </div>
                          </div>
                        )}

                        {!orderRouting.valid && (
                          <p className="text-[11px] text-red-600">{orderRouting.message}</p>
                        )}
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Giảm giá</Label>
                          <Input
                            type="number"
                            min={0}
                            value={discount}
                            onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <Select value={discountType} onValueChange={(v: "percent" | "fixed") => setDiscountType(v)}>
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="fixed">VNĐ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Method */}
                      {purchaseType === "pay_at_shop" ? (
                        <div>
                          <Label className="text-xs">Phương thức thanh toán</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            {paymentMethods.map(pm => (
                              <Button
                                key={pm.value}
                                variant={paymentMethod === pm.value ? "default" : "outline"}
                                size="sm"
                                className={cn("h-8 text-xs gap-1.5", paymentMethod === pm.value && "bg-blue-600 hover:bg-blue-700")}
                                onClick={() => setPaymentMethod(pm.value)}
                              >
                                {pm.icon}
                                {pm.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs">Phương thức thanh toán</Label>
                          <div className="mt-1.5 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 font-medium">
                            COD — Thu tiền khi giao hàng
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      <div>
                        <Label className="text-xs">Ghi chú</Label>
                        <Textarea
                          placeholder="Ghi chú đơn hàng..."
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          className="mt-1 text-xs"
                          rows={2}
                        />
                      </div>

                      {/* Totals */}
                      <div className="space-y-1.5 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tạm tính ({cart.reduce((s, i) => s + i.qty, 0)} SP)</span>
                          <span>{formatVND(cartTotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Giảm giá</span>
                            <span className="text-red-600">-{formatVND(discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold pt-1.5 border-t">
                          <span>Tổng thanh toán</span>
                          <span className="text-primary text-lg">{formatVND(finalTotal)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setCart([])
                            setDiscount(0)
                            setNote("")
                            setCustomerName("")
                            setCustomerPhone("")
                            clearCustomerSelection()
                            setWalkInCredentials(null)
                            setBusinessInfo({ taxCode: "", companyName: "", companyAddress: "", companyEmail: "" })
                            setTaxLookupState("idle")
                            setPurchaseType("pay_at_shop")
                            setPreferredSourceWarehouseId("")
                            setPaymentMethod("cash")
                          }}
                        >
                          Huỷ đơn
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={cart.length === 0 || !orderRouting.valid}>
                              <DollarSign className="h-4 w-4 mr-1" /> Thanh toán
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-serif">Xác nhận thanh toán</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <Receipt className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm space-y-1">
                                  <p>Khách hàng: <strong>{customerName || "Khách lẻ"}</strong></p>
                                  <p>Số sản phẩm: <strong>{cart.reduce((s, i) => s + i.qty, 0)}</strong></p>
                                  {discountAmount > 0 && (
                                    <p>Giảm giá: <strong className="text-red-600">-{formatVND(discountAmount)}</strong></p>
                                  )}
                                  <p>Thanh toán: <strong>{orderRouting.valid ? orderRouting.paymentMethodLabel : "Chưa đủ điều kiện"}</strong></p>
                                  {orderRouting.valid && (
                                    <p>
                                      Luồng xử lý: <strong>
                                        {orderRouting.orderType === "delivery_cod"
                                          ? `COD từ ${warehouseNameById.get(orderRouting.fulfillWarehouseId || 0) || "kho đã chọn"}`
                                          : orderRouting.fulfillmentMode === "shop_transfer"
                                            ? `Điều chuyển về ${warehouseNameById.get(orderRouting.fulfillWarehouseId || 0) || "kho shop"}`
                                            : "Xuất trực tiếp tại shop"}
                                      </strong>
                                    </p>
                                  )}
                                  <p className="text-lg font-bold text-primary pt-1">
                                    Tổng: {formatVND(finalTotal)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Huỷ</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleConfirmSale}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Xác nhận
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã đơn, khách hàng..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="waiting_transfer">Chờ điều chuyển</SelectItem>
                  <SelectItem value="waiting_payment">Chờ thanh toán</SelectItem>
                  <SelectItem value="exported">Đã xuất kho</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span>{filteredSalesOrders.length} đơn</span>
                {pendingOrdersCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">{pendingOrdersCount} chờ duyệt</Badge>
                )}
              </div>
            </div>

            {/* Sales Orders Table */}
            <Card>
              <CardContent className="p-0">
                {filteredSalesOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">Chưa có đơn hàng nào</p>
                    <p className="text-xs text-muted-foreground mt-1">Đơn hàng sẽ xuất hiện sau khi bạn tạo đơn bán hàng</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mã đơn</TableHead>
                        <TableHead className="text-xs">Thời gian</TableHead>
                        <TableHead className="text-xs">Khách hàng</TableHead>
                        <TableHead className="text-xs text-center">Số SP</TableHead>
                        <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                        <TableHead className="text-xs">PTTT</TableHead>
                        <TableHead className="text-xs">Trạng thái</TableHead>
                        <TableHead className="text-xs">Người tạo</TableHead>
                        <TableHead className="text-xs w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSalesOrders.map(order => {
                        const statusCfg = orderStatusConfig[order.status] || orderStatusConfig.pending
                        return (
                          <TableRow key={order.id} className={cn(
                            "hover:bg-muted/50",
                            order.status === "pending" && "bg-amber-50/30"
                          )}>
                            <TableCell className="font-mono text-xs text-blue-600 font-bold">{order.displayCode}</TableCell>
                            <TableCell className="text-sm">{order.date} {order.time}</TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{order.customer}</p>
                              {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
                            </TableCell>
                            <TableCell className="text-center text-sm">{order.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatVND(order.finalTotal)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{paymentLabels[order.paymentMethod] || order.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1 text-xs", statusCfg.color)}>
                                {statusCfg.icon} {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{order.createdBy}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedOrderDetail(order)}>
                                <Eye className="h-3 w-3 mr-1" /> Xem
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Online Orders */}
            {onlineOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" /> Đơn hàng online
                    <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs">{onlineOrders.length} đơn</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mã đơn</TableHead>
                        <TableHead className="text-xs">Ngày tạo</TableHead>
                        <TableHead className="text-xs">Khách hàng</TableHead>
                        <TableHead className="text-xs text-center">Số SP</TableHead>
                        <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                        <TableHead className="text-xs">PTTT</TableHead>
                        <TableHead className="text-xs">Trạng thái</TableHead>
                        <TableHead className="text-xs w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {onlineOrders.map(order => {
                        const statusCfg = orderStatusConfig[order.status] || orderStatusConfig.pending
                        return (
                          <TableRow key={order.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs text-purple-600 font-bold" title={order.id}>{order.displayCode}</TableCell>
                            <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{order.customer.name}</p>
                              <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
                            </TableCell>
                            <TableCell className="text-center text-sm">{order.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatVND(order.total)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{paymentLabels[order.paymentMethod] || order.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1 text-xs", statusCfg.color)}>
                                {statusCfg.icon} {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedOnlineOrder(order)}>
                                <Eye className="h-3 w-3 mr-1" /> Xem
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Detail Dialog */}
          <Dialog open={!!selectedOrderDetail} onOpenChange={open => !open && setSelectedOrderDetail(null)}>
            <DialogContent className="max-w-lg">
              {selectedOrderDetail && (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-serif flex items-center gap-2">
                      <Receipt className="h-5 w-5" /> Chi tiết đơn {selectedOrderDetail.displayCode}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Khách hàng:</span> <strong>{selectedOrderDetail.customer}</strong></div>
                      <div><span className="text-muted-foreground">SĐT:</span> {selectedOrderDetail.phone || "-"}</div>
                      <div><span className="text-muted-foreground">Ngày tạo:</span> {selectedOrderDetail.date} {selectedOrderDetail.time}</div>
                      <div><span className="text-muted-foreground">PTTT:</span> {paymentLabels[selectedOrderDetail.paymentMethod] || selectedOrderDetail.paymentMethod}</div>
                      <div><span className="text-muted-foreground">Người tạo:</span> {selectedOrderDetail.createdBy}</div>
                      <div>
                        <span className="text-muted-foreground">Trạng thái: </span>
                        <Badge variant="outline" className={cn("gap-1 text-xs", (orderStatusConfig[selectedOrderDetail.status] || orderStatusConfig.pending).color)}>
                          {(orderStatusConfig[selectedOrderDetail.status] || orderStatusConfig.pending).icon}
                          {(orderStatusConfig[selectedOrderDetail.status] || orderStatusConfig.pending).label}
                        </Badge>
                      </div>
                    </div>
                    {selectedOrderDetail.note && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ghi chú:</p>
                        <p className="text-sm bg-muted/50 p-2 rounded mt-1">{selectedOrderDetail.note}</p>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Sản phẩm</TableHead>
                          <TableHead className="text-xs text-center">SL</TableHead>
                          <TableHead className="text-xs text-right">Đơn giá</TableHead>
                          <TableHead className="text-xs text-right">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderDetail.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell className="text-center text-sm">{item.qty}</TableCell>
                            <TableCell className="text-right text-sm">{formatVND(item.price)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatVND(item.price * item.qty)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="space-y-1.5 bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tạm tính</span>
                        <span>{formatVND(selectedOrderDetail.total)}</span>
                      </div>
                      {selectedOrderDetail.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Giảm giá</span>
                          <span className="text-red-600">-{formatVND(selectedOrderDetail.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold border-t pt-1.5">
                        <span>Tổng thanh toán</span>
                        <span className="text-primary">{formatVND(selectedOrderDetail.finalTotal)}</span>
                      </div>
                    </div>
                    {selectedOrderDetail.exportSlipId && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200 text-sm">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span>Phiếu xuất kho: <strong className="text-green-700 font-mono">{selectedOrderDetail.exportSlipId}</strong></span>
                      </div>
                    )}
                    {selectedOrderDetail.rejectReason && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200 text-sm">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Lý do từ chối: <strong className="text-red-700">{selectedOrderDetail.rejectReason}</strong></span>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => printOrderInvoice({
                        code: selectedOrderDetail.displayCode,
                        date: `${selectedOrderDetail.date} ${selectedOrderDetail.time}`,
                        customerName: selectedOrderDetail.customer,
                        customerPhone: selectedOrderDetail.phone,
                        paymentMethod: selectedOrderDetail.paymentMethod,
                        note: selectedOrderDetail.note,
                        items: selectedOrderDetail.items.map(i => ({ name: i.name, sku: i.sku, qty: i.qty, price: i.price })),
                        subtotal: selectedOrderDetail.total,
                        discount: selectedOrderDetail.discount,
                        total: selectedOrderDetail.finalTotal,
                      })}
                    >
                      <Printer className="h-4 w-4" /> In hóa đơn
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedOrderDetail(null)}>Đóng</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Online Order Detail Dialog */}
          <Dialog open={!!selectedOnlineOrder} onOpenChange={open => !open && setSelectedOnlineOrder(null)}>
            <DialogContent className="max-w-lg">
              {selectedOnlineOrder && (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-serif flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" /> Đơn online {selectedOnlineOrder.displayCode}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Khách hàng:</span> <strong>{selectedOnlineOrder.customer.name}</strong></div>
                      <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {selectedOnlineOrder.customer.phone}</div>
                      <div className="col-span-2 flex items-start gap-1"><MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" /> <span className="text-xs">{selectedOnlineOrder.customer.address}</span></div>
                      <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(selectedOnlineOrder.createdAt).toLocaleDateString("vi-VN")}</div>
                      <div><span className="text-muted-foreground">PTTT:</span> {paymentLabels[selectedOnlineOrder.paymentMethod] || selectedOnlineOrder.paymentMethod}</div>
                      <div>
                        <span className="text-muted-foreground">Trạng thái: </span>
                        <Badge variant="outline" className={cn("gap-1 text-xs", (orderStatusConfig[selectedOnlineOrder.status] || orderStatusConfig.pending).color)}>
                          {(orderStatusConfig[selectedOnlineOrder.status] || orderStatusConfig.pending).icon}
                          {(orderStatusConfig[selectedOnlineOrder.status] || orderStatusConfig.pending).label}
                        </Badge>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Sản phẩm</TableHead>
                          <TableHead className="text-xs text-center">SL</TableHead>
                          <TableHead className="text-xs text-right">Đơn giá</TableHead>
                          <TableHead className="text-xs text-right">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOnlineOrder.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell className="text-center text-sm">{item.qty}</TableCell>
                            <TableCell className="text-right text-sm">{formatVND(item.price)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatVND(item.price * item.qty)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="space-y-1.5 bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tạm tính</span>
                        <span>{formatVND(selectedOnlineOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phí ship</span>
                        <span>{formatVND(selectedOnlineOrder.shippingFee)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t pt-1.5">
                        <span>Tổng thanh toán</span>
                        <span className="text-primary">{formatVND(selectedOnlineOrder.total)}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => printOrderInvoice({
                        code: selectedOnlineOrder.displayCode,
                        date: new Date(selectedOnlineOrder.createdAt).toLocaleDateString("vi-VN"),
                        customerName: selectedOnlineOrder.customer.name,
                        customerPhone: selectedOnlineOrder.customer.phone,
                        address: selectedOnlineOrder.customer.address,
                        paymentMethod: paymentLabels[selectedOnlineOrder.paymentMethod] || selectedOnlineOrder.paymentMethod,
                        note: selectedOnlineOrder.note,
                        items: selectedOnlineOrder.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                        subtotal: selectedOnlineOrder.subtotal,
                        total: selectedOnlineOrder.total,
                      })}
                    >
                      <Printer className="h-4 w-4" /> In hóa đơn
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedOnlineOrder(null)}>Đóng</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Export Slips Tab */}
        <TabsContent value="slips">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã phiếu, mã đơn..."
                  value={slipSearch}
                  onChange={e => setSlipSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={slipStatusFilter} onValueChange={setSlipStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ xuất</SelectItem>
                  <SelectItem value="completed">Đã xuất</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{filteredExportSlips.length} phiếu</span>
                {pendingSlipsCount > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{pendingSlipsCount} chờ xuất</Badge>
                )}
              </div>
            </div>

            {/* Export Slips */}
            <Card>
              <CardContent className="p-0">
                {filteredExportSlips.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">Chưa có phiếu xuất kho nào</p>
                    <p className="text-xs text-muted-foreground mt-1">Phiếu xuất kho được tạo tự động khi đơn hàng được duyệt</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mã phiếu</TableHead>
                        <TableHead className="text-xs">Đơn hàng</TableHead>
                        <TableHead className="text-xs">Ngày tạo</TableHead>
                        <TableHead className="text-xs">Khách hàng</TableHead>
                        <TableHead className="text-xs text-center">Số SP</TableHead>
                        <TableHead className="text-xs text-right">Giá trị</TableHead>
                        <TableHead className="text-xs">Trạng thái</TableHead>
                        <TableHead className="text-xs">Người tạo</TableHead>
                        <TableHead className="text-xs w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExportSlips.map(slip => {
                        const ssCfg = slipStatusConfig[slip.status] || slipStatusConfig.pending
                        return (
                          <TableRow key={slip.id} className={cn(
                            "hover:bg-muted/50",
                            slip.status === "pending" && "bg-orange-50/30"
                          )}>
                            <TableCell className="font-mono text-xs text-orange-600 font-bold">{slip.id}</TableCell>
                            <TableCell className="font-mono text-xs text-blue-600" title={slip.orderId}>{slip.orderCode || formatHDReference(slip.orderId, slip.date)}</TableCell>
                            <TableCell className="text-sm">{slip.date}</TableCell>
                            <TableCell className="text-sm">{slip.customer}</TableCell>
                            <TableCell className="text-center text-sm">{slip.items.length}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatVND(slip.total)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", ssCfg.color)}>{ssCfg.label}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{slip.createdBy}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedSlipDetail(slip)}>
                                <Eye className="h-3 w-3 mr-1" /> Xem
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Slip Detail Dialog */}
          <Dialog open={!!selectedSlipDetail} onOpenChange={open => !open && setSelectedSlipDetail(null)}>
            <DialogContent className="max-w-lg">
              {selectedSlipDetail && (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-serif flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" /> Phiếu xuất kho {selectedSlipDetail.id}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Đơn hàng:</span> <strong className="font-mono text-blue-600" title={selectedSlipDetail.orderId}>{selectedSlipDetail.orderCode || formatHDReference(selectedSlipDetail.orderId, selectedSlipDetail.date)}</strong></div>
                      <div><span className="text-muted-foreground">Ngày tạo:</span> {selectedSlipDetail.date}</div>
                      <div><span className="text-muted-foreground">Khách hàng:</span> <strong>{selectedSlipDetail.customer}</strong></div>
                      <div><span className="text-muted-foreground">Người tạo:</span> {selectedSlipDetail.createdBy}</div>
                      <div>
                        <span className="text-muted-foreground">Trạng thái: </span>
                        <Badge variant="outline" className={cn("text-xs", (slipStatusConfig[selectedSlipDetail.status] || slipStatusConfig.pending).color)}>
                          {(slipStatusConfig[selectedSlipDetail.status] || slipStatusConfig.pending).label}
                        </Badge>
                      </div>
                      {selectedSlipDetail.completedAt && (
                        <div><span className="text-muted-foreground">Xuất lúc:</span> {new Date(selectedSlipDetail.completedAt).toLocaleString("vi-VN")}</div>
                      )}
                    </div>
                    {selectedSlipDetail.note && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ghi chú:</p>
                        <p className="text-sm bg-muted/50 p-2 rounded mt-1">{selectedSlipDetail.note}</p>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Sản phẩm</TableHead>
                          <TableHead className="text-xs text-center">SL</TableHead>
                          <TableHead className="text-xs text-right">Đơn giá</TableHead>
                          <TableHead className="text-xs text-right">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSlipDetail.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell className="text-center text-sm">{item.qty}</TableCell>
                            <TableCell className="text-right text-sm">{formatVND(item.price)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatVND(item.price * item.qty)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                      <span className="text-sm font-medium">Tổng giá trị</span>
                      <span className="font-serif text-lg font-bold text-primary">{formatVND(selectedSlipDetail.total)}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => printOrderInvoice({
                        code: selectedSlipDetail.id,
                        date: selectedSlipDetail.date,
                        customerName: selectedSlipDetail.customer,
                        note: selectedSlipDetail.note,
                        items: selectedSlipDetail.items.map(i => ({ name: i.name, sku: i.sku, qty: i.qty, price: i.price })),
                        subtotal: selectedSlipDetail.total,
                        total: selectedSlipDetail.total,
                      })}
                    >
                      <Printer className="h-4 w-4" /> In phiếu
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedSlipDetail(null)}>Đóng</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sales History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" /> Lịch sử bán hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">Chưa có đơn bán nào trong phiên này</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Mã HĐ</TableHead>
                      <TableHead className="text-xs">Thời gian</TableHead>
                      <TableHead className="text-xs">Khách hàng</TableHead>
                      <TableHead className="text-xs text-center">Số SP</TableHead>
                      <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                      <TableHead className="text-xs text-right">Giảm giá</TableHead>
                      <TableHead className="text-xs text-right">Thanh toán</TableHead>
                      <TableHead className="text-xs">PTTT</TableHead>
                      <TableHead className="text-xs">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-xs text-blue-600">{sale.id}</TableCell>
                        <TableCell className="text-sm">{sale.date} {sale.time}</TableCell>
                        <TableCell className="text-sm font-medium">{sale.customer}</TableCell>
                        <TableCell className="text-center text-sm">{sale.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                        <TableCell className="text-right text-sm">{formatVND(sale.total)}</TableCell>
                        <TableCell className="text-right text-sm text-red-600">
                          {sale.discount > 0 ? `-${formatVND(sale.discount)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">{formatVND(sale.finalTotal)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{sale.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{sale.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
