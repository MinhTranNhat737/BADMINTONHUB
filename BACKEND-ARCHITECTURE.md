# BadmintonHub — Backend MVC Architecture & Database Design

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Stack công nghệ đề xuất

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| **Runtime** | Node.js 20 LTS | Cùng hệ sinh thái JS với frontend |
| **Framework** | Next.js API Routes (App Router) | Không cần server riêng, tận dụng infra hiện tại |
| **ORM** | Prisma | Type-safe, migration tốt, hỗ trợ PostgreSQL |
| **Database** | PostgreSQL 16 | Quan hệ phức tạp, JSONB, full-text search |
| **Auth** | NextAuth.js + JWT | Session + token-based, hỗ trợ nhiều provider |
| **Validation** | Zod | Type-safe schema validation, tích hợp tốt với TS |
| **Cache** | Redis (tùy chọn) | Cache slot availability, session store |
| **File Storage** | Cloudinary / S3 | Ảnh sản phẩm, avatar |

### 1.2 Cấu trúc thư mục Backend (MVC)

```
app/
  api/                          ← API Routes (View layer - HTTP interface)
    auth/
      login/route.ts
      register/route.ts
      me/route.ts
      forgot-password/route.ts
    branches/
      route.ts                  ← GET (list), POST (create)
      [id]/route.ts             ← GET, PUT, DELETE
    courts/
      route.ts
      [id]/route.ts
      [id]/availability/route.ts
    bookings/
      route.ts
      [id]/route.ts
      [id]/status/route.ts
    products/
      route.ts
      [id]/route.ts
    orders/
      route.ts
      [id]/route.ts
      [id]/status/route.ts
    inventory/
      route.ts
      import/route.ts
      export/route.ts
      check/route.ts
    transfers/
      route.ts
      [id]/route.ts
      [id]/export/route.ts
      [id]/receive/route.ts
    purchase-orders/
      route.ts
      [id]/route.ts
      [id]/status/route.ts
    warehouse-slips/
      route.ts
      [id]/route.ts
      [id]/process/route.ts
    suppliers/
      route.ts
      [id]/route.ts
    sales/
      route.ts
      [id]/route.ts
      [id]/approve/route.ts
    reports/
      revenue/route.ts
      inventory/route.ts
      bookings/route.ts

server/                         ← Backend logic (tách khỏi app/)
  controllers/                  ← Controller layer
    auth.controller.ts
    branch.controller.ts
    court.controller.ts
    booking.controller.ts
    product.controller.ts
    order.controller.ts
    inventory.controller.ts
    transfer.controller.ts
    purchase-order.controller.ts
    supplier.controller.ts
    sales.controller.ts
    report.controller.ts

  services/                     ← Service layer (Business Logic)
    auth.service.ts
    branch.service.ts
    court.service.ts
    booking.service.ts
    product.service.ts
    order.service.ts
    inventory.service.ts
    transfer.service.ts
    purchase-order.service.ts
    supplier.service.ts
    sales.service.ts
    report.service.ts

  models/                       ← Model layer (Prisma schema + helpers)
    prisma/
      schema.prisma             ← Database schema
      migrations/               ← Auto-generated migrations
    index.ts                    ← Prisma client singleton

  middleware/                   ← Middleware
    auth.middleware.ts          ← JWT verification
    role-guard.middleware.ts    ← Role-based access control
    validate.middleware.ts      ← Zod validation wrapper
    error-handler.ts            ← Global error handling

  validators/                   ← Zod schemas
    auth.schema.ts
    booking.schema.ts
    order.schema.ts
    inventory.schema.ts
    product.schema.ts

  utils/                        ← Utilities
    api-response.ts             ← Standardized API responses
    pagination.ts               ← Pagination helpers
    date.ts                     ← Date formatting (VN locale)
    id-generator.ts             ← Generate BK-, ORD-, PO- IDs
```

---

## 2. DATABASE SCHEMA (PostgreSQL + Prisma)

### 2.1 Prisma Schema

