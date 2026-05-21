import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import { formatPOReference, formatVND } from "@/lib/utils"

type ExportLineItem = {
  name: string
  sku?: string
  qty: number
  unitPrice?: number
  lineTotal?: number
}

type MetaField = {
  label: string
  value?: string | null
}

export interface ExportWarehouseSlipDocInput {
  id: string
  type: "import" | "export"
  date?: string
  status?: string
  warehouse?: string
  createdBy?: string
  assignedTo?: string
  processedBy?: string
  supplier?: string
  poReference?: string
  note?: string
  items: ExportLineItem[]
}

export interface ExportPurchaseOrderDocInput {
  id: string
  date?: string
  status?: string
  supplier?: string
  warehouse?: string
  note?: string
  totalValue?: number
  items: ExportLineItem[]
}

export interface ExportInvoiceDocInput {
  id: string
  date?: string
  status?: string
  paymentMethod?: string
  note?: string
  subtotal?: number
  shippingFee?: number
  total: number
  customer?: {
    name?: string
    phone?: string
    email?: string
    address?: string
  }
  items: ExportLineItem[]
}

const tableBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "DDDDDD",
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeDocCode(prefix: "PNK" | "PXK" | "PO" | "HD", raw?: string) {
  const value = (raw || "").trim()
  if (!value) return `${prefix}-${Date.now()}`

  const upper = value.toUpperCase()
  if (upper.startsWith(prefix)) return value

  const plain = value.replace(/\s+/g, "-")
  return `${prefix}-${plain}`
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString("vi-VN")
}

function textCell(value: string, opts?: { bold?: boolean; align?: AlignmentType }) {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
    children: [
      new Paragraph({
        alignment: opts?.align,
        children: [new TextRun({ text: value, bold: opts?.bold })],
      }),
    ],
  })
}

function buildMetaParagraphs(fields: MetaField[]) {
  return fields
    .filter((f) => (f.value || "").trim().length > 0)
    .map(
      (f) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${f.label}: `, bold: true }),
            new TextRun(f.value as string),
          ],
        }),
    )
}

function buildItemsTable(items: ExportLineItem[]) {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        textCell("STT", { bold: true, align: AlignmentType.CENTER }),
        textCell("Sản phẩm", { bold: true }),
        textCell("SKU", { bold: true }),
        textCell("SL", { bold: true, align: AlignmentType.CENTER }),
        textCell("Đơn giá", { bold: true, align: AlignmentType.RIGHT }),
        textCell("Thành tiền", { bold: true, align: AlignmentType.RIGHT }),
      ],
    }),
  ]

  items.forEach((item, index) => {
    const lineTotal = item.lineTotal ?? (item.unitPrice || 0) * item.qty
    rows.push(
      new TableRow({
        children: [
          textCell(String(index + 1), { align: AlignmentType.CENTER }),
          textCell(item.name || "—"),
          textCell(item.sku || "—"),
          textCell(String(item.qty), { align: AlignmentType.CENTER }),
          textCell(item.unitPrice != null ? formatVND(item.unitPrice) : "—", { align: AlignmentType.RIGHT }),
          textCell(formatVND(lineTotal), { align: AlignmentType.RIGHT }),
        ],
      }),
    )
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

async function downloadDoc(document: Document, fileName: string) {
  const blob = await Packer.toBlob(document)
  const url = URL.createObjectURL(blob)
  const anchor = documentRef().createElement("a")
  anchor.href = url
  anchor.download = `${sanitizeFileName(fileName)}.docx`
  anchor.click()
  URL.revokeObjectURL(url)
}

function documentRef() {
  if (typeof window === "undefined") {
    throw new Error("Export DOC chỉ hỗ trợ trên trình duyệt")
  }
  return window.document
}

function buildDoc(title: string, metaFields: MetaField[], items: ExportLineItem[], footerRows: MetaField[]) {
  return new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [new TextRun({ text: "BADMINTONHUB", bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: title, bold: true, size: 30 })],
          }),
          ...buildMetaParagraphs(metaFields),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          buildItemsTable(items),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          ...buildMetaParagraphs(footerRows),
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: "Cảm ơn bạn đã sử dụng BadmintonHub.", italics: true })],
          }),
        ],
      },
    ],
  })
}

export async function exportWarehouseSlipDoc(input: ExportWarehouseSlipDocInput) {
  const title = input.type === "import" ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO"
  const lineTotal = input.items.reduce((sum, item) => sum + (item.lineTotal ?? (item.unitPrice || 0) * item.qty), 0)
  const document = buildDoc(
    title,
    [
      { label: "Mã phiếu", value: input.id },
      { label: "Ngày", value: formatDateTime(input.date) },
      { label: "Kho", value: input.warehouse || "—" },
      { label: "Trạng thái", value: input.status || "—" },
      { label: "Người tạo", value: input.createdBy || "—" },
      { label: "Gán cho", value: input.assignedTo || "—" },
      { label: "Người xử lý", value: input.processedBy || "—" },
      { label: "Nhà cung cấp", value: input.supplier || "—" },
      { label: "PO tham chiếu", value: input.poReference ? formatPOReference(input.poReference) : "—" },
    ],
    input.items,
    [
      { label: "Tổng giá trị", value: formatVND(lineTotal) },
      { label: "Ghi chú", value: input.note || "" },
    ],
  )

  const fileCode = normalizeDocCode(input.type === "import" ? "PNK" : "PXK", input.id)
  await downloadDoc(document, fileCode)
}

export async function exportPurchaseOrderDoc(input: ExportPurchaseOrderDocInput) {
  const computedTotal = input.items.reduce((sum, item) => sum + (item.lineTotal ?? (item.unitPrice || 0) * item.qty), 0)
  const total = input.totalValue ?? computedTotal
  const document = buildDoc(
    "ĐƠN ĐẶT HÀNG NHÀ CUNG CẤP",
    [
      { label: "Mã PO", value: formatPOReference(input.id) },
      { label: "Ngày", value: formatDateTime(input.date) },
      { label: "Nhà cung cấp", value: input.supplier || "—" },
      { label: "Kho nhận", value: input.warehouse || "—" },
      { label: "Trạng thái", value: input.status || "—" },
    ],
    input.items,
    [
      { label: "Tổng giá trị", value: formatVND(total) },
      { label: "Ghi chú", value: input.note || "" },
    ],
  )

  const fileCode = normalizeDocCode("PO", formatPOReference(input.id))
  await downloadDoc(document, fileCode)
}

export async function exportInvoiceDoc(input: ExportInvoiceDocInput) {
  const document = buildDoc(
    "HÓA ĐƠN BÁN HÀNG",
    [
      { label: "Mã hóa đơn", value: input.id },
      { label: "Ngày", value: formatDateTime(input.date) },
      { label: "Trạng thái", value: input.status || "—" },
      { label: "Khách hàng", value: input.customer?.name || "—" },
      { label: "Số điện thoại", value: input.customer?.phone || "—" },
      { label: "Email", value: input.customer?.email || "—" },
      { label: "Địa chỉ", value: input.customer?.address || "—" },
      { label: "Phương thức thanh toán", value: input.paymentMethod || "—" },
    ],
    input.items,
    [
      { label: "Tạm tính", value: input.subtotal != null ? formatVND(input.subtotal) : undefined },
      { label: "Phí vận chuyển", value: input.shippingFee != null ? formatVND(input.shippingFee) : undefined },
      { label: "Tổng cộng", value: formatVND(input.total) },
      { label: "Ghi chú", value: input.note || "" },
    ],
  )

  const fileCode = normalizeDocCode("HD", input.id)
  await downloadDoc(document, fileCode)
}