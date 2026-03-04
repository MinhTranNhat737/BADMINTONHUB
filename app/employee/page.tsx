"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ShoppingCart, Package, DollarSign, ArrowDownToLine, ArrowUpFromLine, TrendingUp
} from "lucide-react"
import { formatVND } from "@/lib/utils"
import { inventoryApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const todayStats = [
  { title: "Đơn bán hôm nay", value: "12", icon: <ShoppingCart className="h-5 w-5" />, color: "bg-blue-100 text-blue-600" },
  { title: "Doanh thu bán hàng", value: formatVND(8750000), icon: <DollarSign className="h-5 w-5" />, color: "bg-green-100 text-green-600" },
  { title: "Nhập kho hôm nay", value: "3", icon: <ArrowDownToLine className="h-5 w-5" />, color: "bg-purple-100 text-purple-600" },
  { title: "Xuất kho hôm nay", value: "5", icon: <ArrowUpFromLine className="h-5 w-5" />, color: "bg-orange-100 text-orange-600" },
]

const recentSales = [
  { id: "HD-001", time: "09:15", customer: "Nguyễn Văn A", items: 2, total: 4740000, method: "Tiền mặt" },
  { id: "HD-002", time: "10:30", customer: "Trần Thị B", items: 1, total: 150000, method: "MoMo" },
  { id: "HD-003", time: "11:45", customer: "Lê Văn C", items: 3, total: 1085000, method: "Tiền mặt" },
  { id: "HD-004", time: "14:20", customer: "Phạm Thị D", items: 1, total: 3290000, method: "VNPay" },
  { id: "HD-005", time: "15:00", customer: "Hoàng Văn E", items: 2, total: 485000, method: "Tiền mặt" },
]

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  useEffect(() => {
    inventoryApi.getLowStock().then((res: any) => {
      if (res.success && res.data) setLowStockItems(res.data.map((i: any) => ({
        id: i.id, name: i.product_name || i.name || "", sku: i.sku || "",
        warehouse: i.warehouse_name || "", available: i.quantity ?? 0,
        reorderPoint: i.reorder_point ?? i.min_quantity ?? 10,
      })))
    }).catch(() => {})
  }, [])

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
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
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
