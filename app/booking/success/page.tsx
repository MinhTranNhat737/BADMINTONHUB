"use client"

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Share2, CalendarPlus, ArrowRight, Home, Printer, FileText, Receipt, CheckCircle2, Route, MapPin, Loader2, Navigation2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { formatVND } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { TOMTOM_API_KEY } from "@/lib/tomtom"
import dynamic from "next/dynamic"

const TomTomMap = dynamic<{ lat: number; lng: number; courtLat?: number; courtLng?: number; courtName?: string; routeCoords?: [number, number][] }>(
  () => import("@/components/tomtom-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted rounded-xl">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface CompletedBooking {
  id: string
  courtName: string
  courtType: string
  branch: string
  courtAddress?: string
  courtLat?: number
  courtLng?: number
  date: string
  timeRange: string
  people: number
  amount: number
  paymentMethod: string
  contact: { name: string; phone: string; email: string; address?: string }
  racketRental: boolean
  note: string
}

function AnimatedCheckmark() {
  return (
    <div className="flex justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="text-secondary">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray="226" strokeDashoffset="226"
          className="animate-checkmark" style={{ strokeLinecap: 'round' }} />
        <path d="M24 40 L35 51 L56 30" fill="none" stroke="currentColor" strokeWidth="3.5"
          strokeDasharray="50" strokeDashoffset="50"
          className="animate-checkmark" style={{ strokeLinecap: 'round', strokeLinejoin: 'round', animationDelay: '0.3s' }} />
      </svg>
    </div>
  )
}

const paymentLabels: Record<string, string> = {
  momo: "MoMo",
  vnpay: "VNPay",
  bank: "Chuyển khoản ngân hàng",
  wallet: "Ví BadmintonHub",
}

function InvoiceSection({ booking }: { booking: CompletedBooking }) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const invoiceDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
  const invoiceTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  const basePrice = booking.amount
  const racketPrice = booking.racketRental ? 50000 : 0
  // Reconstruct subtotal (amount already includes everything)
  const subtotal = basePrice

  const handlePrint = () => {
    window.print()
  }

  return (
    <div ref={invoiceRef} className="print-invoice">
      <Card className="border-2 border-dashed border-primary/30 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-lg">Hóa đơn thanh toán</CardTitle>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Đã thanh toán
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice Header */}
          <div className="flex justify-between items-start text-sm">
            <div>
              <p className="font-bold text-primary text-base">BADMINTONHUB</p>
              <p className="text-muted-foreground text-xs mt-0.5">Hệ thống sân cầu lông chuyên nghiệp</p>
              <p className="text-muted-foreground text-xs">Hotline: 1900 1234</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Số hóa đơn</p>
              <p className="font-mono font-bold text-primary">{booking.id}</p>
              <p className="text-xs text-muted-foreground mt-1">{invoiceDate} - {invoiceTime}</p>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thông tin khách hàng</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Họ tên</p>
                <p className="font-semibold">{booking.contact.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Số điện thoại</p>
                <p className="font-semibold">{booking.contact.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-semibold">{booking.contact.email}</p>
              </div>
              {booking.contact.address && (
                <div>
                  <p className="text-muted-foreground text-xs">Địa chỉ</p>
                  <p className="font-semibold">{booking.contact.address}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Booking Details */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chi tiết đặt sân</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-3 font-semibold text-xs">Mô tả</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-2 px-3">Sân</td>
                    <td className="py-2 px-3 text-right font-semibold">{booking.courtName}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3">Loại sân</td>
                    <td className="py-2 px-3 text-right">{booking.courtType}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3">Cơ sở</td>
                    <td className="py-2 px-3 text-right">{booking.branch}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3">Ngày chơi</td>
                    <td className="py-2 px-3 text-right font-semibold">{booking.date}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3">Khung giờ</td>
                    <td className="py-2 px-3 text-right font-semibold">{booking.timeRange}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-3">Số người chơi</td>
                    <td className="py-2 px-3 text-right">{booking.people} người</td>
                  </tr>
                  {booking.racketRental && (
                    <tr className="border-t">
                      <td className="py-2 px-3">Thuê vợt cầu lông</td>
                      <td className="py-2 px-3 text-right">Có</td>
                    </tr>
                  )}
                  {booking.note && (
                    <tr className="border-t">
                      <td className="py-2 px-3">Ghi chú</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{booking.note}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thanh toán</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức</span>
                <span className="font-semibold">{paymentLabels[booking.paymentMethod] || booking.paymentMethod}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-base">Tổng thanh toán</span>
                <span className="font-bold text-lg text-primary">{formatVND(subtotal)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer note */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ BadmintonHub!</p>
            <p>Vui lòng xuất trình mã QR hoặc hóa đơn này khi đến sân.</p>
            <p className="font-mono text-[10px] mt-2">Mã giao dịch: TXN-{booking.id}-{Date.now().toString(36).toUpperCase()}</p>
          </div>

          {/* Print & Download buttons */}
          <div className="flex gap-2 pt-2 print:hidden">
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> In hóa đơn
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <FileText className="h-4 w-4" /> Tải PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Directions Section ─── */
function DirectionsSection({ booking, userAddress }: { booking: CompletedBooking; userAddress: string }) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; timeMin: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Auto-geocode user's address to get coordinates
  useEffect(() => {
    if (!userAddress || !booking.courtLat) return
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(userAddress)}.json?key=${TOMTOM_API_KEY}&countrySet=VN&limit=1&language=vi-VN`
        )
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          const pos = data.results[0].position
          setUserCoords({ lat: pos.lat, lng: pos.lon })
        }
      } catch {}
    }
    geocode()
  }, [userAddress, booking.courtLat])

  const calculateRoute = useCallback(async () => {
    if (!userCoords || !booking.courtLat || !booking.courtLng) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(
        `https://api.tomtom.com/routing/1/calculateRoute/${userCoords.lat},${userCoords.lng}:${booking.courtLat},${booking.courtLng}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=true&language=vi-VN`
      )
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const summary = route.summary
        const points: [number, number][] = route.legs[0].points.map((p: { latitude: number; longitude: number }) => [p.latitude, p.longitude] as [number, number])
        setRouteCoords(points)
        setRouteInfo({
          distanceKm: Math.round((summary.lengthInMeters / 1000) * 10) / 10,
          timeMin: Math.round(summary.travelTimeInSeconds / 60),
        })
      } else {
        setError("Không tìm được tuyến đường.")
      }
    } catch {
      setError("Lỗi khi tính tuyến đường.")
    } finally {
      setLoading(false)
    }
  }, [userCoords, booking.courtLat, booking.courtLng])

  if (!booking.courtLat || !booking.courtLng) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Chỉ đường đến sân
        </CardTitle>
        {booking.courtAddress && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" /> {booking.courtAddress}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {userAddress && (
          <div className="text-sm">
            <span className="text-muted-foreground">Từ:</span>{" "}
            <span className="font-medium">{userAddress}</span>
          </div>
        )}

        <Button
          onClick={calculateRoute}
          disabled={!userCoords || loading}
          className="w-full font-semibold"
          size="sm"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tính tuyến đường...</>
          ) : (
            <><Navigation2 className="h-4 w-4 mr-2" /> Xem chỉ đường</>
          )}
        </Button>

        {!userCoords && userAddress && (
          <p className="text-xs text-muted-foreground text-center">Đang xác định tọa độ địa chỉ của bạn...</p>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {routeInfo && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Khoảng cách</p>
                <p className="text-lg font-bold text-primary">{routeInfo.distanceKm} km</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Thời gian dự kiến</p>
                <p className="text-lg font-bold text-primary">
                  {routeInfo.timeMin >= 60
                    ? `${Math.floor(routeInfo.timeMin / 60)}h ${routeInfo.timeMin % 60}p`
                    : `${routeInfo.timeMin} phút`}
                </p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords?.lat},${userCoords?.lng}&destination=${booking.courtLat},${booking.courtLng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 transition-colors"
            >
              <Navigation2 className="h-4 w-4" />
              Bắt đầu dẫn đường
              <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
          </div>
        )}

        <div className="rounded-xl overflow-hidden border shadow-sm h-56">
          <TomTomMap
            lat={userCoords?.lat ?? booking.courtLat}
            lng={userCoords?.lng ?? booking.courtLng}
            courtLat={booking.courtLat}
            courtLng={booking.courtLng}
            courtName={booking.courtName}
            routeCoords={routeCoords.length > 0 ? routeCoords : undefined}
          />
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" /> Vị trí của bạn
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-green-500 inline-block" /> Sân cầu lông
          </span>
          {routeCoords.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-3 w-6 rounded bg-blue-500 inline-block" style={{ height: 3 }} /> Tuyến đường
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function BookingSuccessPage() {
  const [booking, setBooking] = useState<CompletedBooking | null>(null)
  const { user } = useAuth()
  const isGuest = user?.role === "guest"

  useEffect(() => {
    const stored = localStorage.getItem('completedBooking')
    if (stored) {
      try {
        setBooking(JSON.parse(stored))
      } catch {
        // fallback
      }
    }
  }, [])

  // Fallback data if no booking stored
  const data = booking || {
    id: "BH-270226-001",
    courtName: "Sân A1 - Premium",
    courtType: "Premium",
    branch: "Thủ Đức",
    date: "27/02/2026",
    timeRange: "07:00 - 09:00",
    people: 2,
    amount: 320000,
    paymentMethod: "momo",
    contact: { name: "Khách", phone: "0901234567", email: "khach@email.com" },
    racketRental: false,
    note: "",
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="mx-auto max-w-lg px-4 w-full">
          {/* Checkmark */}
          <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <AnimatedCheckmark />
          </div>

          {/* Confetti row */}
          <div className="flex justify-center gap-3 mt-4 animate-fade-in-up opacity-0 stagger-1" style={{ animationFillMode: 'forwards' }}>
            {["🏸", "✨", "🎉", "✨", "🏸"].map((c, i) => (
              <span key={i} className="text-2xl">{c}</span>
            ))}
          </div>

          {/* Title */}
          <div className="text-center mt-4 animate-fade-in-up opacity-0 stagger-2" style={{ animationFillMode: 'forwards' }}>
            <h1 className="font-serif text-2xl font-extrabold text-secondary lg:text-3xl">Đặt sân thành công!</h1>
            <p className="text-muted-foreground mt-2">
              Mã đặt sân của bạn là <span className="font-mono font-bold text-primary">{data.id}</span>
            </p>
          </div>

          {/* QR Code placeholder */}
          <div className="mt-6 flex justify-center animate-fade-in-up opacity-0 stagger-3" style={{ animationFillMode: 'forwards' }}>
            <div className="h-[160px] w-[160px] rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="grid grid-cols-4 gap-1 mx-auto w-20">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`h-4 w-4 rounded-sm ${[0,1,3,4,5,7,8,10,12,13,15].includes(i) ? 'bg-foreground' : 'bg-background'}`} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">QR Check-in</p>
              </div>
            </div>
          </div>

          {/* INVOICE / HÓA ĐƠN - shown for ALL users */}
          <div className="mt-6 animate-fade-in-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
            <InvoiceSection booking={data as CompletedBooking} />
          </div>

          {/* DIRECTIONS / CHỈ ĐƯỜNG - shown when court has coordinates and user has address */}
          {(data as CompletedBooking).courtLat && (
            <div className="mt-4 animate-fade-in-up opacity-0 stagger-4" style={{ animationFillMode: 'forwards' }}>
              <DirectionsSection
                booking={data as CompletedBooking}
                userAddress={user?.address || (data as CompletedBooking).contact?.address || ""}
              />
            </div>
          )}

          {/* Guest notice */}
          {isGuest && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Lưu ý cho khách vãng lai</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Bạn đang đặt sân với vai trò khách. Hóa đơn này là bằng chứng thanh toán của bạn. 
                    Vui lòng <strong>in hoặc tải về</strong> hóa đơn để mang theo khi đến sân. 
                    Bạn sẽ không thể xem lại lịch đặt trên hệ thống.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Link href="/register">
                      <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold gap-1">
                        Đăng ký tài khoản
                      </Button>
                    </Link>
                    <span className="text-xs text-amber-600 self-center">để xem lại lịch đặt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex gap-3 animate-fade-in-up opacity-0 stagger-5" style={{ animationFillMode: 'forwards' }}>
            <Button variant="outline" className="flex-1 gap-2">
              <Share2 className="h-4 w-4" /> Chia sẻ
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
              <CalendarPlus className="h-4 w-4" /> Thêm vào Calendar
            </Button>
          </div>

          {/* Navigation links */}
          <div className="mt-3 flex gap-3 animate-fade-in-up opacity-0 stagger-6" style={{ animationFillMode: 'forwards' }}>
            {!isGuest && (
              <Link href="/my-bookings" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  Xem lịch đặt của tôi
                </Button>
              </Link>
            )}
            <Link href="/" className={isGuest ? "w-full" : "flex-1"}>
              <Button variant="outline" className="w-full gap-2">
                <Home className="h-4 w-4" /> Trang chủ
              </Button>
            </Link>
          </div>

          {/* Upsell - only for non-guest */}
          {!isGuest && (
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up opacity-0 stagger-6" style={{ animationFillMode: 'forwards' }}>
              <p className="font-serif font-bold text-foreground">Trở thành thành viên VIP!</p>
              <p className="text-sm text-muted-foreground mt-1">Nhận ưu đãi giảm 20% cho mỗi lần đặt sân và nhiều quyền lợi hấp dẫn khác.</p>
              <Link href="/my-bookings">
                <Button variant="link" className="text-primary px-0 mt-2 font-semibold gap-1">
                  Tìm hiểu thêm <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
