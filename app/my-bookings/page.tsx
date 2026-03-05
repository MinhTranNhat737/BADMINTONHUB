"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { BookingStatusBadge } from "@/components/shared"
import { RouteGuard } from "@/components/route-guard"
import { Calendar, Clock, MapPin, QrCode, Star, ChevronDown, Settings, Heart, Gift, ShoppingBag, Award, User as UserIcon, Save, CheckCircle2, AlertCircle, Mail, Phone, MapPinned, Package, Truck, Receipt, Printer, Download, Eye, Copy, CalendarDays } from "lucide-react"
import { useState, useEffect } from "react"
import { formatVND } from "@/lib/utils"
import { bookingApi, orderApi, type ApiBooking, type ApiOrder } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { AddressInput } from "@/components/address-input"
import { QRCodeSVG } from "qrcode.react"

type SidebarPage = "bookings" | "orders" | "favorites" | "rewards" | "settings"

const sidebarNavItems = [
  { icon: <Calendar className="h-4 w-4" />, label: "Lịch đặt", page: "bookings" as SidebarPage },
  { icon: <ShoppingBag className="h-4 w-4" />, label: "Đơn hàng", page: "orders" as SidebarPage },
  { icon: <Heart className="h-4 w-4" />, label: "Yêu thích", page: "favorites" as SidebarPage },
  { icon: <Gift className="h-4 w-4" />, label: "Điểm thưởng", page: "rewards" as SidebarPage },
  { icon: <Settings className="h-4 w-4" />, label: "Cài đặt", page: "settings" as SidebarPage },
]

