# BÁO CÁO KIỂM TOÁN TOÀN DIỆN BẢO MẬT & PHÂN QUYỀN
## HỆ THỐNG QUẢN LÝ CỬA HÀNG MẸ & BÉ (BABY SHOP MANAGEMENT)

*Thời điểm thực hiện: 27/09/2026*  
*Người thực hiện: Senior Full-Stack Developer + Security Engineer + QA Engineer*  
*Trạng thái: Hoàn tất 100% các tiêu chuẩn kiểm thử Backend, Frontend, MongoDB và Phân quyền*

---

## MỤC LỤC
1. [Danh sách tài khoản đã kiểm tra](#1-danh-sách-tài-khoản-đã-kiểm-tra)
2. [Các tài khoản hard-code đã xóa](#2-các-tài-khoản-hard-code-đã-xóa)
3. [Bảng phân quyền thực tế (Role & Permission Matrix)](#3-bảng-phân-quyền-thực-tế)
4. [Luồng xử lý Permission (Backend & Frontend)](#4-luồng-xử-lý-permission)
5. [Danh sách các nút / Menu đã ẩn khi không có quyền](#5-danh-sách-các-nút--menu-đã-ẩn-khi-không-có-quyền)
6. [Danh sách API đã chặn (HTTP 403 Enforcement)](#6-danh-sách-api-đã-chặn)
7. [Bằng chứng kiểm tra Audit Log (Nhật ký kiểm toán)](#7-bằng-chứng-kiểm-tra-audit-log)
8. [Bằng chứng kiểm tra Backup & Restore (Sao lưu & Phục hồi)](#8-bằng-chứng-kiểm-tra-backup--restore)
9. [Bằng chứng không còn Công nợ khách hàng (YC2)](#9-bằng-chứng-không-còn-công-nợ-khách-hàng)
10. [Bằng chứng bảo vệ Công nợ nhà cung cấp (YC3)](#10-bằng-chứng-bảo-vệ-công-nợ-nhà-cung-cấp)
11. [Bằng chứng trạng thái Phiếu thu / Phiếu chi (YC4)](#11-bằng-chứng-trạng-thái-phiếu-thu--phiếu-chi)
12. [Kết quả kiểm tra Real-Time Permission](#12-kết-quả-kiểm-tra-real-time-permission)
13. [Kết quả Test Matrix](#13-kết-quả-test-matrix)
14. [Kết quả Build Frontend / Backend Syntax](#14-kết-quả-build-frontend--backend-syntax)
15. [Danh sách các file đã sửa](#15-danh-sách-các-file-đã-sửa)
16. [Hướng dẫn kiểm tra cho người dùng](#16-hướng-dẫn-kiểm-tra-cho-người-dùng)
17. [Kết luận hệ thống](#17-kết-luận-hệ-thống)

---

## 1. DANH SÁCH TÀI KHOẢN ĐÃ KIỂM TRA

Toàn bộ tài khoản hiện tại được lưu trữ và xác thực trực tiếp qua MongoDB collection `Users` (kèm mật khẩu băm bảo mật bcrypt) và liên kết hồ sơ nhân sự trong collection `NhanVien`:

| Tên đăng nhập | Họ và tên | Vai trò (Role) | Mã vai trò | Trạng thái | Nguồn dữ liệu |
|---|---|---|---|---|---|
| `admin` | Quản trị viên | Quản lý (`QuanLy`) | 1 | Hoạt động | MongoDB `Users` + `NhanVien` |
| `quantri` | Quản trị hệ thống | Quản trị hệ thống (`QuanTriHeThong`) | 1 | Hoạt động | MongoDB `Users` + `NhanVien` |
| `maianh` | Nguyễn Mai Anh | NV Bán hàng (`NhanVienBanHang`) | 2 | Hoạt động | MongoDB `Users` + `NhanVien` |
| `vanhung` | Trần Văn Hùng | Thủ kho (`NhanVienKho`) | 3 | Hoạt động | MongoDB `Users` + `NhanVien` |
| `ketoan` | Lê Thị Kế Toán | Kế toán (`KeToan`) | 4 | Hoạt động | MongoDB `Users` + `NhanVien` |
| `muahang` | Phạm Văn Mua Hàng | NV Mua hàng (`NhanVienMuaHang`) | 5 | Hoạt động | MongoDB `Users` + `NhanVien` |

*Ghi chú: Thử nghiệm đăng nhập tài khoản giả lập (`fake_user`, tài khoản sai mật khẩu) đều bị Backend từ chối với HTTP 401.*

---

## 2. CÁC TÀI KHOẢN HARD-CODE ĐÃ XÓA

1. **Backend (`backend/src/modules/auth/auth.route.js`)**:
   - Đã xóa hoàn toàn biến `const defaultAccounts = { ... }` (dòng 13–25 cũ) gồm các tài khoản admin, maianh, vanhung, ketoan, muahang viết sẵn mật khẩu plain text.
   - Đã xóa hoàn toàn khối fallback logic `else if (defaultAccounts[rawUsername]) { ... }` (dòng 65–75 cũ).
   - Cơ chế đăng nhập hiện tại: **Chỉ truy vấn MongoDB `Users` và `NhanVien`**. Nếu không tìm thấy hoặc mật khẩu không khớp mã băm `passwordHash`, lập tức trả về mã lỗi `HTTP 401: Tên đăng nhập hoặc mật khẩu không chính xác`.
2. **Frontend (`frontend/src/pages/LoginPage.jsx`)**:
   - Đã loại bỏ hoàn toàn danh sách chip tài khoản demo (`demoAccounts`) và hàm `fillDemo`.
   - Giao diện đăng nhập chỉ còn 2 ô nhập liệu thực tế (Username & Password) với placeholder chuẩn nghiệp vụ, không gợi ý tài khoản mẫu.

---

## 3. BẢNG PHÂN QUYỀN THỰC TẾ

Hệ thống quản lý phân quyền thông qua ma trận quyền `QuyenHan` trong MongoDB collection `VaiTro`, bao gồm 4 hành động chuẩn `["xem", "tao", "sua", "xoa"]`:

| Phân nhóm | Module (Key) | Quản lý (`QuanLy`) | NV Bán hàng (`NhanVienBanHang`) | Thủ kho (`NhanVienKho`) | Kế toán (`KeToan`) | NV Mua hàng (`NhanVienMuaHang`) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Tổng quan** | `dashboard` | Toàn quyền | Xem | Xem | Xem | Xem |
| **Danh mục** | `customers` | Toàn quyền | Xem, Tạo, Sửa | ❌ Không | Xem | ❌ Không |
| | `suppliers` | Toàn quyền | ❌ Không | ❌ Không | Xem | Xem, Tạo, Sửa |
| | `products` | Toàn quyền | Xem | Toàn quyền | Xem | Xem |
| | `product-categories` | Toàn quyền | Xem | Toàn quyền | Xem | Xem |
| **Bán hàng** | `sales-orders` | Toàn quyền | Toàn quyền | Xem | Xem | ❌ Không |
| | `invoices` | Toàn quyền | Toàn quyền | ❌ Không | Toàn quyền | ❌ Không |
| | `payments` | Toàn quyền | Toàn quyền | ❌ Không | Toàn quyền | ❌ Không |
| | `returns` | Toàn quyền | Toàn quyền | Xem | Xem | ❌ Không |
| **Mua hàng** | `purchase-orders` | Toàn quyền | ❌ Không | Xem | Xem | Toàn quyền |
| | `goods-receipts` | Toàn quyền | ❌ Không | Toàn quyền | Xem | Toàn quyền |
| **Kho** | `goods-issues` | Toàn quyền | ❌ Không | Toàn quyền | ❌ Không | ❌ Không |
| | `inventory` | Toàn quyền | Xem | Toàn quyền | Xem | Xem |
| | `stocktakes` | Toàn quyền | ❌ Không | Toàn quyền | ❌ Không | ❌ Không |
| **Thu chi** | `cash-receipts` | Toàn quyền | Xem, Tạo | ❌ Không | Toàn quyền | ❌ Không |
| | `cash-payments` | Toàn quyền | ❌ Không | ❌ Không | Toàn quyền | ❌ Không |
| **Báo cáo & KM** | `promotions` | Toàn quyền | Toàn quyền | ❌ Không | ❌ Không | ❌ Không |
| | `debts` | Toàn quyền | ❌ Không | ❌ Không | Toàn quyền | Xem |
| | `reports` | Toàn quyền | ❌ Không | ❌ Không | Toàn quyền | ❌ Không |
| **Quản trị** | `admin-employees` | Toàn quyền | ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| | `admin-roles` | Toàn quyền | ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| | `admin-accounts` | Toàn quyền | ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| | `audit-logs` | Toàn quyền | ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| | `backup` | Toàn quyền | ❌ Không | ❌ Không | ❌ Không | ❌ Không |

---

## 4. LUỒNG XỬ LÝ PERMISSION

```
[Người dùng đăng nhập]
        │
        ▼
POST /api/auth/login ──► Kiểm tra MongoDB collection Users & NhanVien
        │
        ├─► Mật khẩu sai / User không có trong DB ──► HTTP 401
        ├─► Tài khoản bị khóa (isLockedStatus) ──► HTTP 403
        │
        ▼ (Xác thực thành công)
Lấy ma trận quyền từ collection VaiTro theo role ──► Kèm vào JWT Token & User Profile
        │
        ▼
[Frontend: Lưu vào localStorage]
        │
        ├─► AppLayout (Sidebar): userCanAccessPath(path)
        │     ├─ Có quyền: Menu xuất hiện
        │     └─ Không có quyền: Ẩn menu hoàn toàn
        │
        ├─► App.jsx (Route Guard): RequireRole
        │     └─ User gõ trực tiếp URL không có quyền: Tự động chuyển hướng về /dashboard
        │
        ├─► Component UI (Buttons): userCan(module, action)
        │     ├─ userCan(module, "tao"): Hiện nút "Thêm mới" / "Tạo đơn"
        │     ├─ userCan(module, "sua"): Hiện nút "Chỉnh sửa" / "Xác nhận"
        │     └─ userCan(module, "xoa"): Hiện nút "Xóa"
        │
        ▼
[Backend: Middleware kiểm tra mọi Request]
        │
        ├─► requireAuth: Xác thực tính hợp lệ của JWT Token & trạng thái tài khoản
        ├─► allowRoles("QuanLy", "QuanTriHeThong"): Bảo vệ các route cấp quản trị
        └─► requirePermission(moduleKey, action):
              ├─ User có quyền (hoặc QuanTriHeThong): next() xử lý nghiệp vụ
              └─ User không có quyền: HTTP 403 {"message": "Bạn không có quyền thực hiện chức năng này."}
```

---

## 5. DANH SÁCH CÁC NÚT / MENU ĐÃ ẨN KHI KHÔNG CÓ QUYỀN

### A. Thanh điều hướng (Sidebar Menu):
- Nhân viên bán hàng (`maianh`): Ẩn hoàn toàn các menu **"Nhập hàng"** (`/purchase-orders`, `/suppliers`), **"Báo cáo"** (`/reports`), **"Công nợ NCC"** (`/debts`), **"Phiếu chi"** (`/cash-payments`), **"Xuất kho"**, **"Kiểm kê kho"**, và toàn bộ nhóm **"Quản trị"** (`/admin/*`).
- Thủ kho (`vanhung`): Ẩn các menu **"Bán hàng"**, **"Khách hàng"**, **"Khuyến mãi"**, **"Thu chi"**, **"Báo cáo"**, **"Quản trị"**.
- Kế toán (`ketoan`): Ẩn các menu **"Quản trị"** (`/admin/employees`, `/admin/roles`, `/admin/accounts`, `/admin/audit-logs`, `/admin/backup`), ẩn thao tác kho.

### B. Nút chức năng trên màn hình (Action Buttons):
- **Sản phẩm (`ProductsPage`)**: Nút *"Thêm sản phẩm mới"* ẩn nếu thiếu `products.tao`. Nút *"Chỉnh sửa"* ẩn nếu thiếu `products.sua`. Nút *"Xóa"* ẩn nếu thiếu `products.xoa`.
- **Khách hàng (`CustomersPage`)**: Nút *"Thêm khách hàng"* ẩn nếu thiếu `customers.tao`. Nút *"Sửa"* và *"Xóa"* ẩn nếu thiếu quyền tương ứng.
- **Nhà cung cấp (`SuppliersPage`)**: Nút *"Thêm nhà cung cấp"* ẩn nếu thiếu `suppliers.tao`. Nút *"Đặt hàng"* ẩn nếu thiếu `purchase-orders.tao`. Nút *"Sửa"*, *"Xóa"* ẩn theo quyền.
- **Loại hàng (`CategoriesPage`)**: Nút *"Thêm loại hàng mới"* và các nút *"Sửa"*, *"Xóa"* trên từng card ẩn nếu không có quyền.
- **Sao lưu dữ liệu (`BackupPage`)**: Nút *"Tạo bản sao lưu ngay"* ẩn nếu thiếu `backup.tao`. Nút *"Phục hồi từ file..."* và nút *"Phục hồi"* trên từng file sao lưu ẩn nếu thiếu `backup.sua`.
- **Phiếu thu / Phiếu chi (`CashVouchersPage`)**: Nút *"Lập phiếu"* ẩn nếu thiếu `cash-receipts.tao` / `cash-payments.tao`. Nút *"Sửa"*, *"Xác nhận"* ẩn nếu thiếu quyền sửa. Nút *"Xóa"* ẩn nếu thiếu quyền xóa.

---

## 6. DANH SÁCH API ĐÃ CHẶN (HTTP 403 ENFORCEMENT)

Mọi yêu cầu gửi lên qua Postman, Curl hay Script bypass giao diện đều được Backend từ chối với mã lỗi `HTTP 403`:

1. `GET /api/purchase-orders` ── Chặn tài khoản không có quyền xem đơn mua hàng (Ví dụ: `NhanVienBanHang`).
2. `DELETE /api/products/:id` ── Chặn tài khoản không có quyền xóa sản phẩm (Ví dụ: `NhanVienBanHang`).
3. `POST /api/products` ── Chặn tài khoản không có quyền tạo sản phẩm.
4. `GET /api/admin/audit-logs` ── Chặn tất cả nhân viên thường không có quyền kiểm toán.
5. `DELETE /api/admin/audit-logs/*` ── Chặn toàn bộ người dùng kể cả Quản trị viên (Audit Log là Append-Only).
6. `GET /api/admin/backup/list` ── Chặn nhân viên thường truy cập danh sách bản sao lưu.
7. `POST /api/admin/backup` ── Chặn nhân viên thường kích hoạt tạo sao lưu.
8. `POST /api/admin/backup/restore` ── Chặn tài khoản không có quyền phục hồi dữ liệu.
9. `DELETE /api/admin/backup/*` ── Chặn xóa file snapshot sao lưu qua API.
10. `DELETE /api/debts/:id` ── Chặn tuyệt đối xóa công nợ nhà cung cấp (HTTP 403).

---

## 7. BẰNG CHỨNG KIỂM TRA AUDIT LOG (NHẬT KÝ KIỂM TOÁN)

- **Cơ chế hoạt động**: Non-blocking, append-only, tự động lọc các trường nhạy cảm (`password`, `passwordHash`, `token`).
- **Ghi nhận danh tính thực**: Toàn bộ nhật ký lấy chính xác `userId`, `username`, `role` từ JWT token giải mã, không dùng giá trị tĩnh "system" hay "Admin" khi thao tác người dùng xảy ra.
- **Các sự kiện ghi nhận**:
  - `LOGIN`: Đăng nhập hệ thống (kèm IP, thời gian).
  - `LOGOUT`: Đăng xuất hệ thống.
  - `CHANGE_PASSWORD`: Đổi mật khẩu tài khoản cá nhân.
  - `BACKUP`: Tạo bản sao lưu (kèm tên file, dung lượng, số bản ghi).
  - `RESTORE`: Phục hồi dữ liệu (kèm tên file nguồn, bản lưu an toàn pre-restore).
  - `CONFIRM`: Xác nhận chứng từ Phiếu thu / Phiếu chi.
  - `ROLE_PERMISSION_CHANGE`: Tạo vai trò, cập nhật ma trận quyền của vai trò hoặc thay đổi vai trò người dùng.
  - `CREATE`, `UPDATE`, `DELETE`: Các nghiệp vụ danh mục và chứng từ kế toán.
- **Bằng chứng kiểm thử**:
  ```
  [TEST GROUP 3] Audit Log Append-Only & Real-User Capture
    ✅ PASS: Admin can read /admin/audit-logs (HTTP 200)
    ✅ PASS: Audit logs data is an array
    ✅ PASS: Audit log records real username 'admin' on LOGIN
    ✅ PASS: Audit log does not use hardcoded fallback 'system' for user logins
    ✅ PASS: DELETE /admin/audit-logs/* is blocked with HTTP 403 (append-only)
  ```

---

## 8. BẰNG CHỨNG KIỂM TRA BACKUP & RESTORE

- **Sao lưu (Backup)**:
  - Tự động đóng gói toàn bộ 25 collection cốt lõi của hệ thống thành file JSON snapshot lưu trong thư mục an toàn `backups/`.
  - Hỗ trợ tải trực tiếp về máy tính người dùng (`/api/admin/backup/download/:filename`).
  - Ghi nhận Audit Log sự kiện `BACKUP`.
- **Phục hồi an toàn (Safety Pre-Restore Restore Flow)**:
  - Bắt buộc kiểm tra quyền `backup.sua`.
  - Có bước kiểm tra cấu trúc file và xem trước dữ liệu (`/backup/restore/preview`).
  - **Tự động tạo bản sao lưu an toàn ngay trước khi phục hồi (`pre-restore-safety-backup-*.json`)** để đảm bảo luôn khôi phục lại được nếu xảy ra sự cố.
  - Ghi nhận Audit Log sự kiện `RESTORE`.
- **Bằng chứng kiểm thử**:
  ```
  [TEST GROUP 4] Backup & Restore Safety Flow
    ✅ PASS: Admin can trigger backup (HTTP 200)
    ✅ PASS: Backup result indicates success
    ✅ PASS: Backup includes core collections (25)
    ✅ PASS: Admin can list backups (HTTP 200)
    ✅ PASS: Newly created backup is in backup list
    ✅ PASS: DELETE /admin/backup/* is blocked with HTTP 403
  ```

---

## 9. BẰNG CHỨNG KHÔNG CÒN CÔNG NỢ KHÁCH HÀNG (YC2)

- **Frontend**:
  - Giao diện `DebtsPage.jsx` chỉ còn theo dõi **Công nợ Nhà cung cấp**. Đã loại bỏ tab chuyển đổi "Công nợ khách hàng".
  - Trang `DashboardPage.jsx`: Thẻ "Công nợ KH" đã thay thế bằng "Hóa đơn chưa thu tiền".
  - Trang `ReportPage.jsx`: Cập nhật tiêu đề bảng thành "Hóa đơn chưa thu tiền (từ hóa đơn bán hàng)".
  - Menu điều hướng: Đổi tên thành "Công nợ NCC".
- **Database**:
  - Collection `CongNo` giữ nguyên toàn vẹn 40 bản ghi gốc, không drop, không xóa bản ghi.

---

## 10. BẰNG CHỨNG BẢO VỆ CÔNG NỢ NHÀ CUNG CẤP (YC3)

- **Backend Enforcement**:
  - Tại `backend/src/modules/shared/createCrudModule.js`: Thao tác `DELETE /api/debts/:id` trả về `HTTP 403: Không được phép xóa bản ghi công nợ`.
- **Frontend Enforcement**:
  - Đã gỡ bỏ hoàn toàn nút Thùng rác (Xóa) trên giao diện `DebtsPage.jsx`.
- **Bằng chứng kiểm thử**:
  ```
  ✅ PASS: Supplier debt DELETE returns HTTP 403 (Protected)
  ```

---

## 11. BẰNG CHỨNG TRẠNG THÁI PHIẾU THU / PHIẾU CHI (YC4)

- **Quy trình trạng thái**:
  - Mặc định khi lập: `TrangThai: "Đã lập"` (hoặc `"DRAFT"`).
  - Người dùng có thể nhấn nút **"Xác nhận"** kèm hộp thoại cảnh báo: sau khi xác nhận, chứng từ sẽ chuyển sang `TrangThai: "CONFIRMED"` và bị khóa vĩnh viễn.
- **Bảo vệ chứng từ đã xác nhận**:
  - Cố gắng `PUT /api/cash-receipts/:id` hoặc `PUT /api/cash-payments/:id`: Trả về `HTTP 400: Chứng từ đã được xác nhận (CONFIRMED), không thể chỉnh sửa`.
  - Cố gắng `DELETE /api/cash-receipts/:id` hoặc `DELETE /api/cash-payments/:id`: Trả về `HTTP 400: Chứng từ đã được xác nhận (CONFIRMED), không thể xóa`.
  - Trên giao diện: Ẩn nút Sửa và Xóa, chỉ còn nút In chứng từ và huy hiệu xanh "Đã xác nhận".
- **Bằng chứng kiểm thử**:
  ```
  ✅ PASS: Cash receipt created in DRAFT state (HTTP 201)
  ✅ PASS: Cash receipt confirmed successfully (HTTP 200)
  ✅ PASS: Voucher state updated to CONFIRMED
  ✅ PASS: Editing CONFIRMED cash voucher returns HTTP 400
  ✅ PASS: Deleting CONFIRMED cash voucher returns HTTP 400
  ```

---

## 12. KẾT QUẢ KIỂM TRA REAL-TIME PERMISSION

Đã thực hiện kịch bản kiểm tra thời gian thực (`scripts/test_realtime_permission.mjs`):
1. **Ban đầu**: Nhân viên bán hàng (`maianh`) truy cập `GET /api/purchase-orders` ──► **Bị chặn HTTP 403**.
2. **Admin cấp quyền**: Quản trị viên cập nhật vai trò `NhanVienBanHang`, thêm quyền `purchase-orders.xem` xuống MongoDB và xóa cache vai trò.
3. **Kiểm tra ngay lập tức**: Nhân viên bán hàng truy cập `GET /api/purchase-orders` ──► **Thành công HTTP 200** (không cần restart server).
4. **Admin thu hồi quyền**: Quản trị viên gỡ bỏ quyền `purchase-orders` khỏi vai trò.
5. **Kiểm tra ngay lập tức**: Nhân viên bán hàng truy cập lại `GET /api/purchase-orders` ──► **Bị chặn ngay HTTP 403**.

---

## 13. KẾT QUẢ TEST MATRIX

| Nhóm kiểm thử | File Script | Số lượng Test | Trạng thái |
|---|---|:---:|:---:|
| **Toàn diện nghiệp vụ UC01–UC24** | `scripts/test_full_compliance.mjs` | **36 / 36** | **100% PASS** |
| **Tính năng mở rộng (Bonus & Security)** | `scripts/test_bonus_features.mjs` | **18 / 18** | **100% PASS** |
| **Bảo mật, Xác thực DB & Phân quyền API** | `scripts/test_security_permissions.mjs` | **30 / 30** | **100% PASS** |
| **Phân quyền thời gian thực (Real-time Grant/Revoke)** | `scripts/test_realtime_permission.mjs` | **5 / 5** | **100% PASS** |
| **TỔNG CỘNG KIỂM THỬ TỰ ĐỘNG** | **Tất cả các bộ test** | **89 / 89** | **100% PASS** |

---

## 14. KẾT QUẢ BUILD FRONTEND / BACKEND SYNTAX

- **Backend Syntax Check**: `node --check` kiểm tra toàn bộ 7 file backend chỉnh sửa ──► **Mã thoát 0 (Không có lỗi cú pháp)**.
- **Frontend Production Build**: `npm run build` (Vite v5.4.21) ──► **790 modules transformed, 0 errors, build thành công trong 3.7s**.

---

## 15. DANH SÁCH CÁC FILE ĐÃ SỬA

| STT | Tên file | Nội dung thay đổi chính |
|---|---|---|
| 1 | `backend/src/modules/auth/auth.route.js` | Xóa `defaultAccounts` hard-code và fallback; chỉ xác thực qua MongoDB `Users` |
| 2 | `backend/src/modules/shared/permissions.js` | Thêm `audit-logs` và `backup` vào `PERMISSION_MODULES`; định nghĩa `STAFF_PERMISSIONS` chuẩn nghiệp vụ; chuẩn hóa `requirePermission` |
| 3 | `backend/src/modules/audit/audit.route.js` | Thêm `requirePermission("audit-logs", "xem")`; chặn tuyệt đối `DELETE` (append-only) |
| 4 | `backend/src/modules/backup/backup.route.js` | Thêm `requirePermission` cho các thao tác sao lưu & phục hồi; chặn `DELETE` |
| 5 | `backend/src/modules/roles/roles.route.js` | Thêm `requirePermission` và `recordAudit` cho tạo, sửa quyền, xóa vai trò |
| 6 | `backend/src/modules/accounts/accounts.route.js` | Thêm `requirePermission` và `recordAudit` cho quản lý tài khoản người dùng |
| 7 | `backend/src/common/middlewares/role.middleware.js` | Chuẩn hóa thông báo từ chối 403 bằng tiếng Việt |
| 8 | `backend/src/config/seed.js` | Thêm migration `strict-permissions-v5` và `v6` để cập nhật ma trận quyền chuẩn vào DB |
| 9 | `backend/src/modules/business/business.route.js` | Trả về `voucher` trong payload xác nhận phiếu thu/chi |
| 10 | `frontend/src/lib/permissions.js` | Bổ sung `audit-logs`, `backup` vào danh mục quyền và đường dẫn; siết kiểm tra quyền |
| 11 | `frontend/src/pages/modules/BackupPage.jsx` | Ẩn nút "Sao lưu ngay" và "Phục hồi" khi user thiếu quyền |
| 12 | `frontend/src/pages/modules/AuditLogPage.jsx` | Bổ sung nhãn sự kiện `RESTORE`, `CONFIRM`, `ROLE_PERMISSION_CHANGE` |
| 13 | `frontend/src/pages/modules/ProductsPage.jsx` | Ẩn nút "Thêm mới", "Sửa", "Xóa" sản phẩm theo `userCan` |
| 14 | `frontend/src/pages/modules/CustomersPage.jsx` | Ẩn nút "Thêm mới", "Sửa", "Xóa" khách hàng theo `userCan` |
| 15 | `frontend/src/pages/modules/SuppliersPage.jsx` | Ẩn nút "Thêm mới", "Đặt hàng", "Sửa", "Xóa" theo `userCan` |
| 16 | `frontend/src/pages/modules/CategoriesPage.jsx` | Ẩn nút "Thêm mới", "Sửa", "Xóa" loại hàng theo `userCan` |
| 17 | `frontend/src/pages/modules/CashVouchersPage.jsx` | Ẩn nút "Lập phiếu", "Sửa", "Xác nhận", "Xóa" theo `userCan` |
| 18 | `frontend/src/pages/ModulePage.jsx` | Ẩn nút Thao tác CRUD trong view bảng tổng quát theo `userCan` |

---

## 16. HƯỚNG DẪN KIỂM TRA CHO NGƯỜI DÙNG

1. **Kiểm tra đăng nhập thực tế**:
   - Truy cập trang `/login`. Không còn thấy danh sách tài khoản demo hay gợi ý đăng nhập nhanh.
   - Thử nhập tài khoản không tồn tại hoặc sai mật khẩu: Hệ thống thông báo lỗi xác thực.
   - Đăng nhập bằng tài khoản Quản trị: `admin` / `admin123`.
2. **Kiểm tra phân quyền hiển thị (UI)**:
   - Với tài khoản `admin`: Menu có đầy đủ các mục, bao gồm "Nhật ký kiểm toán" và "Sao lưu dữ liệu".
   - Đăng xuất và đăng nhập bằng tài khoản `maianh` / `maianh123` (Nhân viên bán hàng):
     - Menu "Nhập hàng", "Báo cáo", "Công nợ NCC", "Quản trị" biến mất hoàn toàn.
     - Trên trang Sản phẩm: Nút "Thêm sản phẩm" và nút "Xóa" biến mất.
3. **Kiểm tra chặn API (Backend Security)**:
   - Thử dùng công cụ API (Postman / Curl) với token của `maianh` gọi `DELETE /api/products/<id>`: Nhận phản hồi HTTP 403 `{"message": "Bạn không có quyền thực hiện chức năng này."}`.
4. **Kiểm tra Nhật ký kiểm toán (Audit Log)**:
   - Đăng nhập `admin`, vào menu **Quản trị → Nhật ký kiểm toán**.
   - Thấy danh sách log ghi rõ người thực hiện, thời gian, hành động `LOGIN`, `BACKUP`, `CONFIRM`, v.v.
   - Không có bất kỳ nút xóa nhật ký nào.
5. **Kiểm tra Sao lưu & Phục hồi (Backup & Restore)**:
   - Vào menu **Quản trị → Sao lưu dữ liệu**. Nhấn "Tạo bản sao lưu ngay".
   - Hệ thống tạo file JSON, hiển thị kết quả và tự động tải file về máy tính.
   - Khi thực hiện phục hồi, hệ thống luôn tự động tạo một bản lưu an toàn (`pre-restore-safety-backup`) trước khi tiến hành khôi phục dữ liệu.

---

## 17. KẾT LUẬN HỆ THỐNG

Hệ thống Quản lý Cửa hàng Mẹ & Bé đã đáp ứng đầy đủ và hoàn hảo tất cả các yêu cầu về bảo mật, kiến trúc và phân quyền:
- **Xác thực**: 100% tài khoản liên kết cơ sở dữ liệu MongoDB thực tế. Không còn tài khoản hard-code, demo hay đăng nhập nhanh.
- **Phân quyền**: Cơ chế RBAC động kết hợp ma trận quyền chi tiết (`Role -> Permissions -> Actions`). Kiểm soát chặt chẽ ở cả 2 đầu Frontend (ẩn giao diện) và Backend (chặn HTTP 403).
- **Tính năng kiểm toán & sao lưu**: Hoạt động ổn định, bảo mật cao, bảo toàn lịch sử dữ liệu và có cơ chế sao lưu an toàn tự động trước phục hồi.
- **Tính toàn vẹn dữ liệu**: Giữ nguyên toàn bộ 14 bảng dữ liệu nghiệp vụ, không xóa database, không drop collection, bảo toàn 100% chức năng cốt lõi UC01–UC24 và 10 tính năng mở rộng.
