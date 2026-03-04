"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { BookingStatusBadge, PaymentBadge } from "@/components/shared"
import { TrendingUp, TrendingDown, CalendarCheck, DollarSign, Activity, AlertTriangle, Eye } from "lucide-react"
import { formatVND } from "@/lib/utils"
import { bookingApi, inventoryApi, ApiBooking } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

const kpis = [
  { title: "Doanh thu hôm nay", value: "12.450.000đ", change: "+12%", up: true, icon: <DollarSign className="h-5 w-5" /> },
  { title: "Booking hôm nay", value: "48", change: "+8%", up: true, icon: <CalendarCheck className="h-5 w-5" /> },
  { title: "Công suất sân", value: "78%", change: "-3%", up: false, icon: <Activity className="h-5 w-5" />, progress: 78 },
  { title: "Cảnh báo tồn kho", value: "3", change: "", up: false, icon: <AlertTriangle className="h-5 w-5" />, alert: true },
]

const revenueData = [
  { day: "T2", booking: 8200000, shop: 3100000 },
  { day: "T3", booking: 9500000, shop: 2800000 },
  { day: "T4", booking: 7800000, shop: 4200000 },
  { day: "T5", booking: 11200000, shop: 3600000 },
  { day: "T6", booking: 13500000, shop: 5100000 },
  { day: "T7", booking: 18200000, shop: 6800000 },
  { day: "CN", booking: 16800000, shop: 5400000 },
]

const courtTypeData = [
  { name: "Premium", value: 45, color: "#FF6B35" },
  { name: "Standard", value: 35, color: "#1F6B3A" },
  { name: "VIP", value: 20, color: "#0F172A" },
]

export default function AdminDashboard() {
  const [recentBookings, setRecentBookings] = useState<ApiBooking[]>([])
  const [stockAlerts, setStockAlerts] = useState<any[]>([])

  useEffect(() => {
    bookingApi.getAll({ limit: 5 }).then(res => {
      setRecentBookings(res.bookings || [])
    }).catch(() => {})

    inventoryApi.getLowStock().then(res => {
      if (res.success && res.data) setStockAlerts(res.data)
    }).catch(() => {})
  }, [])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">26/02/2026</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpis.map((kpi, i) => (
          <Card key={i} className={cn("hover:-translate-y-0.5 transition-all", kpi.alert && "border-red-200 bg-red-50")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={cn("p-2 rounded-lg", kpi.alert ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                  {kpi.icon}
                </span>
                {kpi.change && (
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold", kpi.up ? "text-green-600" : "text-red-600")}>
                    {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                )}
              </div>
              <p className="font-serif text-2xl font-extrabold mt-3">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
              {kpi.progress !== undefined && (
                <Progress value={kpi.progress} className="h-1.5 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Doanh thu 7 ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [formatVND(value), '']}
                />
                <Area type="monotone" dataKey="booking" stackId="1" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.3} name="Đặt sân" />
                <Area type="monotone" dataKey="shop" stackId="1" stroke="#1F6B3A" fill="#1F6B3A" fillOpacity={0.3} name="Cửa hàng" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Công suất theo loại</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={courtTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {courtTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {courtTypeData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name} ({d.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Live Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                Booking gần đây
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1" /> Live
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Mã</TableHead>
                  <TableHead className="text-xs">Khách</TableHead>
                  <TableHead className="text-xs">Sân</TableHead>
                  <TableHead className="text-xs">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs text-primary">{b.id}</TableCell>
                    <TableCell className="text-sm">{b.customerName}</TableCell>
                    <TableCell className="text-sm">{b.courtName}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Cảnh báo tồn kho</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sản phẩm</TableHead>
                  <TableHead className="text-xs">Tồn kho</TableHead>
                  <TableHead className="text-xs">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAlerts.map((item: any, idx: number) => (
                  <TableRow key={`${item.sku}-${item.warehouse_name}-${idx}`} className="bg-amber-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium">{item.product_name || item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm font-semibold", (item.quantity || 0) === 0 ? "text-red-600" : "text-amber-600")}>
                        {item.quantity ?? item.available ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-xs h-7">Tạo PO</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
