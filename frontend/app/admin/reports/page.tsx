"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { formatVND } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { bookingApi, courtApi, productApi, salesOrderApi } from "@/lib/api"
import {
  Download, TrendingUp, TrendingDown, DollarSign, CalendarCheck,
  Activity, ShoppingBag, Loader2
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from "recharts"

const datePresets = ["Hôm nay", "7 ngày", "30 ngày", "Tháng này"]
const CHART_COLORS = ["#d63384", "#0d6efd", "#0dcaf0", "#198754", "#FF6B35"]

export default function AdminReports() {
  const [activePreset, setActivePreset] = useState("30 ngày")
  const [bookings, setBookings] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [bRes, cRes, pRes, soRes] = await Promise.all([
          bookingApi.getAll({}).catch(() => ({ bookings: [] })),
          courtApi.getAll().catch(() => ({ success: false, data: [] })),
          productApi.getAll().catch(() => ({ success: false, data: [] })),
          salesOrderApi.getAll().catch(() => ({ success: false, data: [] })),
        ])
        setBookings(bRes.bookings || [])
        if (cRes.success && cRes.data) setCourts(cRes.data)
        if (pRes.success && pRes.data) setProducts(pRes.data)
        if (soRes.success && soRes.data) setSalesOrders(soRes.data)
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [])

  // Compute KPIs from real data
  const bookingRevenue = useMemo(() => bookings.reduce((s, b) => s + (b.amount || 0), 0), [bookings])
  const shopRevenue = useMemo(() => salesOrders.reduce((s, o) => s + (parseFloat(o.final_total) || parseFloat(o.total) || 0), 0), [salesOrders])
  const totalRevenue = bookingRevenue + shopRevenue

  const revenueKPIs = [
    { title: "Tổng doanh thu", value: formatVND(totalRevenue), change: "", up: true, icon: <DollarSign className="h-5 w-5" /> },
    { title: "Doanh thu đặt sân", value: formatVND(bookingRevenue), change: "", up: true, icon: <CalendarCheck className="h-5 w-5" /> },
    { title: "Doanh thu shop", value: formatVND(shopRevenue), change: "", up: true, icon: <ShoppingBag className="h-5 w-5" /> },
    { title: "Tổng bookings", value: String(bookings.length), change: "", up: true, icon: <Activity className="h-5 w-5" /> },
  ]

  // Compute weekly revenue from bookings (last 7 calendar days)
  const weeklyRevenue = useMemo(() => {
    const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    const today = new Date()
    const result: { day: string; booking: number; shop: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const label = `${dayLabels[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
      const bookingRev = bookings
        .filter((b: any) => ((b.bookingDate || "").split("T")[0]) === dateStr)
        .reduce((s: number, b: any) => s + (b.amount || 0), 0)
      const shopRev = salesOrders
        .filter((o: any) => ((o.created_at || "").split("T")[0]) === dateStr)
        .reduce((s: number, o: any) => s + (parseFloat(o.final_total) || parseFloat(o.total) || 0), 0)
      result.push({ day: label, booking: bookingRev, shop: shopRev })
    }
    return result
  }, [bookings, salesOrders])

  // Top courts by revenue
  const topCourts = useMemo(() => {
    const courtRevMap: Record<string, { revenue: number; bookings: number }> = {}
    bookings.forEach((b: any) => {
      const name = b.courtName || `Sân ${b.courtId}`
      if (!courtRevMap[name]) courtRevMap[name] = { revenue: 0, bookings: 0 }
      courtRevMap[name].revenue += b.amount || 0
      courtRevMap[name].bookings += 1
    })
    return Object.entries(courtRevMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [bookings])

  // Payment methods distribution (from bookings)
  const paymentMethods = useMemo(() => {
    const methodMap: Record<string, number> = {}
    bookings.forEach((b: any) => {
      const method = b.paymentMethod || "Khác"
      methodMap[method] = (methodMap[method] || 0) + 1
    })
    const total = bookings.length || 1
    return Object.entries(methodMap).map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [bookings])

  // Top products (from sales orders)
  const topProducts = useMemo(() => {
    const prodMap: Record<string, { qty: number; revenue: number }> = {}
    salesOrders.forEach((o: any) => {
      const items = o.items || []
      items.forEach((item: any) => {
        const name = item.productName || item.name || item.sku
        if (!prodMap[name]) prodMap[name] = { qty: 0, revenue: 0 }
        prodMap[name].qty += item.quantity || 0
        prodMap[name].revenue += (item.quantity || 0) * (item.price || 0)
      })
    })
    return Object.entries(prodMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [salesOrders])

  // Hourly distribution from bookings
  const hourlyDistribution = useMemo(() => {
    const hourMap: Record<string, number> = {}
    for (let h = 6; h <= 21; h++) {
      hourMap[`${h.toString().padStart(2, "0")}:00`] = 0
    }
    bookings.forEach((b: any) => {
      const startTime = b.timeStart
      if (startTime) {
        const hour = startTime.substring(0, 5)
        if (hourMap[hour] !== undefined) hourMap[hour]++
      }
    })
    return Object.entries(hourMap).map(([hour, count]) => ({ hour, bookings: count }))
  }, [bookings])

  // Heatmap data from real bookings
  const heatmapData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear(), month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dateCounts: Record<number, number> = {}
    bookings.forEach((b: any) => {
      if (b.bookingDate) {
        const d = new Date(b.bookingDate)
        if (d.getMonth() === month && d.getFullYear() === year) {
          dateCounts[d.getDate()] = (dateCounts[d.getDate()] || 0) + 1
        }
      }
    })
    const maxCount = Math.max(...Object.values(dateCounts), 1)
    const data: { day: number; weekday: number; occupancy: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const weekday = new Date(year, month, d).getDay()
      const occupancy = Math.round(((dateCounts[d] || 0) / maxCount) * 100)
      data.push({ day: d, weekday, occupancy })
    }
    return data
  }, [bookings])

  function getHeatmapColor(occupancy: number) {
    if (occupancy <= 30) return "bg-green-200 text-green-900"
    if (occupancy <= 60) return "bg-amber-200 text-amber-900"
    if (occupancy <= 85) return "bg-orange-300 text-orange-900"
    return "bg-red-400 text-red-50"
  }

  const currentMonthLabel = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`

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
              <CardTitle className="font-serif text-lg">Doanh thu 7 ngày</CardTitle>
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
                <CardTitle className="font-serif text-lg">Công suất sân - Tháng {currentMonthLabel}</CardTitle>
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