function AccountSidebar({ activePage, onPageChange }: { activePage: SidebarPage; onPageChange: (p: SidebarPage) => void }) {
  const { user } = useAuth()
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <Card>
        <CardContent className="p-6">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold font-serif">
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <h3 className="font-serif font-bold mt-3">{user?.fullName || "Người dùng"}</h3>
            <Badge className="mt-1 bg-amber-100 text-amber-800 border-amber-200">
              <Award className="h-3 w-3 mr-1" /> Thành viên Vàng
            </Badge>
          </div>

          {/* Nav */}
          <nav className="mt-6 flex flex-col gap-1">
            {sidebarNavItems.map(item => (
              <button
                key={item.label}
                onClick={() => onPageChange(item.page)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                  item.page === activePage
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>
    </aside>
  )
}

function BookingCard({ booking, tab, onCancel }: { booking: ApiBooking; tab: string; onCancel?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)

  const dateObj = new Date(booking.bookingDate)
  const dayNum = dateObj.getDate()
  const month = `Th${dateObj.getMonth() + 1}`
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const dayName = dayNames[dateObj.getDay()]

  return (
    <Card className="hover:-translate-y-0.5 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Date Block */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-primary px-3 py-2 text-primary-foreground shrink-0 min-w-[60px]">
            <span className="text-xs font-medium">{dayName}</span>
            <span className="font-serif text-2xl font-extrabold leading-none">{dayNum}</span>
            <span className="text-xs">{month}</span>
          </div>

          {/* Center Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{booking.courtName}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {booking.timeStart} - {booking.timeEnd}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {booking.branchName}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{booking.bookingCode || booking.id}</span>
              <span className="text-sm font-semibold text-primary">{formatVND(booking.amount)}</span>
            </div>
          </div>

          {/* Right: Status & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <BookingStatusBadge status={booking.status} />
            <div className="flex gap-1.5">
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <>
                  <Button variant="outline" size="sm" className="text-xs h-7">Chi tiết</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7">Đổi lịch</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7 text-red-600 hover:text-red-700">Huỷ</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif">Xác nhận huỷ đặt sân?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Chính sách hoàn tiền: Huỷ trước 24h được hoàn 100%. Huỷ trước 2h được hoàn 50%. Huỷ trong vòng 2h không được hoàn tiền.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Quay lại</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => onCancel?.(booking.id)}>Xác nhận huỷ</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {booking.status === 'completed' && (
                <>
                  <Button variant="outline" size="sm" className="text-xs h-7">Chi tiết</Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90">Đánh giá</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-serif">Đánh giá trải nghiệm</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              onMouseEnter={() => setHoverRating(s)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(s)}
                            >
                              <Star className={cn(
                                "h-8 w-8 transition-colors",
                                (hoverRating || rating) >= s
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted"
                              )} />
                            </button>
                          ))}
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-2">
                          {rating === 0 ? "Chọn số sao" : `Bạn đánh giá ${rating} sao`}
                        </p>
                      </div>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                        Gửi đánh giá
                      </Button>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {booking.status === 'cancelled' && (
                <Button variant="outline" size="sm" className="text-xs h-7">Chi tiết</Button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable QR */}
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
          <QrCode className="h-3 w-3" /> QR Check-in
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-4">
            <div className="h-24 w-24 bg-white rounded border flex items-center justify-center p-1">
              <QRCodeSVG
                value={JSON.stringify({ bookingId: booking.id, bookingCode: booking.bookingCode || booking.id })}
                size={88}
                level="M"
              />
            </div>
            <div className="text-sm">
              <p className="font-semibold">Xuất trình khi đến sân</p>
              <p className="text-muted-foreground text-xs mt-1">Nhân viên sẽ quét mã này để check-in</p>
              <p className="font-mono text-xs mt-1 text-primary">{booking.bookingCode || booking.id}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileSettingsForm() {
  const { user, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [address, setAddress] = useState(user?.address || "")
  const [gender, setGender] = useState<"nam" | "nữ" | "">(user?.gender || "")
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên"
    if (!email.trim()) newErrors.email = "Vui lòng nhập email"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Email không hợp lệ"
    if (!phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại"
    else if (!/^0\d{9}$/.test(phone.trim())) newErrors.phone = "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)"
    if (!address.trim()) newErrors.address = "Vui lòng nhập địa chỉ"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSuccessMsg("")

    const result = await updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
    })
    setSaving(false)
    if (result.success) {
      setSuccessMsg("Cập nhật thông tin thành công!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } else {
      setErrors({ general: result.error || "Có lỗi xảy ra" })
    }
  }

  // Check which fields are missing
  const missingFields: string[] = []
  if (!user?.fullName || user.fullName === "Khách") missingFields.push("Họ tên")
  if (!user?.email) missingFields.push("Email")
  if (!user?.phone) missingFields.push("Số điện thoại")
  if (!user?.address) missingFields.push("Địa chỉ")
  if (!user?.gender) missingFields.push("Giới tính")
  if (!user?.dateOfBirth) missingFields.push("Ngày sinh")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Thông tin tài khoản</h1>
        <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân của bạn</p>
      </div>

      {/* Missing info warning */}
      {missingFields.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Thông tin chưa đầy đủ</p>
                <p className="text-xs text-amber-700 mt-1">
                  Bạn cần bổ sung: <strong>{missingFields.join(", ")}</strong> để có thể đặt sân và nhận hóa đơn.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success message */}
      {successMsg && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-semibold text-green-800">{successMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General error */}
      {errors.general && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-semibold text-red-800">{errors.general}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" /> Tài khoản
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Tên đăng nhập</Label>
              <Input value={user?.username || ""} disabled className="mt-1.5 bg-muted" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Vai trò</Label>
              <Input value={user?.role === "admin" ? "Quản trị viên" : user?.role === "employee" ? "Nhân viên" : "Người dùng"} disabled className="mt-1.5 bg-muted" />
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Ngày tạo tài khoản</Label>
            <Input value={user?.createdAt || ""} disabled className="mt-1.5 bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">
                Họ tên <span className="text-red-500">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors(prev => ({ ...prev, fullName: "" })) }}
                placeholder="Nhập họ tên đầy đủ"
                className={cn("mt-1.5", errors.fullName && "border-red-500")}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.fullName}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm">
                Số điện thoại <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: "" })) }}
                  placeholder="0901234567"
                  className={cn("pl-10", errors.phone && "border-red-500")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })) }}
                placeholder="email@example.com"
                className={cn("pl-10", errors.email && "border-red-500")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.email}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm">
              Địa chỉ <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1.5">
              <AddressInput
                value={address}
                onChange={(val) => { setAddress(val); setErrors(prev => ({ ...prev, address: "" })) }}
                placeholder="Tìm kiếm địa chỉ (số nhà, đường, quận/huyện, thành phố)"
                error={errors.address}
              />
            </div>
            {errors.address && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.address}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Giới tính</Label>
              <div className="flex gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setGender("nam")}
                  className={cn(
                    "flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-all",
                    gender === "nam"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  ♂ Nam
                </button>
                <button
                  type="button"
                  onClick={() => setGender("nữ")}
                  className={cn(
                    "flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-all",
                    gender === "nữ"
                      ? "border-pink-500 bg-pink-50 text-pink-600"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  ♀ Nữ
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">Ngày sinh</Label>
              <div className="relative mt-1.5">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="pl-10"
                  max="2015-01-01"
                  min="1940-01-01"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 min-w-[160px]"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu thông tin
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ───────────────────── Order History View ───────────────────── */

const paymentLabels: Record<string, string> = {
  cod: "COD",
  momo: "MoMo",
  vnpay: "VNPay",
  bank: "Chuyển khoản",
}

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "Chờ xử lý",  color: "bg-amber-100 text-amber-800 border-amber-200",  icon: <Clock className="h-3.5 w-3.5" /> },
  processing:  { label: "Đang xử lý", color: "bg-blue-100 text-blue-800 border-blue-200",    icon: <Package className="h-3.5 w-3.5" /> },
  shipping:    { label: "Đang giao",   color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:   { label: "Đã giao",     color: "bg-green-100 text-green-800 border-green-200",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  cancelled:   { label: "Đã hủy",      color: "bg-red-100 text-red-800 border-red-200",       icon: <AlertCircle className="h-3.5 w-3.5" /> },
}

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = orderStatusConfig[status] || orderStatusConfig.pending
  return (
    <Badge variant="outline" className={cn("gap-1", cfg.color)}>
      {cfg.icon} {cfg.label}
    </Badge>
  )
}

function OrderInvoiceDialog({ order }: { order: ApiOrder }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(order.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => { window.print() }

  const handleDownload = () => {
    const lines = [
      "====================================",
      "       HÓA ĐƠN - BADMINTONHUB",
      "====================================",
      `Mã đơn hàng: ${order.id}`,
      `Ngày đặt: ${new Date(order.createdAt).toLocaleString("vi-VN")}`,
      `Trạng thái: ${orderStatusConfig[order.status]?.label || order.status}`,
      "",
      "Thông tin khách hàng:",
      `  Họ tên: ${order.customerName}`,
      `  SĐT: ${order.customerPhone}`,
      `  Email: ${order.customerEmail || ''}`,
      `  Địa chỉ: ${order.shippingAddress}`,
      "",
      "------------------------------------",
      "SẢN PHẨM:",
      "------------------------------------",
      ...order.items.map(item =>
        `  ${item.productName} x${item.quantity} = ${formatVND(item.price * item.quantity)}`
      ),
      "------------------------------------",
      `Thanh toán: ${paymentLabels[order.paymentMethod || ''] || order.paymentMethod}`,
      "====================================",
      `TỔNG CỘNG: ${formatVND(order.amount)}`,
      "====================================",
      "",
      order.note ? `Ghi chú: ${order.note}` : "",
      "",
      "Cảm ơn bạn đã mua hàng tại BadmintonHub!",
    ].filter(Boolean).join("\n")

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hoa-don-${order.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Hóa đơn đơn hàng
        </DialogTitle>
      </DialogHeader>

      <Card className="border-2 border-dashed border-primary/30 mt-2">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-primary text-lg">BADMINTONHUB</p>
              <p className="text-muted-foreground text-xs">Cửa hàng phụ kiện cầu lông</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="font-mono font-bold text-primary">{order.id}</span>
                <button onClick={handleCopy} className="p-1 rounded hover:bg-muted transition-colors">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(order.createdAt).toLocaleString("vi-VN")}
              </p>
              <div className="mt-1">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thông tin nhận hàng</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Họ tên</p>
                <p className="font-semibold">{order.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">SĐT</p>
                <p className="font-semibold">{order.customerPhone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Địa chỉ</p>
                <p className="font-semibold">{order.shippingAddress}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sản phẩm</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-3 font-semibold text-xs">Sản phẩm</th>
                    <th className="text-center py-2 px-3 font-semibold text-xs">SL</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs">Đơn giá</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.productId} className="border-t">
                      <td className="py-2 px-3">{item.productName}</td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{formatVND(item.price)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatVND(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thanh toán</span>
              <span>{paymentLabels[order.paymentMethod || ''] || order.paymentMethod || 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-base">Tổng cộng</span>
              <span className="font-bold text-lg text-primary">{formatVND(order.amount)}</span>
            </div>
          </div>

          {order.note && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">Ghi chú: {order.note}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Print & Download */}
      <div className="flex gap-2 mt-2 print:hidden">
        <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> In hóa đơn
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Tải hóa đơn
        </Button>
      </div>
    </DialogContent>
  )
}

function OrderHistoryView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    orderApi.getMyOrders().then(setOrders)
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Đơn hàng của tôi</h1>
        <p className="text-muted-foreground mt-1">Xem lại lịch sử mua hàng và hóa đơn</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-serif font-bold text-lg text-muted-foreground">Chưa có đơn hàng nào</h3>
            <p className="text-sm text-muted-foreground mt-1">Hãy mua sắm và đơn hàng sẽ hiển thị ở đây</p>
            <a href="/shop">
              <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <ShoppingBag className="h-4 w-4" /> Đi mua sắm
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary">{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                      <Badge variant="outline" className="text-xs">
                        {paymentLabels[order.paymentMethod || ''] || order.paymentMethod || 'N/A'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {order.items.map(i => `${i.productName} x${i.quantity}`).join(", ")}
                    </p>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-serif font-bold text-primary text-lg">{formatVND(order.amount)}</p>
                    <Dialog open={dialogOpen && selectedOrder?.id === order.id} onOpenChange={(open) => {
                      setDialogOpen(open)
                      if (!open) setSelectedOrder(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => { setSelectedOrder(order); setDialogOpen(true) }}
                        >
                          <Receipt className="h-4 w-4" /> Xem hóa đơn
                        </Button>
                      </DialogTrigger>
                      {selectedOrder && selectedOrder.id === order.id && (
                        <OrderInvoiceDialog order={selectedOrder} />
                      )}
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState<SidebarPage>("bookings")
  const [allBookings, setAllBookings] = useState<ApiBooking[]>([])

  useEffect(() => {
    if (user && user.role !== 'guest') {
      bookingApi.getMyBookings().then(setAllBookings)
    }
  }, [user])

  const handleCancel = async (bookingId: string) => {
    const result = await bookingApi.updateStatus(bookingId, 'cancelled')
    if (result.success) {
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    }
  }

  const upcoming = allBookings.filter(b => ['confirmed', 'pending', 'playing'].includes(b.status))
  const completed = allBookings.filter(b => b.status === 'completed')
  const cancelled = allBookings.filter(b => b.status === 'cancelled')

  // Guest không được xem lịch đặt
  if (user?.role === 'guest') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8" />
              </div>
              <h2 className="font-serif text-xl font-bold">Không thể xem lịch đặt</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Bạn đang truy cập với vai trò khách. Hãy đăng ký hoặc đăng nhập để xem lịch sử đặt sân.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hóa đơn đặt sân của bạn đã được hiển thị ngay sau khi thanh toán.
              </p>
              <div className="flex gap-3 mt-6">
                <a href="/login" className="flex-1">
                  <Button variant="outline" className="w-full font-semibold">Đăng nhập</Button>
                </a>
                <a href="/register" className="flex-1">
                  <Button className="w-full bg-primary text-primary-foreground font-semibold">Đăng ký</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <RouteGuard>
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex gap-6">
            <AccountSidebar activePage={activePage} onPageChange={setActivePage} />
            <div className="flex-1 min-w-0">
              {activePage === "bookings" ? (
                <>
                  <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Lịch đặt của tôi</h1>

                  <Tabs defaultValue="upcoming" className="mt-6">
                    <TabsList>
                      <TabsTrigger value="upcoming">Sắp tới ({upcoming.length})</TabsTrigger>
                      <TabsTrigger value="completed">Hoàn thành ({completed.length})</TabsTrigger>
                      <TabsTrigger value="cancelled">Đã huỷ ({cancelled.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="mt-4 flex flex-col gap-4">
                      {upcoming.length === 0 ? (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">Chưa có lịch đặt sắp tới</p>
                          <p className="text-sm mt-1">Hãy <a href="/courts" className="text-primary underline">đặt sân</a> để bắt đầu chơi!</p>
                        </CardContent></Card>
                      ) : upcoming.map(b => <BookingCard key={b.id} booking={b} tab="upcoming" onCancel={handleCancel} />)}
                    </TabsContent>

                    <TabsContent value="completed" className="mt-4 flex flex-col gap-4">
                      {completed.length === 0 ? (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">Chưa có lịch đã hoàn thành</p>
                        </CardContent></Card>
                      ) : completed.map(b => <BookingCard key={b.id} booking={b} tab="completed" />)}
                    </TabsContent>

                    <TabsContent value="cancelled" className="mt-4 flex flex-col gap-4">
                      {cancelled.length === 0 ? (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">Chưa có lịch đã huỷ</p>
                        </CardContent></Card>
                      ) : cancelled.map(b => <BookingCard key={b.id} booking={b} tab="cancelled" />)}
                    </TabsContent>
                  </Tabs>
                </>
              ) : activePage === "orders" ? (
                <OrderHistoryView />
              ) : activePage === "favorites" ? (
                <div>
                  <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Yêu thích</h1>
                  <Card className="mt-6"><CardContent className="p-8 text-center text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">Chưa có mục yêu thích</p>
                    <p className="text-sm mt-1">Các sân và sản phẩm bạn yêu thích sẽ hiển thị tại đây.</p>
                  </CardContent></Card>
                </div>
              ) : activePage === "rewards" ? (
                <div>
                  <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Điểm thưởng</h1>
                  <Card className="mt-6"><CardContent className="p-8 text-center text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">0 điểm</p>
                    <p className="text-sm mt-1">Đặt sân và mua hàng để tích luỹ điểm thưởng.</p>
                  </CardContent></Card>
                </div>
              ) : (
                <ProfileSettingsForm />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </RouteGuard>
  )
}
