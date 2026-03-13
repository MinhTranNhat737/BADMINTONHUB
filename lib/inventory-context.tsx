"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { inventoryApi, transferApi, purchaseOrderApi, getToken } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export interface InventoryItem {
  id: number; sku: string; name: string; category: string; warehouse: string
  warehouseId?: number; onHand: number; reserved: number; available: number
  reorderPoint: number; unitCost: number; image: string
}
export interface InventoryTransaction {
  id: string; type: "import" | "export" | "transfer-out" | "transfer-in"
  date: string; sku: string; productName: string; qty: number; cost: number
  note: string; warehouse?: string; operator?: string
}
export interface TransferRequest {
  id: string; transferCode?: string; date: string; fromWarehouse: string; toWarehouse: string
  fromWarehouseId?: number; toWarehouseId?: number
  items: { sku: string; name: string; qty: number; available: number }[]
  reason: string; note: string
  status: "pending" | "approved" | "in-transit" | "completed" | "rejected"
  pickupMethod: "employee" | "delivery" | "customer"; createdBy: string
  customerName?: string; customerPhone?: string
  approvedBy?: string; approvedAt?: string; completedAt?: string
}
export interface AdminWarehouseSlip {
  id: string; type: "import" | "export"; source: "admin"; poId?: string
  supplier?: string; date: string; warehouse: string
  items: { sku: string; name: string; qty: number; unitCost: number }[]
  note: string; status: "pending" | "processed"; createdBy: string
  assignedTo: string; processedAt?: string; processedBy?: string
}
export interface PurchaseOrder {
  id: string; supplier: string; status: string; createdDate: string
  totalValue: number; items: number; warehouse?: string
  poItems?: { sku: string; name: string; qty: number; unitCost: number }[]
}

export interface WarehouseInfo { id: number; name: string; isHub: boolean }

interface InventoryContextType {
  inventory: InventoryItem[]; transactions: InventoryTransaction[]
  transferRequests: TransferRequest[]; adminSlips: AdminWarehouseSlip[]
  purchaseOrders: PurchaseOrder[]; warehouses: WarehouseInfo[]; loading: boolean
  refreshInventory: () => Promise<void>
  importItems: (p: { items: { sku: string; name: string; qty: number; cost: number }[]; warehouse: string; note: string; date: string; operator: string }) => Promise<void>
  exportItems: (p: { items: { sku: string; name: string; qty: number; reason: string }[]; warehouse: string; note: string; date: string; operator: string }) => Promise<boolean>
  createTransfer: (r: Omit<TransferRequest, "id">) => Promise<string>
  updateTransferStatus: (id: string, status: TransferRequest["status"]) => Promise<void>
  exportTransferItems: (p: { transferId: string; qtys: Record<string, number>; date: string; note: string; operator: string }) => Promise<void>
  receiveTransferItems: (transferId: string, operator: string) => Promise<void>
  createAdminSlip: (s: Omit<AdminWarehouseSlip, "id">) => string
  processAdminSlip: (id: string, processedBy: string) => void
  updatePOStatus: (id: string, status: string) => Promise<void>
  resetAll: () => void
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

function txItem(r: any): InventoryItem {
  const unitCostRaw = r.unit_cost ?? r.unitCost
  const fallbackPrice = r.product_price ?? r.price
  const parsedUnitCost = Number(unitCostRaw)
  const parsedFallbackPrice = Number(fallbackPrice)
  const unitCost = Number.isFinite(parsedUnitCost) && parsedUnitCost > 0
    ? parsedUnitCost
    : (Number.isFinite(parsedFallbackPrice) && parsedFallbackPrice > 0 ? parsedFallbackPrice : 0)
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category || "",
    warehouse: r.warehouse_name || r.warehouse || "",
    warehouseId: r.warehouse_id,
    onHand: r.on_hand ?? r.onHand ?? 0,
    reserved: r.reserved ?? 0,
    available: r.available ?? 0,
    reorderPoint: r.reorder_point ?? r.reorderPoint ?? 10,
    unitCost,
    image: r.product_image || r.image || ""
  }
}
function txTxn(r: any): InventoryTransaction {
  return { id: String(r.id), type: r.type, date: r.date ? new Date(r.date).toISOString().split("T")[0] : "", sku: r.sku || "", productName: r.product_name || r.productName || r.name || "", qty: r.qty || r.quantity || 0, cost: r.cost || 0, note: r.note || "", warehouse: r.warehouse_name || r.warehouse || "", operator: r.operator || "" }
}

function fromApiTransferStatus(status: any): TransferRequest["status"] {
  if (status === "in_transit") return "in-transit"
  return (status || "pending") as TransferRequest["status"]
}

