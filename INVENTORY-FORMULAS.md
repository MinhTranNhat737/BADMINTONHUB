# CÔNG THỨC QUẢN LÝ TỒN KHO — BADMINTONHUB

> File tham chiếu cho toàn bộ logic xuất nhập kho, điều chuyển, phiếu admin.
> Source code: `lib/inventory-context.tsx`

---

## 1. CẤU TRÚC DỮ LIỆU MỖI SKU (theo từng kho)

```
onHand    = Tổng hàng vật lý trong kho (đã kiểm đếm được)
reserved  = Hàng giữ cho đơn hàng / booking chưa xuất
available = onHand − reserved
```

Mỗi SKU được theo dõi **riêng biệt theo từng kho**. Ví dụ: `YNX-AX88D` ở "Kho Cầu Giấy" và "Kho Thanh Xuân" là 2 bản ghi khác nhau.

---

## 2. TỔNG HỢP (Dashboard)

```
totalValue    = Σ (onHand × unitCost)       ← giá trị toàn bộ hàng vật lý
lowStockCount = đếm các SKU có 0 < available ≤ reorderPoint
outOfStock    = đếm các SKU có available === 0
```

---

## 3. THANH MỨC TỒN KHO (StockLevelIndicator)

Component: `components/shared.tsx` → `StockLevelIndicator`

```
maxCapacity = max ?? reorderPoint × 3
stockPct    = min(available / maxCapacity × 100, 100)

Ngưỡng màu:
  available === 0                → ĐỎ    (hết hàng)
  0 < available < reorderPoint   → ĐỎ    (nguy hiểm, dưới điểm đặt lại)
  available === reorderPoint     → VÀNG   (đúng ngưỡng đặt lại)
  available > reorderPoint       → XANH   (bình thường)
```

---

## 4. NHẬP KHO — `importItems()`

**Khi nào gọi:** Admin hoặc NV kho nhập hàng mới vào kho.

```
Lookup: tìm theo cặp (sku, warehouse)

  Nếu tìm thấy:
    onHand    += qty
    available += qty
    reserved   → không đổi

  Nếu không tìm thấy (SKU chưa có ở kho này):
    Tạo entry mới:
      onHand    = qty
      reserved  = 0
      available = qty    (= onHand − reserved = qty − 0)

Giao dịch ghi nhận:
  type = "import"
  id   = "GRN-{timestamp}-{index}"
```

---

## 5. XUẤT KHO — `exportItems()`

**Khi nào gọi:** Admin hoặc NV kho xuất hàng (bán, hàng lỗi, khuyến mãi...).

```
Pre-check (ATOMIC):
  Kiểm tra available >= qty cho TẤT CẢ items trong phiếu
  → Nếu bất kỳ item nào thiếu → HỦY TOÀN BỘ phiếu, return false

Lookup: tìm theo cặp (sku, warehouse)
  onHand    -= qty
  available -= qty
  reserved   → không đổi

Return: true nếu thành công, false nếu thất bại

Giao dịch ghi nhận:
  type = "export"
  id   = "EXP-{timestamp}-{index}"
```

---

## 6. ĐIỀU CHUYỂN KHO — Quy trình 4 bước

### Luồng trạng thái:

```
  pending ──→ in-transit ──→ completed
     ↓
  rejected
```

### Bước 1 — TẠO YÊU CẦU — `createTransfer()`

**Ai gọi:** NV kho đích (kho cần hàng) tạo yêu cầu.

```
Tồn kho  → KHÔNG đổi (chưa trừ / cộng gì)
status   = "pending"
id       = "DCK-{năm}-{số random 3 chữ số}"
```

### Bước 2 — KHO NGUỒN XUẤT HÀNG — `exportTransferItems()`

**Ai gọi:** NV kho nguồn (kho có hàng) duyệt và xuất hàng.

```
Kho nguồn (fromWarehouse):
  onHand    -= actualQty      (số lượng thực xuất, có thể khác yêu cầu)
  available -= actualQty
  reserved   → không đổi

status → "in-transit"
Cập nhật: approvedBy, approvedAt, items[].qty = actualQty

Giao dịch ghi nhận:
  type = "transfer-out"
  id   = "XKDC-{transferId}-{index}"
```

### Bước 3 — KHO ĐÍCH NHẬN HÀNG — `receiveTransferItems()`

**Ai gọi:** NV kho đích xác nhận đã nhận hàng.