```prisma
// server/models/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// USERS & AUTH
// ═══════════════════════════════════════════════════════════════

enum UserRole {
  user
  admin
  employee
  guest
}

enum Gender {
  nam
  nu
}

model User {
  id           String    @id @default(uuid())
  username     String    @unique
  passwordHash String    @map("password_hash")
  fullName     String    @map("full_name")
  email        String    @unique
  phone        String    @unique
  address      String?
  gender       Gender?
  dateOfBirth  DateTime? @map("date_of_birth") @db.Date
  role         UserRole  @default(user)
  warehouseId  Int?      @map("warehouse_id")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  warehouse        Warehouse?           @relation(fields: [warehouseId], references: [id])
  bookings         Booking[]
  orders           Order[]
  reviews          Review[]
  salesOrders      SalesOrder[]         @relation("CreatedBy")
  approvedSales    SalesOrder[]         @relation("ApprovedBy")
  approvedOrders   Order[]              @relation("ApprovedBy")
  createdTransfers TransferRequest[]    @relation("CreatedBy")
  approvedTransfers TransferRequest[]   @relation("ApprovedBy")
  createdSlips     AdminWarehouseSlip[] @relation("CreatedBy")
  assignedSlips    AdminWarehouseSlip[] @relation("AssignedTo")
  processedSlips   AdminWarehouseSlip[] @relation("ProcessedBy")
  createdPOs       PurchaseOrder[]

  @@map("users")
}

// ═══════════════════════════════════════════════════════════════
// BRANCHES & WAREHOUSES
// ═══════════════════════════════════════════════════════════════

model Branch {
  id        Int      @id @default(autoincrement())
  name      String
  address   String
  lat       Decimal  @db.Decimal(10, 6)
  lng       Decimal  @db.Decimal(10, 6)
  phone     String?
  email     String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  courts     Court[]
  warehouses Warehouse[]
  bookings   Booking[]

  @@map("branches")
}

model Warehouse {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  branchId  Int?     @map("branch_id")
  address   String?
  isHub     Boolean  @default(false) @map("is_hub")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  branch           Branch?            @relation(fields: [branchId], references: [id])
  employees        User[]
  inventory        Inventory[]
  transactions     InventoryTransaction[]
  transfersFrom    TransferRequest[]  @relation("FromWarehouse")
  transfersTo      TransferRequest[]  @relation("ToWarehouse")
  warehouseSlips   AdminWarehouseSlip[]
  purchaseOrders   PurchaseOrder[]

  @@map("warehouses")
}

// ═══════════════════════════════════════════════════════════════
// COURTS
// ═══════════════════════════════════════════════════════════════

enum CourtType {
  standard
  premium
  vip
}

model Court {
  id           Int       @id @default(autoincrement())
  name         String
  branchId     Int       @map("branch_id")
  type         CourtType @default(standard)
  indoor       Boolean   @default(true)
  price        Decimal   @db.Decimal(12, 0)
  rating       Decimal   @default(0) @db.Decimal(2, 1)
  reviewsCount Int       @default(0) @map("reviews_count")
  image        String?
  description  String?   @db.Text
  hours        String    @default("06:00 - 22:00")
  available    Boolean   @default(true)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  branch    Branch          @relation(fields: [branchId], references: [id])
  amenities CourtAmenity[]
  slots     CourtSlot[]
  bookings  Booking[]
  reviews   Review[]

  @@map("courts")
}

model CourtAmenity {
  id      Int    @id @default(autoincrement())
  courtId Int    @map("court_id")
  amenity String

  court Court @relation(fields: [courtId], references: [id], onDelete: Cascade)

  @@map("court_amenities")
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS & CATALOG
// ═══════════════════════════════════════════════════════════════

model Product {
  id            Int      @id @default(autoincrement())
  sku           String   @unique
  name          String
  brand         String
  category      String
  price         Decimal  @db.Decimal(12, 0)
  originalPrice Decimal? @map("original_price") @db.Decimal(12, 0)
  rating        Decimal  @default(0) @db.Decimal(2, 1)
  reviewsCount  Int      @default(0) @map("reviews_count")
  image         String?
  description   String?  @db.Text
  specs         Json?    @db.JsonB
  features      Json?    @db.JsonB
  inStock       Boolean  @default(true) @map("in_stock")
  gender        Gender?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  images     ProductImage[]
  badges     ProductBadge[]
  orderItems OrderItem[]
  salesItems SalesOrderItem[]
  inventory  Inventory[]

  @@map("products")
}

model ProductImage {
  id        Int    @id @default(autoincrement())
  productId Int    @map("product_id")
  url       String
  sortOrder Int    @default(0) @map("sort_order")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}

model ProductBadge {
  id        Int    @id @default(autoincrement())
  productId Int    @map("product_id")
  badge     String

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_badges")
}

// ═══════════════════════════════════════════════════════════════
// BOOKINGS & COURT SLOTS
// ═══════════════════════════════════════════════════════════════

enum BookingStatus {
  pending
  confirmed
  playing
  completed
  cancelled
}

model Booking {
  id            String        @id @default(uuid())
  courtId       Int           @map("court_id")
  branchId      Int           @map("branch_id")
  userId        String?       @map("user_id")
  bookingDate   DateTime      @map("booking_date") @db.Date
  dayLabel      String        @map("day_label")
  timeStart     String        @map("time_start")
  timeEnd       String?       @map("time_end")
  people        Int           @default(2)
  amount        Decimal       @db.Decimal(12, 0)
  status        BookingStatus @default(pending)
  paymentMethod String        @map("payment_method")
  customerName  String        @map("customer_name")
  customerPhone String        @map("customer_phone")
  customerEmail String?       @map("customer_email")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  // Relations
  court  Court       @relation(fields: [courtId], references: [id])
  branch Branch      @relation(fields: [branchId], references: [id])
  user   User?       @relation(fields: [userId], references: [id])
  slots  CourtSlot[]

  @@index([courtId, bookingDate])
  @@index([status])
  @@index([customerPhone])
  @@map("bookings")
}

enum SlotStatus {
  booked
  hold
}

model CourtSlot {
  id        Int        @id @default(autoincrement())
  courtId   Int        @map("court_id")
  slotDate  DateTime   @map("slot_date") @db.Date
  dateLabel String     @map("date_label")
  time      String
  status    SlotStatus @default(booked)
  bookedBy  String?    @map("booked_by")
  phone     String?
  bookingId String?    @map("booking_id")
  createdAt DateTime   @default(now()) @map("created_at")

  // Relations
  court   Court    @relation(fields: [courtId], references: [id])
  booking Booking? @relation(fields: [bookingId], references: [id])

  @@unique([courtId, slotDate, time])
  @@index([courtId, slotDate])
  @@map("court_slots")
}

// ═══════════════════════════════════════════════════════════════
// ORDERS (Online)
// ═══════════════════════════════════════════════════════════════

enum OrderType {
  online
  pos
}

enum DeliveryMethod {
  delivery
  pickup
}

enum OrderStatus {
  pending
  confirmed
  processing
  shipping
  delivered
  cancelled
}

model Order {
  id                  String         @id @default(uuid())
  userId              String?        @map("user_id")
  type                OrderType      @default(online)
  deliveryMethod      DeliveryMethod @default(delivery) @map("delivery_method")
  pickupBranchId      Int?           @map("pickup_branch_id")
  fulfillingWarehouse String?        @map("fulfilling_warehouse")
  customerCoords      Json?          @map("customer_coords") @db.JsonB
  customerName        String         @map("customer_name")
  customerPhone       String         @map("customer_phone")
  customerEmail       String?        @map("customer_email")
  customerAddress     String?        @map("customer_address")
  note                String?        @db.Text
  subtotal            Decimal        @db.Decimal(12, 0)
  shippingFee         Decimal        @default(0) @map("shipping_fee") @db.Decimal(12, 0)
  total               Decimal        @db.Decimal(12, 0)
  paymentMethod       String         @map("payment_method")
  status              OrderStatus    @default(pending)
  approvedById        String?        @map("approved_by")
  createdAt           DateTime       @default(now()) @map("created_at")
  updatedAt           DateTime       @updatedAt @map("updated_at")

  // Relations
  user       User?       @relation(fields: [userId], references: [id])
  approvedBy User?       @relation("ApprovedBy", fields: [approvedById], references: [id])
  items      OrderItem[]

  @@index([status])
  @@index([userId])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id          Int     @id @default(autoincrement())
  orderId     String  @map("order_id")
  productId   Int     @map("product_id")
  productName String  @map("product_name")
  price       Decimal @db.Decimal(12, 0)
  qty         Int

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

// ═══════════════════════════════════════════════════════════════
// SALES ORDERS (POS — Nhân viên bán tại quầy)
// ═══════════════════════════════════════════════════════════════

enum SalesOrderStatus {
  pending
  approved
  rejected
  exported
}

model SalesOrder {
  id            String           @id @default(uuid())
  createdById   String           @map("created_by")
  branchId      Int?             @map("branch_id")
  customerName  String           @map("customer_name")
  customerPhone String?          @map("customer_phone")
  total         Decimal          @db.Decimal(12, 0)
  discount      Decimal          @default(0) @db.Decimal(12, 0)
  finalTotal    Decimal          @map("final_total") @db.Decimal(12, 0)
  paymentMethod String           @map("payment_method")
  note          String?          @db.Text
  status        SalesOrderStatus @default(pending)
  approvedById  String?          @map("approved_by")
  approvedAt    DateTime?        @map("approved_at")
  rejectReason  String?          @map("reject_reason")
  exportSlipId  String?          @map("export_slip_id")
  createdAt     DateTime         @default(now()) @map("created_at")

  // Relations
  createdBy  User             @relation("CreatedBy", fields: [createdById], references: [id])
  approvedBy User?            @relation("ApprovedBy", fields: [approvedById], references: [id])
  items      SalesOrderItem[]

  @@index([status])
  @@map("sales_orders")
}

model SalesOrderItem {
  id           Int     @id @default(autoincrement())
  salesOrderId String  @map("sales_order_id")
  productId    Int     @map("product_id")
  productName  String  @map("product_name")
  price        Decimal @db.Decimal(12, 0)
  qty          Int

  salesOrder SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)
  product    Product    @relation(fields: [productId], references: [id])

  @@map("sales_order_items")
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════

model Inventory {
  id           Int      @id @default(autoincrement())
  sku          String
  productId    Int?     @map("product_id")
  warehouseId  Int      @map("warehouse_id")
  name         String
  category     String
  onHand       Int      @default(0) @map("on_hand")
  reserved     Int      @default(0)
  available    Int      @default(0)
  reorderPoint Int      @default(0) @map("reorder_point")
  unitCost     Decimal  @map("unit_cost") @db.Decimal(12, 0)
  image        String?
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  product   Product?  @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([sku, warehouseId])
  @@index([warehouseId])
  @@index([sku])
  @@map("inventory")
}

enum TransactionType {
  import
  export
  transfer_out
  transfer_in
}

model InventoryTransaction {
  id          String          @id @default(uuid())
  type        TransactionType
  date        DateTime
  sku         String
  warehouseId Int             @map("warehouse_id")
  qty         Int
  cost        Decimal         @db.Decimal(12, 0)
  note        String?         @db.Text
  operator    String?
  createdAt   DateTime        @default(now()) @map("created_at")

  // Relations
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@index([warehouseId, date])
  @@index([sku])
  @@map("inventory_transactions")
}

// ═══════════════════════════════════════════════════════════════
// TRANSFERS (Điều chuyển kho)
// ═══════════════════════════════════════════════════════════════

enum TransferStatus {
  pending
  approved
  in_transit
  completed
  rejected
}

enum PickupMethod {
  employee
  delivery
  customer
}

model TransferRequest {
  id              String         @id @default(uuid())
  date            DateTime
  fromWarehouseId Int            @map("from_warehouse_id")
  toWarehouseId   Int            @map("to_warehouse_id")
  reason          String
  note            String?        @db.Text
  status          TransferStatus @default(pending)
  pickupMethod    PickupMethod   @map("pickup_method")
  createdById     String         @map("created_by")
  customerName    String?        @map("customer_name")
  customerPhone   String?        @map("customer_phone")
  approvedById    String?        @map("approved_by")
  approvedAt      DateTime?      @map("approved_at")
  completedAt     DateTime?      @map("completed_at")
  createdAt       DateTime       @default(now()) @map("created_at")

  // Relations
  fromWarehouse Warehouse      @relation("FromWarehouse", fields: [fromWarehouseId], references: [id])
  toWarehouse   Warehouse      @relation("ToWarehouse", fields: [toWarehouseId], references: [id])
  createdBy     User           @relation("CreatedBy", fields: [createdById], references: [id])
  approvedBy    User?          @relation("ApprovedBy", fields: [approvedById], references: [id])
  items         TransferItem[]

  @@index([status])
  @@map("transfer_requests")
}

model TransferItem {
  id                 Int    @id @default(autoincrement())
  transferId         String @map("transfer_id")
  sku                String
  name               String
  qty                Int
  availableAtRequest Int    @map("available_at_request")

  transfer TransferRequest @relation(fields: [transferId], references: [id], onDelete: Cascade)

  @@map("transfer_items")
}

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDERS (Đặt hàng nhà cung cấp)
// ═══════════════════════════════════════════════════════════════

enum POStatus {
  draft
  sent
  confirmed
  shipping
  received
  cancelled
}

model PurchaseOrder {
  id          String   @id @default(uuid())
  supplierId  Int      @map("supplier_id")
  warehouseId Int      @map("warehouse_id")
  status      POStatus @default(draft)
  totalValue  Decimal  @map("total_value") @db.Decimal(14, 0)
  note        String?  @db.Text
  createdById String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  supplier  Supplier @relation(fields: [supplierId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  createdBy User     @relation(fields: [createdById], references: [id])
  items     POItem[]
  slips     AdminWarehouseSlip[]

  @@index([status])
  @@map("purchase_orders")
}

model POItem {
  id       Int     @id @default(autoincrement())
  poId     String  @map("po_id")
  sku      String
  name     String
  qty      Int
  unitCost Decimal @map("unit_cost") @db.Decimal(12, 0)

  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  @@map("po_items")
}

// ═══════════════════════════════════════════════════════════════
// ADMIN WAREHOUSE SLIPS (Phiếu xuất/nhập kho)
// ═══════════════════════════════════════════════════════════════

enum SlipType {
  import
  export
}

enum SlipStatus {
  pending
  processed
}

model AdminWarehouseSlip {
  id            String     @id @default(uuid())
  type          SlipType
  poId          String?    @map("po_id")
  supplierId    Int?       @map("supplier_id")
  warehouseId   Int        @map("warehouse_id")
  note          String?    @db.Text
  status        SlipStatus @default(pending)
  createdById   String     @map("created_by")
  assignedToId  String     @map("assigned_to")
  processedAt   DateTime?  @map("processed_at")
  processedById String?    @map("processed_by")
  createdAt     DateTime   @default(now()) @map("created_at")

  // Relations
  purchaseOrder PurchaseOrder? @relation(fields: [poId], references: [id])
  warehouse     Warehouse      @relation(fields: [warehouseId], references: [id])
  createdBy     User           @relation("CreatedBy", fields: [createdById], references: [id])
  assignedTo    User           @relation("AssignedTo", fields: [assignedToId], references: [id])
  processedBy   User?          @relation("ProcessedBy", fields: [processedById], references: [id])
  items         SlipItem[]

  @@index([status])
  @@map("admin_warehouse_slips")
}

model SlipItem {
  id       Int     @id @default(autoincrement())
  slipId   String  @map("slip_id")
  sku      String
  name     String
  qty      Int
  unitCost Decimal @map("unit_cost") @db.Decimal(12, 0)

  slip AdminWarehouseSlip @relation(fields: [slipId], references: [id], onDelete: Cascade)

  @@map("slip_items")
}

// ═══════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════

model Supplier {
  id            Int      @id @default(autoincrement())
  name          String
  contactPerson String   @map("contact_person")
  phone         String
  email         String
  address       String?
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  purchaseOrders PurchaseOrder[]

  @@map("suppliers")
}

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════

model Review {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id")
  courtId   Int      @map("court_id")
  rating    Int
  content   String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user  User  @relation(fields: [userId], references: [id])
  court Court @relation(fields: [courtId], references: [id])

  @@unique([userId, courtId])
  @@map("reviews")
}
```

