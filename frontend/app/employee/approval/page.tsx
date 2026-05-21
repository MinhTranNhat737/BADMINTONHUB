"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatHDReference, formatVND } from "@/lib/utils"
import { salesOrderApi, inventoryApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { printOrderInvoice, printWarehouseSlip } from "@/lib/print-utils"
import { useAuth } from "@/lib/auth-context"
import {
  Search, CheckCircle2, XCircle, Clock, Eye, FileText,
  ArrowUpFromLine, Receipt, Package, AlertTriangle, Printer,
  DollarSign, ShoppingCart, CreditCard, Banknote, Smartphone, Truck
} from "lucide-react"

/* ─── Types ─── */
interface CartItem {
  productId: number
  sku?: string
  category?: string
  name: string
  price: number
  qty: number
}

interface WarrantyLine {
  id: string
  sku?: string
  name: string
  qty: number
  months: number
  expiresAt: string
}

interface WarrantySheet {
  id: string
  issuedAt: string
  customer: string
  phone: string
  items: WarrantyLine[]
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
  branchId?: number
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
  items: { sku?: string; name: string; qty: number; price: number }[]
  total: number
  customer: string
  note: string
  status: "pending" | "completed"
  createdBy: string
  warranty?: WarrantySheet | null
  completedAt?: string
  completedBy?: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  waiting_transfer: { label: "Chờ điều chuyển", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Truck className="h-3.5 w-3.5" /> },
  waiting_payment: { label: "Chờ thanh toán", color: "bg-sky-100 text-sky-800 border-sky-200", icon: <CreditCard className="h-3.5 w-3.5" /> },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  exported: { label: "Đã xuất kho", color: "bg-green-100 text-green-800 border-green-200", icon: <Package className="h-3.5 w-3.5" /> },
}

const slipStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xuất", color: "bg-amber-100 text-amber-800 border-amber-200" },
  completed: { label: "Đã xuất", color: "bg-green-100 text-green-800 border-green-200" },
}

