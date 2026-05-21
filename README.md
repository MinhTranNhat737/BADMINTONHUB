# BadmintonHub

Frontend đã được chuyển vào `frontend/`, backend nằm trong `backend/`.
Tài liệu chi tiết của ứng dụng vẫn nằm trong `frontend/README.md`.

## Chạy dự án từ thư mục gốc

```bash
npm run install:all
npm run dev
```

Frontend chạy tại `http://localhost:3000`, backend API chạy tại `http://localhost:5000`.

Lưu ý: `frontend/` chỉ nên dùng một package manager. Nếu thư mục này có cả `package-lock.json` và `pnpm-lock.yaml`, hãy giữ lại một file lock rồi cài lại sạch `frontend/node_modules`.

## Chạy riêng từng phần

```bash
npm run dev:frontend
npm run dev:backend
```

## Biến môi trường

- Frontend: copy `frontend/.env.example` thành `frontend/.env.local`
- Backend: copy `backend/.env.example` thành `backend/.env`

Frontend mặc định gọi API qua `NEXT_PUBLIC_API_URL=http://localhost:5000/api`.