---

## 3. MVC FLOW — Chi tiết từng layer

### 3.1 Request Flow

```
Client Request
    ↓
API Route (app/api/bookings/route.ts)     ← Route definition
    ↓
Middleware (auth → role-guard → validate)  ← Cross-cutting concerns
    ↓
Controller (booking.controller.ts)         ← Parse request, call service
    ↓
Service (booking.service.ts)               ← Business logic
    ↓
Model (Prisma Client)                      ← Database query
    ↓
PostgreSQL                                 ← Data storage
```

### 3.2 Ví dụ cụ thể: Booking Flow

#### API Route
```typescript
// app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { authMiddleware } from "@/server/middleware/auth.middleware"
import { BookingController } from "@/server/controllers/booking.controller"

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (auth.error) return auth.error
  return BookingController.list(req, auth.user)
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req)
  if (auth.error) return auth.error
  return BookingController.create(req, auth.user)
}
```

#### Controller
```typescript
// server/controllers/booking.controller.ts
import { NextRequest, NextResponse } from "next/server"
import { BookingService } from "@/server/services/booking.service"
import { createBookingSchema } from "@/server/validators/booking.schema"
import { apiSuccess, apiError } from "@/server/utils/api-response"

export class BookingController {
  static async list(req: NextRequest, user: AuthUser) {
    const { searchParams } = new URL(req.url)
    const filters = {
      status: searchParams.get("status"),
      branchId: searchParams.get("branchId"),
      date: searchParams.get("date"),
      search: searchParams.get("search"),
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
    }

    // Admin sees all, employee sees branch, user sees own
    const result = await BookingService.list(filters, user)
    return apiSuccess(result)
  }

  static async create(req: NextRequest, user: AuthUser) {
    const body = await req.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("Validation error", 400, parsed.error.flatten())
    }

    const booking = await BookingService.create(parsed.data, user)
    return apiSuccess(booking, 201)
  }
}
```

