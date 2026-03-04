"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft, Phone, Mail, KeyRound, ShieldCheck, CheckCircle2,
  Eye, EyeOff, Loader2, AlertCircle, SendHorizonal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const STEPS = [
  { label: "Số điện thoại", icon: Phone },
  { label: "Xác minh OTP", icon: ShieldCheck },
  { label: "Xác nhận Email", icon: Mail },
  { label: "Mật khẩu mới", icon: KeyRound },
]

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { findUserByPhone, resetPassword } = useAuth()

  const [step, setStep] = useState(0) // 0-3
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [generatedOtp, setGeneratedOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [success, setSuccess] = useState(false)

  // Found user info
  const [foundUsername, setFoundUsername] = useState("")
  const [maskedEmail, setMaskedEmail] = useState("")
  const [realEmail, setRealEmail] = useState("")
  const [maskedPhone, setMaskedPhone] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Mask phone: 0901***567
  const maskPhone = (p: string) => {
    if (p.length < 7) return p
    return p.slice(0, 4) + "***" + p.slice(-3)
  }

  // ─── Step 0: Enter phone ───
  const handlePhoneSubmit = () => {
    setError("")
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại")
      return
    }
    if (!/^0\d{9}$/.test(phone.trim())) {
      setError("Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)")
      return
    }

    setLoading(true)
    const result = findUserByPhone(phone.trim())
    if (!result.success) {
      setError(result.error || "Không tìm thấy tài khoản")
      setLoading(false)
      return
    }

    setFoundUsername(result.username!)
    setMaskedEmail(result.maskedEmail!)
    setRealEmail(result.email!)
    setMaskedPhone(maskPhone(phone.trim()))

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(code)
    setCountdown(60)

    // Simulate sending SMS
    setTimeout(() => {
      setLoading(false)
      setStep(1)
      // Show OTP in console for demo purposes
      console.log(`[BadmintonHub] Mã OTP gửi đến ${phone}: ${code}`)
      // Also show in alert for demo
      alert(`[Demo] Mã OTP đã gửi đến ${maskPhone(phone.trim())}:\n\n${code}\n\n(Trong thực tế mã sẽ gửi qua SMS)`)
    }, 1500)
  }

  // ─── Step 1: Verify OTP ───
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || ""
    }
    setOtp(newOtp)
    if (pasted.length === 6) {
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyOtp = () => {
    const entered = otp.join("")
    if (entered.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số")
      return
    }
    if (entered !== generatedOtp) {
      setError("Mã OTP không chính xác")
      return
    }
    setError("")
    setStep(2)
  }

  const handleResendOtp = () => {
    if (countdown > 0) return
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(code)
    setOtp(["", "", "", "", "", ""])
    setCountdown(60)
    console.log(`[BadmintonHub] Mã OTP mới gửi đến ${phone}: ${code}`)
    alert(`[Demo] Mã OTP mới đã gửi đến ${maskedPhone}:\n\n${code}`)
  }

  // ─── Step 2: Confirm email – send reset link ───
  const handleSendEmailLink = () => {
    setLoading(true)
    setError("")
    // Simulate sending email with reset link
    setTimeout(() => {
      setLoading(false)
      setEmailSent(true)
      console.log(`[BadmintonHub] Link đặt lại mật khẩu đã gửi đến ${realEmail}`)
      alert(`[Demo] Link đặt lại mật khẩu đã gửi đến:\n${realEmail}\n\n(Trong thực tế sẽ gửi email thật).\n\nBấm OK để tiến hành đặt mật khẩu mới.`)
      setStep(3)
    }, 1500)
  }

  // ─── Step 3: New password ───
  const handleResetPassword = () => {
    setError("")
    if (!newPassword.trim()) {
      setError("Vui lòng nhập mật khẩu mới")
      return
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    setLoading(true)
    const result = resetPassword(foundUsername, newPassword)
    setTimeout(() => {
      setLoading(false)
      if (!result.success) {
        setError(result.error || "Có lỗi xảy ra")
        return
      }
      setSuccess(true)
    }, 1000)
  }

  // ─── Success screen ───
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2416] via-[#0F3D2A] to-[#1F6B3A] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground">Đổi mật khẩu thành công!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Mật khẩu tài khoản <strong className="text-foreground">{foundUsername}</strong> đã được cập nhật.
                  Bạn có thể đăng nhập bằng mật khẩu mới.
                </p>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
              >
                Đăng nhập ngay
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2416] via-[#0F3D2A] to-[#1F6B3A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.jpg"
            alt="BadmintonHub"
            width={64}
            height={64}
            className="rounded-2xl shadow-lg mb-3"
          />
          <h1 className="font-serif text-2xl font-extrabold text-white">
            Badminton<span className="text-primary">Hub</span>
          </h1>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-8">
            {/* Back + Title */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 shrink-0"
                onClick={() => {
                  if (step === 0) router.push("/login")
                  else setStep(s => s - 1)
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="font-serif text-lg font-bold text-foreground">Quên mật khẩu</h2>
                <p className="text-xs text-muted-foreground">Bước {step + 1}/4 — {STEPS[step].label}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mb-6">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i <= step ? "bg-[#1F6B3A]" : "bg-gray-200"
                  )}
                />
              ))}
            </div>

            {/* ─── Step 0: Phone ─── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <Phone className="h-7 w-7 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nhập số điện thoại đã đăng ký để nhận mã xác minh
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0901234567"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError("") }}
                    autoFocus
                    maxLength={10}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <Button
                  onClick={handlePhoneSubmit}
                  disabled={loading}
                  className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi mã...</>
                  ) : (
                    <><SendHorizonal className="h-4 w-4 mr-2" /> Gửi mã xác minh</>
                  )}
                </Button>
              </div>
            )}

            {/* ─── Step 1: OTP ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
                    <ShieldCheck className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mã xác minh 6 chữ số đã gửi đến số <strong className="text-foreground">{maskedPhone}</strong>
                  </p>
                </div>

                {/* OTP inputs */}
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={cn(
                        "w-12 h-14 text-center text-xl font-bold rounded-lg border-2 outline-none transition-colors",
                        "focus:border-[#1F6B3A] focus:ring-2 focus:ring-[#1F6B3A]/20",
                        error ? "border-red-400" : "border-gray-200"
                      )}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
                >
                  Xác minh
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Gửi lại mã sau <strong className="text-foreground">{countdown}s</strong>
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      className="text-sm text-[#1F6B3A] font-semibold hover:underline"
                    >
                      Gửi lại mã xác minh
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── Step 2: Email confirmation ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                    <Mail className="h-7 w-7 text-purple-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Xác minh thành công! Link đặt lại mật khẩu sẽ được gửi đến email:
                  </p>
                  <p className="font-semibold text-foreground mt-2 text-lg">{maskedEmail}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground space-y-1">
                  <p>• Link sẽ được gửi đến hòm thư Gmail của bạn</p>
                  <p>• Vui lòng kiểm tra cả mục <strong>Spam / Thư rác</strong></p>
                  <p>• Link có hiệu lực trong 15 phút</p>
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <Button
                  onClick={handleSendEmailLink}
                  disabled={loading}
                  className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi email...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" /> Gửi link đặt lại mật khẩu</>
                  )}
                </Button>
              </div>
            )}

            {/* ─── Step 3: New password ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                    <KeyRound className="h-7 w-7 text-amber-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nhập mật khẩu mới cho tài khoản <strong className="text-foreground">{foundUsername}</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError("") }}
                      className="pr-10"
                      autoFocus
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
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError("") }}
                  />
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(level => (
                        <div
                          key={level}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            newPassword.length >= level * 3
                              ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-amber-400" : level <= 3 ? "bg-blue-400" : "bg-green-500"
                              : "bg-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {newPassword.length < 6 ? "Quá ngắn" : newPassword.length < 8 ? "Trung bình" : newPassword.length < 12 ? "Khá mạnh" : "Rất mạnh"}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="w-full bg-[#1F6B3A] text-white hover:bg-[#185a30] font-semibold h-11 text-base"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang cập nhật...</>
                  ) : (
                    <><KeyRound className="h-4 w-4 mr-2" /> Đặt mật khẩu mới</>
                  )}
                </Button>
              </div>
            )}

            {/* Back to login */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-[#1F6B3A] font-semibold hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
