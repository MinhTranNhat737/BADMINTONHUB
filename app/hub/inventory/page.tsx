"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { StockLevelIndicator } from "@/components/shared"
import { formatVND } from "@/lib/utils"
import { useInventory } from "@/lib/inventory-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { exportInventoryCheckSheet } from "@/lib/export-inventory-check"
import {
  Search, Package, AlertTriangle, XOctagon, DollarSign,
  Warehouse, FileSpreadsheet
} from "lucide-react"
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis
} from "@/components/ui/pagination"

const HUB_INV_PAGE_SIZE = 20

export default function HubInventoryPage() {
  const { user } = useAuth()
  const { inventory } = useInventory()

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [alertOnly, setAlertOnly] = useState(false)
  const [hubInvPage, setHubInvPage] = useState(1)

  // Hub only items
  const hubItems = useMemo(() => inventory.filter(i => i.warehouse === "Kho Hub"), [inventory])

  const categories = [...new Set(hubItems.map(i => i.category))]

  const totalValue = useMemo(() => hubItems.reduce((sum, i) => sum + i.onHand * i.unitCost, 0), [hubItems])
  const totalQty = useMemo(() => hubItems.reduce((sum, i) => sum + i.onHand, 0), [hubItems])
  const lowStock = useMemo(() => hubItems.filter(i => i.available > 0 && i.available <= i.reorderPoint).length, [hubItems])
  const outOfStock = useMemo(() => hubItems.filter(i => i.available === 0).length, [hubItems])

  const filtered = hubItems.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false
    if (alertOnly && item.available > item.reorderPoint) return false
    return true
  })

  // Pagination
  const hubInvTotalPages = Math.max(1, Math.ceil(filtered.length / HUB_INV_PAGE_SIZE))
  const hubInvSafePage = Math.min(hubInvPage, hubInvTotalPages)
  const paginatedFiltered = useMemo(() => {
    const start = (hubInvSafePage - 1) * HUB_INV_PAGE_SIZE
    return filtered.slice(start, start + HUB_INV_PAGE_SIZE)
  }, [filtered, hubInvSafePage])

  const getHubInvPageNumbers = () => {
    const pages: (number | "...")[] = []
    if (hubInvTotalPages <= 7) {
      for (let i = 1; i <= hubInvTotalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (hubInvSafePage > 3) pages.push("...")
      for (let i = Math.max(2, hubInvSafePage - 1); i <= Math.min(hubInvTotalPages - 1, hubInvSafePage + 1); i++) pages.push(i)
      if (hubInvSafePage < hubInvTotalPages - 2) pages.push("...")
      pages.push(hubInvTotalPages)
    }
    return pages
  }

  const stats = [
    { title: "Tổng SKU Hub", value: hubItems.length.toString(), icon: <Package className="h-5 w-5" />, color: "bg-purple-100 text-purple-600" },
    { title: "Tổng giá trị", value: formatVND(totalValue), icon: <DollarSign className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
    { title: "Sắp hết hàng", value: lowStock.toString(), icon: <AlertTriangle className="h-5 w-5" />, color: "bg-amber-100 text-amber-600", alert: lowStock > 0 },
    { title: "Hết hàng", value: outOfStock.toString(), icon: <XOctagon className="h-5 w-5" />, color: "bg-red-100 text-red-600", alert: outOfStock > 0 },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-purple-600" /> Tồn kho Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Tổng {totalQty.toLocaleString("vi-VN")} sản phẩm trong kho Hub
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => {
            exportInventoryCheckSheet({
              items: filtered,
              warehouseFilter: "Kho Hub",
              categoryFilter,
              exportedBy: user?.fullName || "NV Hub",
            })
          }}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Xuất phiếu kiểm kê
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, i) => (
          <Card key={i} className={cn("hover:-translate-y-0.5 transition-all", stat.alert && "border-red-200")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={cn("p-2 rounded-lg", stat.color)}>{stat.icon}</span>
              </div>
              <p className="font-serif text-2xl font-extrabold mt-3">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm SKU, tên sản phẩm..." value={search} onChange={e => { setSearch(e.target.value); setHubInvPage(1) }} className="pl-9 h-9" />
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setHubInvPage(1) }}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="alert-hub" checked={alertOnly} onCheckedChange={v => { setAlertOnly(v); setHubInvPage(1) }} />
          <Label htmlFor="alert-hub" className="text-sm">Chỉ cảnh báo</Label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        Hiển thị {(hubInvSafePage - 1) * HUB_INV_PAGE_SIZE + 1}–{Math.min(hubInvSafePage * HUB_INV_PAGE_SIZE, filtered.length)} / {filtered.length} mục
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12"></TableHead>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Sản phẩm</TableHead>
                <TableHead className="text-xs">Danh mục</TableHead>
                <TableHead className="text-xs text-center">Tồn kho</TableHead>
                <TableHead className="text-xs text-center">Khả dụng</TableHead>
                <TableHead className="text-xs text-center">Ngưỡng đặt lại</TableHead>
                <TableHead className="text-xs text-right">Đơn giá</TableHead>
                <TableHead className="text-xs text-right">Giá trị tồn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFiltered.map((item, idx) => (
                <TableRow key={item.id} className={cn(
                  "hover:bg-muted/50",
                  idx % 2 !== 0 && "bg-muted/20",
                  item.available === 0 && "bg-red-50/50",
                  item.available > 0 && item.available <= item.reorderPoint && "bg-amber-50/50"
                )}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-purple-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-purple-600" />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">{item.sku}</TableCell>
                  <TableCell><p className="text-sm font-medium">{item.name}</p></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                  <TableCell className="text-center text-sm">{item.onHand}</TableCell>
                  <TableCell className="text-center">
                    <StockLevelIndicator available={item.available} reorderPoint={item.reorderPoint} />
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{item.reorderPoint}</TableCell>
                  <TableCell className="text-right text-sm">{formatVND(item.unitCost)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatVND(item.onHand * item.unitCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hubInvTotalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setHubInvPage(p => Math.max(1, p - 1))}
                  className={cn("cursor-pointer", hubInvSafePage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {getHubInvPageNumbers().map((page, i) => (
                <PaginationItem key={i}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      isActive={page === hubInvSafePage}
                      onClick={() => setHubInvPage(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setHubInvPage(p => Math.min(hubInvTotalPages, p + 1))}
                  className={cn("cursor-pointer", hubInvSafePage === hubInvTotalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
