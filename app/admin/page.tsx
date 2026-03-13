"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { BookingStatusBadge } from "@/components/shared"
import {
  TrendingUp, TrendingDown, CalendarCheck, DollarSign, Activity,
  AlertTriangle, Loader2, Zap, Users, Clock, BarChart3
} from "lucide-react"
import { formatVND, generateTimeSlots } from "@/lib/utils"
import { bookingApi, inventoryApi, courtApi, branchApi, ApiBooking } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const CHART_COLORS = ["#FF6B35", "#1F6B3A", "#6366f1", "#ec4899", "#0ea5e9", "#f59e0b"]

export default function AdminDashboard() {
  const [recentBookings, setRecentBookings] = useState<ApiBooking[]>([])
  const [allBookings, setAllBookings] = useState<ApiBooking[]>([])
  const [stockAlerts, setStockAlerts] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [bookingsRes, allBookingsRes, lowStockRes, courtsRes, branchesRes] = await Promise.all([
          bookingApi.getAll({ limit: 8 }).catch(() => ({ bookings: [] })),
          bookingApi.getAll({}).catch(() => ({ bookings: [] })),
          inventoryApi.getLowStock().catch(() => ({ success: false, data: [] })),
          courtApi.getAll().catch(() => ({ success: false, data: [] })),
          branchApi.getAll().catch(() => ({ success: false, data: [] })),
        ])
        setRecentBookings(bookingsRes.bookings || [])
        setAllBookings(allBookingsRes.bookings || [])
        if (lowStockRes.success && lowStockRes.data) setStockAlerts(lowStockRes.data)
        if (courtsRes.success && courtsRes.data) setCourts(courtsRes.data)
        if (branchesRes.success && branchesRes.data) setBranches(branchesRes.data)
      } catch { }
      setLoading(false)
    }
    fetchData()
  }, [])

  // ─── Time helpers ───
  const todayStr = new Date().toISOString().split("T")[0]
  const now = new Date()

  // ─── Financial KPIs ───
  const todayBookings = useMemo(() =>
    allBookings.filter(b => (b.bookingDate || "").split("T")[0] === todayStr),
    [allBookings, todayStr]
  )
  const todayRevenue = useMemo(() =>
    todayBookings.reduce((s, b) => s + (b.amount || 0), 0),
    [todayBookings]
  )

  // Total revenue (all time)
  const totalRevenue = useMemo(() =>
    allBookings.reduce((s, b) => s + (b.amount || 0), 0),
    [allBookings]
  )

  // This month revenue
  const thisMonthRevenue = useMemo(() => {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return allBookings
      .filter(b => (b.bookingDate || "").startsWith(monthStr))
      .reduce((s, b) => s + (b.amount || 0), 0)
  }, [allBookings, now])

  // Yesterday revenue for comparison
  const yesterdayStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    return d.toISOString().split("T")[0]
  }, [])
  const yesterdayRevenue = useMemo(() =>
    allBookings.filter(b => (b.bookingDate || "").split("T")[0] === yesterdayStr)
      .reduce((s, b) => s + (b.amount || 0), 0),
    [allBookings, yesterdayStr]
  )
  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : todayRevenue > 0 ? 100 : 0

  // ─── Court capacity (slot-based) ───
  const timeSlots = generateTimeSlots()
  const totalSlotsPerDay = courts.filter((c: any) => c.status === "active").length * timeSlots.length

  const todayBookedSlots = useMemo(() => {
    let count = 0
    todayBookings.forEach(b => {
      if (b.status === "cancelled") return
      const startH = parseInt((b.timeStart || "06:00").split(":")[0])
      const endH = parseInt((b.timeEnd || "07:00").split(":")[0])
      count += Math.max(1, endH - startH)
    })
    return count
  }, [todayBookings])

  const courtCapacity = totalSlotsPerDay > 0 ? Math.round((todayBookedSlots / totalSlotsPerDay) * 100) : 0

  // ─── Per-court capacity for today ───
  const courtCapacityData = useMemo(() => {
    const activeCourts = courts.filter((c: any) => c.status === "active")
    return activeCourts.map((c: any) => {
      const courtBookings = todayBookings.filter(b => b.courtId === c.id && b.status !== "cancelled")
      let bookedSlots = 0
      courtBookings.forEach(b => {
        const startH = parseInt((b.timeStart || "06:00").split(":")[0])
        const endH = parseInt((b.timeEnd || "07:00").split(":")[0])
        bookedSlots += Math.max(1, endH - startH)
      })
      const total = timeSlots.length
      const pct = total > 0 ? Math.round((bookedSlots / total) * 100) : 0
      return {
        name: c.name?.split(' - ')[0] || c.name,
        fullName: c.name,
        type: c.courtType || c.court_type || "standard",
        booked: bookedSlots,
        free: total - bookedSlots,
        total,
        pct,
        revenue: courtBookings.reduce((s: number, b: ApiBooking) => s + (b.amount || 0), 0),
      }
    }).sort((a, b) => b.pct - a.pct)
  }, [courts, todayBookings, timeSlots])

  // ─── KPI cards ───
  const kpis = [
    {
      title: "Doanh thu hôm nay",
      value: formatVND(todayRevenue),
      change: revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange}%` : "",
      up: revenueChange >= 0,
      icon: <DollarSign className="h-5 w-5" />,
      sub: `Hôm qua: ${formatVND(yesterdayRevenue)}`,
    },
    {
      title: "Tổng doanh thu",
      value: formatVND(totalRevenue),
      change: "",
      up: true,
      icon: <BarChart3 className="h-5 w-5" />,
      sub: `Tháng này: ${formatVND(thisMonthRevenue)}`,
    },
    {
      title: "Công suất sân hôm nay",
      value: `${courtCapacity}%`,
      change: `${todayBookedSlots}/${totalSlotsPerDay} slot`,
      up: courtCapacity >= 50,
      icon: <Activity className="h-5 w-5" />,
      progress: courtCapacity,
    },
    {
      title: "Booking hôm nay",
      value: String(todayBookings.length),
      change: "",
      up: true,
      icon: <CalendarCheck className="h-5 w-5" />,
      sub: `${todayBookings.filter(b => b.status === 'confirmed' || b.status === 'playing').length} đã xác nhận`,
    },
  ]

  // ─── Revenue chart (last 7 days) ───
  const revenueData = useMemo(() => {
    const dayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    const today = new Date()
    const result: { day: string; revenue: number; bookings: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const label = `${dayLabels[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
      const dayBookings = allBookings.filter(b => (b.bookingDate || "").split("T")[0] === dateStr)
      const revenue = dayBookings.reduce((s, b) => s + (b.amount || 0), 0)
      result.push({ day: label, revenue, bookings: dayBookings.length })
    }
    return result
  }, [allBookings])

  // ─── Hourly capacity for today ───
  const hourlyData = useMemo(() => {
    const activeCourts = courts.filter((c: any) => c.status === "active")
    const totalCourts = activeCourts.length || 1
    return timeSlots.map(slot => {
      const hour = parseInt(slot.split(":")[0])
      let booked = 0
      todayBookings.forEach(b => {
        if (b.status === "cancelled") return
        const startH = parseInt((b.timeStart || "06:00").split(":")[0])
        const endH = parseInt((b.timeEnd || "07:00").split(":")[0])
        if (hour >= startH && hour < endH) booked++
      })
      return {
        time: slot,
        booked,
        free: totalCourts - booked,
        pct: Math.round((booked / totalCourts) * 100),
      }
    })
  }, [courts, todayBookings, timeSlots])

  // ─── Court type distribution ───
  const courtTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {}
    courts.forEach((c: any) => {
      const type = c.courtType || c.court_type || "standard"
      typeCount[type] = (typeCount[type] || 0) + 1
    })
    const total = courts.length || 1
    return Object.entries(typeCount).map(([name, count], i) => ({
      name: name === "premium" ? "Premium" : name === "vip" ? "VIP" : "Standard",
      value: count,
      pct: Math.round((count / total) * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [courts])

  // ─── Revenue by branch ───
  const branchRevenueData = useMemo(() => {
    return branches.map((b: any, i: number) => {
      const branchBookings = todayBookings.filter(bk => bk.branchName === b.name)
      return {
        name: b.name,
        revenue: branchBookings.reduce((s: number, bk: ApiBooking) => s + (bk.amount || 0), 0),
        bookings: branchBookings.length,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }
    })
  }, [branches, todayBookings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-extrabold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString("vi-VN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {kpis.map((kpi, i) => (
          <Card key={i} className="hover:-translate-y-0.5 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  {kpi.icon}
                </span>
                {kpi.change && (
                  <span className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                    kpi.up ? "text-green-700 bg-green-100" : "text-red-600 bg-red-100"
                  )}>
                    {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                )}
              </div>
              <p className="font-serif text-2xl font-extrabold mt-3">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
              {kpi.sub && (
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              )}
              {kpi.progress !== undefined && (
                <Progress value={kpi.progress} className="h-1.5 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Revenue Chart + Court Type ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg">Doanh thu 7 ngày gần nhất</CardTitle>
              <span className="text-xs text-muted-foreground">
                Tổng: <strong className="text-foreground">{formatVND(revenueData.reduce((s, d) => s + d.revenue, 0))}</strong>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [formatVND(value), name === 'revenue' ? 'Doanh thu' : 'Bookings']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5} fill="url(#revGrad)" name="Doanh thu" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Court Type + Branch Revenue */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base">Phân bổ loại sân</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={courtTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {courtTypeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} sân`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4">
                {courtTypeData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Branch Revenue Today */}
          {branchRevenueData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-base">Doanh thu theo chi nhánh (hôm nay)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {branchRevenueData.map((b, i) => (
                  <div key={b.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                        <span className="font-medium truncate max-w-[140px]">{b.name}</span>
                      </div>
                      <span className="font-semibold text-primary">{formatVND(b.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={branchRevenueData[0]?.revenue ? (b.revenue / branchRevenueData.reduce((s, x) => Math.max(s, x.revenue), 1) * 100) : 0}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-[10px] text-muted-foreground">{b.bookings} booking</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══ Court Capacity + Hourly Chart ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Hourly capacity chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Công suất theo giờ (hôm nay)
              </CardTitle>
              <Badge variant="outline" className="text-xs">{courts.filter((c: any) => c.status === "active").length} sân</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [value, name === 'booked' ? 'Đã đặt' : 'Trống']}
                />
                <Legend formatter={(value) => value === 'booked' ? 'Đã đặt' : 'Trống'} />
                <Bar dataKey="booked" stackId="a" fill="#FF6B35" radius={[0, 0, 0, 0]} />
                <Bar dataKey="free" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-court capacity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Công suất từng sân (hôm nay)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Trung bình: <strong className={cn(courtCapacity >= 70 ? "text-green-600" : courtCapacity >= 40 ? "text-amber-600" : "text-red-600")}>{courtCapacity}%</strong>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {courtCapacityData.map(c => (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4">
                        {c.type === "premium" ? "Premium" : c.type === "vip" ? "VIP" : "Std"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{c.booked}/{c.total} slot</span>
                      <span className={cn("text-sm font-bold min-w-[36px] text-right",
                        c.pct >= 70 ? "text-green-600" : c.pct >= 40 ? "text-amber-600" : "text-muted-foreground"
                      )}>{c.pct}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
                        c.pct >= 70 ? "bg-green-500" : c.pct >= 40 ? "bg-amber-500" : "bg-slate-400"
                      )}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Doanh thu: {formatVND(c.revenue)}</span>
                    <span>{c.free} slot trống</span>
                  </div>
                </div>
              ))}
              {courtCapacityData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có sân nào đang hoạt động</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Tables Row ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                Booking gần đây
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1" /> Live
                </Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">{recentBookings.length} booking</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Mã</TableHead>
                  <TableHead className="text-xs">Khách</TableHead>
                  <TableHead className="text-xs">Sân</TableHead>
                  <TableHead className="text-xs">Số tiền</TableHead>
                  <TableHead className="text-xs">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs text-primary">{b.bookingCode || b.id}</TableCell>
                    <TableCell className="text-sm">{b.customerName}</TableCell>
                    <TableCell className="text-sm">{b.courtName}</TableCell>
                    <TableCell className="text-sm font-semibold">{formatVND(b.amount)}</TableCell>
                    <TableCell><BookingStatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
                {recentBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có booking</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <AlertTriangle className={cn("h-4 w-4", stockAlerts.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
                Cảnh báo tồn kho
              </CardTitle>
              {stockAlerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">{stockAlerts.length} sản phẩm</Badge>
              )}
            </div>
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
                {stockAlerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Không có cảnh báo tồn kho
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
