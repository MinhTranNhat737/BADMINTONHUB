"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, EyeOff, UserPlus, CalendarDays } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { AddressInput } from "@/components/address-input"

export default function RegisterPage() {
  const router = useRouter()
  const { register, user } = useAuth()
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    gender: "" as "nam" | "nu" | "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  if (user) {
    return null
  }

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim() || !form.password) {
      setError("Vui lòng nhập đầy đủ thông tin")
      setLoading(false)
      return
    }

    if (form.phone.trim().length < 10) {
      setError("Số điện thoại không hợp lệ")
      setLoading(false)
      return
    }

    if (form.username.trim().length < 3) {
      setError("Tên tài khoản phải có ít nhất 3 ký tự")
      setLoading(false)
      return
    }

    if (form.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      setLoading(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError("Email không hợp lệ")
      setLoading(false)
      return
    }

    const result = await register({
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
    })

    if (!result.success) {
      setError(result.error || "Đăng ký thất bại")
      setLoading(false)
      return
    }

    router.push("/")
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
              <h2 className="font-serif text-xl font-bold text-foreground">Đăng ký tài khoản</h2>
              <p className="text-sm text-muted-foreground mt-1">Tạo tài khoản mới để sử dụng dịch vụ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={e => update("fullName", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Tên tài khoản</Label>
                <Input
                  id="username"
                  placeholder="nguyenvana"
                  value={form.username}
                  onChange={e => update("username", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@gmail.com"
                    value={form.email}
                    onChange={e => update("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    placeholder="0901234567"
                    value={form.phone}
                    onChange={e => update("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ <span className="text-red-500">*</span></Label>
                <AddressInput
                  value={form.address}
                  onChange={(val) => update("address", val)}
                  placeholder="Tìm kiếm địa chỉ..."
                  compact
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Giới tính</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update("gender", "nam")}
                      className={cn(
                        "flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-all",
                        form.gender === "nam"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      ♂ Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => update("gender", "nu")}
                      className={cn(
                        "flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-all",
                        form.gender === "nu"
                          ? "border-pink-500 bg-pink-50 text-pink-600"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      ♀ Nữ
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Ngày sinh</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => update("dateOfBirth", e.target.value)}
                      className="pl-10"
                      max="2015-01-01"
                      min="1940-01-01"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ít nhất 6 ký tự"
                    value={form.password}
                    onChange={e => update("password", e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={e => update("confirmPassword", e.target.value)}
                />
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
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