```
Kho đích (toWarehouse):
  Nếu SKU đã tồn tại ở kho đích:
    onHand    += qty
    available += qty
    reserved   → không đổi

  Nếu SKU chưa tồn tại ở kho đích:
    Tạo entry mới:
      onHand    = qty
      reserved  = 0
      available = qty

status → "completed"
Cập nhật: completedAt

Giao dịch ghi nhận:
  type = "transfer-in"
  id   = "NKDC-{transferId}-{index}"
```

### Bước 4 — TỪ CHỐI — `updateTransferStatus("rejected")`

**Ai gọi:** NV kho nguồn hoặc Admin từ chối yêu cầu.

```
Tồn kho → KHÔNG đổi
status  → "rejected"
```

---

## 7. PHIẾU ADMIN (Admin Slips)

### Tạo phiếu — `createAdminSlip()`

**Ai gọi:** Admin tạo chỉ thị nhập/xuất cho NV kho.

```
Tồn kho → KHÔNG đổi (phiếu chỉ là chỉ thị, chưa thực hiện)
status  = "pending"
id      = "PNK-{năm}-{xxx}" (phiếu nhập)
        = "PXK-{năm}-{xxx}" (phiếu xuất)

Giá trị phiếu = Σ (item.qty × item.unitCost)
```

### Xử lý phiếu — `processAdminSlip()`

**Ai gọi:** NV kho sau khi đã nhập/xuất thực tế (gọi importItems hoặc exportItems trước).

```
Tồn kho → đã thay đổi qua importItems / exportItems (gọi riêng, trước bước này)
status  → "processed"
Cập nhật: processedAt, processedBy
```

---

## 8. ĐƠN MUA HÀNG (Purchase Orders)

### Cập nhật trạng thái — `updatePOStatus()`

```
Tồn kho → KHÔNG đổi
Chỉ đổi status: draft → pending → confirmed → in-transit → delivered
                                                           ↘ cancelled

Tồn kho chỉ thay đổi khi NV kho nhập hàng thực tế (gọi importItems riêng).

Giá trị PO = totalValue (có sẵn) hoặc Σ (item.qty × item.unitCost)
```

---

## 9. QUY TẮC LOOKUP

```
Mọi thao tác tìm item luôn theo cặp:  (sku, warehouse)

Ví dụ:
  YNX-AX88D @ "Kho Cầu Giấy"   → bản ghi A
  YNX-AX88D @ "Kho Thanh Xuân"  → bản ghi B (hoàn toàn độc lập)
```

---

## 10. LƯU TRỮ & ĐỒNG BỘ

```
localStorage keys:
  bh_inventory        → InventoryItem[]
  bh_transactions     → InventoryTransaction[]
  bh_transfers        → TransferRequest[]
  bh_admin_slips      → AdminWarehouseSlip[]
  bh_purchase_orders  → PurchaseOrder[]

Đồng bộ giữa các tab:
  window "storage" event → tự động cập nhật khi tab khác thay đổi dữ liệu

Reset (resetAll):
  Xóa toàn bộ localStorage keys → trả về dữ liệu mặc định từ API
```

---

## 11. BẢNG TỔNG HỢP THAY ĐỔI TỒN KHO

| # | Phương thức              | onHand   | available | reserved  | Giao dịch      |
|---|--------------------------|----------|-----------|-----------|-----------------|
| 1 | Nhập kho                 | `+= qty` | `+= qty`  | không đổi | `import`        |
| 2 | Xuất kho                 | `-= qty` | `-= qty`  | không đổi | `export`        |
| 3 | Xuất điều chuyển (nguồn) | `-= qty` | `-= qty`  | không đổi | `transfer-out`  |
| 4 | Nhận điều chuyển (đích)  | `+= qty` | `+= qty`  | không đổi | `transfer-in`   |
| 5 | Tạo phiếu admin          | —        | —         | —         | —               |
| 6 | Xử lý phiếu admin        | *(qua 1 hoặc 2)* | *(qua 1 hoặc 2)* | — | *(qua 1 hoặc 2)* |
| 7 | Cập nhật PO              | —        | —         | —         | —               |
| 8 | Tạo yêu cầu điều chuyển  | —        | —         | —         | —               |
| 9 | Từ chối điều chuyển       | —        | —         | —         | —               |

> Dấu `—` nghĩa là tồn kho KHÔNG thay đổi ở bước đó.