#### Service
```typescript
// server/services/booking.service.ts
import { prisma } from "@/server/models"
import { BookingStatus } from "@prisma/client"

export class BookingService {
  static async list(filters: BookingFilters, user: AuthUser) {
    const where: any = {}

    // Role-based filtering
    if (user.role === "user") {
      where.userId = user.id
    } else if (user.role === "employee") {
      where.branch = { warehouses: { some: { id: user.warehouseId } } }
    }
    // admin sees all

    if (filters.status) where.status = filters.status
    if (filters.branchId) where.branchId = parseInt(filters.branchId)
    if (filters.date) where.bookingDate = new Date(filters.date)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
        { customerPhone: { contains: filters.search } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { court: true, branch: true, slots: true },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.booking.count({ where }),
    ])

    return { items, total, page: filters.page, totalPages: Math.ceil(total / filters.limit) }
  }

  static async create(data: CreateBookingInput, user: AuthUser) {
    // 1. Check slot availability
    const conflicting = await prisma.courtSlot.findFirst({
      where: {
        courtId: data.courtId,
        slotDate: new Date(data.bookingDate),
        time: { in: data.timeSlots },
      },
    })
    if (conflicting) {
      throw new AppError("Khung giờ đã được đặt", 409)
    }

    // 2. Calculate amount
    const court = await prisma.court.findUniqueOrThrow({
      where: { id: data.courtId },
    })
    const amount = Number(court.price) * data.timeSlots.length

    // 3. Create booking + slots in transaction
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          courtId: data.courtId,
          branchId: court.branchId,
          userId: user.role !== "guest" ? user.id : null,
          bookingDate: new Date(data.bookingDate),
          dayLabel: data.dayLabel,
          timeStart: data.timeSlots[0],
          timeEnd: data.timeSlots[data.timeSlots.length - 1],
          people: data.people,
          amount,
          status: "pending",
          paymentMethod: data.paymentMethod,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
        },
      })

      // Reserve slots
      await tx.courtSlot.createMany({
        data: data.timeSlots.map((time) => ({
          courtId: data.courtId,
          slotDate: new Date(data.bookingDate),
          dateLabel: data.dayLabel,
          time,
          status: "booked",
          bookedBy: data.customerName,
          phone: data.customerPhone,
          bookingId: booking.id,
        })),
      })

      return booking
    })
  }

  static async updateStatus(id: string, status: BookingStatus, user: AuthUser) {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id } })

    // If cancelling, release slots
    if (status === "cancelled") {
      await prisma.courtSlot.deleteMany({
        where: { bookingId: id },
      })
    }

    return prisma.booking.update({
      where: { id },
      data: { status },
    })
  }
}
```

