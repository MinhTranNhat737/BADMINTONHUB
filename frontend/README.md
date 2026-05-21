<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.2.0-38B2AC?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/shadcn/ui-New_York-000?style=for-the-badge" />
</p>

# 🏸 BadmintonHub — Hệ Thống Đặt Sân Cầu Lông Online

> Hệ thống đặt sân cầu lông và cung cấp phụ kiện thể thao hàng đầu Việt Nam.  
> Tích hợp quản lý kho hàng, POS bán hàng, đơn đặt hàng nhà cung cấp và phân tích báo cáo.

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ](#-công-nghệ)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Tài khoản mặc định](#-tài-khoản-mặc-định)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Hệ thống Routes](#-hệ-thống-routes)
- [Tính năng theo vai trò](#-tính-năng-theo-vai-trò)
- [Dữ liệu mẫu](#-dữ-liệu-mẫu)
- [Tích hợp API bên ngoài](#-tích-hợp-api-bên-ngoài)
- [Thư viện Component](#-thư-viện-component)
- [Mã sản phẩm (SKU)](#-mã-sản-phẩm-sku)

---

## 🏸 Giới thiệu

**BadmintonHub** là nền tảng quản lý toàn diện cho hệ thống sân cầu lông — bao gồm:

- 🏟️ **Đặt sân online** — Chọn sân, chọn giờ, thanh toán
- 🛒 **Cửa hàng thể thao** — Mua vợt, giày, phụ kiện cầu lông
- 📦 **Quản lý kho hàng** — Nhập/xuất kho, điều chuyển nội bộ giữa 3 kho
- 💰 **POS bán hàng** — Hệ thống bán hàng tại quầy cho nhân viên
- 📊 **Báo cáo & phân tích** — Doanh thu, công suất sân, tồn kho
- 🚚 **Quản lý đơn đặt hàng NCC** — Vòng đời PO từ dự thảo đến nhận hàng

Hệ thống phục vụ **5 loại người dùng**: Khách (Guest), Người dùng đã đăng ký, Nhân viên kho, Quản trị viên (Admin), và Nhà cung cấp.

---

## ✨ Tính năng chính

### Đặt sân cầu lông
- Tìm kiếm & lọc sân theo chi nhánh, loại sân, giá, tiện ích
- Xem lịch trống theo tuần (06:00 – 22:00)
- Quy trình đặt sân 3 bước (xác nhận → thông tin → thanh toán)
- Mã QR cho lần đặt sân thành công
- Bản đồ chỉ đường đến sân (TomTom Maps)
- Xem thời tiết cho sân ngoài trời

### Cửa hàng trực tuyến
- Danh mục sản phẩm với bộ lọc đa chiều
- Chi tiết sản phẩm với gallery ảnh, thông số kỹ thuật
- Giỏ hàng, checkout với gợi ý địa chỉ tự động
- Hỗ trợ nhiều phương thức thanh toán (COD, MoMo, VNPay, Chuyển khoản)

### Quản lý kho hàng nội bộ
- Theo dõi tồn kho theo từng kho (3 kho: Cầu Giấy, Thanh Xuân, Long Biên)
- Phiếu nhập kho (GRN) từ NCC
- Phiếu xuất kho bán hàng
- **Điều chuyển nội bộ** — Yêu cầu hàng từ kho khác, tạo phiếu xuất kho điều chuyển
- **3 hình thức lấy hàng**: Nhân viên qua lấy, Giao vận, Khách qua lấy
- Xử lý phiếu từ Admin (chuyển sang tab nhập/xuất kho để xác nhận)
- Cảnh báo sắp hết hàng & hết hàng

### Bán hàng tại quầy (POS)
- Tìm kiếm sản phẩm, thêm vào giỏ, áp dụng giảm giá
- Thông tin khách hàng, chọn phương thức thanh toán
- In hóa đơn / phiếu xuất kho
- Quy trình duyệt đơn hàng

### Quản trị viên (Admin)
- Dashboard tổng quan với KPI (doanh thu, đặt sân, công suất sân, cảnh báo tồn kho)
- Biểu đồ Recharts (Area, Pie, Bar)
- Quản lý toàn bộ lịch đặt sân
- Quản lý đơn đặt hàng nhà cung cấp (PO lifecycle)
- Tạo phiếu nhập/xuất kho cho nhân viên xử lý
- Báo cáo doanh thu & phân tích
- Công cụ test API (TomTom + Weather)

---

## 🛠 Công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| **Framework** | Next.js 16.1.6 (App Router) |
| **Ngôn ngữ** | TypeScript 5.7.3 |
| **UI Library** | React 19.2.4 |
| **Styling** | Tailwind CSS 4.2.0, tw-animate-css |
| **UI Components** | shadcn/ui (New York style) — 50+ components |
| **Biểu đồ** | Recharts 2.15.0 |
| **Form** | React Hook Form + Zod validation |
| **Bản đồ** | MapLibre GL 5.19.0 + TomTom APIs |
| **Date Picker** | react-day-picker + date-fns |
| **Toast** | Sonner |
| **Carousel** | Embla Carousel |
| **Analytics** | Vercel Analytics |
| **Icons** | Lucide React |
| **Font** | Montserrat (headings) + Plus Jakarta Sans (body) |
| **Package Manager** | pnpm |

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu

- **Node.js** ≥ 18.x
- **pnpm** ≥ 8.x

### Bước cài đặt

```bash
# 1. Clone repository
git clone <repo-url>
cd BADMINTONHUB

# 2. Cài đặt dependencies
pnpm install

# 3. Chạy development server
pnpm dev

# 4. Mở trình duyệt
# → http://localhost:3000
```

### Các lệnh khác

```bash
# Build production
pnpm build

# Chạy production server
pnpm start

# Kiểm tra lint
pnpm lint
```

---

## 👥 Tài khoản mặc định

| Vai trò | Tên đăng nhập | Mật khẩu | Họ tên | Kho phụ trách |
|---------|---------------|-----------|--------|---------------|
| 🔴 Admin | `admin` | `admin123` | Quản trị viên | — (toàn bộ) |
| 🟢 Nhân viên 1 | `nhanvien1` | `nhanvien123` | Nhân viên Cầu Giấy | Kho Cầu Giấy |
| 🟢 Nhân viên 2 | `nhanvien2` | `nhanvien123` | Nhân viên Thanh Xuân | Kho Thanh Xuân |
| 🟢 Nhân viên 3 | `nhanvien3` | `nhanvien123` | Nhân viên Long Biên | Kho Long Biên |
| 🔵 Người dùng | (tự đăng ký) | (tự tạo) | — | — |
| ⚪ Khách | — | — | Khách (chế độ duyệt) | — |

> 💡 Dữ liệu được lưu trên **localStorage** — xóa dữ liệu trình duyệt sẽ reset tài khoản.

---

## 📁 Cấu trúc dự án

```
BADMINTONHUB/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, AuthProvider, Toaster)
│   ├── page.tsx                  # Trang chủ (Landing page)
│   ├── globals.css               # Global styles
│   │
│   ├── login/                    # Đăng nhập
│   ├── register/                 # Đăng ký (có gợi ý địa chỉ TomTom)
│   │
│   ├── courts/                   # Danh sách sân
│   │   └── [id]/                 # Chi tiết sân (bản đồ, thời tiết, đặt sân)
│   │
│   ├── booking/                  # Quy trình đặt sân 3 bước
│   │   └── success/              # Xác nhận đặt sân (QR, bản đồ)
│   │
│   ├── shop/                     # Cửa hàng
│   │   ├── [id]/                 # Chi tiết sản phẩm
│   │   ├── checkout/             # Thanh toán
│   │   └── order-success/        # Xác nhận đơn hàng
│   │
│   ├── my-bookings/              # Lịch sử & tài khoản người dùng
│   │
│   ├── admin/                    # 🔴 Panel quản trị
│   │   ├── layout.tsx            # Sidebar layout
│   │   ├── page.tsx              # Dashboard (KPI, biểu đồ)
│   │   ├── bookings/             # Quản lý đặt sân
│   │   ├── inventory/            # Quản lý tồn kho
│   │   ├── purchase-orders/      # Đơn đặt hàng NCC
│   │   └── reports/              # Báo cáo doanh thu
│   │
│   ├── employee/                 # 🟢 Panel nhân viên
│   │   ├── layout.tsx            # Sidebar layout
│   │   ├── page.tsx              # Dashboard nhân viên
│   │   ├── sales/                # POS bán hàng
│   │   ├── approval/             # Duyệt đơn hàng
│   │   ├── orders/               # Đơn hàng online
│   │   └── inventory/            # Quản lý kho (nhập/xuất/điều chuyển)
│   │
│   └── supplier/                 # 🟡 Portal nhà cung cấp
│
├── components/                   # Components dùng chung
│   ├── ui/                       # 50+ shadcn/ui components
│   ├── navbar.tsx                # Thanh điều hướng chính
│   ├── footer.tsx                # Footer
│   ├── route-guard.tsx           # Bảo vệ route theo vai trò
│   ├── shared.tsx                # Badge, indicator dùng chung
│   └── theme-provider.tsx        # Dark/light theme
│
├── lib/                          # Utilities & context
│   ├── auth-context.tsx          # Authentication provider
│   ├── cart-context.tsx          # Shopping cart provider
│   ├── inventory-context.tsx     # Inventory state provider
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.ts             # Hook kiểm tra mobile
│   └── use-toast.ts              # Hook toast notifications
│
├── public/                       # Static assets
│   └── danh-sach-ma-san-pham.txt # Danh sách mã SKU
│
├── styles/                       # Global styles
├── components.json               # Cấu hình shadcn/ui
├── next.config.mjs               # Cấu hình Next.js
├── tsconfig.json                 # Cấu hình TypeScript
├── postcss.config.mjs            # Cấu hình PostCSS
├── package.json                  # Dependencies & scripts
└── pnpm-lock.yaml                # Lock file
```

---

## 🗺 Hệ thống Routes

### Trang công khai

| Route | Mô tả |
|-------|--------|
| `/` | Trang chủ — Hero slideshow, thống kê, sân nổi bật, cách đặt sân, sản phẩm nổi bật |
| `/courts` | Danh sách sân — Lọc theo chi nhánh, loại sân, giá, tiện ích, hiển thị grid/list |
| `/courts/[id]` | Chi tiết sân — Tiện ích, chọn giờ, lịch tuần, đánh giá, bản đồ TomTom, thời tiết |
| `/shop` | Cửa hàng — Danh mục sản phẩm, bộ lọc đa chiều, giỏ hàng |
| `/shop/[id]` | Chi tiết sản phẩm — Gallery, thông số, sản phẩm liên quan |
| `/shop/checkout` | Thanh toán — Địa chỉ (TomTom autocomplete), phương thức thanh toán |
| `/shop/order-success` | Xác nhận đơn hàng thành công |
| `/login` | Đăng nhập — Gợi ý tài khoản demo, chế độ khách |
| `/register` | Đăng ký — Tự động gợi ý địa chỉ (TomTom) |

### Trang người dùng đã đăng nhập

| Route | Mô tả |
|-------|--------|
| `/booking` | Đặt sân 3 bước (xác nhận → thông tin → thanh toán) |
| `/booking/success` | Xác nhận thành công — QR code, bản đồ, hóa đơn |
| `/my-bookings` | Trung tâm tài khoản — Lịch sử đặt sân, đơn hàng, hồ sơ, yêu thích, điểm |

### Panel quản trị (`/admin/*`)

| Route | Mô tả |
|-------|--------|
| `/admin` | Dashboard — KPI, biểu đồ doanh thu, đặt sân gần đây, cảnh báo tồn kho |
| `/admin/bookings` | Quản lý đặt sân — Tabs theo trạng thái, timeline, chi tiết, QR, thao tác hàng loạt |
| `/admin/inventory` | Quản lý tồn kho — Tồn kho, phiếu nhập/xuất, tạo phiếu cho nhân viên |
| `/admin/purchase-orders` | Đơn đặt hàng NCC — Tạo/sửa PO, vòng đời 5 bước |
| `/admin/reports` | Báo cáo — Doanh thu, top sân, phương thức thanh toán |

### Panel nhân viên (`/employee/*`)

| Route | Mô tả |
|-------|--------|
| `/employee` | Dashboard — Thống kê ngày, doanh số, cảnh báo tồn kho |
| `/employee/sales` | POS — Tìm sản phẩm, giỏ hàng, giảm giá, thanh toán, in hóa đơn |
| `/employee/approval` | Duyệt đơn — Xem & duyệt/từ chối đơn hàng, tự động tạo phiếu xuất |
| `/employee/orders` | Đơn hàng online — Xử lý → Vận chuyển → Giao hàng |
| `/employee/inventory` | Kho hàng — 6 tab: Tổng quan, Nhập kho, Xuất kho, Điều chuyển, Phiếu Admin, Lịch sử |

### Portal nhà cung cấp

| Route | Mô tả |
|-------|--------|
| `/supplier` | Xem PO, cập nhật tracking, xác nhận giao hàng |

---

## 🎭 Tính năng theo vai trò

### ⚪ Khách (Guest)
- Duyệt sân & sản phẩm
- Xem chi tiết sân, thời tiết, bản đồ
- **Không thể** đặt sân hoặc mua hàng

### 🔵 Người dùng (User)
- Tất cả tính năng của Khách
- Đặt sân online 3 bước
- Mua sản phẩm qua cửa hàng
- Quản lý đơn hàng & lịch sử
- Cài đặt hồ sơ cá nhân
- Xem QR code & chỉ đường đến sân

### 🟢 Nhân viên (Employee)
- Bán hàng tại quầy (POS) với in hóa đơn
- Duyệt đơn hàng nội bộ
- Xử lý đơn hàng online (đóng gói → vận chuyển → giao)
- Quản lý kho hàng theo kho được phân công:
  - **Nhập kho** — Phiếu GRN từ NCC
  - **Xuất kho** — Phiếu xuất bán hàng
  - **Điều chuyển nội bộ** — Yêu cầu hàng từ kho khác:
    - *Phiếu đi*: Duyệt & tạo phiếu xuất kho điều chuyển
    - *Yêu cầu đã gửi*: Theo dõi yêu cầu & xác nhận nhận hàng
    - 3 hình thức: Nhân viên qua lấy / Giao vận / Khách qua lấy
  - **Phiếu từ Admin** — Nhận phiếu, chuyển sang tab nhập/xuất kho xử lý
  - **Lịch sử** — Toàn bộ giao dịch nhập/xuất/điều chuyển

### 🔴 Quản trị viên (Admin)
- Dashboard tổng quan + biểu đồ
- Quản lý toàn bộ đặt sân (duyệt, hủy, timeline)
- Quản lý tồn kho toàn hệ thống
- Tạo phiếu nhập/xuất kho gửi cho nhân viên
- Đặt hàng nhà cung cấp (PO từ dự thảo đến nhận hàng)
- Báo cáo doanh thu & công suất

### 🟡 Nhà cung cấp (Supplier)
- Xem đơn đặt hàng từ hệ thống
- Cập nhật tracking & lô hàng
- Xác nhận giao hàng

---

## 📊 Dữ liệu mẫu

### Chi nhánh (3 cơ sở tại Hà Nội)

| Chi nhánh | Địa chỉ | Số sân |
|-----------|---------|--------|
| BadmintonHub Cầu Giấy | 12 Trần Thái Tông, Cầu Giấy | 4 sân |
| BadmintonHub Thanh Xuân | 68 Nguyễn Trãi, Thanh Xuân | 4 sân |
| BadmintonHub Long Biên | 25 Nguyễn Văn Cừ, Long Biên | 3 sân |

### Sân (11 sân)

| Sân | Chi nhánh | Loại | Trong/Ngoài | Giá/giờ |
|-----|-----------|------|-------------|---------|
| A1 Premium | Cầu Giấy | Premium | Indoor | 180,000đ |
| A2 Standard | Cầu Giấy | Standard | Indoor | 120,000đ |
| A3 Standard | Cầu Giấy | Standard | Indoor | 120,000đ |
| A4 Outdoor | Cầu Giấy | Standard | Outdoor | 90,000đ |
| B1 Premium | Thanh Xuân | Premium | Indoor | 200,000đ |
| B2 VIP | Thanh Xuân | VIP | Indoor | 250,000đ |
| B3 Standard | Thanh Xuân | Standard | Indoor | 100,000đ |
| B4 Outdoor | Thanh Xuân | Standard | Outdoor | 70,000đ |
| C1 Standard | Long Biên | Standard | Indoor | 110,000đ |
| C2 Premium | Long Biên | Premium | Indoor | 170,000đ |
| C3 Outdoor | Long Biên | Standard | Outdoor | 80,000đ |

### Nhà cung cấp

| NCC | Liên hệ | Email |
|-----|---------|-------|
| Yonex Việt Nam | Nguyễn Minh Quang | yonex@supplier.vn |
| Victor Sports Việt Nam | Trần Hải Đăng | victor@supplier.vn |
| Li-Ning Việt Nam | Phạm Thị Lan | lining@supplier.vn |

---

## 🌐 Tích hợp API bên ngoài

### TomTom APIs
- **Geocoding** — Chuyển đổi địa chỉ ↔ tọa độ
- **Fuzzy Search** — Tìm kiếm địa điểm, gợi ý địa chỉ (autocomplete)
- **Routing** — Tính toán tuyến đường, thời gian di chuyển
- **Map Tiles** — Hiển thị bản đồ qua MapLibre GL

### WeatherAPI
- Thời tiết hiện tại & dự báo 3 ngày
- Hiển thị cho sân ngoài trời (nhiệt độ, độ ẩm, gió, tia UV)

### Vercel Analytics
- Theo dõi lượt truy cập trang

---

## 🧩 Thư viện Component

Dự án sử dụng **50+ components** từ shadcn/ui (phong cách New York):

<details>
<summary>Xem danh sách đầy đủ</summary>

| Component | Mô tả |
|-----------|--------|
| Accordion | Nội dung mở rộng/thu gọn |
| Alert / Alert Dialog | Thông báo & xác nhận |
| Avatar | Ảnh đại diện |
| Badge | Nhãn trạng thái |
| Breadcrumb | Điều hướng breadcrumb |
| Button / Button Group | Nút bấm & nhóm nút |
| Calendar | Lịch chọn ngày |
| Card | Khung nội dung |
| Carousel | Trượt ảnh (Embla) |
| Chart | Biểu đồ (Recharts) |
| Checkbox | Hộp kiểm |
| Collapsible | Thu gọn nội dung |
| Command | Palette lệnh (cmdk) |
| Context Menu | Menu chuột phải |
| Dialog | Hộp thoại modal |
| Drawer | Ngăn kéo (mobile) |
| Dropdown Menu | Menu thả xuống |
| Form | Form với validation |
| Hover Card | Thẻ hover |
| Input / Input OTP | Ô nhập liệu & OTP |
| Label | Nhãn form |
| Menubar | Thanh menu |
| Navigation Menu | Menu điều hướng |
| Pagination | Phân trang |
| Popover | Popup nhỏ |
| Progress | Thanh tiến trình |
| Radio Group | Nhóm radio |
| Resizable | Panel co giãn |
| Scroll Area | Vùng cuộn tùy chỉnh |
| Select | Dropdown chọn |
| Separator | Đường phân cách |
| Sheet | Panel trượt |
| Sidebar | Thanh bên |
| Skeleton | Loading placeholder |
| Slider | Thanh trượt |
| Sonner | Toast notifications |
| Spinner | Loading spinner |
| Switch | Công tắc bật/tắt |
| Table | Bảng dữ liệu |
| Tabs | Tab chuyển nội dung |
| Textarea | Ô nhập nhiều dòng |
| Toast / Toaster | Thông báo nổi |
| Toggle / Toggle Group | Nút bật/tắt |
| Tooltip | Gợi ý hover |

</details>

### Components dùng chung (`components/shared.tsx`)

| Component | Mô tả |
|-----------|--------|
| `BookingStatusBadge` | Badge trạng thái đặt sân |
| `PaymentBadge` | Badge phương thức thanh toán |
| `POStatusBadge` | Badge trạng thái đơn đặt hàng NCC |
| `StockLevelIndicator` | Chỉ báo mức tồn kho (màu sắc) |
| `NotificationBell` | Chuông thông báo với badge đếm |

---

## 📦 Mã sản phẩm (SKU)

| STT | Mã SKU | Tên sản phẩm | Danh mục | Kho | Giá nhập |
|-----|--------|-------------|----------|-----|----------|
| 1 | `YNX-AX88D` | Vợt Yonex Astrox 88D Pro | Vợt cầu lông | Kho Cầu Giấy | 3,200,000đ |
| 2 | `YNX-PC65Z` | Giày Yonex Power Cushion 65Z3 | Giày | Kho Thanh Xuân | 2,300,000đ |
| 3 | `VCT-TK99` | Vợt Victor Thruster K 9900 | Vợt cầu lông | Kho Cầu Giấy | 2,700,000đ |
| 4 | `YNX-BG65` | Cước Yonex BG65 | Phụ kiện | Kho Long Biên | 85,000đ |
| 5 | `LNI-AB59` | Túi vợt Lining ABJT059 | Túi vợt | Kho Thanh Xuân | 620,000đ |
| 6 | `YNX-AC102` | Quấn cán Yonex AC102EX | Phụ kiện | Kho Cầu Giấy | 25,000đ |
| 7 | `LN-N99` | Vợt Li-Ning N99 | Vợt cầu lông | Kho Thanh Xuân | 2,500,000đ |

> 📄 File tham khảo: `public/danh-sach-ma-san-pham.txt`

---

## ⚙️ Cấu hình

| File | Mô tả |
|------|--------|
| `next.config.mjs` | `ignoreBuildErrors: true`, `images.unoptimized: true` |
| `components.json` | shadcn/ui: New York style, RSC, CSS variables, neutral base |
| `tsconfig.json` | Path alias `@/*` → `"./*"` |
| `postcss.config.mjs` | Tailwind CSS PostCSS plugin |

---

## 📝 Ghi chú

- Dữ liệu được lưu trên **localStorage** — không có backend/database thực tế
- Tất cả dữ liệu mock phục vụ mục đích demo & phát triển
- Bản đồ & thời tiết sử dụng API key có sẵn (giới hạn request)
- Hỗ trợ **tiếng Việt** toàn bộ giao diện

---

<p align="center">
  <strong>BadmintonHub</strong> — Cập nhật: 28/02/2026
</p>
