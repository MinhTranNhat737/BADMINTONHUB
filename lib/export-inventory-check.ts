/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORT INVENTORY CHECK — Xuất form Excel kiểm tra tồn kho
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tạo file Excel (.xlsx) chứa bảng kiểm kê tồn kho với:
 *  - Thông tin sản phẩm (SKU, tên, danh mục, kho, tồn kho hệ thống)
 *  - Cột trống "Số lượng thực tế" để nhân viên ghi khi kiểm đếm
 *  - Cột "Chênh lệch" tự tính = Thực tế − Hệ thống (công thức Excel)
 *  - Cột "Ghi chú" để ghi lý do chênh lệch
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as XLSX from "xlsx"
import type { InventoryItem } from "@/lib/inventory-context"

interface ExportOptions {
  items: InventoryItem[]
  warehouseFilter?: string
  categoryFilter?: string
  exportedBy?: string
}

export function exportInventoryCheckSheet(options: ExportOptions) {
  const { items, warehouseFilter, categoryFilter, exportedBy } = options
  const now = new Date()
  const dateStr = now.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })

  // ─── Sort items: by warehouse, then category, then SKU ───
  const sorted = [...items].sort((a, b) => {
    if (a.warehouse !== b.warehouse) return a.warehouse.localeCompare(b.warehouse)
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.sku.localeCompare(b.sku)
  })

  // ─── Build header rows ───
  const headerRows: (string | number | null)[][] = [
    ["BADMINTONHUB — PHIẾU KIỂM TRA TỒN KHO"],
    [],
    [
      "Ngày kiểm kê:",
      `${dateStr} ${timeStr}`,
      null,
      "Kho:",
      warehouseFilter && warehouseFilter !== "all" ? warehouseFilter : "Tất cả kho",
    ],
    [
      "Người xuất phiếu:",
      exportedBy || "Admin",
      null,
      "Danh mục:",
      categoryFilter && categoryFilter !== "all" ? categoryFilter : "Tất cả danh mục",
    ],
    [
      "Tổng số dòng:",
      sorted.length,
    ],
    [],
  ]

  // ─── Column headers ───
  const columnHeaders = [
    "STT",
    "Mã SKU",
    "Tên sản phẩm",
    "Danh mục",
    "Kho",
    "Tồn kho\n(Hệ thống)",
    "Đã đặt\ntrước",
    "Khả dụng\n(Hệ thống)",
    "Đơn giá\n(VND)",
    "SỐ LƯỢNG\nTHỰC TẾ\n(Ghi tay)",
    "CHÊNH\nLỆCH",
    "GHI CHÚ",
  ]

  // ─── Data rows ───
  const startDataRow = headerRows.length + 2 // 1-based Excel row (header rows + column header row + 1)

  const dataRows = sorted.map((item, idx) => {
    const excelRow = startDataRow + idx
    return [
      idx + 1,
      item.sku,
      item.name,
      item.category,
      item.warehouse,
      item.onHand,
      item.reserved,
      item.available,
      item.unitCost,
      null, // Số lượng thực tế — để trống
      { f: `IF(J${excelRow}="","",J${excelRow}-F${excelRow})` }, // Chênh lệch = Thực tế - Tồn kho hệ thống
      null, // Ghi chú — để trống
    ]
  })

  // ─── Summary rows at bottom ───
  const lastDataRow = startDataRow + sorted.length - 1
  const summaryRows: (string | number | null | { f: string })[][] = [
    [],
    [
      null,
      null,
      null,
      null,
      "TỔNG CỘNG:",
      { f: `SUM(F${startDataRow}:F${lastDataRow})` },
      { f: `SUM(G${startDataRow}:G${lastDataRow})` },
      { f: `SUM(H${startDataRow}:H${lastDataRow})` },
      null,
      { f: `IF(COUNTA(J${startDataRow}:J${lastDataRow})=0,"",SUM(J${startDataRow}:J${lastDataRow}))` },
      { f: `IF(COUNTA(J${startDataRow}:J${lastDataRow})=0,"",SUM(K${startDataRow}:K${lastDataRow}))` },
    ],
    [],
    ["Người kiểm kê:", null, null, null, null, null, null, "Quản lý xác nhận:"],
    ["(Ký, ghi rõ họ tên)", null, null, null, null, null, null, "(Ký, ghi rõ họ tên)"],
    [],
    [],
    [],
    ["__________________________", null, null, null, null, null, null, "__________________________"],
  ]

  // ─── Combine all rows (as array of arrays) ───
  const allRows = [...headerRows, columnHeaders, ...dataRows, ...summaryRows]

  // ─── Create worksheet ───
  const ws = XLSX.utils.aoa_to_sheet(allRows)

  // ─── Column widths ───
  ws["!cols"] = [
    { wch: 5 },   // STT
    { wch: 14 },  // SKU
    { wch: 35 },  // Tên sản phẩm
    { wch: 16 },  // Danh mục
    { wch: 18 },  // Kho
    { wch: 12 },  // Tồn kho HT
    { wch: 10 },  // Đã đặt trước
    { wch: 12 },  // Khả dụng
    { wch: 14 },  // Đơn giá
    { wch: 14 },  // Số lượng thực tế
    { wch: 12 },  // Chênh lệch
    { wch: 25 },  // Ghi chú
  ]

  // ─── Merge title cell ───
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // Title row merge
  ]

  // ─── Row heights ───
  ws["!rows"] = []
  ws["!rows"][0] = { hpt: 30 } // Title row
  const colHeaderRowIndex = headerRows.length
  ws["!rows"][colHeaderRowIndex] = { hpt: 45 } // Column header row

  // ─── Format currency cells ───
  for (let i = 0; i < sorted.length; i++) {
    const row = startDataRow - 1 + i // 0-based for xlsx
    const cellRef = XLSX.utils.encode_cell({ r: row, c: 8 }) // Column I (Đơn giá)
    if (ws[cellRef]) {
      ws[cellRef].z = '#,##0'
    }
  }

  // ─── Create workbook & export ───
  const wb = XLSX.utils.book_new()

  const sheetName = warehouseFilter && warehouseFilter !== "all"
    ? `Kiểm kê ${warehouseFilter.replace("Kho ", "")}`
    : "Kiểm kê tồn kho"

  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)) // Sheet name max 31 chars

  // ─── Generate filename ───
  const datePart = now.toISOString().split("T")[0].replace(/-/g, "")
  const whPart = warehouseFilter && warehouseFilter !== "all"
    ? `_${warehouseFilter.replace(/\s+/g, "-")}`
    : ""
  const fileName = `Kiem-ke-ton-kho${whPart}_${datePart}.xlsx`

  // ─── Trigger download ───
  XLSX.writeFile(wb, fileName)

  return fileName
}
