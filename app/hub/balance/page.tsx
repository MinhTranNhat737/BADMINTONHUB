"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatVND } from "@/lib/utils"
import { useInventory } from "@/lib/inventory-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  Search, Package, Scale, ArrowRight, CheckCircle2, AlertTriangle,
  XOctagon, Warehouse, Zap, Eye, Send, Minus, Plus
} from "lucide-react"

interface BalanceItem {
  sku: string
  name: string
  category: string
  unitCost: number
  hubAvailable: number
  branches: {
    warehouse: string
    onHand: number
    available: number
    reorderPoint: number
    status: "ok" | "low" | "out"
    deficit: number // how much more is needed to reach safe level (reorderPoint * 2)
  }[]
  totalDeficit: number
}

interface TransferPlan {
  sku: string
  name: string
  toWarehouse: string
  qty: number
  unitCost: number
}

function isHubWarehouse(name?: string) {
  return /hub/i.test(String(name || ""))
}

export default function HubBalancePage() {
  const { user } = useAuth()
  const ctx = useInventory()
  const { inventory, createTransfer, exportTransferItems, warehouses } = ctx
  const BRANCH_WAREHOUSES = useMemo(() => warehouses.filter(w => !w.isHub).map(w => w.name), [warehouses])
  const hubWarehouseName = useMemo(
    () => warehouses.find((w) => w.isHub || isHubWarehouse(w.name))?.name || "Kho Hub",
    [warehouses]
  )

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "needs-restock" | "out">("all")
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Balance confirm dialog
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balancePlan, setBalancePlan] = useState<TransferPlan[]>([])
  const [balanceNote, setBalanceNote] = useState("")
  const [balanceSuccess, setBalanceSuccess] = useState(false)

  // Manual transfer dialog
  const [manualOpen, setManualOpen] = useState(false)
  const [manualSku, setManualSku] = useState("")
  const [manualWarehouse, setManualWarehouse] = useState("")
  const [manualQty, setManualQty] = useState(0)
  const [manualNote, setManualNote] = useState("")
  const [manualSuccess, setManualSuccess] = useState(false)

  const categories = [...new Set(inventory.map(i => i.category))]

  // Build balance analysis data
  const balanceData: BalanceItem[] = useMemo(() => {
    // Get all unique SKUs
    const skuMap = new Map<string, BalanceItem>()

    const hubItems = inventory.filter(i => isHubWarehouse(i.warehouse))
    for (const hubItem of hubItems) {
      const branches = BRANCH_WAREHOUSES.map(wh => {
        const branchItem = inventory.find(i => i.sku === hubItem.sku && i.warehouse === wh)
        if (!branchItem) {
          // SKU doesn't exist in this branch
          return {
            warehouse: wh,
            onHand: 0,
            available: 0,
            reorderPoint: hubItem.reorderPoint,
            status: "out" as const,
            deficit: hubItem.reorderPoint * 2, // needs full allocation
          }
        }
        const safeLevel = branchItem.reorderPoint * 2
        const deficit = Math.max(0, safeLevel - branchItem.available)
        const status: "ok" | "low" | "out" =
          branchItem.available === 0 ? "out" :
          branchItem.available <= branchItem.reorderPoint ? "low" : "ok"
        return {
          warehouse: wh,
          onHand: branchItem.onHand,
          available: branchItem.available,
          reorderPoint: branchItem.reorderPoint,
          status,
          deficit,
        }
      })

      const totalDeficit = branches.reduce((s, b) => s + b.deficit, 0)
      skuMap.set(hubItem.sku, {
        sku: hubItem.sku,
        name: hubItem.name,
        category: hubItem.category,
        unitCost: hubItem.unitCost,
        hubAvailable: hubItem.available,
        branches,
        totalDeficit,
      })
    }

    return Array.from(skuMap.values())
  }, [inventory, BRANCH_WAREHOUSES])

  // Filter
  const filtered = balanceData.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false
    if (statusFilter === "needs-restock" && item.totalDeficit === 0) return false
    if (statusFilter === "out" && !item.branches.some(b => b.status === "out")) return false
    return true
  })

  // Items needing restock
  const needsRestockCount = balanceData.filter(d => d.totalDeficit > 0).length
  const outOfStockBranches = balanceData.reduce((s, d) => s + d.branches.filter(b => b.status === "out").length, 0)

  // Generate auto-balance plan
  const generateBalancePlan = useCallback(() => {
    const plan: TransferPlan[] = []

    for (const item of balanceData) {
      if (item.totalDeficit === 0) continue

      let hubRemaining = item.hubAvailable

      // Sort branches: out first, then low, prioritize higher deficit
      const sortedBranches = [...item.branches]
        .filter(b => b.deficit > 0)
        .sort((a, b) => {
          if (a.status === "out" && b.status !== "out") return -1
          if (a.status !== "out" && b.status === "out") return 1
          return b.deficit - a.deficit
        })

      for (const branch of sortedBranches) {
        if (hubRemaining <= 0) break
        const transferQty = Math.min(branch.deficit, hubRemaining)
        if (transferQty > 0) {
          plan.push({
            sku: item.sku,
            name: item.name,
            toWarehouse: branch.warehouse,
            qty: transferQty,
            unitCost: item.unitCost,
          })
          hubRemaining -= transferQty
        }
      }
    }

    return plan
  }, [balanceData])

  const handleAutoBalance = () => {
    const plan = generateBalancePlan()
    if (plan.length === 0) return
    setBalancePlan(plan)
    setBalanceNote("")
    setBalanceOpen(true)
  }

  const handleConfirmBalance = async () => {
    // Group plan by target warehouse
    const grouped = new Map<string, TransferPlan[]>()
    for (const p of balancePlan) {
      const list = grouped.get(p.toWarehouse) || []
      list.push(p)
      grouped.set(p.toWarehouse, list)
    }

    const today = new Date().toISOString().split("T")[0]

    // Create one transfer request per target warehouse
    try {
      for (const [toWarehouse, items] of grouped) {
        const transferId = await createTransfer({
          date: today,
          fromWarehouse: hubWarehouseName,
          toWarehouse,
          items: items.map(i => ({
            sku: i.sku,
            name: i.name,
            qty: i.qty,
            available: balanceData.find(d => d.sku === i.sku)?.hubAvailable || 0,
          })),
          reason: "Cân bằng tồn kho tự động từ Hub",
          note: balanceNote || "Cân bằng tồn kho — NV Hub tạo phiếu tự động",
          status: "pending",
          pickupMethod: "delivery",
          createdBy: user?.fullName || "NV Hub",
        })

        if (!transferId) throw new Error("Tạo phiếu điều chuyển thất bại")

        const qtys: Record<string, number> = {}
        for (const item of items) {
          qtys[item.sku] = item.qty
        }
        await exportTransferItems({
          transferId,
          qtys,
          date: today,
          note: balanceNote || "Xuất cân bằng tồn kho từ Hub",
          operator: user?.fullName || "NV Hub",
        })
      }

      setBalanceSuccess(true)
      setBalanceOpen(false)
      setTimeout(() => setBalanceSuccess(false), 5000)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Cân bằng tồn kho thất bại")
    }
  }

  // Manual single transfer
  const handleManualTransfer = async () => {
    if (!manualSku || !manualWarehouse || manualQty <= 0) return

    const item = balanceData.find(d => d.sku === manualSku)
    if (!item || item.hubAvailable < manualQty) return

    const today = new Date().toISOString().split("T")[0]
    try {
      const transferId = await createTransfer({
        date: today,
        fromWarehouse: hubWarehouseName,
        toWarehouse: manualWarehouse,
        items: [{
          sku: manualSku,
          name: item.name,
          qty: manualQty,
          available: item.hubAvailable,
        }],
        reason: "Điều chuyển thủ công từ Hub",
        note: manualNote || `NV Hub xuất ${manualQty} ${item.name} → ${manualWarehouse}`,
        status: "pending",
        pickupMethod: "delivery",
        createdBy: user?.fullName || "NV Hub",
      })

      if (!transferId) throw new Error("Tạo phiếu điều chuyển thất bại")

      await exportTransferItems({
        transferId,
        qtys: { [manualSku]: manualQty },
        date: today,
        note: manualNote || `Xuất điều chuyển ${item.name} → ${manualWarehouse}`,
        operator: user?.fullName || "NV Hub",
      })

      setManualSuccess(true)
      setManualOpen(false)
      setManualSku("")
      setManualWarehouse("")
      setManualQty(0)
      setManualNote("")
      setTimeout(() => setManualSuccess(false), 5000)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Điều chuyển thất bại")
    }
  }

  const openManualFromSku = (sku: string) => {
    setManualSku(sku)
    setManualOpen(true)
  }

  const selectedDetail = selectedSku ? balanceData.find(d => d.sku === selectedSku) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold flex items-center gap-2">
            <Scale className="h-6 w-6 text-purple-600" /> Cân bằng tồn kho
          </h1>
          <p className="text-sm text-muted-foreground">
            So sánh tồn kho các chi nhánh và điều chuyển từ Hub để cân bằng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            onClick={handleAutoBalance}
            disabled={needsRestockCount === 0}
          >
            <Zap className="h-3.5 w-3.5" /> Tự động cân bằng ({needsRestockCount} SKU)
          </Button>
        </div>
      </div>

      {/* Success messages */}
      {balanceSuccess && (
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            Cân bằng tồn kho thành công! Các phiếu điều chuyển đã được tạo và xuất kho từ Hub.
          </p>
        </div>
      )}
      {manualSuccess && (
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            Điều chuyển thủ công thành công! Hàng đã xuất từ Hub.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-purple-100 text-purple-600"><Package className="h-5 w-5" /></span>
            </div>
            <p className="font-serif text-2xl font-extrabold mt-3">{balanceData.length}</p>
            <p className="text-sm text-muted-foreground">SKU theo dõi</p>
          </CardContent>
        </Card>
        <Card className={needsRestockCount > 0 ? "border-amber-200" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-600"><AlertTriangle className="h-5 w-5" /></span>
            </div>
            <p className="font-serif text-2xl font-extrabold mt-3">{needsRestockCount}</p>
            <p className="text-sm text-muted-foreground">SKU cần bổ sung</p>
          </CardContent>
        </Card>
        <Card className={outOfStockBranches > 0 ? "border-red-200" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-red-100 text-red-600"><XOctagon className="h-5 w-5" /></span>
            </div>
            <p className="font-serif text-2xl font-extrabold mt-3">{outOfStockBranches}</p>
            <p className="text-sm text-muted-foreground">Kho chi nhánh hết hàng</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm SKU, tên sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="needs-restock">Cần bổ sung</SelectItem>
            <SelectItem value="out">Có kho hết hàng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Balance Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Sản phẩm</TableHead>
                <TableHead className="text-xs">Danh mục</TableHead>
                <TableHead className="text-xs text-center bg-purple-50">
                  <div className="flex items-center justify-center gap-1">
                    <Warehouse className="h-3 w-3" /> Hub
                  </div>
                </TableHead>
                {BRANCH_WAREHOUSES.map(wh => (
                  <TableHead key={wh} className="text-xs text-center">
                    {wh.replace("Kho ", "")}
                  </TableHead>
                ))}
                <TableHead className="text-xs text-center">Tổng thiếu</TableHead>
                <TableHead className="text-xs text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.sku} className={cn(
                  "hover:bg-muted/50",
                  idx % 2 !== 0 && "bg-muted/20",
                  item.totalDeficit > 0 && "bg-amber-50/30",
                  item.branches.some(b => b.status === "out") && "bg-red-50/30",
                )}>
                  <TableCell className="font-mono text-xs text-primary">{item.sku}</TableCell>
                  <TableCell className="text-sm font-medium">{item.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                  <TableCell className="text-center bg-purple-50/50">
                    <span className="font-semibold text-purple-700">{item.hubAvailable}</span>
                  </TableCell>
                  {item.branches.map(branch => (
                    <TableCell key={branch.warehouse} className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge className={cn(
                          "text-xs min-w-[36px] justify-center",
                          branch.status === "out" ? "bg-red-100 text-red-700" :
                          branch.status === "low" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          {branch.available}
                        </Badge>
                        {branch.deficit > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">-{branch.deficit}</span>
                        )}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {item.totalDeficit > 0 ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">-{item.totalDeficit}</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 text-xs">Đủ</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => { setSelectedSku(item.sku); setDetailOpen(true) }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {item.totalDeficit > 0 && item.hubAvailable > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700"
                          onClick={() => openManualFromSku(item.sku)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Chi tiết tồn kho — {selectedDetail?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-primary">{selectedDetail.sku}</span>
                <Badge variant="outline">{selectedDetail.category}</Badge>
                <span className="text-muted-foreground">Đơn giá: {formatVND(selectedDetail.unitCost)}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kho</TableHead>
                    <TableHead className="text-xs text-center">Tồn kho</TableHead>
                    <TableHead className="text-xs text-center">Khả dụng</TableHead>
                    <TableHead className="text-xs text-center">Ngưỡng ĐL</TableHead>
                    <TableHead className="text-xs text-center">Mức an toàn</TableHead>
                    <TableHead className="text-xs text-center">Trạng thái</TableHead>
                    <TableHead className="text-xs text-center">Cần bổ sung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-purple-50/50">
                    <TableCell className="text-sm font-semibold text-purple-700">
                      <div className="flex items-center gap-1"><Warehouse className="h-3.5 w-3.5" /> Kho Hub</div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{selectedDetail.hubAvailable}</TableCell>
                    <TableCell className="text-center font-semibold text-purple-700">{selectedDetail.hubAvailable}</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-700 text-xs">Hub</Badge></TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                  </TableRow>
                  {selectedDetail.branches.map(branch => (
                    <TableRow key={branch.warehouse}>
                      <TableCell className="text-sm font-medium">{branch.warehouse}</TableCell>
                      <TableCell className="text-center">{branch.onHand}</TableCell>
                      <TableCell className="text-center">{branch.available}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{branch.reorderPoint}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{branch.reorderPoint * 2}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-xs",
                          branch.status === "out" ? "bg-red-100 text-red-700" :
                          branch.status === "low" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        )}>
                          {branch.status === "out" ? "Hết hàng" : branch.status === "low" ? "Sắp hết" : "Ổn"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {branch.deficit > 0 ? (
                          <span className="text-sm font-semibold text-red-600">+{branch.deficit}</span>
                        ) : (
                          <span className="text-sm text-green-600">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                <p><strong>Mức an toàn</strong> = Ngưỡng đặt lại × 2</p>
                <p><strong>Cần bổ sung</strong> = Mức an toàn − Khả dụng (nếu &gt; 0)</p>
                <p><strong>Hub xuất tối đa</strong> = min(Cần bổ sung, Hub khả dụng)</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedDetail && selectedDetail.totalDeficit > 0 && selectedDetail.hubAvailable > 0 && (
              <Button
                variant="default"
                className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  setDetailOpen(false)
                  openManualFromSku(selectedDetail.sku)
                }}
              >
                <Send className="h-3.5 w-3.5" /> Xuất bổ sung
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Auto Balance Confirm Dialog ═══ */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" /> Xác nhận cân bằng tồn kho tự động
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hệ thống đề xuất điều chuyển {balancePlan.length} mặt hàng từ Kho Hub đến các chi nhánh thiếu hàng.
              Ưu tiên: Hết hàng &gt; Sắp hết &gt; Thiếu nhiều nhất.
            </p>

            {/* Group by warehouse */}
            {BRANCH_WAREHOUSES.map(wh => {
              const items = balancePlan.filter(p => p.toWarehouse === wh)
              if (items.length === 0) return null
              return (
                <Card key={wh}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-purple-600" />
                      Kho Hub → {wh}
                      <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs">{items.length} SKU</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Sản phẩm</TableHead>
                          <TableHead className="text-xs text-center">Số lượng</TableHead>
                          <TableHead className="text-xs text-right">Giá trị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={`${item.sku}-${wh}`}>
                            <TableCell className="font-mono text-xs text-primary">{item.sku}</TableCell>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setBalancePlan(prev => prev.map(p =>
                                      p.sku === item.sku && p.toWarehouse === wh
                                        ? { ...p, qty: Math.max(0, p.qty - 1) }
                                        : p
                                    ).filter(p => p.qty > 0))
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-semibold text-sm w-8 text-center">{item.qty}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setBalancePlan(prev => prev.map(p =>
                                      p.sku === item.sku && p.toWarehouse === wh
                                        ? { ...p, qty: p.qty + 1 }
                                        : p
                                    ))
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatVND(item.qty * item.unitCost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            })}

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Tổng giá trị điều chuyển:</span>
                <span className="font-serif text-lg font-extrabold text-purple-700">
                  {formatVND(balancePlan.reduce((s, p) => s + p.qty * p.unitCost, 0))}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú (tùy chọn)</Label>
              <Textarea
                placeholder="Ghi chú cho phiếu điều chuyển..."
                value={balanceNote}
                onChange={e => setBalanceNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              className="gap-1.5 bg-purple-600 hover:bg-purple-700"
              onClick={handleConfirmBalance}
              disabled={balancePlan.length === 0}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận xuất cân bằng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Manual Transfer Dialog ═══ */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" /> Xuất điều chuyển thủ công
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const item = balanceData.find(d => d.sku === manualSku)
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sản phẩm</Label>
                  <Select value={manualSku} onValueChange={setManualSku}>
                    <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                    <SelectContent>
                      {balanceData.filter(d => d.hubAvailable > 0).map(d => (
                        <SelectItem key={d.sku} value={d.sku}>
                          {d.sku} — {d.name} (Hub: {d.hubAvailable})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kho đích</Label>
                  <Select value={manualWarehouse} onValueChange={setManualWarehouse}>
                    <SelectTrigger><SelectValue placeholder="Chọn kho chi nhánh" /></SelectTrigger>
                    <SelectContent>
                      {BRANCH_WAREHOUSES.map(wh => {
                        const branch = item?.branches.find(b => b.warehouse === wh)
                        return (
                          <SelectItem key={wh} value={wh}>
                            {wh} (hiện có: {branch?.available ?? 0})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Số lượng (Hub khả dụng: {item?.hubAvailable ?? 0})</Label>
                  <Input
                    type="number"
                    min={1}
                    max={item?.hubAvailable ?? 0}
                    value={manualQty || ""}
                    onChange={e => setManualQty(parseInt(e.target.value) || 0)}
                    placeholder="Nhập số lượng"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    placeholder="Ghi chú..."
                    value={manualNote}
                    onChange={e => setManualNote(e.target.value)}
                  />
                </div>
              </div>
            )
          })()}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              className="gap-1.5 bg-purple-600 hover:bg-purple-700"
              onClick={handleManualTransfer}
              disabled={!manualSku || !manualWarehouse || manualQty <= 0}
            >
              <Send className="h-3.5 w-3.5" /> Xuất điều chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
