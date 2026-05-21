"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, LogIn, UserX } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0A2416] via-[#0F3D2A] to-[#1F6B3A] flex items-center justify-center">
        <div className="text-white text-lg">Đang tải...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect")
  const { login, loginAsGuest, user } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") router.push("/admin")
      else if (user.role === "employee" && user.warehouse === "Kho Hub") router.push("/hub")
      else if (user.role === "employee") router.push("/employee")
      else router.push("/")
    }
  }, [user, router])

  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin")
      setLoading(false)
      return
    }

    const result = await login(username.trim(), password)
    if (!result.success) {
      setError(result.error || "Đăng nhập thất bại")
      setLoading(false)
      return
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2416] via-[#0F3D2A] to-[#1F6B3A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.jpg"
            alt="BadmintonHub"
            width={80}
            height={80}
            className="rounded-2xl shadow-lg mb-4"
          />
          <h1 className="font-serif text-3xl font-extrabold text-white">
            Badminton<span className="text-primary">Hub</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Hệ thống sân cầu lông</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="font-serif text-xl font-bold text-foreground">Đăng nhập</h2>
              <p className="text-sm text-muted-foreground mt-1">Nhập tài khoản để tiếp tục</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên tài khoản</Label>
                <Input
                  id="username"
                  placeholder="Nhập tên tài khoản"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link href="/forgot-password" className="text-xs text-[#1F6B3A] font-medium hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-muted-foreground">Hoặc</span>
              </div>
            </div>

            {/* Guest Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-base font-semibold border-dashed border-2 gap-2"
              onClick={() => {
                loginAsGuest()
                router.push(redirectUrl || "/")
              }}
            >
              <UserX className="h-4 w-4" />
              Tiếp tục với vai trò khách
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Bạn có thể xem sân và sản phẩm, nhưng cần đăng ký để đặt sân và thanh toán
            </p>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Đăng ký ngay
              </Link>
            </div>

            {/* Demo accounts hint */}
            <div className="mt-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Tài khoản demo:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Admin</p>
                  <p>admin / admin123</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Khách</p>
                  <p>Nhấn &quot;Tiếp tục với vai trò khách&quot;</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-medium text-foreground mb-1">Nhân viên (mật khẩu chung: nhanvien123)</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <p>nhanvien1 — Kho Cầu Giấy</p>
                  <p>nhanvien2 — Kho Thanh Xuân</p>
                  <p>nhanvien3 — Kho Long Biên</p>
                  <p className="font-medium text-primary">nvhub — Kho Hub (trung tâm)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
