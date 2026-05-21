# HOẠT ĐỘNG KHO — BADMINTONHUB (BẢN CHUẨN 2026)

Tài liệu này ghi lại quy trình vận hành kho theo code hiện tại.

Phạm vi chính:
- Frontend orchestration: `lib/inventory-context.tsx`
- API client: `lib/api.ts`
- Backend inventory: `backend/models/inventory.model.js`
- Backend transfer: `backend/models/transfer.model.js`

---

## 1) Dữ liệu tồn kho cốt lõi

Mỗi SKU được quản lý theo từng kho (`warehouse_id`):

- `on_hand`: số lượng vật lý
- `reserved`: số lượng đã giữ chỗ
- `available = on_hand - reserved`
- `reorder_point`: ngưỡng cảnh báo
- `unit_cost`: giá vốn

Dashboard tổng hợp:
- Tổng giá trị kho: `Σ(on_hand × unit_cost)`
- Sắp hết hàng: `0 < available <= reorder_point`
- Hết hàng: `available = 0`

---

## 2) Luồng nhập kho

### Tác nhân
- Admin hoặc Nhân viên kho

### API
- `POST /api/inventory/import`

### Hành vi backend
- Nếu SKU chưa có ở kho: tạo bản ghi inventory mới
- Nếu đã có: cộng thêm `on_hand`
- Ghi giao dịch `inventory_transactions` với `type = import`

### Điều kiện thành công
- Bắt buộc có `sku`, `warehouseId`, `qty`
- `qty` phải hợp lệ (`>= 0` theo model)

---

## 3) Luồng xuất kho

### Tác nhân
- Admin hoặc Nhân viên kho

### API
- `POST /api/inventory/export`

### Hành vi backend
- Kiểm tra `available >= qty`
- Trừ `on_hand`
- Ghi giao dịch `inventory_transactions` với `type = export`

### Điều kiện thất bại thường gặp
- SKU không tồn tại trong kho
- Tồn khả dụng không đủ

---

## 4) Luồng điều chuyển kho

### Trạng thái chuẩn
- `pending` → `approved` → `in-transit` → `completed`
- hoặc `pending` → `rejected`

### Bước 1: Tạo yêu cầu điều chuyển
- API: `POST /api/transfers`
- Dữ liệu chính: kho nguồn, kho đích, lý do, cách lấy hàng, danh sách item
- Lưu vào:
  - `transfer_requests`
  - `transfer_items`
- Tồn kho CHƯA đổi ở bước này

### Bước 2: Kho nguồn xuất điều chuyển
- Frontend gọi `exportTransferItems(...)`
- Thực hiện xuất kho từng SKU tại kho nguồn (`/inventory/export`)
- Thành công toàn bộ thì cập nhật trạng thái sang `in-transit`

### Bước 3: Kho đích nhận điều chuyển
- Frontend gọi `receiveTransferItems(...)`
- Nhập kho từng SKU tại kho đích (`/inventory/import`)
- Thành công toàn bộ thì cập nhật trạng thái sang `completed`

### Bước từ chối
- Cập nhật trạng thái `rejected`
- Không thay đổi tồn kho

---

## 5) Luồng phiếu kho từ Admin (Admin Slip)

### Tạo phiếu
- Frontend tạo phiếu qua `createAdminSlip(...)`
- Mã phiếu:
  - `PNK-YYYYMMDD-XXX` (nhập)
  - `PXK-YYYYMMDD-XXX` (xuất)
- Trạng thái ban đầu: `pending`

### Xử lý phiếu
- Kho thực hiện nhập/xuất thật trước
- Sau khi nghiệp vụ kho thành công mới gọi `processAdminSlip(...)`
- Trạng thái phiếu chuyển `processed`

Lưu ý kiến trúc hiện tại:
- Admin Slip đang lưu cục bộ (local storage key `bh_admin_slips`), chưa có bảng/API backend riêng cho slip.

---

## 6) Luồng PO (Purchase Order)

### API
- `GET /api/purchase-orders`
- `PATCH /api/purchase-orders/:id/status`

### Ý nghĩa
- PO quản lý vòng đời mua hàng (`sent`, `confirmed`, `shipping`, `received`)
- Cập nhật trạng thái PO KHÔNG tự động tăng tồn kho
- Tồn kho chỉ đổi khi kho thực hiện nhập thực tế (`/inventory/import`)

---

## 7) Quy tắc xử lý lỗi đã chuẩn hóa

Các thao tác kho trọng yếu hiện bắt buộc kiểm tra `res.success` từ API:
- `importItems`
- `createTransfer`
- `updateTransferStatus`
- `exportTransferItems`
- `receiveTransferItems`

Nếu API trả lỗi:
- Dừng quy trình ngay
- Không hiển thị thành công giả
- Không đẩy trạng thái phiếu sang bước kế tiếp

---

## 8) Nhận diện Kho Hub

Để tránh lỗi do tên kho thay đổi nhẹ, các màn Hub chính đã chuyển sang nhận diện linh hoạt:
- Ưu tiên cờ `isHub`
- Fallback theo regex `/hub/i`

Áp dụng ở:
- Dashboard Hub
- Tồn kho Hub
- Cân bằng tồn kho Hub
- Điều chuyển Hub

---

## 9) Checklist vận hành kho hằng ngày

1. Kiểm tra cảnh báo `low stock` / `out of stock`
2. Xử lý phiếu nhập/xuất tồn đọng
3. Duyệt và xuất các phiếu điều chuyển `pending/approved`
4. Xác nhận nhận hàng cho phiếu `in-transit`
5. Đối soát giao dịch nhập/xuất trong ngày
6. Chỉ đánh dấu phiếu Admin là `processed` sau khi nhập/xuất thành công