---

## 4. API ENDPOINTS — Danh sách đầy đủ

### 4.1 Auth
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| POST | `/api/auth/login` | Đăng nhập → JWT | Public |
| POST | `/api/auth/register` | Đăng ký tài khoản | Public |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | Authenticated |
| PUT | `/api/auth/profile` | Cập nhật profile | Authenticated |
| POST | `/api/auth/forgot-password` | Tìm tài khoản theo SĐT | Public |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu | Public |

### 4.2 Branches
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/branches` | Danh sách chi nhánh | Public |
| GET | `/api/branches/:id` | Chi tiết chi nhánh | Public |
| POST | `/api/branches` | Tạo chi nhánh | Admin |
| PUT | `/api/branches/:id` | Cập nhật chi nhánh | Admin |

### 4.3 Courts
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/courts` | Danh sách sân (filter: branch, type, price) | Public |
| GET | `/api/courts/:id` | Chi tiết sân + amenities | Public |
| GET | `/api/courts/:id/availability?date=` | Lịch trống theo ngày | Public |
| POST | `/api/courts` | Tạo sân | Admin |
| PUT | `/api/courts/:id` | Cập nhật sân | Admin |
| DELETE | `/api/courts/:id` | Xóa sân | Admin |

### 4.4 Bookings
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/bookings` | Danh sách booking (phân quyền) | Authenticated |
| GET | `/api/bookings/:id` | Chi tiết booking | Owner/Admin/Employee |
| POST | `/api/bookings` | Tạo booking mới | Authenticated |
| PUT | `/api/bookings/:id` | Cập nhật booking | Admin |
| PATCH | `/api/bookings/:id/status` | Đổi trạng thái | Admin/Employee |
| DELETE | `/api/bookings/:id` | Hủy & xóa booking | Admin |

### 4.5 Products
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/products` | Danh sách sản phẩm (filter, search, sort) | Public |
| GET | `/api/products/:id` | Chi tiết sản phẩm | Public |
| POST | `/api/products` | Tạo sản phẩm | Admin |
| PUT | `/api/products/:id` | Cập nhật sản phẩm | Admin |
| DELETE | `/api/products/:id` | Xóa sản phẩm | Admin |