const normalizeText = (value?: string) => {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

const formatLocalDate = (value?: string | number | Date) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ""
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const getWarrantyMonths = (category?: string, name?: string) => {
  const source = normalizeText(`${category || ""} ${name || ""}`)
  if (source.includes("vot") || source.includes("racket")) return 3
  if (source.includes("giay") || source.includes("shoe") || source.includes("sneaker")) return 1
  return 0
}

const addMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

const sanitizeDigits = (value?: string) => String(value || "").replace(/\D/g, "")

const buildWarrantyLineId = (baseId: string, index: number) => {
  return `${baseId}-${String(index + 1).padStart(3, "0")}`
}

const expandWarrantyItemsFromProducts = (
  items: Array<{ sku?: string; name: string; category?: string; qty: number }>,
  issuedAt: Date,
  baseWarrantyId: string
) => {
  const lines: WarrantyLine[] = []
  let sequence = 0

  for (const item of items) {
    const months = getWarrantyMonths(item.category, item.name)
    if (months <= 0) continue

    const quantity = Math.max(0, Number(item.qty || 0))
    for (let unit = 0; unit < quantity; unit += 1) {
      lines.push({
        id: buildWarrantyLineId(baseWarrantyId, sequence),
        sku: item.sku || undefined,
        name: item.name,
        qty: 1,
        months,
        expiresAt: formatLocalDate(addMonths(issuedAt, months)),
      })
      sequence += 1
    }
  }

  return lines
}

const parseWarrantyIdFromNote = (note?: string) => {
  const source = String(note || "")
  const match = source.match(/(?:PBH\s*)?(BH-[A-Z0-9-]+)/i)
  return match?.[1] || ""
}

const mapSlipItems = (rawItems: any[]): { sku?: string; name: string; qty: number; price: number }[] => {
  return rawItems
    .map((item: any) => ({
      sku: item?.sku || item?.productSku || undefined,
      name: item?.name || item?.product_name || item?.productName || "Sản phẩm",
      qty: Number(item?.qty ?? item?.quantity ?? 0),
      price: Number(item?.price ?? 0),
    }))
    .filter((item) => item.qty > 0)
}

const buildWarrantyFromOrder = (
  order: SalesOrder | undefined,
  fallbackId: string,
  issuedDate: string,
  customer: string,
  phone: string,
  explicitWarrantyId?: string
): WarrantySheet | null => {
  if (!order) return null

  const baseDate = new Date(issuedDate || new Date().toISOString())
  const baseWarrantyId = explicitWarrantyId || `BH-${fallbackId.slice(4)}`
  const warrantyItems = expandWarrantyItemsFromProducts(
    order.items.map((item) => ({
      sku: item.sku || undefined,
      name: item.name,
      category: item.category,
      qty: Number(item.qty || 0),
    })),
    baseDate,
    baseWarrantyId
  )

  if (warrantyItems.length === 0) return null

  return {
    id: baseWarrantyId,
    issuedAt: issuedDate,
    customer,
    phone,
    items: warrantyItems,
  }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending
  return <Badge variant="outline" className={cn("gap-1", cfg.color)}>{cfg.icon} {cfg.label}</Badge>
}

/* ─── Main Page ─── */
export default function ApprovalPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [exportSlips, setExportSlips] = useState<ExportSlip[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [rejectReason, setRejectReason] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [completeDialogSlipId, setCompleteDialogSlipId] = useState<string | null>(null)
  const [warehouseByBranch, setWarehouseByBranch] = useState<Record<number, number>>({})
  const [paymentDialogOrder, setPaymentDialogOrder] = useState<SalesOrder | null>(null)
  const [paymentDialogMode, setPaymentDialogMode] = useState<"approve" | "confirm_payment">("approve")
  const [approvalPaymentMethod, setApprovalPaymentMethod] = useState<"cash" | "vietqr" | "momo" | "bank">("cash")
  const [approvalPaymentNote, setApprovalPaymentNote] = useState("")

  const paymentMethodOptions: { key: "cash" | "vietqr" | "momo" | "bank"; label: string; icon: React.ReactNode }[] = [
    { key: "cash", label: "Tiền mặt", icon: <Banknote className="h-4 w-4" /> },
    { key: "vietqr", label: "VietQR", icon: <CreditCard className="h-4 w-4" /> },
    { key: "momo", label: "MoMo", icon: <Smartphone className="h-4 w-4" /> },
    { key: "bank", label: "Chuyển khoản", icon: <DollarSign className="h-4 w-4" /> },
  ]

  const paymentKeyToLabel = (method: "cash" | "vietqr" | "momo" | "bank") => {
    if (method === "cash") return "Tiền mặt"
    if (method === "vietqr") return "VietQR"
    if (method === "momo") return "MoMo"
    return "Chuyển khoản"
  }

  const paymentLabelToKey = (label: string): "cash" | "vietqr" | "momo" | "bank" => {
    const normalized = String(label || "").toLowerCase()
    if (normalized.includes("vietqr") || normalized.includes("qr")) return "vietqr"
    if (normalized.includes("momo")) return "momo"
    if (normalized.includes("chuyển khoản") || normalized.includes("bank")) return "bank"
    return "cash"
  }

  const mapApiSalesOrder = (o: any): SalesOrder => {
    const items = (o.items || []).map((i: any) => ({
      productId: i.product_id || 0,
      sku: i.sku || "",
      category: i.category || "",
      name: i.product_name || i.name || "",
      price: Number(i.price || 0),
      qty: Number(i.qty || i.quantity || 0),
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
      date: o.created_at ? formatLocalDate(o.created_at) : "",
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
      branchId: o.branch_id ? Number(o.branch_id) : undefined,
      approvedAt: o.approved_at,
      approvedBy: o.approved_by,
      rejectedAt: o.rejected_at,
      rejectedBy: o.rejected_by,
      rejectReason: o.reject_reason,
    }
  }

  // Load from API
  const loadData = async () => {
    let loadedOrders: SalesOrder[] = []
    try {
      const res = await salesOrderApi.getAll()
      if ((res as any).success && (res as any).data) {
        loadedOrders = (res as any).data.map(mapApiSalesOrder)
        setOrders(loadedOrders)
      }
    } catch {}

    try {
      const wr: any = await inventoryApi.getWarehouses()
      if (wr?.success && Array.isArray(wr.data)) {
        const map: Record<number, number> = {}
        for (const warehouse of wr.data) {
          if (warehouse?.branch_id) map[Number(warehouse.branch_id)] = Number(warehouse.id)
        }
        setWarehouseByBranch(map)
      }
    } catch {}

    // Export slips still from localStorage (no backend endpoint)
    try {
      const storedSlips = localStorage.getItem("exportSlips")
      if (storedSlips) {
        const rawSlips = JSON.parse(storedSlips)
          const usedWarrantyByCustomer = new Map<string, string>()
        const normalizedSlips: ExportSlip[] = Array.isArray(rawSlips)
            ? rawSlips.map((rawSlip: any, rawIndex: number) => {
              const order = loadedOrders.find((entry) =>
                entry.id === String(rawSlip?.orderId || "")
                || entry.displayCode === String(rawSlip?.orderCode || "")
                || entry.exportSlipId === String(rawSlip?.id || "")
              )

              const itemCandidates = Array.isArray(rawSlip?.items)
                ? rawSlip.items
                : Array.isArray(rawSlip?.products)
                ? rawSlip.products
                : []
              const parsedItems = mapSlipItems(itemCandidates)
              const recoveredItems = parsedItems.length > 0
                ? parsedItems
                : (order?.items || []).map((item) => ({
                    sku: item.sku || undefined,
                    name: item.name,
                    qty: Number(item.qty || 0),
                    price: Number(item.price || 0),
                  })).filter((item) => item.qty > 0)

              const warrantyIdFromNote = parseWarrantyIdFromNote(rawSlip?.note)
                const warrantyIdFromRaw = String(rawSlip?.warranty?.id || rawSlip?.warrantyId || rawSlip?.warranty_code || "")
                const resolvedWarrantyId = warrantyIdFromRaw || warrantyIdFromNote
              const generatedBaseId = `BH-${String(rawSlip?.id || `MIG-${rawIndex + 1}`).slice(4)}`
              const baseWarrantyId = resolvedWarrantyId || generatedBaseId

              const rawWarrantyItems: WarrantyLine[] = Array.isArray(rawSlip?.warranty?.items)
                ? rawSlip.warranty.items.reduce((acc: WarrantyLine[], line: any, lineIndex: number) => {
                    const qty = Math.max(0, Number(line?.qty || 0))
                    if (qty <= 0) return acc
                    const months = Number(line?.months || 0)
                    const lineBaseId = String(line?.id || buildWarrantyLineId(baseWarrantyId, lineIndex))
                    for (let unit = 0; unit < qty; unit += 1) {
                      acc.push({
                        id: qty === 1 ? lineBaseId : `${lineBaseId}-${unit + 1}`,
                        sku: line?.sku || undefined,
                        name: line?.name || "Sản phẩm",
                        qty: 1,
                        months,
                        expiresAt: line?.expiresAt || rawSlip?.date || formatLocalDate(),
                      })
                    }
                    return acc
                  }, [])
                : []

              const warrantyFromRaw = rawSlip?.warranty
                ? {
                    id: baseWarrantyId,
                    issuedAt: rawSlip.warranty.issuedAt || rawSlip.date || formatLocalDate(),
                    customer: rawSlip.warranty.customer || rawSlip.customer || order?.customer || "Khách lẻ",
                    phone: rawSlip.warranty.phone || order?.phone || "",
                    items: rawWarrantyItems,
                  }
                : null

              const fallbackWarranty = buildWarrantyFromOrder(
                order,
                String(rawSlip?.id || ""),
                rawSlip?.date || formatLocalDate(),
                rawSlip?.customer || order?.customer || "Khách lẻ",
                order?.phone || "",
                baseWarrantyId || undefined
              )

              const fallbackWarrantyWithId: WarrantySheet | null = resolvedWarrantyId
                ? {
                    id: resolvedWarrantyId,
                    issuedAt: rawSlip?.date || formatLocalDate(),
                    customer: rawSlip?.customer || order?.customer || "Khách lẻ",
                    phone: order?.phone || "",
                    items: [],
                  }
                : null

              const warranty = warrantyFromRaw && (warrantyFromRaw.items.length > 0 || warrantyFromRaw.id)
                ? warrantyFromRaw
                : (fallbackWarranty || fallbackWarrantyWithId)

              const warrantyCustomerKey = normalizeText(`${warranty?.customer || rawSlip?.customer || order?.customer || ""}|${warranty?.phone || order?.phone || ""}`)
              if (warranty?.id) {
                const owner = usedWarrantyByCustomer.get(warranty.id)
                if (!owner) {
                  usedWarrantyByCustomer.set(warranty.id, warrantyCustomerKey)
                } else if (owner !== warrantyCustomerKey) {
                  const suffixSeed = sanitizeDigits(warranty?.phone || order?.phone || rawSlip?.customer || "") || String(rawIndex + 1)
                  const suffix = suffixSeed.slice(-4).padStart(4, "0")
                  const nextWarrantyId = `${warranty.id}-${suffix}`
                  warranty.id = nextWarrantyId
                  warranty.items = warranty.items.map((line, idx) => ({
                    ...line,
                    id: buildWarrantyLineId(nextWarrantyId, idx),
                  }))
                  usedWarrantyByCustomer.set(nextWarrantyId, warrantyCustomerKey)
                }
              }

              const recomputedTotal = recoveredItems.reduce((sum, item) => sum + item.qty * item.price, 0)
              const fallbackTotal = Number(rawSlip?.total ?? order?.finalTotal ?? recomputedTotal)

              return {
                id: String(rawSlip?.id || ""),
                orderId: String(rawSlip?.orderId || order?.id || ""),
                orderCode: rawSlip?.orderCode || order?.displayCode || undefined,
                date: rawSlip?.date || formatLocalDate(),
                items: recoveredItems,
                total: fallbackTotal,
                customer: rawSlip?.customer || order?.customer || "Khách lẻ",
                note: rawSlip?.note || "",
                status: rawSlip?.status === "completed" ? "completed" : "pending",
                createdBy: rawSlip?.createdBy || order?.createdBy || "Nhân viên",
                warranty,
                completedAt: rawSlip?.completedAt,
                completedBy: rawSlip?.completedBy,
              } satisfies ExportSlip
            })
          : []

        setExportSlips(normalizedSlips)
        localStorage.setItem("exportSlips", JSON.stringify(normalizedSlips))
      }
    } catch {}
  }
  useEffect(() => {
    loadData()

    const intervalId = window.setInterval(() => {
      loadData()
    }, 10000)

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "exportSlips") {
        loadData()
      }
    }

    window.addEventListener("storage", onStorage)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // Save orders — update local state (API calls done per-action)
  const saveOrders = (updated: SalesOrder[]) => {
    setOrders(updated)
  }

  const saveSlips = (updated: ExportSlip[]) => {
    setExportSlips(updated)
    localStorage.setItem("exportSlips", JSON.stringify(updated))
  }

  // Filter
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return o.id.toLowerCase().includes(q)
          || o.displayCode.toLowerCase().includes(q)
          || o.customer.toLowerCase().includes(q)
      }
      return true
    })
  }, [orders, statusFilter, search])

  // Stats
  const pendingCount = orders.filter(o => o.status === "pending").length
  const waitingTransferCount = orders.filter(o => o.status === "waiting_transfer").length
  const waitingPaymentCount = orders.filter(o => o.status === "waiting_payment").length
  const exportedCount = orders.filter(o => o.status === "exported").length
  const totalRevenue = orders
    .filter(o => o.status === "approved" || o.status === "exported")
    .reduce((s, o) => s + o.finalTotal, 0)

  const createPendingSlipForOrder = (order: SalesOrder, currentSlips: ExportSlip[]) => {
    if (order.exportSlipId && currentSlips.some(slip => slip.id === order.exportSlipId)) {
      return { updatedOrder: order, updatedSlips: currentSlips }
    }

    const now = new Date()
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
    const sameDaySeq = currentSlips.filter((slip) => String(slip.id).startsWith(`PXK-${datePart}-`)).length + 1
    const slipId = `PXK-${datePart}-${String(sameDaySeq).padStart(3, "0")}`

    const baseWarrantyId = `BH-${slipId.slice(4)}`
    const warrantyItems = expandWarrantyItemsFromProducts(
      order.items.map((item) => ({
        sku: item.sku || undefined,
        name: item.name,
        category: item.category,
        qty: Number(item.qty || 0),
      })),
      now,
      baseWarrantyId
    )

    const warranty: WarrantySheet | null = warrantyItems.length > 0
      ? {
        id: baseWarrantyId,
        issuedAt: formatLocalDate(now),
        customer: order.customer,
        phone: order.phone,
        items: warrantyItems,
      }
      : null

    const slip: ExportSlip = {
      id: slipId,
      orderId: order.id,
      orderCode: order.displayCode,
      date: formatLocalDate(now),
      items: order.items.map(item => ({ sku: item.sku, name: item.name, qty: item.qty, price: item.price })),
      total: order.finalTotal,
      customer: order.customer,
      note: warranty ? `XKDH ${order.displayCode} | PBH ${warranty.id}` : `XKDH ${order.displayCode}`,
      status: "pending",
      createdBy: user?.fullName || "Nhân viên",
      warranty,
    }

    return {
      updatedOrder: { ...order, exportSlipId: slipId },
      updatedSlips: [slip, ...currentSlips],
    }
  }

  // Approve order → generate export slip
  const handleApprove = async (order: SalesOrder, paymentMethod: "cash" | "vietqr" | "momo" | "bank", paymentNote: string) => {
    const resolvedPaymentMethod = order.orderType === "delivery_cod" ? "COD" : paymentKeyToLabel(paymentMethod)
    let apiOrder: SalesOrder | null = null
    try {
      const approveResult: any = await salesOrderApi.approve(order.id, {
        payment_method: resolvedPaymentMethod,
        note: paymentNote || order.note || undefined,
      })
      if (!approveResult?.success || !approveResult?.data) return
      apiOrder = mapApiSalesOrder(approveResult.data)
    } catch {
      return
    }

    if (!apiOrder) return

    let nextOrder: SalesOrder = {
      ...order,
      ...apiOrder,
      paymentMethod: resolvedPaymentMethod,
      note: paymentNote || apiOrder.note || order.note,
    }
    let nextSlips = exportSlips

    if (nextOrder.status === "approved") {
      const withSlip = createPendingSlipForOrder(nextOrder, nextSlips)
      nextOrder = withSlip.updatedOrder
      nextSlips = withSlip.updatedSlips
    }

    saveOrders(orders.map(existing => (existing.id === order.id ? nextOrder : existing)))
    saveSlips(nextSlips)
    setPaymentDialogOrder(null)
    setApprovalPaymentNote("")
  }

  const handleConfirmPayment = async (order: SalesOrder, paymentMethod: "cash" | "vietqr" | "momo" | "bank", paymentNote: string) => {
    let apiOrder: SalesOrder | null = null
    try {
      const paymentResult: any = await salesOrderApi.confirmPayment(order.id, {
        payment_method: paymentKeyToLabel(paymentMethod),
        note: paymentNote || order.note || undefined,
      })
      if (!paymentResult?.success || !paymentResult?.data) return
      apiOrder = mapApiSalesOrder(paymentResult.data)
    } catch {
      return
    }

    if (!apiOrder) return

    let nextOrder: SalesOrder = {
      ...order,
      ...apiOrder,
      paymentMethod: paymentKeyToLabel(paymentMethod),
      note: paymentNote || apiOrder.note || order.note,
      paymentStatus: "paid",
    }
    let nextSlips = exportSlips

    if (nextOrder.status === "approved") {
      const withSlip = createPendingSlipForOrder(nextOrder, nextSlips)
      nextOrder = withSlip.updatedOrder
      nextSlips = withSlip.updatedSlips
    }

    saveOrders(orders.map(existing => (existing.id === order.id ? nextOrder : existing)))
    saveSlips(nextSlips)
    setPaymentDialogOrder(null)
    setApprovalPaymentNote("")
  }

  // Reject order
  const handleReject = async (order: SalesOrder, reason: string) => {
    try {
      await salesOrderApi.reject(order.id, reason)
    } catch {}
    const now = new Date()
    const updatedOrders = orders.map(o =>
      o.id === order.id
        ? { ...o, status: "rejected" as const, rejectedAt: now.toISOString(), rejectedBy: user?.fullName, rejectReason: reason }
        : o
    )
    saveOrders(updatedOrders)
    setRejectReason("")
  }

  // Complete export slip → update order status to "exported"
  const handleCompleteSlip = async (slip: ExportSlip): Promise<boolean> => {
    const now = new Date()
    const order = orders.find(o =>
      o.id === slip.orderId
      || o.displayCode === slip.orderId
      || (slip.orderCode ? o.displayCode === slip.orderCode : false)
    )
    if (!order) return false

    if (order.status !== "approved") return false
    if (order.orderType === "pay_at_shop" && order.paymentStatus !== "paid") return false

    const warehouseId = order.fulfillWarehouseId || (order.branchId ? warehouseByBranch[order.branchId] : undefined)
    if (!warehouseId) return false

    const resolvedItems: { sku: string; qty: number; name: string; price: number }[] = []
    for (const item of slip.items) {
      let sku = item.sku

      if (!sku) {
        try {
          const inv: any = await inventoryApi.getAll({ warehouseId, search: item.name })
          const match = (inv?.data || []).find((invItem: any) => String(invItem?.name || "").toLowerCase() === String(item.name || "").toLowerCase())
          if (match?.sku) sku = String(match.sku)
        } catch {}
      }

      if (!sku) return false
      resolvedItems.push({ sku, qty: item.qty, name: item.name, price: item.price })
    }

    for (const item of resolvedItems) {
      const exported: any = await inventoryApi.exportStock({
        warehouse_id: warehouseId,
        sku: item.sku,
        quantity: item.qty,
        note: `${slip.id} | ${order.displayCode} | ${user?.fullName || "Nhân viên"}`,
      })
      if (!exported?.success) return false
    }

    try {
      const completed: any = await salesOrderApi.complete(order.id)
      if (!completed?.success) return false
    } catch {
      return false
    }

    const updatedSlips = exportSlips.map(s =>
      s.id === slip.id
        ? { ...s, status: "completed" as const, completedAt: now.toISOString(), completedBy: user?.fullName }
        : s
    )
    saveSlips(updatedSlips)

    // Update linked order
    const updatedOrders = orders.map(o =>
      o.id === order.id
        ? { ...o, status: "exported" as const }
        : o
    )
    saveOrders(updatedOrders)

    // Save warehouse transaction to localStorage for inventory page
    const existingTxns = JSON.parse(localStorage.getItem("warehouseTransactions") || "[]")
    const newTxns = slip.items.map((item, i) => ({
      id: `${slip.id}-${i}`,
      type: "export",
      source: "sales",
      slipId: slip.id,
      orderId: slip.orderId,
      date: formatLocalDate(now),
      productName: item.name,
      qty: item.qty,
      price: item.price,
      note: slip.note,
      processedBy: user?.fullName,
    }))
    localStorage.setItem("warehouseTransactions", JSON.stringify([...newTxns, ...existingTxns]))
    return true
  }

  const pendingSlips = exportSlips.filter(s => s.status === "pending")
  const completedSlips = exportSlips.filter(s => s.status === "completed")
  const vietqrUrl = useMemo(() => {
    if (!paymentDialogOrder) return ""
    const amount = Math.max(0, Math.round(paymentDialogOrder.finalTotal || 0))
    const addInfo = encodeURIComponent(`Thanh toan ${paymentDialogOrder.displayCode}`)
    const accountName = encodeURIComponent("BADMINTONHUB")
    return `https://img.vietqr.io/image/MB-0363132364-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`
  }, [paymentDialogOrder])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold">Duyệt đơn hàng</h1>
          <p className="text-sm text-muted-foreground">Duyệt đơn bán hàng và quản lý phiếu xuất kho</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-600"><Clock className="h-5 w-5" /></span>
            </div>
            <p className="font-serif text-2xl font-extrabold mt-3">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Chờ duyệt</p>
          </CardContent>
        </Card>
        <Card className="hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <span className="p-2 rounded-lg bg-purple-100 text-purple-600"><Truck className="h-5 w-5" /></span>
            <p className="font-serif text-2xl font-extrabold mt-3">{waitingTransferCount + waitingPaymentCount}</p>
            <p className="text-sm text-muted-foreground">Đang chờ xử lý</p>
          </CardContent>
        </Card>
        <Card className="hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <span className="p-2 rounded-lg bg-green-100 text-green-600"><Package className="h-5 w-5" /></span>
            <p className="font-serif text-2xl font-extrabold mt-3">{exportedCount}</p>
            <p className="text-sm text-muted-foreground">Đã xuất kho</p>
          </CardContent>
        </Card>
        <Card className="hover:-translate-y-0.5 transition-all">
          <CardContent className="p-4">
            <span className="p-2 rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></span>
            <p className="font-serif text-2xl font-extrabold mt-3">{formatVND(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Doanh thu đã duyệt</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Đơn hàng
            {pendingCount > 0 && <Badge className="ml-1 bg-amber-500 text-white text-[10px] h-5 px-1.5">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="slips" className="gap-1.5">
            <ArrowUpFromLine className="h-3.5 w-3.5" /> Phiếu xuất kho
            {pendingSlips.length > 0 && <Badge className="ml-1 bg-orange-500 text-white text-[10px] h-5 px-1.5">{pendingSlips.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, khách hàng..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-1">
              {[
                { value: "all", label: "Tất cả" },
                { value: "pending", label: "Chờ duyệt" },
                { value: "approved", label: "Đã duyệt" },
                { value: "waiting_transfer", label: "Chờ điều chuyển" },
                { value: "waiting_payment", label: "Chờ thanh toán" },
                { value: "exported", label: "Đã xuất" },
                { value: "rejected", label: "Từ chối" },
              ].map(tab => (
                <Button
                  key={tab.value}
                  variant={statusFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setStatusFilter(tab.value)}
                >
                  {tab.label}
                  {tab.value !== "all" && (() => {
                    const count = orders.filter(o => o.status === tab.value).length
                    return count > 0 ? <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{count}</Badge> : null
                  })()}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">Không có đơn hàng nào</p>
                  <p className="text-xs text-muted-foreground mt-1">Đơn hàng từ bán hàng sẽ hiển thị tại đây</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Mã đơn</TableHead>
                      <TableHead className="text-xs">Thời gian</TableHead>
                      <TableHead className="text-xs">Khách hàng</TableHead>
                      <TableHead className="text-xs text-center">Sản phẩm</TableHead>
                      <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                      <TableHead className="text-xs">PTTT</TableHead>
                      <TableHead className="text-xs">Trạng thái</TableHead>
                      <TableHead className="text-xs">Phiếu XK</TableHead>
                      <TableHead className="text-xs text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id} className={cn(
                        "hover:bg-muted/50",
                        order.status === "pending" && "bg-amber-50/30"
                      )}>
                        <TableCell className="font-mono text-xs text-blue-600 font-semibold">{order.displayCode}</TableCell>
                        <TableCell className="text-sm">{order.date} {order.time}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{order.customer}</p>
                          {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
                        </TableCell>
                        <TableCell className="text-center text-sm">{order.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">{formatVND(order.finalTotal)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{order.paymentMethod}</Badge></TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-xs">
                          {order.exportSlipId ? (
                            <span className="font-mono text-orange-600">{order.exportSlipId}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            {/* Detail dialog */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle className="font-serif flex items-center gap-2">
                                    Chi tiết đơn {order.displayCode} <StatusBadge status={order.status} />
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-2">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground text-xs">Khách hàng</p>
                                      <p className="font-semibold">{order.customer}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Điện thoại</p>
                                      <p className="font-semibold">{order.phone || "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Ngày tạo</p>
                                      <p className="font-semibold">{order.date} {order.time}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Người tạo</p>
                                      <p className="font-semibold">{order.createdBy}</p>
                                    </div>
                                  </div>
                                  <div className="border rounded-lg overflow-hidden">
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
                                        {order.items.map((item, i) => (
                                          <TableRow key={i}>
                                            <TableCell className="text-sm">{item.name}</TableCell>
                                            <TableCell className="text-sm text-center">{item.qty}</TableCell>
                                            <TableCell className="text-sm text-right">{formatVND(item.price)}</TableCell>
                                            <TableCell className="text-sm text-right font-medium">{formatVND(item.price * item.qty)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Tạm tính</span>
                                      <span>{formatVND(order.total)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Giảm giá</span>
                                        <span className="text-red-600">-{formatVND(order.discount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                                      <span>Tổng thanh toán</span>
                                      <span className="text-primary">{formatVND(order.finalTotal)}</span>
                                    </div>
                                  </div>
                                  {order.note && (
                                    <div className="text-sm">
                                      <p className="text-muted-foreground text-xs">Ghi chú</p>
                                      <p>{order.note}</p>
                                    </div>
                                  )}
                                  {order.rejectReason && (
                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm">
                                      <p className="text-red-800 font-medium">Lý do từ chối: {order.rejectReason}</p>
                                      <p className="text-xs text-red-600 mt-1">Bởi {order.rejectedBy} • {order.rejectedAt ? new Date(order.rejectedAt).toLocaleString("vi-VN") : ""}</p>
                                    </div>
                                  )}
                                  <div className="flex justify-end pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => printOrderInvoice({
                                        code: order.displayCode,
                                        date: `${order.date} ${order.time}`,
                                        customerName: order.customer,
                                        customerPhone: order.phone,
                                        paymentMethod: order.paymentMethod,
                                        note: order.note,
                                        items: order.items.map(i => ({ name: i.name, sku: i.sku, qty: i.qty, price: i.price })),
                                        subtotal: order.total,
                                        discount: order.discount,
                                        total: order.finalTotal,
                                      })}
                                    >
                                      <Printer className="h-3.5 w-3.5" /> In hóa đơn
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Approve button */}
                            {order.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    setPaymentDialogMode("approve")
                                    setPaymentDialogOrder(order)
                                    setApprovalPaymentMethod(paymentLabelToKey(order.paymentMethod))
                                    setApprovalPaymentNote(order.note || "")
                                  }}
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                </Button>

                                {/* Reject button */}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50">
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle className="font-serif">Từ chối đơn hàng {order.displayCode}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-3 mt-2">
                                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                          <p className="font-medium text-red-800">Từ chối đơn hàng?</p>
                                          <p className="text-xs text-red-700 mt-1">Đơn hàng sẽ bị huỷ và không thể khôi phục.</p>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium mb-1.5 block">Lý do từ chối <span className="text-red-500">*</span></label>
                                        <Textarea
                                          placeholder="Nhập lý do từ chối đơn hàng..."
                                          value={rejectReason}
                                          onChange={e => setRejectReason(e.target.value)}
                                          rows={3}
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Huỷ</Button>
                                      </DialogClose>
                                      <DialogClose asChild>
                                        <Button
                                          variant="destructive"
                                          disabled={!rejectReason.trim()}
                                          onClick={() => handleReject(order, rejectReason)}
                                        >
                                          <XCircle className="h-4 w-4 mr-1" /> Từ chối
                                        </Button>
                                      </DialogClose>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}

                            {order.status === "waiting_payment" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setPaymentDialogMode("confirm_payment")
                                  setPaymentDialogOrder(order)
                                  setApprovalPaymentMethod(paymentLabelToKey(order.paymentMethod))
                                  setApprovalPaymentNote(order.note || "")
                                }}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Slips Tab */}
        <TabsContent value="slips">
          <div className="space-y-6">
            {/* Pending slips */}
            {pendingSlips.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <ArrowUpFromLine className="h-5 w-5 text-orange-600" /> Phiếu xuất kho chờ xử lý
                    <Badge className="bg-orange-500 text-white ml-2">{pendingSlips.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingSlips.map(slip => (
                    <div key={slip.id} className="border rounded-lg p-4 bg-orange-50/30 hover:bg-orange-50/60 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-orange-600">{slip.id}</span>
                            <Badge variant="outline" className={slipStatusConfig.pending.color}>
                              {slipStatusConfig.pending.label}
                            </Badge>
                            {slip.warranty && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                {slip.warranty.id}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Đơn hàng: <span className="font-mono text-blue-600">{slip.orderCode || formatHDReference(slip.orderId, slip.date)}</span> • Khách: <strong>{slip.customer}</strong> • Ngày: {slip.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => printWarehouseSlip({
                              id: slip.id,
                              type: "export",
                              date: slip.date,
                              warehouse: "Kho chi nhánh",
                              note: slip.note,
                              createdBy: slip.createdBy,
                              assignedTo: slip.completedBy || slip.createdBy,
                              processedBy: slip.completedBy,
                              items: slip.items.map(i => ({ sku: i.sku || "", name: i.name, qty: i.qty, unitCost: i.price })),
                            })}
                          >
                            <Printer className="h-3.5 w-3.5" /> In phiếu
                          </Button>
                        <Dialog
                          open={completeDialogSlipId === slip.id}
                          onOpenChange={(open) => setCompleteDialogSlipId(open ? slip.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1"
                              onClick={() => setCompleteDialogSlipId(slip.id)}
                            >
                              <Package className="h-3.5 w-3.5" /> Xác nhận xuất kho
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-serif">Xác nhận xuất kho {slip.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 mt-2">
                              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                  <p className="font-medium text-amber-800">Lưu ý</p>
                                  <p className="text-xs text-amber-700 mt-1">Xác nhận sẽ trừ số lượng tồn kho tương ứng. Vui lòng kiểm tra hàng thực tế trước khi xác nhận.</p>
                                </div>
                              </div>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Sản phẩm</TableHead>
                                      <TableHead className="text-xs text-center">SL</TableHead>
                                      <TableHead className="text-xs text-right">Đơn giá</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {slip.items.map((item, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-sm">{item.name}</TableCell>
                                        <TableCell className="text-sm text-center">{item.qty}</TableCell>
                                        <TableCell className="text-sm text-right">{formatVND(item.price)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <p className="text-sm font-bold text-right">Tổng: <span className="text-primary">{formatVND(slip.total)}</span></p>
                              {slip.warranty && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs space-y-1">
                                  <p className="font-semibold text-blue-800">Phiếu bảo hành: {slip.warranty.id}</p>
                                  {slip.warranty.items.map((w, idx) => (
                                    <p key={`${w.name}-${idx}`} className="text-blue-700">
                                      {w.id}: {w.name} × {w.qty} • {w.months} tháng • HSD: {w.expiresAt}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Huỷ</Button>
                              </DialogClose>
                              <Button
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={async () => {
                                  const ok = await handleCompleteSlip(slip)
                                  if (ok) setCompleteDialogSlipId(null)
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Xác nhận xuất kho
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </div>

                      {/* Items preview */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {slip.items.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.name} × {item.qty}
                          </Badge>
                        ))}
                        {slip.warranty && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                            Bảo hành: {slip.warranty.items.length} dòng
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Completed slips */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" /> Lịch sử phiếu xuất kho
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedSlips.length === 0 && pendingSlips.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">Chưa có phiếu xuất kho nào</p>
                    <p className="text-xs text-muted-foreground mt-1">Phiếu sẽ được tạo tự động khi duyệt đơn hàng</p>
                  </div>
                ) : completedSlips.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có phiếu đã hoàn thành</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mã phiếu</TableHead>
                        <TableHead className="text-xs">Đơn hàng</TableHead>
                        <TableHead className="text-xs">Ngày</TableHead>
                        <TableHead className="text-xs">Khách hàng</TableHead>
                        <TableHead className="text-xs text-center">Số SP</TableHead>
                        <TableHead className="text-xs text-right">Tổng</TableHead>
                        <TableHead className="text-xs">Bảo hành</TableHead>
                        <TableHead className="text-xs">Trạng thái</TableHead>
                        <TableHead className="text-xs">Người xử lý</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedSlips.map(slip => (
                        <TableRow key={slip.id}>
                          <TableCell className="font-mono text-xs text-orange-600 font-semibold">{slip.id}</TableCell>
                          <TableCell className="font-mono text-xs text-blue-600">{slip.orderCode || formatHDReference(slip.orderId, slip.date)}</TableCell>
                          <TableCell className="text-sm">{slip.date}</TableCell>
                          <TableCell className="text-sm">{slip.customer}</TableCell>
                          <TableCell className="text-center text-sm">{slip.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatVND(slip.total)}</TableCell>
                          <TableCell className="text-xs">
                            {slip.warranty ? (
                              <div>
                                <p className="font-medium text-blue-700">{slip.warranty.id}</p>
                                <p className="text-muted-foreground">{slip.warranty.items.length} dòng</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Không</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={slipStatusConfig.completed.color}>
                              {slipStatusConfig.completed.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{slip.completedBy || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!paymentDialogOrder} onOpenChange={(open) => { if (!open) setPaymentDialogOrder(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              {paymentDialogMode === "approve" ? "Duyệt đơn" : "Xác nhận thanh toán"} {paymentDialogOrder?.displayCode}
            </DialogTitle>
          </DialogHeader>
          {paymentDialogOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Khách hàng</p>
                  <p className="font-medium">{paymentDialogOrder.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tổng thanh toán</p>
                  <p className="font-semibold text-primary">{formatVND(paymentDialogOrder.finalTotal)}</p>
                </div>
              </div>

              {paymentDialogOrder.orderType === "delivery_cod" && paymentDialogMode === "approve" ? (
                <div>
                  <p className="text-sm font-medium mb-2">Phương thức thanh toán</p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 font-medium">
                    COD — Thu tiền khi giao hàng
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">Phương thức thanh toán</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethodOptions.map(opt => (
                      <Button
                        key={opt.key}
                        type="button"
                        variant={approvalPaymentMethod === opt.key ? "default" : "outline"}
                        className={cn("justify-start", approvalPaymentMethod === opt.key ? "bg-blue-600 hover:bg-blue-700" : "")}
                        onClick={() => setApprovalPaymentMethod(opt.key)}
                      >
                        {opt.icon}
                        <span className="ml-2">{opt.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {approvalPaymentMethod === "vietqr" && !(paymentDialogOrder.orderType === "delivery_cod" && paymentDialogMode === "approve") && (
                <div className="rounded-lg border p-3 flex justify-center bg-slate-50">
                  <img src={vietqrUrl} alt="VietQR" className="h-56 w-56 object-contain" />
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Ghi chú</p>
                <Textarea
                  rows={3}
                  value={approvalPaymentNote}
                  onChange={e => setApprovalPaymentNote(e.target.value)}
                  placeholder="Nhập ghi chú nếu có..."
                />
              </div>

              {paymentDialogOrder.fulfillmentMode === "shop_transfer" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Đơn hẹn lấy tại shop: chỉ tạo phiếu xuất kho sau khi xác nhận thanh toán.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOrder(null)}>Huỷ</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!paymentDialogOrder}
              onClick={() => {
                if (!paymentDialogOrder) return
                if (paymentDialogMode === "approve") {
                  handleApprove(paymentDialogOrder, approvalPaymentMethod, approvalPaymentNote)
                  return
                }
                handleConfirmPayment(paymentDialogOrder, approvalPaymentMethod, approvalPaymentNote)
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {paymentDialogMode === "approve" ? "Duyệt đơn" : "Xác nhận đã thanh toán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
