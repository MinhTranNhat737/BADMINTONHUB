import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING & HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const WEATHER_API_KEY = "8a4755cdd81b4bdcb9973512251210"

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

export function formatPOReference(value?: string | null): string {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  if (/^PO[-A-Z0-9]+$/i.test(raw)) return raw.toUpperCase()
  const normalized = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (!normalized) return raw
  return `PO${normalized.slice(0, 8)}`
}

export function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 6; h < 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
  }
  return slots
}

export function getWeekDays(startDate: Date = new Date()): { date: Date; label: string; dayName: string }[] {
  const days = []
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    days.push({
      date: d,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      dayName: dayNames[d.getDay()],
    })
  }
  return days
}

/**
 * Check if a time slot is in the past (already passed).
 * @param slotDate - The Date object for the day of the slot
 * @param slotTime - The time string e.g. "06:00", "14:00"
 * @returns true if the slot's start hour has already passed
 */
export function isSlotPast(slotDate: Date, slotTime: string): boolean {
  const now = new Date()
  const slotHour = parseInt(slotTime.split(":")[0])
  const slotStart = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate(), slotHour, 0, 0)
  return slotStart <= now
}