### 4.6 Orders (Online)
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/orders` | Danh sách đơn hàng | Authenticated |
| GET | `/api/orders/:id` | Chi tiết đơn hàng | Owner/Admin |
| POST | `/api/orders` | Tạo đơn hàng | Authenticated |
| PATCH | `/api/orders/:id/status` | Cập nhật trạng thái | Admin/Employee |

### 4.7 Sales Orders (POS)
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/sales` | Danh sách đơn bán tại quầy | Employee/Admin |
| POST | `/api/sales` | Tạo đơn bán hàng | Employee |
| PATCH | `/api/sales/:id/approve` | Duyệt/từ chối đơn | Admin/Employee |

### 4.8 Inventory
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/inventory` | Tồn kho (filter: warehouse, category, sku) | Employee/Admin |
| GET | `/api/inventory/transactions` | Lịch sử giao dịch | Employee/Admin |
| POST | `/api/inventory/import` | Nhập kho | Employee |
| POST | `/api/inventory/export` | Xuất kho | Employee |

### 4.9 Transfers
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/transfers` | Danh sách phiếu điều chuyển | Employee/Admin |
| GET | `/api/transfers/:id` | Chi tiết phiếu | Employee/Admin |
| POST | `/api/transfers` | Tạo yêu cầu điều chuyển | Employee |
| PATCH | `/api/transfers/:id/status` | Cập nhật trạng thái | Admin |
| POST | `/api/transfers/:id/export` | Xuất hàng điều chuyển | Employee |
| POST | `/api/transfers/:id/receive` | Nhận hàng điều chuyển | Employee |

