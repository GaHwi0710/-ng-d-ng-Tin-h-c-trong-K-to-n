# Backend

## Chay local

1. Sao chep `.env.example` thanh `.env` va thay `MONGODB_URI` neu dung MongoDB Atlas.
2. Cai dependencies: `npm install` trong `frontend` va `backend`.
3. Tu thu muc goc du an chay: `npm run dev`

Ung dung day du chay tai `http://localhost:5000`.
Frontend va API dung chung mot server local.

Health check: `GET /api/health`

Tai khoan quan ly mac dinh: `admin` / `admin123`. Vai tro duoc lay tu tai khoan sau khi dang nhap, khong nhap tren man hinh dang nhap. Tai khoan moi duoc tao trong khu vuc quan tri.

Các nghiệp vụ ghi chứng từ sử dụng MongoDB transaction khi MongoDB chạy replica set hoặc mongos. Môi trường MongoDB standalone dùng chế độ tương thích để vẫn chạy được local; khi triển khai thật nên bật replica set để đảm bảo rollback nguyên tử.