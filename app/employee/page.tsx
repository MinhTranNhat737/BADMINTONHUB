"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ShoppingCart, Package, DollarSign, ArrowDownToLine, ArrowUpFromLine, TrendingUp
} from "lucide-react"
import { formatVND } from "@/lib/utils"
import { inventoryApi, salesOrderApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    inventoryApi.getLowStock().then((res: any) => {
      if (res.success && res.data) setLowStockItems(res.data.map((i: any) => ({
        id: i.id, name: i.product_name || i.name || "", sku: i.sku || "",
        warehouse: i.warehouse_name || "", available: i.quantity ?? 0,
        reorderPoint: i.reorder_point ?? i.min_quantity ?? 10,
      })))
    }).catch(() => {})

    salesOrderApi.getAll().then((res: any) => {
      if (res.success && res.data) setSalesOrders(res.data)
    }).catch(() => {})

    inventoryApi.getTransactions().then((res: any) => {
      if (res.success && res.data) setTransactions(res.data)
    }).catch(() => {})
  }, [])

  // Compute today's stats from real data
  const todayStr = new Date().toISOString().split("T")[0]
  const todaySales = useMemo(() => salesOrders.filter((o: any) => {
    const created = o.createdAt || o.created_at || ""
    return created.startsWith(todayStr)
  }), [salesOrders, todayStr])
  const todayRevenue = useMemo(() => todaySales.reduce((s, o) => s + (parseFloat(o.final_total) || parseFloat(o.total) || 0), 0), [todaySales])
  const todayImports = useMemo(() => transactions.filter((t: any) => {
    const created = t.createdAt || t.created_at || ""
    return created.startsWith(todayStr) && (t.type === "import" || t.type === "IN")
  }).length, [transactions, todayStr])
  const todayExports = useMemo(() => transactions.filter((t: any) => {
    const created = t.createdAt || t.created_at || ""
    return created.startsWith(todayStr) && (t.type === "export" || t.type === "OUT")
  }).length, [transactions, todayStr])

  const todayStats = [
    { title: "Đơn bán hôm nay", value: String(todaySales.length), icon: <ShoppingCart className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
    { title: "Doanh thu bán hàng", value: formatVND(todayRevenue), icon: <DollarSign className="h-5 w-5" />, color: "bg-green-100 text-green-600" },
    { title: "Nhập kho hôm nay", value: String(todayImports), icon: <ArrowDownToLine className="h-5 w-5" />, color: "bg-purple-100 text-purple-600" },
    { title: "Xuất kho hôm nay", value: String(todayExports), icon: <ArrowUpFromLine className="h-5 w-5" />, color: "bg-orange-100 text-orange-600" },
  ]

  // Recent sales (latest 5)
  const recentSales = useMemo(() => {
    return [...salesOrders]
      .sort((a, b) => {
        const da = a.createdAt || a.created_at || ""
        const db = b.createdAt || b.created_at || ""
        return db.localeCompare(da)
      })
      .slice(0, 5)
      .map((o: any) => ({
        id: o.orderCode || o.id,
        time: (o.createdAt || o.created_at || "").substring(11, 16) || "--:--",
        customer: o.customerName || o.customer_name || "Khách lẻ",
        items: o.items?.length || 0,
        total: parseFloat(o.final_total) || parseFloat(o.total) || 0,
        method: o.paymentMethod || o.payment_method || "Tiền mặt",
      }))
  }, [salesOrders])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold text-foreground">
            Xin chào, {user?.fullName || "Nhân viên"}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">Tổng quan hoạt động hôm nay</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {todayStats.map((stat, i) => (
          <Card key={i} className="hover:-translate-y-0.5 transition-all">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" /> Đơn bán gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Mã</TableHead>
                  <TableHead className="text-xs">Giờ</TableHead>
                  <TableHead className="text-xs">Khách hàng</TableHead>
                  <TableHead className="text-xs text-center">SL</TableHead>
                  <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                  <TableHead className="text-xs">Thanh toán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs text-blue-600">{sale.id}</TableCell>
                    <TableCell className="text-sm">{sale.time}</TableCell>
                    <TableCell className="text-sm font-medium">{sale.customer}</TableCell>
                    <TableCell className="text-center text-sm">{sale.items}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatVND(sale.total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{sale.method}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={lowStockItems.length > 0 ? "border-amber-200" : ""}>
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" /> Cảnh báo tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Không có sản phẩm nào sắp hết hàng</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item, idx) => (
                  <div key={`${item.id}-${item.warehouse}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku} • {item.warehouse}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.available === 0 ? "destructive" : "outline"} className="text-xs">
                        {item.available === 0 ? "Hết hàng" : `Còn ${item.available}`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Mức đặt lại: {item.reorderPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