### 4.10 Purchase Orders
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/purchase-orders` | Danh sách PO | Admin |
| GET | `/api/purchase-orders/:id` | Chi tiết PO | Admin |
| POST | `/api/purchase-orders` | Tạo PO | Admin |
| PATCH | `/api/purchase-orders/:id/status` | Cập nhật trạng thái PO | Admin |
| DELETE | `/api/purchase-orders/:id` | Xóa PO (draft only) | Admin |

### 4.11 Warehouse Slips
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/warehouse-slips` | Danh sách phiếu | Employee/Admin |
| POST | `/api/warehouse-slips` | Tạo phiếu nhập/xuất | Admin |
| POST | `/api/warehouse-slips/:id/process` | Xử lý phiếu | Employee |

### 4.12 Suppliers
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/suppliers` | Danh sách NCC | Admin |
| POST | `/api/suppliers` | Thêm NCC | Admin |
| PUT | `/api/suppliers/:id` | Cập nhật NCC | Admin |

### 4.13 Reports
| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| GET | `/api/reports/revenue` | Báo cáo doanh thu | Admin |
| GET | `/api/reports/inventory` | Báo cáo tồn kho | Admin |
| GET | `/api/reports/bookings` | Thống kê đặt sân | Admin |

---

## 5. MIDDLEWARE

### 5.1 Auth Middleware
```typescript
// server/middleware/auth.middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { verify } from "jsonwebtoken"

export interface AuthUser {
  id: string
  username: string
  role: "user" | "admin" | "employee" | "guest"
  warehouseId?: number
}

export async function authMiddleware(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")

  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    }
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as AuthUser
    return { error: null, user: decoded }
  } catch {
    return {
      error: NextResponse.json({ error: "Token invalid" }, { status: 401 }),
      user: null,
    }
  }
}
```

### 5.2 Role Guard
```typescript
// server/middleware/role-guard.middleware.ts
import { AuthUser } from "./auth.middleware"

export function requireRole(...roles: AuthUser["role"][]) {
  return (user: AuthUser) => {
    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden — Bạn không có quyền truy cập" },
        { status: 403 }
      )
    }
    return null
  }
}
```

### 5.3 Validation (Zod)
```typescript
// server/validators/booking.schema.ts
import { z } from "zod"

