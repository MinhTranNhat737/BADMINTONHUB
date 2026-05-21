-- ═══════════════════════════════════════════════════════════════════════════════
-- BADMINTONHUB - MIGRATION 07
-- Bổ sung cột còn thiếu cho bảng bookings (tương thích backend hiện tại)
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS booking_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code
  ON bookings(booking_code)
  WHERE booking_code IS NOT NULL;

COMMIT;
