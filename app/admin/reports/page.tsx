"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { formatVND } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Download, TrendingUp, TrendingDown, DollarSign, CalendarCheck,
  Activity, ShoppingBag
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from "recharts"

const datePresets = ["Hôm nay", "7 ngày", "30 ngày", "Tháng này"]

const revenueKPIs = [
  { title: "Tổng doanh thu", value: "285.600.000đ", change: "+18%", up: true, icon: <DollarSign className="h-5 w-5" /> },
  { title: "Doanh thu đặt sân", value: "198.400.000đ", change: "+15%", up: true, icon: <CalendarCheck className="h-5 w-5" /> },
  { title: "Doanh thu shop", value: "87.200.000đ", change: "+24%", up: true, icon: <ShoppingBag className="h-5 w-5" /> },
  { title: "Tỷ lệ tăng trưởng", value: "18%", change: "+3%", up: true, icon: <Activity className="h-5 w-5" /> },
]

const weeklyRevenue = [
  { day: "T2", booking: 28200000, shop: 11100000 },
  { day: "T3", booking: 32500000, shop: 9800000 },
  { day: "T4", booking: 27800000, shop: 14200000 },
  { day: "T5", booking: 35200000, shop: 12600000 },
  { day: "T6", booking: 42500000, shop: 15100000 },
  { day: "T7", booking: 51200000, shop: 18800000 },
  { day: "CN", booking: 46800000, shop: 16400000 },
]

const topCourts = [
  { name: "Sân B2 - VIP", revenue: 52000000, bookings: 208 },
  { name: "Sân A1 - Premium", revenue: 45600000, bookings: 285 },
  { name: "Sân B1 - Premium", revenue: 41200000, bookings: 229 },
  { name: "Sân C2 - Premium", revenue: 33800000, bookings: 225 },
  { name: "Sân A2 - Standard", revenue: 28400000, bookings: 237 },
]

const paymentMethods = [
  { name: "MoMo", value: 35, color: "#d63384" },
  { name: "VNPay", value: 30, color: "#0d6efd" },
  { name: "Bank", value: 20, color: "#0dcaf0" },
  { name: "Wallet", value: 15, color: "#198754" },
]

const topProducts = [
  { name: "Vợt Yonex Astrox 88D Pro", qty: 42, revenue: 192780000 },
  { name: "Giày Yonex Power Cushion 65Z3", qty: 28, revenue: 92120000 },
  { name: "Vợt Victor Thruster K 9900", qty: 35, revenue: 136150000 },
  { name: "Cước Yonex BG65", qty: 320, revenue: 48000000 },
  { name: "Túi vợt Lining ABJT059", qty: 18, revenue: 16020000 },
]

const hourlyDistribution = [
  { hour: "06:00", bookings: 12 },
  { hour: "07:00", bookings: 25 },
  { hour: "08:00", bookings: 38 },
  { hour: "09:00", bookings: 30 },
  { hour: "10:00", bookings: 20 },
  { hour: "11:00", bookings: 15 },
  { hour: "12:00", bookings: 8 },
  { hour: "13:00", bookings: 10 },
  { hour: "14:00", bookings: 15 },
  { hour: "15:00", bookings: 22 },
  { hour: "16:00", bookings: 35 },
  { hour: "17:00", bookings: 48 },
  { hour: "18:00", bookings: 55 },
  { hour: "19:00", bookings: 52 },
  { hour: "20:00", bookings: 45 },
  { hour: "21:00", bookings: 30 },
]

// Heatmap data for calendar
function generateHeatmapData() {
  const data: { day: number; weekday: number; occupancy: number }[] = []
  for (let d = 1; d <= 28; d++) {
    const weekday = (d - 1) % 7
    const occupancy = Math.floor(Math.random() * 100)
    data.push({ day: d, weekday, occupancy })
  }
  return data
}

function getHeatmapColor(occupancy: number) {
  if (occupancy <= 30) return "bg-green-200 text-green-900"
  if (occupancy <= 60) return "bg-amber-200 text-amber-900"
  if (occupancy <= 85) return "bg-orange-300 text-orange-900"
  return "bg-red-400 text-red-50"
}

export default function AdminReports() {
  const [activePreset, setActivePreset] = useState("30 ngay")
  const heatmapData = generateHeatmapData()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold">Báo cáo</h1>
          <p className="text-sm text-muted-foreground">Phân tích và thống kê</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      {/* Date Presets */}
      <div className="flex items-center gap-2 mb-6">
        {datePresets.map(p => (
          <button
            key={p}
            onClick={() => setActivePreset(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activePreset === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Doanh Thu</TabsTrigger>
          <TabsTrigger value="occupancy">Công Suất Sân</TabsTrigger>
          <TabsTrigger value="inventory">Tồn Kho</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {revenueKPIs.map((kpi, i) => (
              <Card key={i} className="hover:-translate-y-0.5 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">{kpi.icon}</span>
                    <span className={cn("flex items-center gap-0.5 text-xs font-semibold", kpi.up ? "text-green-600" : "text-red-600")}>
                      {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {kpi.change}
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-extrabold mt-3">{kpi.value}</p>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Doanh thu 7 ngay</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={weeklyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [formatVND(value), '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="booking" stackId="1" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.3} name="Đặt sân" />
                  <Area type="monotone" dataKey="shop" stackId="1" stroke="#1F6B3A" fill="#1F6B3A" fillOpacity={0.3} name="Cửa hàng" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Two Column */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Courts */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Top sân theo doanh thu</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topCourts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(value: number) => [formatVND(value), 'Doanh thu']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="#FF6B35" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Phương thức thanh toán</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                      {paymentMethods.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {paymentMethods.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name} ({d.value}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Top sản phẩm bán chạy</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Sản phẩm</TableHead>
                    <TableHead className="text-xs text-center">Đã bán</TableHead>
                    <TableHead className="text-xs text-right">Doanh thu</TableHead>
                    <TableHead className="text-xs w-32">Tỷ trọng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => {
                    const maxRev = Math.max(...topProducts.map(x => x.revenue))
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-bold text-primary">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{p.name}</TableCell>
                        <TableCell className="text-center text-sm">{p.qty}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatVND(p.revenue)}</TableCell>
                        <TableCell>
                          <Progress value={(p.revenue / maxRev) * 100} className="h-1.5" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy Tab */}
        <TabsContent value="occupancy" className="space-y-6">
          {/* Heatmap Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg">Công suất sân - Tháng 2/2026</CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-200" /> 0-30%</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-200" /> 31-60%</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-300" /> 61-85%</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400" /> 86%+</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Heatmap grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {heatmapData.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105",
                      getHeatmapColor(d.occupancy)
                    )}
                    title={`Ngày ${d.day}: ${d.occupancy}% công suất`}
                  >
                    <span className="text-xs font-bold">{d.day}</span>
                    <span className="text-[10px]">{d.occupancy}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Phân bổ booking theo giờ</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Bar dataKey="bookings" name="Bookings" radius={[4, 4, 0, 0]}>
                    {hourlyDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.bookings >= 45 ? "#FF6B35" : "#e2e8f0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-2">Giờ cao điểm: 17:00 - 21:00 (highlight màu cam)</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-serif text-lg font-bold">Báo cáo tồn kho</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">Xem chi tiết tại mục Tồn kho trong menu Quản lý.</p>
              <Button className="mt-4" variant="outline" asChild>
                <a href="/admin/inventory">Đi đến Tồn kho</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
