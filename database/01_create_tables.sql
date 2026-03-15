-- ═══════════════════════════════════════════════════════════════════════════════
-- BADMINTONHUB - TẠO CÁC BẢNG DATABASE
-- PostgreSQL 16+
-- Chạy theo thứ tự: 01 → 02 → 03
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bật uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CHI NHÁNH (branches)
-- BadmintonHub có 3 chi nhánh: Cầu Giấy, Thanh Xuân, Long Biên
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE branches (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,              -- "BadmintonHub Cầu Giấy"
    address     VARCHAR(255) NOT NULL,              -- Địa chỉ đầy đủ
    lat         DECIMAL(10,6) NOT NULL,             -- Vĩ độ (21.0285)
    lng         DECIMAL(10,6) NOT NULL,             -- Kinh độ (105.7823)
    phone       VARCHAR(20),
    email       VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. KHO (warehouses)
-- 4 kho: Kho Cầu Giấy, Kho Thanh Xuân, Kho Long Biên, Kho Hub (trung tâm)
-- Mỗi chi nhánh có 1 kho, Kho Hub không thuộc chi nhánh nào
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE warehouses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,       -- "Kho Cầu Giấy"
    branch_id   INT REFERENCES branches(id),        -- NULL nếu là Kho Hub
    address     VARCHAR(255),
    is_hub      BOOLEAN DEFAULT FALSE,              -- TRUE cho Kho Hub
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NGƯỜI DÙNG (users)
-- Vai trò: user (khách), admin, employee (nhân viên kho), guest
-- Nhân viên được gán vào 1 kho cụ thể
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- Mã hóa bcrypt
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15) NOT NULL UNIQUE,    -- VD: "0901234567"
    address         VARCHAR(255),
    gender          VARCHAR(5) CHECK (gender IN ('nam', 'nu')),
    date_of_birth   DATE,
    role            VARCHAR(10) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin', 'employee', 'guest')),
    warehouse_id    INT REFERENCES warehouses(id),  -- Kho của nhân viên
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SÂN CẦU LÔNG (courts)
-- 11 sân thuộc 3 chi nhánh, loại: standard / premium / vip
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE courts (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,          -- "Sân A1 - Premium"
    branch_id       INT NOT NULL REFERENCES branches(id),
    type            VARCHAR(10) NOT NULL DEFAULT 'standard'
                    CHECK (type IN ('standard', 'premium', 'vip')),
    indoor          BOOLEAN DEFAULT TRUE,           -- Trong nhà hay ngoài trời
    price           DECIMAL(12,0) NOT NULL,         -- Giá/giờ (VNĐ), VD: 160000
    rating          DECIMAL(2,1) DEFAULT 0,         -- Đánh giá 0-5
    reviews_count   INT DEFAULT 0,
    image           VARCHAR(255),
    description     TEXT,
    hours           VARCHAR(20) DEFAULT '06:00 - 22:00',
    available       BOOLEAN DEFAULT TRUE,           -- Đang hoạt động?
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TIỆN ÍCH SÂN (court_amenities)
-- VD: Điều hòa, Đèn LED, Sàn gỗ, Wi-Fi, Nước uống...
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE court_amenities (
    id          SERIAL PRIMARY KEY,
    court_id    INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    amenity     VARCHAR(50) NOT NULL               -- "Điều hòa"
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. NHÀ CUNG CẤP (suppliers)
-- 3 NCC: Yonex VN, Victor Sports VN, Li-Ning VN
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,          -- "Yonex Việt Nam"
    contact_person  VARCHAR(100),                   -- Người liên hệ
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SẢN PHẨM (products)
-- 34 sản phẩm: vợt, giày, quần áo, phụ kiện, quả cầu, túi vợt
-- specs và features lưu dạng JSONB cho linh hoạt
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(20) NOT NULL UNIQUE,    -- VD: "YNX-AX88D"
    name            VARCHAR(200) NOT NULL,          -- "Vợt Yonex Astrox 88D Pro"
    brand           VARCHAR(50) NOT NULL,           -- "Yonex"
    category        VARCHAR(50) NOT NULL,           -- "Vợt cầu lông", "Giày", "Phụ kiện"...
    price           DECIMAL(12,0) NOT NULL,         -- Giá bán (VNĐ)
    original_price  DECIMAL(12,0),                  -- Giá gốc (nếu có giảm giá)
    rating          DECIMAL(2,1) DEFAULT 0,
    reviews_count   INT DEFAULT 0,
    image           VARCHAR(255),                   -- Ảnh chính
    description     TEXT,
    specs           JSONB,                          -- Thông số KT: {"weight":"83g", "balance":"Nặng đầu"...}
    features        JSONB,                          -- Tính năng: ["Namd graphite", "Aero+Box"...]
    in_stock        BOOLEAN DEFAULT TRUE,
    gender          VARCHAR(5) CHECK (gender IN ('nam', 'nu')),  -- NULL = unisex
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ẢNH SẢN PHẨM (product_images)
-- Mỗi sản phẩm có 1-3 ảnh
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_images (
    id          SERIAL PRIMARY KEY,
    product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         VARCHAR(255) NOT NULL,
    sort_order  INT DEFAULT 0                      -- Thứ tự hiển thị
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. NHÃN SẢN PHẨM (product_badges)
-- VD: "Bán chạy", "Mới", "Sale"
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE product_badges (
    id          SERIAL PRIMARY KEY,
    product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    badge       VARCHAR(20) NOT NULL               -- "Bán chạy"
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ĐẶT SÂN (bookings)
-- Khách đặt sân qua web, admin/nhân viên tạo trực tiếp
-- Trạng thái: pending → confirmed → playing → completed / cancelled
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id        INT NOT NULL REFERENCES courts(id),
    branch_id       INT NOT NULL REFERENCES branches(id),
    user_id         UUID REFERENCES users(id),      -- NULL nếu khách vãng lai
    booking_date    DATE NOT NULL,                  -- Ngày chơi
    day_label       VARCHAR(10) NOT NULL,            -- "4/3" (ngày/tháng)
    time_start      VARCHAR(5) NOT NULL,            -- "08:00"
    time_end        VARCHAR(5),                     -- "10:00"
    people          INT DEFAULT 2,                  -- Số người chơi
    amount          DECIMAL(12,0) NOT NULL,          -- Tổng tiền (VNĐ)
    status          VARCHAR(15) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','hold','playing','completed','cancelled')),
    payment_method  VARCHAR(30) NOT NULL,           -- "cash", "bank_transfer", "momo"...
    customer_name   VARCHAR(100) NOT NULL,
    customer_phone  VARCHAR(15) NOT NULL,
    customer_email  VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_court_date ON bookings(court_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_phone ON bookings(customer_phone);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SLOT SÂN (court_slots)
-- Mỗi dòng = 1 khung giờ 1h đã được đặt/giữ
-- VD: Sân A1, ngày 4/3, lúc 08:00, trạng thái "booked"
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE court_slots (
    id          SERIAL PRIMARY KEY,
    court_id    INT NOT NULL REFERENCES courts(id),
    slot_date   DATE NOT NULL,                     -- Ngày cụ thể
    date_label  VARCHAR(10) NOT NULL,              -- "4/3"
    time        VARCHAR(5) NOT NULL,               -- "08:00"
    status      VARCHAR(10) NOT NULL DEFAULT 'booked'
                CHECK (status IN ('booked', 'hold')),
    booked_by   VARCHAR(100),                      -- Tên người đặt
    phone       VARCHAR(15),
    booking_id  UUID REFERENCES bookings(id),
    created_at  TIMESTAMP DEFAULT NOW(),

    -- Mỗi sân + ngày + giờ chỉ có 1 slot duy nhất
    UNIQUE(court_id, slot_date, time)
);

CREATE INDEX idx_court_slots_lookup ON court_slots(court_id, slot_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. ĐƠN HÀNG ONLINE (orders)
-- Khách mua hàng qua website, giao hàng hoặc nhận tại chi nhánh
-- Trạng thái: pending → confirmed → processing → shipping → delivered / cancelled
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id),
    type                VARCHAR(10) NOT NULL DEFAULT 'online'
                        CHECK (type IN ('online', 'pos')),
    delivery_method     VARCHAR(10) NOT NULL DEFAULT 'delivery'
                        CHECK (delivery_method IN ('delivery', 'pickup')),
    pickup_branch_id    INT REFERENCES branches(id),    -- Chi nhánh nhận hàng
    fulfilling_warehouse VARCHAR(50),                    -- "Kho Cầu Giấy" - kho xử lý
    customer_coords     JSONB,                           -- {"lat": 21.02, "lng": 105.78}
    customer_name       VARCHAR(100) NOT NULL,
    customer_phone      VARCHAR(15) NOT NULL,
    customer_email      VARCHAR(100),
    customer_address    VARCHAR(255),
    note                TEXT,
    subtotal            DECIMAL(12,0) NOT NULL,          -- Tạm tính
    shipping_fee        DECIMAL(12,0) DEFAULT 0,         -- Phí ship
    total               DECIMAL(12,0) NOT NULL,          -- Tổng cộng
    payment_method      VARCHAR(30) NOT NULL,
    status              VARCHAR(15) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','processing','shipping','delivered','cancelled')),
    approved_by         UUID REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. CHI TIẾT ĐƠN HÀNG (order_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE order_items (
    id              SERIAL PRIMARY KEY,
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      INT NOT NULL REFERENCES products(id),
    product_name    VARCHAR(200) NOT NULL,          -- Snapshot tên SP tại thời điểm mua
    price           DECIMAL(12,0) NOT NULL,         -- Snapshot giá tại thời điểm mua
    qty             INT NOT NULL CHECK (qty > 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. ĐƠN BÁN TẠI QUẦY (sales_orders)
-- Nhân viên tạo đơn POS, cần được duyệt trước khi xuất kho
-- Trạng thái: pending → approved/rejected → exported
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE sales_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by      UUID NOT NULL REFERENCES users(id),   -- NV tạo đơn
    branch_id       INT REFERENCES branches(id),
    customer_name   VARCHAR(100) NOT NULL,
    customer_phone  VARCHAR(15),
    total           DECIMAL(12,0) NOT NULL,
    discount        DECIMAL(12,0) DEFAULT 0,
    final_total     DECIMAL(12,0) NOT NULL,               -- total - discount
    payment_method  VARCHAR(30) NOT NULL,
    note            TEXT,
    status          VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','exported')),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    reject_reason   VARCHAR(255),
    export_slip_id  UUID,                                  -- Liên kết phiếu xuất kho
    sales_code      VARCHAR(30) UNIQUE,                    -- Mã đơn: HD-YYMMDD-XXXX
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_orders_status ON sales_orders(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. CHI TIẾT ĐƠN BÁN TẠI QUẦY (sales_order_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE sales_order_items (
    id              SERIAL PRIMARY KEY,
    sales_order_id  UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200) NOT NULL,
    price           DECIMAL(12,0) NOT NULL,
    qty             INT NOT NULL CHECK (qty > 0)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. TỒN KHO (inventory)
-- Mỗi dòng = 1 SKU tại 1 kho cụ thể
-- Công thức: available = on_hand - reserved
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(20) NOT NULL,               -- Mã SP: "YNX-AX88D"
    product_id      INT REFERENCES products(id),
    warehouse_id    INT NOT NULL REFERENCES warehouses(id),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    on_hand         INT NOT NULL DEFAULT 0,             -- Tổng hàng vật lý trong kho
    reserved        INT NOT NULL DEFAULT 0,             -- Hàng đã giữ cho đơn chưa xuất
    available       INT NOT NULL DEFAULT 0,             -- on_hand - reserved (hàng khả dụng)
    reorder_point   INT NOT NULL DEFAULT 0,             -- Ngưỡng cảnh báo hết hàng
    unit_cost       DECIMAL(12,0) NOT NULL,             -- Giá vốn/đơn vị
    image           VARCHAR(255),
    updated_at      TIMESTAMP DEFAULT NOW(),

    -- Cùng 1 SKU ở 2 kho khác nhau = 2 dòng riêng
    UNIQUE(sku, warehouse_id)
);

CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_sku ON inventory(sku);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. LỊCH SỬ GIAO DỊCH KHO (inventory_transactions)
-- Ghi lại mọi thao tác nhập/xuất/điều chuyển
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(15) NOT NULL
                    CHECK (type IN ('import','export','transfer_out','transfer_in')),
    date            TIMESTAMP NOT NULL,
    sku             VARCHAR(20) NOT NULL,
    warehouse_id    INT NOT NULL REFERENCES warehouses(id),
    qty             INT NOT NULL,
    cost            DECIMAL(12,0) NOT NULL,
    note            TEXT,
    operator        VARCHAR(100),                       -- Tên NV thực hiện
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_txn_warehouse_date ON inventory_transactions(warehouse_id, date);
CREATE INDEX idx_txn_sku ON inventory_transactions(sku);

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. YÊU CẦU ĐIỀU CHUYỂN KHO (transfer_requests)
-- Quy trình 4 bước: pending → approved → in_transit → completed/rejected
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE transfer_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date                TIMESTAMP NOT NULL,
    from_warehouse_id   INT NOT NULL REFERENCES warehouses(id),
    to_warehouse_id     INT NOT NULL REFERENCES warehouses(id),
    reason              VARCHAR(255) NOT NULL,          -- "Hết hàng tại kho đích"
    note                TEXT,
    status              VARCHAR(15) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','in_transit','completed','rejected')),
    pickup_method       VARCHAR(10) NOT NULL
                        CHECK (pickup_method IN ('employee','delivery','customer')),
    created_by          UUID NOT NULL REFERENCES users(id),
    customer_name       VARCHAR(100),                   -- Nếu pickup_method = customer
    customer_phone      VARCHAR(15),
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP,
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfer_status ON transfer_requests(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. HÀNG TRONG PHIẾU ĐIỀU CHUYỂN (transfer_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE transfer_items (
    id                      SERIAL PRIMARY KEY,
    transfer_id             UUID NOT NULL REFERENCES transfer_requests(id) ON DELETE CASCADE,
    sku                     VARCHAR(20) NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    qty                     INT NOT NULL CHECK (qty > 0),
    available_at_request    INT NOT NULL               -- Tồn kho thời điểm yêu cầu
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. ĐƠN ĐẶT HÀNG NHÀ CUNG CẤP (purchase_orders)
-- Admin tạo PO gửi NCC, theo dõi trạng thái nhập hàng
-- Trạng thái: draft → sent → confirmed → shipping → received / cancelled
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id     INT NOT NULL REFERENCES suppliers(id),
    warehouse_id    INT NOT NULL REFERENCES warehouses(id),  -- Kho nhận hàng
    status          VARCHAR(15) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','confirmed','shipping','received','cancelled')),
    total_value     DECIMAL(14,0) NOT NULL,
    note            TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_status ON purchase_orders(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. HÀNG TRONG ĐƠN ĐẶT NCC (po_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE po_items (
    id          SERIAL PRIMARY KEY,
    po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku         VARCHAR(20) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    unit_cost   DECIMAL(12,0) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. PHIẾU NHẬP/XUẤT KHO (admin_warehouse_slips)
-- Admin tạo phiếu → giao NV kho xử lý
-- Trạng thái: pending → processed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE admin_warehouse_slips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(10) NOT NULL CHECK (type IN ('import','export')),
    po_id           UUID REFERENCES purchase_orders(id),    -- Liên kết PO (nếu có)
    supplier_id     INT REFERENCES suppliers(id),
    warehouse_id    INT NOT NULL REFERENCES warehouses(id),
    note            TEXT,
    status          VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processed')),
    created_by      UUID NOT NULL REFERENCES users(id),     -- Admin tạo
    assigned_to     UUID NOT NULL REFERENCES users(id),     -- NV kho xử lý
    processed_at    TIMESTAMP,
    processed_by    UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_slips_status ON admin_warehouse_slips(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. HÀNG TRONG PHIẾU NHẬP/XUẤT (slip_items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE slip_items (
    id          SERIAL PRIMARY KEY,
    slip_id     UUID NOT NULL REFERENCES admin_warehouse_slips(id) ON DELETE CASCADE,
    sku         VARCHAR(20) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    unit_cost   DECIMAL(12,0) NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. ĐÁNH GIÁ SÂN (reviews)
-- Mỗi user chỉ đánh giá 1 lần/sân
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id),
    court_id    INT NOT NULL REFERENCES courts(id),
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content     TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, court_id)
);