function txTfr(r: any): TransferRequest {
  return { id: String(r.id), transferCode: r.transfer_code || '', date: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : r.date || "", fromWarehouse: r.from_warehouse_name || r.fromWarehouse || "", toWarehouse: r.to_warehouse_name || r.toWarehouse || "", fromWarehouseId: r.from_warehouse_id, toWarehouseId: r.to_warehouse_id, items: (r.items || []).map((i: any) => ({ sku: i.sku, name: i.name || i.product_name || "", qty: i.qty || i.quantity || 0, available: i.available || 0 })), reason: r.reason || r.note || "", note: r.note || "", status: fromApiTransferStatus(r.status), pickupMethod: r.pickup_method || r.pickupMethod || "employee", createdBy: r.created_by_name || r.createdBy || "", customerName: r.customer_name, customerPhone: r.customer_phone, approvedBy: r.approved_by_name, approvedAt: r.approved_at, completedAt: r.completed_at }
}
function txPO(r: any): PurchaseOrder {
  return { id: String(r.id), supplier: r.supplier_name || r.supplier || "", status: r.status || "", createdDate: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : r.createdDate || "", totalValue: r.total_value ?? r.totalValue ?? 0, items: r.item_count ?? r.items ?? 0, warehouse: r.warehouse_name || r.warehouse || "", poItems: (r.po_items || r.poItems || []).map((i: any) => ({ sku: i.sku, name: i.name || i.product_name || "", qty: i.qty || i.quantity || 0, unitCost: i.unit_cost || i.unitCost || i.price || 0 })) }
}

