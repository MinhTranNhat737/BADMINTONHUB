# Deploy BadmintonHub bằng GitHub Student Pack (chạy production ổn định)

Hướng dẫn này triển khai full hệ thống:
- Frontend Next.js (`/`)
- Backend Express (`/backend`)
- PostgreSQL cloud

Mục tiêu: deploy dùng bình thường, có domain public, API hoạt động ổn định.

---

## 1) Kiến trúc khuyến nghị (dùng ưu đãi Student Pack)

Luồng ổn định nhất với Student Pack:
- **DigitalOcean App Platform** cho frontend + backend (dùng credit Student Pack)
- **Managed PostgreSQL** trên DigitalOcean

> Nếu trong Student Pack của bạn không còn DigitalOcean credit, có thể giữ nguyên kỹ thuật bên dưới và thay provider tương đương (Railway/Render + Neon).

---

## 2) Chuẩn bị trước khi deploy

1. Push code lên GitHub (branch `main` hoặc branch deploy)
2. Đảm bảo có 2 file env mẫu:
   - `.env.example`
   - `backend/.env.example`
3. Tạo database PostgreSQL cloud và lấy `DATABASE_URL`

---

## 3) Tạo PostgreSQL + import schema

### 3.1 Tạo database
- Tạo **Managed PostgreSQL** trên DigitalOcean
- Copy connection string dạng:

`postgresql://user:password@host:port/dbname?sslmode=require`

### 3.2 Import schema + seed
Chạy lần lượt 3 file SQL trong thư mục `database/`:

1. `database/01_create_tables.sql`
2. `database/02_seed_data.sql`
3. `database/03_views_functions.sql`

Bạn có thể import bằng `psql` local:

```bash
psql "<DATABASE_URL>" -f database/01_create_tables.sql
psql "<DATABASE_URL>" -f database/02_seed_data.sql
psql "<DATABASE_URL>" -f database/03_views_functions.sql
```

---

## 4) Deploy Backend (App Platform)

Tạo service mới từ GitHub repo:
- **Type**: Web Service
- **Source directory**: `backend`
- **Build command**: `npm ci`
- **Run command**: `npm start`

### Environment variables (Backend)

Bắt buộc:
- `NODE_ENV=production`
- `PORT=5000` (hoặc để platform tự inject)
- `DATABASE_URL=<your_database_url>`
- `DB_SSL=true`

Tạm thời để CORS (sẽ cập nhật lại sau khi có domain frontend):
- `CORS_ORIGIN=https://<frontend-domain>.ondigitalocean.app`

Health check:
- Path: `/health`

Sau deploy thành công, lấy URL backend, ví dụ:
- `https://badmintonhub-api-xxxxx.ondigitalocean.app`

---

## 5) Deploy Frontend (App Platform)

Tạo service thứ 2 từ cùng repo:
- **Type**: Web Service
- **Source directory**: `/` (root project)
- **Build command**: `pnpm install --frozen-lockfile && pnpm build`
- **Run command**: `pnpm start`

### Environment variables (Frontend)

- `NEXT_PUBLIC_API_URL=https://<backend-domain>/api`

Ví dụ:
- `NEXT_PUBLIC_API_URL=https://badmintonhub-api-xxxxx.ondigitalocean.app/api`

---

## 6) Cập nhật CORS lần cuối

Sau khi frontend có domain chính thức, sửa backend env:

- `CORS_ORIGIN=https://<frontend-domain>.ondigitalocean.app`

Nếu cần nhiều domain (preview + custom):

- `CORS_ORIGIN=https://frontend-a.ondigitalocean.app,https://app.yourdomain.com`

---

## 7) Domain thật (tuỳ chọn)

Nếu bạn có domain từ Student Pack:
1. Trỏ domain vào frontend service (App Platform)
2. Bật HTTPS (Let’s Encrypt tự động)
3. Update lại backend `CORS_ORIGIN` theo domain mới

---

## 8) Checklist nghiệm thu sau deploy

Frontend:
- Mở trang chủ OK
- Đăng ký / đăng nhập OK
- Trang `/courts`, `/shop` load được dữ liệu

Backend:
- `GET /health` trả `status: OK`
- Không còn lỗi CORS khi gọi từ frontend

Nghiệp vụ:
- Tạo booking thành công
- Tạo order thành công
- Admin/Employee xem được dữ liệu

---

## 9) Lỗi thường gặp và cách xử lý

### Lỗi `CORS blocked`
- Kiểm tra đúng domain frontend trong `CORS_ORIGIN`
- Nếu nhiều domain, ngăn cách bằng dấu phẩy

### Lỗi kết nối DB
- Kiểm tra `DATABASE_URL`
- Bật `DB_SSL=true`
- Kiểm tra whitelist/network policy của DB provider

### Frontend gọi nhầm localhost
- Kiểm tra `NEXT_PUBLIC_API_URL`
- Redeploy frontend sau khi đổi env

---

## 10) Gợi ý CI/CD tối thiểu

Với App Platform + GitHub:
- Push vào `main` sẽ tự auto deploy
- Nên bật nhánh staging để test trước production

---

Nếu bạn muốn, bước tiếp theo mình có thể tạo luôn cấu hình deploy theo hướng **1-click bằng Docker Compose + Droplet** để bạn dùng hết credit Student Pack dễ hơn.