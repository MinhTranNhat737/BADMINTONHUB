"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, MapPin, Clock, Search, ChevronRight, Users, Calendar, Award, Building } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { formatVND } from "@/lib/utils"
import { courtApi, productApi, type ApiCourt, type ApiProduct } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"

const heroImages = ["/ANH1.webp", "/ANH2.webp", "/ANH3.webp", "/ANH4.webp", "/ANH5.webp"]

function HeroSection() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent(i => (i + 1) % heroImages.length), [])
  const prev = useCallback(() => setCurrent(i => (i - 1 + heroImages.length) % heroImages.length), [])

  useEffect(() => {
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <section className="relative w-full h-[500px] lg:h-[600px] bg-[#0A2416] overflow-hidden">
      {/* Slideshow Background */}
      {heroImages.map((src, idx) => (
        <div
          key={src}
          className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
          style={{ opacity: idx === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt={`Sân cầu lông ${idx + 1}`}
            fill
            sizes="100vw"
            className="object-cover w-full h-full"
            priority={idx === 0}
          />
        </div>
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {heroImages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === current ? "w-8 bg-primary" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 transition-colors"
      >
        <ChevronRight className="h-6 w-6 rotate-180" />
      </button>
      <button
        onClick={next}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 transition-colors"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-4">
        <div className="max-w-2xl text-center">
        </div>
      </div>
    </section>
  )
}

function StatsRow() {
  const stats = [
    { icon: <Building className="h-5 w-5" />, value: "20+", label: "Sân" },
    { icon: <Users className="h-5 w-5" />, value: "500+", label: "Khách/ngày" },
    { icon: <Star className="h-5 w-5" />, value: "4.9", label: "Đánh giá" },
    { icon: <MapPin className="h-5 w-5" />, value: "3", label: "Cơ sở" },
  ]

  return (
    <section className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3 justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {s.icon}
              </div>
              <div>
                <p className="font-serif text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedCourts() {
  const [courts, setCourts] = useState<ApiCourt[]>([])
  useEffect(() => { courtApi.getAll().then(data => setCourts(data.slice(0, 3))) }, [])

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/ANHBIA1.webp"
          alt="Sân nổi bật background"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl text-balance">Sân nổi bật</h2>
            <p className="mt-1 text-muted-foreground">Những sân được yêu thích nhất</p>
          </div>
          <Link href="/courts">
            <Button variant="ghost" className="text-primary font-semibold gap-1">
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courts.slice(0, 3).map(court => (
            <Link key={court.id} href={`/courts/${court.id}`}>
              <Card className="group overflow-hidden border hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg cursor-pointer">
                <div className="relative aspect-video bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                  <div className="text-center text-secondary/40 font-serif font-bold text-2xl">{court.name.split(' - ')[0]}</div>
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                    <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Xem lịch
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center rounded-md bg-card/90 px-2 py-1 text-xs font-medium capitalize">
                      {court.type}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-foreground">{court.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {court.branch}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{court.rating}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-serif font-bold text-primary">{formatVND(court.price)}<span className="text-xs text-muted-foreground font-normal">/h</span></span>
                    {court.available && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-green" />
                        Còn trống
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { num: "1", title: "Chọn sân & giờ", desc: "Tìm sân phù hợp theo cơ sở, loại sân và thời gian." },
    { num: "2", title: "Đặt & thanh toán", desc: "Xác nhận booking và thanh toán nhanh chóng qua nhiều phương thức." },
    { num: "3", title: "Đến chơi & tận hưởng", desc: "Check-in bằng QR code và tận hưởng trận đấu tuyệt vời." },
  ]

  return (
    <section className="py-16 bg-card">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Cách thức hoạt động</h2>
        <p className="mt-2 text-muted-foreground">Chỉ 3 bước đơn giản</p>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-xl font-extrabold mb-4">
                {s.num}
              </div>
              <h3 className="font-serif font-bold text-foreground text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ShopPreview() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  useEffect(() => { productApi.getAll({ limit: 4 }).then(res => setProducts(res.products)) }, [])

  return (
    <section className="relative py-16 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/ANHBIA2.jpg"
          alt="Phụ kiện thể thao background"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl text-balance">Phụ kiện thể thao</h2>
            <p className="mt-1 text-muted-foreground">Sản phẩm chất lượng từ các thương hiệu uy tín</p>
          </div>
          <Link href="/shop">
            <Button variant="ghost" className="text-primary font-semibold gap-1">
              Xem cửa hàng <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
          {products.slice(0, 4).map(p => (
            <Link key={p.id} href="/shop" className="snap-start">
              <Card className="group w-56 shrink-0 overflow-hidden hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-muted to-background flex items-center justify-center relative">
                  <span className="text-4xl text-muted-foreground/20 font-serif font-bold">{p.brand[0]}</span>
                  {p.badges[0] && (
                    <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded ${
                      p.badges[0] === 'Bán chạy' ? 'bg-primary text-primary-foreground' :
                      p.badges[0] === 'Mới' ? 'bg-secondary text-secondary-foreground' :
                      'bg-red-500 text-white'
                    }`}>{p.badges[0]}</span>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{p.brand}</p>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5">{p.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-muted-foreground">{p.rating}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-serif font-bold text-primary text-sm">{formatVND(p.price)}</span>
                    {p.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">{formatVND(p.originalPrice)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsRow />
        <FeaturedCourts />
        <HowItWorks />
        <ShopPreview />
      </main>
      <Footer />
    </div>
  )
}