const SLIP_KEY = "bh_admin_slips"
function loadSlips(): AdminWarehouseSlip[] { if (typeof window === "undefined") return []; try { const r = localStorage.getItem(SLIP_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function saveSlips(s: AdminWarehouseSlip[]) { if (typeof window === "undefined") return; try { localStorage.setItem(SLIP_KEY, JSON.stringify(s)) } catch { } }

let whMap: Record<string, number> = {}
async function ensureWhMap() { if (Object.keys(whMap).length > 0) return; try { const r = await inventoryApi.getWarehouses(); if (r.success && r.data) for (const w of r.data) whMap[w.name] = w.id } catch { } }

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const canAccess = user?.role === "admin" || user?.role === "employee"
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([])
  const [adminSlips, setAdminSlips] = useState<AdminWarehouseSlip[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInv = useCallback(async () => { if (!canAccess) return; try { const r = await inventoryApi.getAll(); if (r.success && r.data) setInventory(r.data.map(txItem)) } catch { } }, [canAccess])
  const fetchTxn = useCallback(async () => { if (!canAccess) return; try { const r = await inventoryApi.getTransactions(); if (r.success && r.data) setTransactions(r.data.map(txTxn)) } catch { } }, [canAccess])
  const fetchTfr = useCallback(async () => { if (!canAccess) return; try { const r = await transferApi.getAll(); if (r.success && r.data) setTransferRequests(r.data.map(txTfr)) } catch { } }, [canAccess])
  const fetchPOs = useCallback(async () => { if (!canAccess) return; try { const r = await purchaseOrderApi.getAll(); if (r.success && r.data) setPurchaseOrders(r.data.map(txPO)) } catch { } }, [canAccess])

  const refreshInventory = useCallback(async () => { if (!canAccess) { setLoading(false); return }; await Promise.all([fetchInv(), fetchTxn(), fetchTfr(), fetchPOs()]) }, [canAccess, fetchInv, fetchTxn, fetchTfr, fetchPOs])

  useEffect(() => { const init = async () => { setLoading(true); if (canAccess) { await ensureWhMap(); try { const wr = await inventoryApi.getWarehouses(); if (wr.success && wr.data) setWarehouses(wr.data.map((w: any) => ({ id: w.id, name: w.name, isHub: !!w.is_hub }))) } catch { }; await refreshInventory() } setAdminSlips(loadSlips()); setLoading(false) }; init() }, [canAccess, refreshInventory])

  const importItems = useCallback(async ({ items, warehouse, note, date, operator }: { items: { sku: string; name: string; qty: number; cost: number }[]; warehouse: string; note: string; date: string; operator: string }) => {
    await ensureWhMap(); const wid = whMap[warehouse]; if (!wid) throw new Error("Kho not found: " + warehouse)
    for (const item of items) { await inventoryApi.importStock({ warehouse_id: wid, sku: item.sku, quantity: item.qty, cost: item.cost || 0, note: `${note} | ${operator}` }) }
    await Promise.all([fetchInv(), fetchTxn()])
  }, [fetchInv, fetchTxn])

  const exportItems = useCallback(async ({ items, warehouse, note, date, operator }: { items: { sku: string; name: string; qty: number; reason: string }[]; warehouse: string; note: string; date: string; operator: string }): Promise<boolean> => {
    await ensureWhMap(); const wid = whMap[warehouse]; if (!wid) return false
    try {
      for (const item of items) { const inv = inventory.find(i => i.sku === item.sku && i.warehouse === warehouse); const r = await inventoryApi.exportStock({ warehouse_id: wid, sku: item.sku, quantity: item.qty, cost: inv?.unitCost || 0, note: `${item.reason || note} | ${operator}` }); if (!r.success) return false }
      await Promise.all([fetchInv(), fetchTxn()]); return true
    } catch { return false }
  }, [fetchInv, fetchTxn, inventory])

  const createTransfer = useCallback(async (request: Omit<TransferRequest, "id">): Promise<string> => {
    await ensureWhMap(); const fid = whMap[request.fromWarehouse] || request.fromWarehouseId; const tid = whMap[request.toWarehouse] || request.toWarehouseId
    if (!fid || !tid) throw new Error("Kho not found")
    const r = await transferApi.create({ from_warehouse_id: fid, to_warehouse_id: tid, reason: request.reason, note: request.note, pickup_method: request.pickupMethod, customer_name: request.customerName, customer_phone: request.customerPhone, items: request.items.map(i => ({ sku: i.sku, name: i.name, qty: i.qty, available_at_request: i.available })) })
    await fetchTfr(); return r.data?.id ? String(r.data.id) : ""
  }, [fetchTfr])

  const updateTransferStatus = useCallback(async (id: string, status: TransferRequest["status"]) => { await transferApi.updateStatus(id, status); await fetchTfr() }, [fetchTfr])

  const exportTransferItems = useCallback(async ({ transferId, qtys, date, note, operator }: { transferId: string; qtys: Record<string, number>; date: string; note: string; operator: string }) => {
    const tf = transferRequests.find(t => t.id === transferId); if (!tf) return
    await ensureWhMap(); const fid = whMap[tf.fromWarehouse] || tf.fromWarehouseId; if (!fid) return
    for (const item of tf.items) { const eq = qtys[item.sku] || 0; if (eq <= 0) continue; const inv = inventory.find(i => i.sku === item.sku && (i.warehouseId === fid || i.warehouse === tf.fromWarehouse)); await inventoryApi.exportStock({ warehouse_id: fid, sku: item.sku, quantity: eq, cost: inv?.unitCost || 0, note: `XK DC ${tf.transferCode || transferId} | ${note} | ${operator}` }) }
    await transferApi.updateStatus(transferId, "in-transit", qtys); await Promise.all([fetchInv(), fetchTxn(), fetchTfr()])
  }, [transferRequests, inventory, fetchInv, fetchTxn, fetchTfr])

  const receiveTransferItems = useCallback(async (transferId: string, operator: string) => {
    // Re-fetch the transfer from backend to get accurate exported quantities
    let tf: TransferRequest | undefined
    try {
      const res = await transferApi.getById(transferId)
      if (res.success && res.data) tf = txTfr(res.data)
    } catch { }
    if (!tf) tf = transferRequests.find(t => t.id === transferId)
    if (!tf) return
    await ensureWhMap(); const tid = whMap[tf.toWarehouse] || tf.toWarehouseId; if (!tid) return
    for (const item of tf.items) { const inv = inventory.find(i => i.sku === item.sku); await inventoryApi.importStock({ warehouse_id: tid, sku: item.sku, quantity: item.qty, cost: inv?.unitCost || 0, note: `NK DC ${tf.transferCode || transferId} | ${operator}` }) }
    await transferApi.updateStatus(transferId, "completed"); await Promise.all([fetchInv(), fetchTxn(), fetchTfr()])
  }, [transferRequests, inventory, fetchInv, fetchTxn, fetchTfr])

  const createAdminSlip = useCallback((slip: Omit<AdminWarehouseSlip, "id">) => {
    const pfx = slip.type === "import" ? "PNK" : "PXK"
    const now = new Date()
    const y = now.getFullYear().toString()
    const m = (now.getMonth() + 1).toString().padStart(2, "0")
    const d = now.getDate().toString().padStart(2, "0")
    const hh = now.getHours().toString().padStart(2, "0")
    const mm = now.getMinutes().toString().padStart(2, "0")
    const ss = now.getSeconds().toString().padStart(2, "0")
    const ms = now.getMilliseconds().toString().padStart(3, "0")
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, "0")
    // Example: PNK-20260306-094537-144-07
    const id = `${pfx}-${y}${m}${d}-${hh}${mm}${ss}-${ms}-${rand}`
    setAdminSlips(prev => { const u = [{ ...slip, id }, ...prev]; saveSlips(u); return u }); return id
  }, [])

  const processAdminSlip = useCallback((id: string, processedBy: string) => {
    setAdminSlips(prev => { const u = prev.map(s => s.id === id ? { ...s, status: "processed" as const, processedAt: new Date().toISOString(), processedBy } : s); saveSlips(u); return u })
  }, [])

  const updatePOStatus = useCallback(async (id: string, status: string) => { await purchaseOrderApi.updateStatus(id, status); await fetchPOs() }, [fetchPOs])

  const resetAll = useCallback(() => { setInventory([]); setTransactions([]); setTransferRequests([]); setAdminSlips([]); setPurchaseOrders([]); try { localStorage.removeItem(SLIP_KEY) } catch { }; refreshInventory() }, [refreshInventory])

  return (
    <InventoryContext.Provider value={{ inventory, transactions, transferRequests, adminSlips, purchaseOrders, warehouses, loading, refreshInventory, importItems, exportItems, createTransfer, updateTransferStatus, exportTransferItems, receiveTransferItems, createAdminSlip, processAdminSlip, updatePOStatus, resetAll }}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider")
  return ctx
}
