"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, MapPin, Grid3X3, List, Filter, X, Sun, Home } from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { formatVND, getWeekDays } from "@/lib/utils"
import { courtApi, branchApi, type ApiCourt, type ApiBranch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface FilterState {
  selectedBranches: number[]
  courtType: string
  indoorFilter: string
  priceRange: [number, number]
  amenities: string[]
  minRating: number
}

function FilterSidebar({
  open,
  onClose,
  filters,
  onFiltersChange,
  branches,
  courts,
}: {
  open: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  branches: ApiBranch[]
  courts: ApiCourt[]
}) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)

  const toggleBranch = (id: number) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(id)
        ? prev.selectedBranches.filter(b => b !== id)
        : [...prev.selectedBranches, id],
    }))
  }

  const toggleAmenity = (a: string) => {
    setLocalFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleReset = () => {
    const reset: FilterState = {
      selectedBranches: [],
      courtType: "all",
      indoorFilter: "all",
      priceRange: [50000, 500000],
      amenities: [],
      minRating: 0,
    }
    setLocalFilters(reset)
    onFiltersChange(reset)
  }

  return (
    <aside className={cn(
      "w-72 shrink-0 space-y-6",
      "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:bg-card max-lg:p-6 max-lg:shadow-xl max-lg:overflow-y-auto max-lg:transition-transform max-lg:duration-300",
      open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
    )}>
      <div className="flex items-center justify-between lg:hidden">
        <h3 className="font-serif font-bold text-lg">Bộ lọc</h3>
        <button onClick={onClose}><X className="h-5 w-5" /></button>
      </div>

      {/* Branch */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Cơ sở</h4>
        <div className="flex flex-col gap-2">
          {branches.map(b => {
            const courtCount = courts.filter(c => c.branchId === b.id).length
            return (
              <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={localFilters.selectedBranches.includes(b.id)}
                  onCheckedChange={() => toggleBranch(b.id)}
                />
                {b.name.replace("BadmintonHub ", "")}
                <span className="text-xs text-muted-foreground">({courtCount} sân)</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Court Type */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Loại sân</h4>
        <RadioGroup
          value={localFilters.courtType}
          onValueChange={(v) => setLocalFilters(prev => ({ ...prev, courtType: v }))}
          className="flex flex-col gap-2"
        >
          {[
            { value: "all", label: "Tất cả" },
            { value: "standard", label: "Standard" },
            { value: "premium", label: "Premium" },
            { value: "vip", label: "VIP" },
          ].map(t => (
            <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value={t.value} /> {t.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Indoor / Outdoor */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Trong nhà / Ngoài trời</h4>
        <RadioGroup
          value={localFilters.indoorFilter}
          onValueChange={(v) => setLocalFilters(prev => ({ ...prev, indoorFilter: v }))}
          className="flex flex-col gap-2"
        >
          {[
            { value: "all", label: "Tất cả" },
            { value: "indoor", label: "Trong nhà" },
            { value: "outdoor", label: "Ngoài trời" },
          ].map(t => (
            <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value={t.value} /> {t.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Giá (VND/h)</h4>
        <Slider
          value={localFilters.priceRange}
          onValueChange={(v) => setLocalFilters(prev => ({ ...prev, priceRange: v as [number, number] }))}
          min={50000}
          max={500000}
          step={10000}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatVND(localFilters.priceRange[0])}</span>
          <span>{formatVND(localFilters.priceRange[1])}</span>
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Tiện ích</h4>
        <div className="flex flex-col gap-2">
          {["Điều hòa", "Sàn gỗ", "Wi-Fi", "Phòng thay đồ", "Camera"].map(a => (
            <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={localFilters.amenities.includes(a)}
                onCheckedChange={() => toggleAmenity(a)}
              />
              {a}
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Đánh giá</h4>
        <RadioGroup
          value={localFilters.minRating.toString()}
          onValueChange={(v) => setLocalFilters(prev => ({ ...prev, minRating: parseInt(v) }))}
          className="flex flex-col gap-2"
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <RadioGroupItem value="0" /> Tất cả
          </label>
          {[4, 3, 2].map(r => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value={r.toString()} />
              <span className="flex items-center gap-0.5">
                {Array.from({ length: r }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1">trở lên</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={handleApply} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          Áp dụng
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full">
          Xóa bộ lọc
        </Button>
      </div>
    </aside>
  )
}

function CourtCard({ court }: { court: ApiCourt }) {
  const slotStatuses = ['available', 'available', 'booked', 'available', 'hold', 'booked'] as const
  const slotTimes = ['06:00', '07:00', '08:00', '14:00', '17:00', '19:00']

  return (
    <Link href={`/courts/${court.id}`}>
      <Card className="group overflow-hidden hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg cursor-pointer">
        <div className="relative aspect-video bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
          <div className="text-center text-secondary/30 font-serif font-bold text-2xl">{court.name.split(' - ')[0]}</div>
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
            <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Xem lịch</span>
          </div>
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="inline-flex items-center rounded-md bg-card/90 px-2 py-1 text-xs font-medium capitalize">
              {court.type}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
              court.indoor
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300"
            )}>
              {court.indoor ? <Home className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              {court.indoor ? "Trong nhà" : "Ngoài trời"}
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-serif font-bold text-foreground">{court.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {court.address || court.branch}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{court.rating}</span>
            </div>
          </div>

          {/* Slot pills */}
          <div className="mt-3 flex flex-wrap gap-1">
            {slotTimes.map((t, i) => (
              <span key={t} className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                slotStatuses[i] === 'available' ? "bg-court-available text-green-700" :
                slotStatuses[i] === 'booked' ? "bg-court-booked text-red-700" :
                "bg-court-hold text-amber-700"
              )}>
                {t}
              </span>
            ))}
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
  )
}

export default function CourtsPage() {
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeDay, setActiveDay] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('rating')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const weekDays = getWeekDays()

  // Load courts and branches from API
  const [courts, setCourts] = useState<ApiCourt[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  useEffect(() => {
    courtApi.getAll().then(setCourts)
    branchApi.getAll().then(setBranches)
  }, [])

  // Only show available (open) courts to customers
  const openCourts = useMemo(() => courts.filter(c => c.available !== false), [courts])

  // Court count per branch (only open courts)
  const branchCourtCount = useMemo(() => {
    const counts: Record<number, number> = {}
    openCourts.forEach(c => {
      counts[c.branchId] = (counts[c.branchId] || 0) + 1
    })
    return counts
  }, [openCourts])

  const [filters, setFilters] = useState<FilterState>({
    selectedBranches: [],
    courtType: "all",
    indoorFilter: "all",
    priceRange: [50000, 500000],
    amenities: [],
    minRating: 0,
  })

  const filteredCourts = useMemo(() => {
    let result = [...openCourts]

    // Filter by branch combobox
    if (selectedBranch !== 'all') {
      result = result.filter(c => c.branchId === parseInt(selectedBranch))
    }

    // Filter by branch sidebar checkboxes
    if (filters.selectedBranches.length > 0) {
      result = result.filter(c => filters.selectedBranches.includes(c.branchId))
    }

    // Filter by court type
    if (filters.courtType !== "all") {
      result = result.filter(c => c.type === filters.courtType)
    }

    // Filter by indoor/outdoor
    if (filters.indoorFilter === "indoor") {
      result = result.filter(c => c.indoor === true)
    } else if (filters.indoorFilter === "outdoor") {
      result = result.filter(c => c.indoor === false)
    }

    // Filter by price range
    result = result.filter(c => c.price >= filters.priceRange[0] && c.price <= filters.priceRange[1])

    // Filter by amenities
    if (filters.amenities.length > 0) {
      result = result.filter(c => filters.amenities.every(a => c.amenities.includes(a)))
    }

    // Filter by rating
    if (filters.minRating > 0) {
      result = result.filter(c => c.rating >= filters.minRating)
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
    }

    return result
  }, [filters, sortBy, selectedBranch, openCourts])

  // Group filtered courts by branch for display
  const groupedCourts = useMemo(() => {
    const groups: { branch: ApiBranch; courts: ApiCourt[] }[] = []
    const branchMap = new Map<number, ApiCourt[]>()
    filteredCourts.forEach(c => {
      if (!branchMap.has(c.branchId)) branchMap.set(c.branchId, [])
      branchMap.get(c.branchId)!.push(c)
    })
    branches.forEach(b => {
      const bCourts = branchMap.get(b.id)
      if (bCourts && bCourts.length > 0) {
        groups.push({ branch: b, courts: bCourts })
      }
    })
    return groups
  }, [filteredCourts])

  const activeFilterCount = [
    filters.selectedBranches.length > 0,
    filters.courtType !== "all",
    filters.indoorFilter !== "all",
    filters.priceRange[0] > 50000 || filters.priceRange[1] < 500000,
    filters.amenities.length > 0,
    filters.minRating > 0,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="font-serif text-2xl font-extrabold text-foreground lg:text-3xl">Tìm sân cầu lông</h1>
          <p className="text-muted-foreground mt-1">Chọn sân phù hợp với bạn</p>

          {/* Branch combobox selector */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Cơ sở:</span>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-64 h-9">
                <SelectValue placeholder="Chọn cơ sở" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    Tất cả cơ sở
                    <Badge variant="secondary" className="text-xs ml-1">{openCourts.length} sân</Badge>
                  </span>
                </SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    <span className="flex items-center gap-2">
                      {b.name.replace("BadmintonHub ", "")}
                      <Badge variant="secondary" className="text-xs ml-1">{branchCourtCount[b.id] || 0} sân</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 7-day tab bar */}
          <div className="mt-6 flex gap-1 overflow-x-auto pb-2">
            {weekDays.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={cn(
                  "flex flex-col items-center px-4 py-2 rounded-lg text-sm transition-colors shrink-0",
                  activeDay === i
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span className="text-xs">{d.dayName}</span>
                <span className="font-semibold">{d.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-6">
            {/* Filter Sidebar */}
            <FilterSidebar
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              filters={filters}
              onFiltersChange={setFilters}
              branches={branches}
              courts={courts}
            />

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="lg:hidden" onClick={() => setFilterOpen(true)}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-4 w-4" /> Bộ lọc
                      {activeFilterCount > 0 && (
                        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {filteredCourts.length} sân
                    {activeFilterCount > 0 && ` (đã lọc từ ${openCourts.length})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Đánh giá cao</SelectItem>
                      <SelectItem value="price-asc">Giá tăng</SelectItem>
                      <SelectItem value="price-desc">Giá giảm</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-md">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn("p-1.5 rounded-l-md", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn("p-1.5 rounded-r-md", viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active filters chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.selectedBranches.length > 0 && filters.selectedBranches.map(bid => {
                    const branch = branches.find(b => b.id === bid)
                    return branch ? (
                      <span key={bid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                        {branch.name.replace("BadmintonHub ", "")}
                        <button onClick={() => setFilters(prev => ({ ...prev, selectedBranches: prev.selectedBranches.filter(b => b !== bid) }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null
                  })}
                  {filters.courtType !== "all" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium capitalize">
                      {filters.courtType}
                      <button onClick={() => setFilters(prev => ({ ...prev, courtType: "all" }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.indoorFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                      {filters.indoorFilter === "indoor" ? "Trong nhà" : "Ngoài trời"}
                      <button onClick={() => setFilters(prev => ({ ...prev, indoorFilter: "all" }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filters.amenities.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                      {a}
                      <button onClick={() => setFilters(prev => ({ ...prev, amenities: prev.amenities.filter(x => x !== a) }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {filters.minRating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                      {filters.minRating}★ trở lên
                      <button onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => setFilters({ selectedBranches: [], courtType: "all", indoorFilter: "all", priceRange: [50000, 500000], amenities: [], minRating: 0 })}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}

              {/* Court Grid — grouped by branch */}
              {filteredCourts.length > 0 ? (
                <div className="space-y-8">
                  {groupedCourts.map(({ branch, courts: branchCourts }) => (
                    <div key={branch.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h2 className="font-serif font-bold text-lg">{branch.name}</h2>
                        <Badge variant="outline" className="text-xs">{branchCourts.length} sân</Badge>
                      </div>
                      <div className={cn(
                        viewMode === 'grid'
                          ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
                          : "flex flex-col gap-4"
                      )}>
                        {branchCourts.map(court => (
                          <CourtCard key={court.id} court={court} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif font-bold text-lg">Không tìm thấy sân phù hợp</h3>
                  <p className="text-muted-foreground mt-1 text-sm">Thử thay đổi bộ lọc để xem thêm kết quả</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setFilters({ selectedBranches: [], courtType: "all", indoorFilter: "all", priceRange: [50000, 500000], amenities: [], minRating: 0 })}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {filteredCourts.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {[1, 2, 3].map(p => (
                    <button
                      key={p}
                      className={cn(
                        "h-9 w-9 rounded-md text-sm font-medium transition-colors",
                        p === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