export const createBookingSchema = z.object({
  courtId: z.number().int().positive(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayLabel: z.string(),
  timeSlots: z.array(z.string().regex(/^\d{2}:00$/)).min(1).max(16),
  people: z.number().int().min(1).max(20),
  paymentMethod: z.string(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().regex(/^0\d{9}$/, "SĐT phải có 10 số bắt đầu bằng 0"),
  customerEmail: z.string().email().optional().or(z.literal("")),
})
```

---

## 6. STANDARDIZED API RESPONSE

```typescript
// server/utils/api-response.ts

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function apiSuccess<T>(data: T, status = 200, meta?: ApiResponse<T>["meta"]) {
  return NextResponse.json({ success: true, data, meta }, { status })
}

export function apiError(message: string, status = 400, details?: any) {
  return NextResponse.json({ success: false, error: message, details }, { status })
}
```

---

## 7. MAPPING: localStorage → Database

| localStorage Key | → Database Table(s) |
|---|---|
| `badmintonhub_users` | `users` |
| `badmintonhub_session` | JWT token (stateless) |
| `bh_courts` | `courts` + `court_amenities` |
| `bh_bookings_history` | `bookings` |
| `bh_court_bookings` | `court_slots` |
| `badmintonhub_orders` | `orders` + `order_items` |
| `badmintonhub_cart` | Client-side only (hoặc `carts` table nếu cần) |
| `salesOrders` | `sales_orders` + `sales_order_items` |
| `bh_inventory` | `inventory` |
| `bh_transactions` | `inventory_transactions` |
| `bh_transfers` | `transfer_requests` + `transfer_items` |
| `bh_admin_slips` | `admin_warehouse_slips` + `slip_items` |
| `bh_purchase_orders` | `purchase_orders` + `po_items` |

---

## 8. CÔNG THỨC NGHIỆP VỤ TỒN KHO (giữ nguyên)

```
available = onHand − reserved

NHẬP KHO:  onHand += qty,  available += qty
XUẤT KHO:  onHand -= qty,  available -= qty  (check: available >= qty)

ĐIỀU CHUYỂN:
  1. Tạo request     → status = "pending"
  2. Kho nguồn xuất  → onHand -= qty, available -= qty, status = "in_transit"
  3. Kho đích nhận   → onHand += qty, available += qty, status = "completed"
  4. Từ chối         → status = "rejected", tồn kho không đổi
```

---

## 9. SEED DATA

```typescript
// server/models/prisma/seed.ts
// Chạy: npx prisma db seed

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // 1. Branches
  const branches = await Promise.all([
    prisma.branch.create({ data: { name: "BadmintonHub Cầu Giấy", address: "Số 12 Trần Thái Tông...", lat: 21.0285, lng: 105.7823 } }),
    prisma.branch.create({ data: { name: "BadmintonHub Thanh Xuân", address: "Số 68 Nguyễn Trãi...", lat: 20.9935, lng: 105.8000 } }),
    prisma.branch.create({ data: { name: "BadmintonHub Long Biên", address: "Số 25 Nguyễn Văn Cừ...", lat: 21.0460, lng: 105.8648 } }),
  ])

  // 2. Warehouses (4 kho: 3 chi nhánh + 1 hub)
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { name: "Kho Cầu Giấy", branchId: branches[0].id } }),
    prisma.warehouse.create({ data: { name: "Kho Thanh Xuân", branchId: branches[1].id } }),
    prisma.warehouse.create({ data: { name: "Kho Long Biên", branchId: branches[2].id } }),
    prisma.warehouse.create({ data: { name: "Kho Hub", isHub: true } }),
  ])

  // 3. Admin user
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
      fullName: "Quản trị viên",
      email: "admin@badmintonhub.vn",
      phone: "0901234567",
      role: "admin",
    },
  })

  // 4. Employee users (1 per warehouse)
  // ... tương tự DEFAULT_EMPLOYEES trong auth-context.tsx

  // 5. Courts (11 sân) — từ database seed

  // 6. Products (34 sản phẩm) — từ database seed

  // 7. Inventory (132 entries) — từ database seed

  // 8. Suppliers (3 NCC) — từ database seed
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## 10. MIGRATION PLAN (localStorage → PostgreSQL)

### Phase 1: Setup (1-2 ngày)
- [x] Thiết kế database schema
- [ ] Cài đặt PostgreSQL + Prisma
- [ ] Chạy `prisma migrate dev --name init`
- [ ] Viết seed data
- [ ] Tạo Prisma client singleton

### Phase 2: Backend Core (3-5 ngày)
- [ ] Middleware: auth, role-guard, validation, error-handler
- [ ] API: Auth (login, register, me, forgot-password)
- [ ] API: Branches, Courts, Court availability
- [ ] API: Bookings (CRUD + slot management)
- [ ] API: Products (CRUD)

### Phase 3: Business Logic (3-5 ngày)
- [ ] API: Orders (online checkout)
- [ ] API: Sales Orders (POS)
- [ ] API: Inventory (import, export, check)
- [ ] API: Transfers (4-step workflow)
- [ ] API: Purchase Orders
- [ ] API: Warehouse Slips

### Phase 4: Frontend Migration (3-5 ngày)
- [ ] Tạo API client (`lib/api.ts`) thay localStorage
- [ ] Migrate auth-context → API calls
- [ ] Migrate inventory-context → API calls
- [ ] Migrate tất cả page components
- [ ] Migrate cart (giữ client-side hoặc server-side)

### Phase 5: Testing & Polish (2-3 ngày)
- [ ] Integration tests cho các API critical
- [ ] Error handling edge cases
- [ ] Performance optimization (indexes, pagination)
- [ ] Reports API

---

## 11. COMMANDS BẮT ĐẦU

```bash
# 1. Cài dependencies
pnpm add prisma @prisma/client bcryptjs jsonwebtoken zod
pnpm add -D @types/bcryptjs @types/jsonwebtoken

# 2. Init Prisma
npx prisma init --datasource-provider postgresql

# 3. Cấu hình .env
# DATABASE_URL="postgresql://user:password@localhost:5432/badmintonhub"
# JWT_SECRET="your-secret-key-here"

# 4. Tạo migration
npx prisma migrate dev --name init

# 5. Seed data
npx prisma db seed

# 6. Mở Prisma Studio (GUI xem data)
npx prisma studio
```
