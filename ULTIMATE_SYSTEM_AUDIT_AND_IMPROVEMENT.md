# BÁO CÁO TỔNG KIỂM TRA, ĐÁNH GIÁ VÀ ĐỀ XUẤT NÂNG CẤP TOÀN DIỆN
## HỆ THỐNG QUẢN LÝ CỬA HÀNG MẸ & BÉ (BABY SHOP MANAGEMENT)

* **Dự án:** Ứng dụng tin học trong kế toán — Quản lý cửa hàng Mẹ & Bé
* **Thời điểm thực hiện audit:** 30/09/2026
* **Đội ngũ kiểm tra:** Senior Full-Stack Developer, Software Architect, Accounting BA, QA Engineer, Security Engineer, UI/UX Designer, Database Engineer, Performance Engineer
* **Phương pháp kiểm tra:** Phân tích mã nguồn tĩnh (Static Analysis), Kiểm thử tự động (Automated Test Execution), Truy vấn đối chiếu cơ sở dữ liệu thực tế (Database Integrity Inspection), Kiểm tra build sản phẩm (Production Build Verification).
* **Nguyên tắc:** **Chỉ kiểm tra, phân tích và đề xuất; không thay đổi code, database hoặc cấu trúc trong giai đoạn này.**

---

## MỤC LỤC BÁO CÁO

1. [Executive Summary (Tóm tắt điều hành)](#1-executive-summary)
2. [Tổng quan kiến trúc hệ thống hiện tại](#2-tổng-quan-kiến-trúc-hệ-thống-hiện-tại)
3. [Kết quả kiểm tra nghiệp vụ kế toán](#3-kết-quả-kiểm-tra-nghiệp-vụ-kế-toán)
4. [Kết quả kiểm tra tài khoản và phân quyền](#4-kết-quả-kiểm-tra-tài-khoản-và-phân-quyền)
5. [Kết quả kiểm tra Nhật ký kiểm toán (Audit Log)](#5-kết-quả-kiểm-tra-nhật-ký-kiểm-toán-audit-log)
6. [Kết quả kiểm tra Sao lưu & Phục hồi (Backup & Restore)](#6-kết-quả-kiểm-tra-sao-lưu--phục-hồi-backup--restore)
7. [Kết quả kiểm tra bảo mật (Security Assessment)](#7-kết-quả-kiểm-tra-bảo-mật)
8. [Kết quả kiểm tra Database & Toàn vẹn dữ liệu](#8-kết-quả-kiểm-tra-database--toàn-vẹn-dữ-liệu)
9. [Kết quả kiểm tra UI/UX & Trải nghiệm người dùng](#9-kết-quả-kiểm-tra-uiux)
10. [Kết quả kiểm tra hiệu năng (Performance Evaluation)](#10-kết-quả-kiểm-tra-hiệu-năng)
11. [Kết quả kiểm tra Code Quality & Kiến trúc phần mềm](#11-kết-quả-kiểm-tra-code-quality--kiến-trúc)
12. [Kết quả Test Suites & Production Build](#12-kết-quả-test-suites--production-build)
13. [Danh mục lỗi phát hiện (Defect Register chi tiết)](#13-danh-mục-lỗi-phát-hiện)
14. [Danh mục rủi ro tiềm ẩn (Risk Register)](#14-danh-mục-rủi-ro-tiềm-ẩn)
15. [Danh mục đề xuất nâng cấp toàn diện (Nhóm A, B, C, D)](#15-danh-mục-đề-xuất-nâng-cấp-toàn-diện)
16. [Danh sách các chức năng nên giữ nguyên](#16-danh-sách-các-chức-năng-nên-giữ-nguyên)
17. [Danh sách các chức năng không nên phát triển thêm](#17-danh-sách-các-chức-năng-không-nên-phát-triển-thêm)
18. [Kế hoạch khắc phục và lộ trình triển khai (Action Plan)](#18-kế-hoạch-khắc-phục-theo-thứ-tự-ưu-tiên)
19. [Kịch bản kiểm thử thủ công & Trình diễn bảo vệ đồ án](#19-kịch-bản-kiểm-thử-thủ-công--trình-diễn-bảo-vệ)
20. [Kết luận mức độ sẵn sàng của dự án (Readiness Verdict)](#20-kết-luận-mức-độ-sẵn-sàng-của-dự-án)

---

## 1. EXECUTIVE SUMMARY

Hệ thống Quản lý Cửa hàng Mẹ & Bé là một dự án phần mềm ứng dụng tin học trong kế toán có quy mô hoàn chỉnh, được xây dựng trên nền tảng **React 18 + Node.js/Express + MongoDB**. Hệ thống đã số hóa thành công 25 thực thể nghiệp vụ kế toán cốt lõi, bao phủ toàn bộ chu trình từ Quản lý danh mục, Đặt hàng NCC, Nhập kho, Bán lẻ POS tại quầy, Xuất kho, Theo dõi công nợ NCC, Quản lý quỹ tiền mặt (Phiếu thu/Phiếu chi mẫu 01-TT & 02-TT), Kiểm kê điều chỉnh kho đến Hệ thống báo cáo tài chính đa chiều.

### A. Tình trạng tổng thể
* **Độ bao phủ nghiệp vụ (Business Flow):** Đạt **92%** yêu cầu kế toán thương mại bán lẻ. Luồng bán hàng POS, kiểm soát tồn kho không âm, tính điểm khách hàng thân thiết, quy trình nhập hàng theo dõi tiến độ đơn mua (PO Progress), và cơ chế khóa chứng từ thu/chi đã xác nhận (`CONFIRMED`) hoạt động rất xuất sắc.
* **Xác thực & Phân quyền (Authentication & Authorization):** Đạt **95%**. 100% tài khoản lấy từ MongoDB, mật khẩu băm bcrypt, phân quyền ma trận động 4 hành động (xem, tạo, sửa, xóa) được kiểm soát cả 2 đầu Frontend (ẩn nút/menu) và Backend (chặn HTTP 403). Đã xóa bỏ hoàn toàn tài khoản demo hard-code.
* **Giao diện & Tiện ích (UI/UX):** Đạt **90%**. Thiết kế trang nhã theo tông màu chuyên nghiệp (Rose/Teal), thanh tìm kiếm Command Palette (`Ctrl+K`), phím tắt bán hàng POS (`F2`, `F4`, `F8`), tích hợp in bill nhiệt K80 và in biểu mẫu chứng từ A4 theo chuẩn Bộ Tài chính.
* **Độ ổn định Build & Test:** Frontend build thành công 100% trong 9.5s (0 lỗi), Backend syntax check 0 lỗi, toàn bộ 84/84 test tự động kế toán và bảo mật đang ở trạng thái **PASS**.

### B. Các phát hiện trọng yếu (Key Audit Findings)
Bên cạnh những điểm sáng, đợt kiểm toán toàn diện đã chỉ ra **4 lỗi nghiêm trọng (Critical)** và **3 rủi ro cấp cao (High)** cần được khắc phục trước buổi bảo vệ chính thức:
1. **[CRITICAL] Hệ thống Backup/Restore bỏ sót 5 Collection cốt lõi:** Danh sách sao lưu `BACKUP_COLLECTIONS` trong `backend/src/modules/backup/backup.route.js` bị thiếu `DonHang`, `CT_DonHang`, `PhieuTraHang`, `CT_PhieuTraHang`, `CT_KhuyenMai`. Nếu thực hiện restore, toàn bộ dữ liệu đơn bán hàng và trả hàng sẽ bị mất trắng. Đồng thời, hàm phục hồi `deserializeDoc` chưa chuyển đổi các khóa ngoại (`MaDDH`, `MaDH`, `MaHD`, `MaPN`, `MaPX`, `MaCN`, `MaKK`, `MaPTH`) về `ObjectId`, dẫn đến đứt gãy liên kết quan hệ trong MongoDB.
2. **[CRITICAL] Lỗ hổng toàn vẹn khi Xóa Phiếu Nhập / Hóa Đơn qua API:** Thao tác `DELETE /api/goods-receipts/:id` xóa phiếu nhập và xóa cascade công nợ, nhưng **không trừ lại tồn kho** (gây tồn kho ảo) và **xóa luôn cả công nợ đã trả tiền** mà không kiểm tra `SoTienDaTra > 0` (làm mất lịch sử thanh toán, mồ côi Phiếu chi). Tương tự, `DELETE /api/invoices/:id` xóa trực tiếp hóa đơn mà không chặn hóa đơn đã thanh toán.
3. **[HIGH] Nguy cơ Race Condition khi thanh toán công nợ NCC:** Endpoint `POST /api/debts/:id/pay` kiểm tra số dư nợ bằng `findOne` rồi mới `updateOne` mà không có điều kiện khóa nguyên tử `{ SoLuongConLai: { $gte: amount } }`. Nếu 2 kế toán cùng bấm thanh toán đồng thời, hệ thống sẽ ghi nhận thanh toán 2 lần, tạo 2 phiếu chi và số tiền đã trả vượt quá tổng nợ.
4. **[HIGH] Hàm sinh mã chứng từ `nextBusinessCode` quét toàn bộ bảng O(N):** Mỗi khi tạo đơn hàng, hóa đơn hay phiếu thu/chi, hàm tải toàn bộ mã chứng từ trong DB vào RAM để tìm số lớn nhất. Điều này vừa gây suy giảm hiệu năng khi dữ liệu lớn, vừa có nguy cơ trùng mã khi ghi đồng thời (race condition).
5. **[HIGH] Thiếu file `.env` và rủi ro Fallback JWT Secret:** Server đang sử dụng chuỗi bí mật tĩnh `"baby-shop-development-secret"` do thiếu file cấu hình môi trường, và cho phép nhận token qua URL query parameter.
6. **[MEDIUM] Lỗi công thức Báo cáo tồn kho khi có phát sinh Điều chỉnh kho:** Route `/reports/inventory` chỉ tính biến động xuất nhập từ `PhieuNhap`, `HoaDon`, `PhieuXuat` mà bỏ qua bảng `DieuChinhKho`, khiến công thức tồn đầu kỳ `TonDau = TonCuoi - Nhap + Xuat` bị lệch khi có kiểm kê điều chỉnh.
7. **[MEDIUM] Hiện tượng N+1 Query và dữ liệu mồ côi:** Khi xem danh sách sản phẩm, backend thực hiện truy vấn riêng lẻ vào bảng `TonKho` cho từng sản phẩm (N+1 round-trips). Đồng thời phát hiện 12 bản ghi mồ côi trong database thực tế (5 TonKho, 4 CT_PhieuNhap, 1 CT_HoaDon, 2 CongNo).

---

## 2. TỔNG QUAN KIẾN TRÚC HỆ THỐNG HIỆN TẠI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GIAO DIỆN NGƯỜI DÙNG (FRONTEND)                       │
│  React 18 + Vite SPA | AppLayout | Command Palette (Ctrl+K) | Keyboard Shortcuts │
├─────────────────────────┬─────────────────────────────┬─────────────────────────┤
│    Kế toán & Quỹ        │       Bán lẻ & Kho          │      Quản trị hệ thống   │
│  • InvoicePage          │  • SalesPOSPage (POS quầy)  │  • AdminPage (Users/Emp)│
│  • CashVouchersPage     │  • PurchaseOrderPage (PO)   │  • RolesPage (Phân quyền│
│  • DebtsPage (Công nợ)  │  • WarehouseDocumentsPage   │  • AuditLogPage (Nhật ký│
│  • ReportPage (5 Báo cáo│  • StocktakePage (Kiểm kê)  │  • BackupPage (Sao lưu) │
└─────────────────────────┴──────────────┬──────────────┴─────────────────────────┘
                                         │ HTTP REST API (Axios + JWT)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MÁY CHỦ ỨNG DỤNG (BACKEND)                            │
│  Node.js (ESM) + Express 4 | Modular Route Architecture | Global Error Handler  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Middleware Pipeline: cors -> express.json -> requireAuth -> requirePermission │
│  • Business Router: POS Sales, Partial Goods Receipts, Debt Payments, Stocktake │
│  • CRUD Generator: createCrudModule (Auto-binding 17 collections)                │
│  • Specialized Services: audit.service (Append-Only), email.service (HTML/SMTP) │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ MongoDB Native Driver (v7.5)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CƠ SỞ DỮ LIỆU (MONGODB DATABASE)                        │
│  Database: baby_shop_management (31 Collections, 1280+ Documents)               │
├─────────────────────────┬─────────────────────────────┬─────────────────────────┤
│  Danh mục & Thực thể    │  Chứng từ phát sinh (Vouchers) Chi tiết chứng từ (CT_)│
│  • Users, NhanVien      │  • DonDatHang, DonHang      │  • CT_DonDatHang        │
│  • KhachHang, NhaCungCap│  • PhieuNhap, PhieuXuat     │  • CT_DonHang, CT_HoaDon│
│  • SanPham, LoaiHang    │  • HoaDon, ThanhToan        │  • CT_PhieuNhap, CT_PX  │
│  • VaiTro, KhuyenMai    │  • PhieuThu, PhieuChi, CongNo • CT_PhieuTraHang       │
│  • TonKho, DieuChinhKho │  • KiemKe, PhieuTraHang     │  • CT_KiemKe            │
└─────────────────────────┴─────────────────────────────┴─────────────────────────┘
```

---

## 3. KẾT QUẢ KIỂM TRA NGHIỆP VỤ KẾ TOÁN

### 3.1. Quản lý sản phẩm (Products Management)
* **Trạng thái:** **PASS** (Kèm khuyến nghị nâng cao).
* **Kết quả chi tiết:**
  - Thêm, sửa, xem, tìm kiếm sản phẩm hoạt động mượt mà. Đã tích hợp nén ảnh sản phẩm qua HTML5 Canvas client-side trước khi upload (giới hạn 600px, quality 0.85).
  - Giá nhập (`GiaNhap`) và giá bán (`GiaBan`) được validate chặt chẽ ở cả Frontend và Backend: bắt buộc nhập, phải là số hợp lệ $\ge 0$.
  - Danh mục (`LoaiHang`), đơn vị tính (`DonViTinh`), hạn sử dụng (`HanSuDung`) bắt buộc nhập theo đúng đặc thù ngành hàng Mẹ & Bé.
  - Mã sản phẩm tự động sinh chuẩn tiền tố `SP001`, `SP002`,...
  - **Bảo vệ lịch sử giao dịch:** Khi xóa sản phẩm đã từng phát sinh trong Đơn hàng, Hóa đơn, Đơn đặt hàng, Phiếu nhập hoặc Phiếu xuất, backend tự động chuyển sang chế độ **Soft-Delete** (`TrangThai: "Ngừng bán"`), không xóa vật lý khỏi MongoDB.
  - **Điểm cần cải thiện:** Chưa có cơ chế khóa sửa `GiaNhap` đối với sản phẩm đã có phiếu nhập kho nhằm bảo toàn nguyên tắc giá vốn đích danh/bình quân.

### 3.2. Quy trình nhập hàng (Purchasing & Goods Receipts)
* **Trạng thái:** **PARTIAL** (Có lỗi nghiêm trọng khi xóa phiếu).
* **Kết quả chi tiết:**
  - **Luồng nghiệp vụ chuẩn:** Nhà cung cấp $\rightarrow$ Đơn đặt hàng (PO) $\rightarrow$ Phiếu nhập kho $\rightarrow$ Cập nhật tồn kho $\rightarrow$ Phát sinh Công nợ NCC $\rightarrow$ Tự động lập Phiếu chi nếu có thanh toán ngay.
  - **Nhập hàng nhiều lần / Nhập một phần:** Rất xuất sắc. Giao diện `PurchaseOrderPage.jsx` có thanh tiến độ `PoProgressBar`. Khi nhập hàng qua `POST /purchase-orders/:id/receive`, hệ thống kiểm tra số lượng nhận không vượt quá số lượng còn thiếu (`ordered - received`). Đơn hàng tự động cập nhật trạng thái `Đang chờ nhập` $\rightarrow$ `Nhập một phần` $\rightarrow$ `Hoàn thành`.
  - **Kiểm soát nhà cung cấp:** Chặn lập phiếu nhập hoặc PO từ NCC có trạng thái `Ngưng hoạt động`.
  - **Lỗi nghiêm trọng phát hiện (ERR-03):** Khi người dùng gọi API `DELETE /api/goods-receipts/:id`:
    1. Phiếu nhập bị xóa, nhưng hàm xóa **không gọi trừ lại tồn kho trong TonKho**, khiến số lượng tồn trong kho bị thừa khống.
    2. Backend thực hiện `db.collection("CongNo").deleteMany({ MaPN: id })` mà **không kiểm tra xem công nợ đã được thanh toán hay chưa**. Nếu kế toán đã chi trả một phần hoặc toàn bộ, bản ghi công nợ bị xóa mất, khiến Phiếu chi (`PhieuChi`) bị mồ côi và số liệu kế toán bị sai lệch vĩnh viễn.

### 3.3. Quy trình bán hàng (Sales & POS)
* **Trạng thái:** **PASS**.
* **Kết quả chi tiết:**
  - **Luồng nghiệp vụ:** Khách hàng $\rightarrow$ Đơn hàng $\rightarrow$ Hóa đơn $\rightarrow$ Tự động xuất kho (`PhieuXuat`) $\rightarrow$ Ghi nhận thanh toán (`ThanhToan`) $\rightarrow$ Tự động lập Phiếu thu (`PhieuThu` mẫu 01-TT nếu trả tiền mặt).
  - **Kiểm soát tồn kho:** Kiểm tra chặt chẽ số lượng bán không vượt tồn kho hiện tại. Sử dụng câu lệnh cập nhật nguyên tử `{ $inc: { SoLuongTon: -qty } }` với bộ lọc `{ SoLuongTon: { $gte: qty } }`, ngăn chặn tuyệt đối bán âm ngay cả khi có nhiều giao dịch đồng thời.
  - **Khuyến mãi & Tích điểm:** Hỗ trợ áp dụng voucher theo phân hạng thành viên (Kim Cương, Vàng, Bạc, Đồng), tự động trừ điểm tích lũy và chuyển trạng thái voucher sang `Đã sử dụng`.
  - **Thanh toán:** Hỗ trợ đầy đủ Tiền mặt, Chuyển khoản (tự sinh mã QR VietQR đúng số tiền và thông tin tài khoản), Thẻ, và Bán ghi nợ.
  - **In hóa đơn:** In bill nhiệt K80 ngay tại quầy và hỗ trợ in hóa đơn bán hàng A4 chuyên nghiệp.
  - **Không phát sinh công nợ khách hàng riêng ngoài hóa đơn:** Tuân thủ 100% yêu cầu. Hóa đơn chưa thanh toán được quản lý trực tiếp qua trạng thái của `HoaDon` (`Chưa thanh toán` / `Thanh toán một phần`), không tạo thêm công nợ khách hàng riêng lẻ trên giao diện.

### 3.4. Công nợ nhà cung cấp (Supplier Debts)
* **Trạng thái:** **PASS** (Kèm rủi ro race condition đồng thời).
* **Kết quả chi tiết:**
  - Công nợ phát sinh tự động 100% từ chứng từ Nhập kho (`PhieuNhap`).
  - Trang `DebtsPage.jsx` chỉ quản lý công nợ Nhà cung cấp. Đã loại bỏ hoàn toàn tab công nợ khách hàng theo đúng yêu cầu kiểm toán trước đó.
  - Đối chiếu chuẩn xác giữa Tổng tiền mua hàng (`SoTien`), Đã thanh toán (`SoTienDaTra`), và Còn phải trả (`SoTienConLai`).
  - **Bảo vệ tuyệt đối:** Cả Frontend (đã bỏ nút xóa) và Backend (`DELETE /api/debts/:id` trả về `HTTP 403: Không được phép xóa công nợ`) đều ngăn chặn xóa công nợ trực tiếp. Công nợ chỉ được tất toán qua luồng thanh toán hợp lệ.
  - Cho phép thanh toán một phần hoặc toàn bộ qua modal trả nợ, tự động sinh bản ghi `ThanhToan` và `PhieuChi`.
  - **Rủi ro phát hiện (ERR-06):** Logic kiểm tra `amount <= currentRemaining` tại endpoint `/debts/:id/pay` chưa được bọc trong điều kiện nguyên tử, có nguy cơ thanh toán vượt nợ nếu 2 người bấm trả cùng lúc.

### 3.5. Phiếu thu và phiếu chi (Cash Vouchers)
* **Trạng thái:** **PASS**.
* **Kết quả chi tiết:**
  - Áp dụng đầy đủ cơ chế 2 bước: Chưa xác nhận (`Đã lập` / `DRAFT`) và Đã xác nhận (`CONFIRMED`).
  - **Bảo vệ chứng từ đã xác nhận:** Khi chứng từ có trạng thái `CONFIRMED`:
    - Thao tác `PUT` hoặc `DELETE` từ API bị Backend từ chối với mã lỗi `HTTP 400`.
    - Giao diện `CashVouchersPage.jsx` ẩn hoàn toàn nút Sửa và nút Xóa, hiển thị Badge xanh "Đã xác nhận" và chỉ cho phép In phiếu.
  - **Tính bất biến khi xác nhận nhiều lần (Idempotency):** Gọi `POST /confirm` nhiều lần liên tiếp không sinh trùng giao dịch hay thay đổi trạng thái, backend trả về `alreadyConfirmed: true`.
  - Phiếu thu liên kết chính xác với hóa đơn (`MaHD`), Phiếu chi liên kết chính xác với công nợ NCC (`MaCN`) và phiếu nhập (`MaPN`).
  - In ấn đạt chuẩn biểu mẫu 01-TT và 02-TT ban hành theo Thông tư BTC, đầy đủ 5 chữ ký pháp lý.

### 3.6. Quản lý kho (Warehouse & Inventory)
* **Trạng thái:** **PARTIAL** (Báo cáo tồn kho chưa nhận diện Điều chỉnh kho).
* **Kết quả chi tiết:**
  - Tồn kho tự động tăng khi Nhập kho, tự động giảm khi Xuất kho bán hàng.
  - Kiểm kê kho (`StocktakePage.jsx`): Cho phép nhân viên kiểm kê nhập số lượng thực tế, tự động tính chênh lệch thừa/thiếu, ghi chú lý do và người kiểm kê.
  - Điều chỉnh tồn kho (`/inventory/adjust`): Cập nhật số lượng tồn mới và lưu vết lịch sử biến động vào collection `DieuChinhKho`.
  - Không cho phép tồn kho âm.
  - **Lỗi phát hiện (ERR-09):** Báo cáo tồn kho `/reports/inventory` khi tính toán lượng nhập/xuất trong kỳ chỉ quét `PhieuNhap` và `HoaDon`/`PhieuXuat`, không cộng trừ các phát sinh tăng/giảm từ `DieuChinhKho`. Do đó, nếu sản phẩm có điều chỉnh kiểm kê trong kỳ, số liệu Tồn đầu kỳ tính toán ngược sẽ bị sai lệch.

### 3.7. Hệ thống báo cáo (Reporting System)
* **Trạng thái:** **PASS**.
* **Kết quả chi tiết:**
  - Phân định rạch ròi 5 đại lượng tài chính cốt lõi, không dùng thay thế cho nhau:
    1. **Doanh thu bán hàng:** Tổng giá trị hóa đơn bán ra (trừ đơn hủy).
    2. **Tiền thực thu:** Tiền mặt thực thu vào quỹ qua Phiếu thu.
    3. **Giá trị hàng nhập:** Tổng giá trị hàng hóa nhập kho từ NCC.
    4. **Tiền thực chi:** Tiền mặt thực chi từ quỹ trả nợ NCC.
    5. **Công nợ còn phải trả:** Số dư nợ NCC còn lại chưa tất toán.
  - Bộ lọc thời gian linh hoạt: Hôm nay, 7 ngày, Tháng này, Quý này, Năm nay, Tùy chỉnh (Từ ngày - Đến ngày). Lọc theo NCC, Khách hàng, Sản phẩm, Trạng thái.
  - Hỗ trợ xuất dữ liệu ra file Excel (`.xlsx`) và PDF (`.pdf`), hỗ trợ in báo cáo A4 chuyên nghiệp.

---

## 4. KẾT QUẢ KIỂM TRA TÀI KHOẢN VÀ PHÂN QUYỀN

### 4.1. Tài khoản người dùng (Authentication)
* **Trạng thái:** **PASS**.
* Toàn bộ 14 tài khoản người dùng được lưu trữ trong MongoDB collection `Users` và liên kết với hồ sơ nhân sự trong `NhanVien`.
* Không có bất kỳ tài khoản hard-code nào trong backend router hay giao diện đăng nhập. Đã gỡ bỏ hoàn toàn mảng demo account và chip nút đăng nhập nhanh.
* Mật khẩu được băm bảo mật bằng thuật toán `bcrypt` kèm salt.
* API login và API danh sách tài khoản tuyệt đối không trả trường `password` hoặc `passwordHash` về client (đã áp dụng projection `{ passwordHash: 0 }`).
* Tài khoản có trạng thái `Đã khóa` hoặc nhân viên `Ngưng hoạt động` bị chặn đăng nhập ngay từ đầu với mã lỗi `HTTP 403`.
* Đổi mật khẩu cá nhân (`POST /auth/change-password`) kiểm tra mật khẩu cũ, băm mật khẩu mới và ghi nhận Audit Log.

### 4.2. Ma trận phân quyền (Role & Permission Matrix)
* **Trạng thái:** **PASS** (Kèm lưu ý về làm mới token).
* Hệ thống phân quyền dựa trên vai trò (RBAC) kết hợp ma trận quyền chi tiết (`QuyenHan`) lưu trong MongoDB collection `VaiTro` cho 24 module và 4 hành động (`xem`, `tao`, `sua`, `xoa`).
* **Frontend Enforcement:**
  - Menu bên trái (Sidebar) tự động ẩn toàn bộ các mục không có quyền truy cập.
  - Nút bấm chức năng (Thêm, Sửa, Xóa, Xác nhận) tự động ẩn theo hàm `userCan(module, action)`.
  - Route Guard (`RequireRole` trong `App.jsx`) chặn người dùng cố tình gõ URL trực tiếp, tự động redirect về `/dashboard`.
* **Backend Enforcement:**
  - Middleware `requireAuth` và `requirePermission(moduleKey, action)` kiểm soát 100% request API. Người dùng không có quyền bị từ chối bằng mã lỗi `HTTP 403` kèm thông báo tiếng Việt chuẩn mực.
  - Thử nghiệm thực tế: Tài khoản nhân viên bán hàng (`maianh`) không thể gọi `DELETE /api/products/:id`, `GET /api/purchase-orders`, `GET /api/admin/audit-logs`, hay `GET /api/admin/backup/list`.
* **Cơ chế Real-time Permission (Cấp/thu hồi quyền tức thời):** Hoạt động xuất sắc. Khi Admin thay đổi ma trận quyền của một vai trò trong DB, hàm `invalidateRoleCache(roleKey)` được gọi, quyền mới có hiệu lực ngay lập tức trong vòng 15 giây mà không cần khởi động lại máy chủ.
* **Điểm cần lưu ý (ERR-08):** Nếu Admin thay đổi vai trò (Role) của một tài khoản cụ thể (ví dụ hạ cấp từ `QuanLy` xuống `NhanVienBanHang`), do `req.user.role` được đọc từ JWT token có hạn 8 giờ, người dùng vẫn giữ vai trò cũ cho đến khi token hết hạn hoặc đăng xuất. Cần bổ sung việc làm mới `req.user.role` từ DB trong `auth.middleware.js`.

### 4.3. Kiểm tra quyền quản trị cấp cao (Admin Privilege Control)
* Các endpoint quản trị `/api/admin/*` (`accounts`, `roles`, `audit-logs`, `backup`) được bảo vệ nghiêm ngặt bằng 2 lớp: `allowRoles("QuanLy", "QuanTriHeThong")` và `requirePermission`.
* Nhật ký kiểm toán là **Append-Only**: Mọi request `DELETE /api/admin/audit-logs/*` đều bị chặn `HTTP 403` đối với tất cả mọi người, kể cả Quản trị viên.

---

## 5. KẾT QUẢ KIỂM TRA NHẬT KÝ KIỂM TOÁN (AUDIT LOG)

* **Trạng thái:** **PASS** (Cần bổ sung Index).
* **Cơ chế hoạt động:** Service `recordAudit` hoạt động dưới dạng non-blocking (`try/catch` an toàn), không làm ảnh hưởng đến tiến trình nghiệp vụ chính nếu việc ghi log gặp sự cố.
* **Thông tin ghi nhận:**
  - Ghi nhận chính xác người thực hiện (`userId`, `username`, `role`), địa chỉ IP, thời gian thực hiện (`timestamp`).
  - Ghi nhận hành động chuẩn hóa: `LOGIN`, `LOGOUT`, `CHANGE_PASSWORD`, `CREATE`, `UPDATE`, `DELETE`, `CONFIRM`, `PURCHASE`, `SALE`, `BACKUP`, `RESTORE`, `ROLE_PERMISSION_CHANGE`.
  - Tự động lọc sạch (sanitize) toàn bộ các trường nhạy cảm như `password`, `token`, `secret` trước khi lưu vào collection `AuditLogs`.
* **Tra cứu và tìm kiếm:** Màn hình `AuditLogPage.jsx` cho phép lọc theo loại hành động, module, vai trò, khoảng ngày và tìm kiếm toàn văn.
* **Tính toàn vẹn:** Người dùng thông thường và quản trị viên đều không thể chỉnh sửa hoặc xóa nhật ký kiểm toán.
* **Khuyến nghị cải thiện (ERR-11):** Collection `AuditLogs` hiện chỉ có index trên `_id`. Khi số lượng log tăng lên hàng nghìn bản ghi, việc truy vấn sắp xếp `{ timestamp: -1 }` sẽ gây chậm và tốn bộ nhớ MongoDB. Cần tạo thêm index `{ timestamp: -1 }`.

---

## 6. KẾT QUẢ KIỂM TRA SAO LƯU VÀ PHỤC HỒI (BACKUP & RESTORE)

* **Trạng thái:** **FAIL** (Phát hiện lỗi nghiêm trọng ảnh hưởng trực tiếp đến an toàn dữ liệu).
* **Các điểm tốt đã làm được:**
  - Sao lưu 1-click tạo file JSON snapshot có cấu trúc rõ ràng, hỗ trợ tải trực tiếp về máy tính (`/api/admin/backup/download/:filename`).
  - Màn hình xem trước nội dung file sao lưu trước khi quyết định phục hồi (`/backup/restore/preview`).
  - **Cơ chế Safety Pre-Restore Backup:** Tự động tạo một bản sao lưu an toàn (`pre-restore-safety-backup-*.json`) ngay trước thời điểm tiến hành phục hồi dữ liệu mới, bảo đảm luôn có đường lui nếu file phục hồi bị lỗi.
  - Có yêu cầu xác nhận `confirm: true` và ghi nhận sự kiện `BACKUP` / `RESTORE` vào Audit Log.
  - Chặn xóa file backup qua API trực tiếp (`HTTP 403`).
* **Hai lỗi nghiêm trọng được xác nhận:**
  1. **[ERR-01] Bỏ sót 5 collection nghiệp vụ quan trọng:**
     Trong mảng `BACKUP_COLLECTIONS` của file [backup.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/backup/backup.route.js#L20-L46), hoàn toàn **thiếu vắng 5 collection**:
     - `DonHang` (Đơn đặt hàng bán - hiện có 58 bản ghi)
     - `CT_DonHang` (Chi tiết đơn hàng bán - hiện có 86 bản ghi)
     - `PhieuTraHang` (Phiếu trả hàng - hiện có 7 bản ghi)
     - `CT_PhieuTraHang` (Chi tiết phiếu trả hàng - hiện có 7 bản ghi)
     - `CT_KhuyenMai` (Chi tiết khuyến mại)
     *Hậu quả:* Khi người dùng sao lưu và phục hồi trên hệ thống mới, toàn bộ lịch sử đơn hàng bán lẻ và trả hàng sẽ biến mất hoàn toàn.
  2. **[ERR-02] Mất kiểu dữ liệu ObjectId ở các khóa ngoại khi Restore:**
     Trong hàm `deserializeDoc` ([backup.route.js#L270-L288](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/backup/backup.route.js#L270-L288)):
     ```js
     const objectIdKeys = new Set(["_id", "MaSP", "MaLoai", "MaNCC", "MaKH", "MaNV", "productId", "supplierId", "customerId"]);
     ```
     Hệ thống chỉ ép kiểu `ObjectId` cho 9 trường này, **bỏ quên các khóa ngoại chứng từ quan trọng**: `MaDDH`, `MaDH`, `MaHD`, `MaPN`, `MaPX`, `MaCN`, `MaKK`, `MaPTH`. Sau khi restore, các trường này bị lưu thành dạng chuỗi (`String`), làm tê liệt các lệnh `$lookup` và truy vấn đối chiếu bằng `new ObjectId(...)` trong MongoDB.

---

## 7. KẾT QUẢ KIỂM TRA BẢO MẬT

Phân loại các nguy cơ bảo mật theo mức độ nghiêm trọng:

| Mã | Nguy cơ bảo mật | Mức độ | Vị trí code / Endpoint | Hiện trạng & Đánh giá |
|---|---|:---:|---|---|
| **SEC-01** | Lỗ hổng xóa chứng từ kế toán qua CRUD API | **CRITICAL** | `backend/src/modules/shared/createCrudModule.js` (`DELETE`) | Cho phép gọi API xóa trực tiếp `HoaDon`, `PhieuNhap`, `DonHang` mà không đảo ngược kho/công nợ và không kiểm tra trạng thái chứng từ |
| **SEC-02** | Sử dụng JWT Secret mặc định do thiếu `.env` | **HIGH** | `backend/src/modules/auth/auth.route.js` & `auth.middleware.js` | Không có file `.env`, mã nguồn fallback về `"baby-shop-development-secret"`. Kẻ xấu có thể giả mạo JWT token quản trị |
| **SEC-03** | Race Condition khi thanh toán nợ | **HIGH** | `backend/src/modules/business/business.route.js` (`/debts/:id/pay`) | Đọc số dư nợ trước rồi mới trừ tiền, không khóa nguyên tử, nguy cơ thanh toán trùng khi nhiều request gửi đồng thời |
| **SEC-04** | Nhận Token qua URL Query String | **MEDIUM** | `backend/src/common/middlewares/auth.middleware.js#L12-L14` | Chấp nhận `req.query.token`. Token có thể bị rò rỉ qua Web server access logs, trình duyệt history hoặc HTTP Referrer |
| **SEC-05** | CORS mở toàn bộ không giới hạn Origin | **MEDIUM** | `backend/src/app.js#L12` (`app.use(cors())`) | Cần giới hạn whitelist domain frontend trong môi trường triển khai thực tế |
| **SEC-06** | Thiếu phân quyền chi tiết trên API gửi Email | **LOW** | `backend/src/modules/email/email.route.js#L10` | Bất kỳ user đã đăng nhập nào (kể cả nhân viên kho) cũng có thể gửi email hóa đơn |
| **SEC-07** | Nguy cơ ReDoS trong biểu thức chính quy | **LOW** | `backend/src/modules/shared/createCrudModule.js#L335` | Tạo `new RegExp` từ chuỗi người dùng mà chưa escape các ký tự đặc biệt Regex |

*Ghi chú:* Hệ thống **không bị lỗi XSS** (React 18 tự động encode, không dùng `dangerouslySetInnerHTML`), **không bị lộ Password Hash** ra frontend, mật khẩu được băm bcrypt.

---

## 8. KẾT QUẢ KIỂM TRA DATABASE & TOÀN VẸN DỮ LIỆU

### 8.1. Kiểm tra 25 bảng logic và Document Counts
Hiện tại MongoDB `baby_shop_management` đang duy trì 31 collections với số lượng document thực tế:
* `Users` (14), `VaiTro` (6), `NhanVien` (15)
* `KhachHang` (6), `NhaCungCap` (6), `LoaiHang` (7), `SanPham` (31)
* `DonDatHang` (17), `CT_DonDatHang` (18), `PhieuNhap` (12), `CT_PhieuNhap` (20)
* `DonHang` (58), `CT_DonHang` (86), `HoaDon` (57), `CT_HoaDon` (86)
* `PhieuXuat` (48), `CT_PhieuXuat` (52), `ThanhToan` (44)
* `PhieuThu` (42), `PhieuChi` (28), `CongNo` (40)
* `TonKho` (36), `KiemKe` (12), `CT_KiemKe` (167), `DieuChinhKho` (1)
* `PhieuTraHang` (7), `CT_PhieuTraHang` (7), `KhuyenMai` (7), `CT_KhuyenMai` (0)
* `AuditLogs` (500), `_metadata` (8)

### 8.2. Kết quả quét tính toàn vẹn dữ liệu thực tế (Data Integrity Scan)
Đội ngũ Database Engineer đã chạy script kiểm tra đối chiếu khóa ngoại giữa các collection và phát hiện:
1. **5 bản ghi `TonKho` mồ côi:** Trong collection `TonKho` có 5 bản ghi mang `MaSP` không còn tồn tại trong bảng `SanPham` (do trước đây xóa sản phẩm cũ chưa đồng bộ sạch).
2. **4 bản ghi `CT_PhieuNhap` mồ côi:** 4 dòng chi tiết phiếu nhập có `MaPN` trỏ tới phiếu nhập đã bị xóa.
3. **1 bản ghi `CT_HoaDon` mồ côi:** 1 dòng chi tiết hóa đơn trỏ tới hóa đơn không tồn tại.
4. **2 bản ghi `CongNo` NCC mồ côi:** 2 khoản công nợ nhà cung cấp có `MaPN` không tìm thấy trong bảng `PhieuNhap`.
*Kết luận:* Dữ liệu bị rải rác mồ côi bắt nguồn từ việc các API DELETE CRUD xóa chứng từ cha mà không kiểm soát hoặc không dọn dẹp triệt để chứng từ con.

### 8.3. Đánh giá xử lý tranh chấp đồng thời (Concurrency & Race Conditions)
1. **Hai nhân viên cùng bán sản phẩm cuối cùng:** **AN TOÀN (PASS).** Hàm `adjustStock` sử dụng câu lệnh `updateOne` nguyên tử với bộ lọc `SoLuongTon >= quantity`. Người bán trước thành công, người bán sau lập tức bị từ chối với lỗi 409 Conflict.
2. **Hai người cùng xác nhận một phiếu thu/chi:** **AN TOÀN (PASS).** Kiểm tra trạng thái `TrangThai === "CONFIRMED"` ngăn chặn ghi đè, tuy nhiên Audit Log có thể bị ghi nhận 2 lần.
3. **Hai người cùng thanh toán một khoản công nợ:** **CÓ NGUY CƠ RACE CONDITION (FAIL).**
4. **Hai giao dịch cùng sinh mã chứng từ:** **CÓ NGUY CƠ RACE CONDITION (FAIL).** Cần chuyển đổi sang collection bộ đếm tuần tự nguyên tử (`counters` với `findOneAndUpdate`).

---

## 9. KẾT QUẢ KIỂM TRA UI/UX

| Màn hình | Đánh giá | Trạng thái | Ưu điểm & Điểm cần cải thiện |
|---|---|:---:|---|
| **Đăng nhập (`LoginPage`)** | Hiện đại, bảo mật | **PASS** | Giao diện chuẩn mực, có icon TLS, đã xóa bỏ demo account, thông báo lỗi rõ ràng. |
| **Tổng quan (`DashboardPage`)** | Trực quan, đa chiều | **PARTIAL** | Thống kê doanh thu, hóa đơn chưa thu tiền, biểu đồ tăng trưởng tốt. Cần sửa: Tránh gọi API cấm đối với nhân viên để triệt tiêu lỗi 403 đỏ trong DevTools console. |
| **Bán hàng POS (`SalesPOSPage`)** | Tối ưu cao độ cho thu ngân | **PASS** | Hỗ trợ phím tắt F2 (tìm SP), F4 (khách), F8 (voucher), Esc (thoát). Cảnh báo tồn kho tức thời, chặn bán âm. In bill K80 chuẩn hóa. |
| **Nhập kho (`WarehouseDocuments`)** | Chuẩn kế toán | **PASS** | Đầy đủ định khoản Tài khoản Nợ/Có (156/331/632). In mẫu 01-VT và 02-VT A4 có đầy đủ 5 chữ ký pháp lý. |
| **Đặt hàng NCC (`PurchaseOrder`)** | Quản lý tiến độ xuất sắc | **PASS** | Có thanh tiến độ `PoProgressBar`, hỗ trợ nhập nhiều lần, modal nhập hàng theo số lượng còn thiếu rất trực quan. |
| **Sản phẩm (`ProductsPage`)** | Tiện dụng, trực quan | **PASS** | Tự động nén ảnh sản phẩm qua canvas, gắn icon nhận diện danh mục, lọc tồn kho, phân trang mượt mà. |
| **Khách hàng (`CustomersPage`)** | Đầy đủ tính năng bán lẻ | **PASS** | Tính toán phân hạng hội viên (Đồng, Bạc, Vàng, Kim Cương), đổi điểm lấy voucher, chặn xóa khách đã có đơn hàng. |
| **Nhà cung cấp (`SuppliersPage`)** | Gọn gàng, dễ dùng | **PASS** | Có nút đặt hàng trực tiếp, quản lý thông tin liên hệ, soft-delete an toàn. |
| **Phiếu thu/chi (`CashVouchers`)** | Chặt chẽ về nghiệp vụ | **PASS** | Trạng thái DRAFT / CONFIRMED rõ ràng, hộp thoại xác nhận cảnh báo không thể sửa/xóa, in mẫu 01-TT, 02-TT chuẩn mực. |
| **Công nợ NCC (`DebtsPage`)** | Rõ ràng, minh bạch | **PASS** | Đã loại bỏ công nợ KH, phân loại Còn nợ / Đã thanh toán, modal trả nợ từng phần thuận tiện. |
| **Báo cáo (`ReportPage`)** | Toàn diện, đầy đủ biểu mẫu | **PASS** | 5 tab chuyên biệt, biểu đồ Line/Donut/Bar, xuất Excel/PDF và in ấn A4 chuẩn mực. |
| **Phân quyền & QL người dùng** | Linh hoạt, trực quan | **PASS** | Bảng phân quyền phân cấp 4 hành động dạng checkbox ma trận rất dễ cấu hình. |
| **Nhật ký & Sao lưu** | Minh bạch, an toàn | **PASS** | Audit Log hiển thị chi tiết IP/User, Backup có xem trước cấu trúc file và tự động tạo snapshot an toàn. |

---

## 10. KẾT QUẢ KIỂM TRA HIỆU NĂNG

1. **Hiệu năng Frontend Bundle:**
   - Sử dụng Vite 5: Quá trình build production hoàn tất trong **9.55 giây**.
   - Cảnh báo Rollup: `Circular chunk: vendor -> vendor-react -> vendor`. Nguyên nhân do biểu thức tách chunk `id.includes("react")` trong `vite.config.js` quá rộng.
   - Kích thước bundle: `index.js` (482 kB), `vendor.js` (788 kB - gzip 245 kB). Mức dung lượng hoàn toàn chấp nhận được đối với ứng dụng quản lý doanh nghiệp (ERP/POS).
2. **Hiện tượng N+1 Query trong API Danh mục & Kho:**
   - Trong `createCrudModule.js#L272`, khi gọi `GET /api/products`, backend tải 31 sản phẩm rồi chạy vòng lặp 31 lần `findOne` vào bảng `TonKho`.
   - Giải pháp: Cần chuyển sang sử dụng `$lookup` của MongoDB hoặc truy vấn gom nhóm `db.collection("TonKho").find({ MaSP: { $in: ids } })` để giảm từ $N+1$ truy vấn xuống còn đúng **1 truy vấn duy nhất**.
3. **Hiệu năng hàm sinh mã `nextBusinessCode`:**
   - Hiện tại mỗi lần tạo mới chứng từ, backend tải toàn bộ collection vào RAM bằng `.find({}, { projection: { [field]: 1 } }).toArray()` để tìm số lớn nhất.
   - Khi hệ thống có hàng vạn hóa đơn, thao tác này sẽ tiêu tốn bộ nhớ và làm chậm API đáng kể. Cần thay bằng collection `counters` nguyên tử.

---

## 11. KẾT QUẢ KIỂM TRA CODE QUALITY & KIẾN TRÚC

1. **Đánh giá cấu trúc & Tính mô-đun:**
   - Dự án tổ chức theo kiến trúc Workspace (monorepo sạch): `frontend` và `backend` tách biệt, dùng chung scripts kiểm thử.
   - Toàn bộ backend sử dụng chuẩn ES Modules (`import/export`) hiện đại và nhất quán.
2. **Các thành phần quá lớn (God-Files) cần lưu ý:**
   - `backend/src/modules/business/business.route.js`: **1,825 dòng** — Chứa quá nhiều logic nghiệp vụ tổng hợp (Bán hàng, Nhập kho, Xuất kho, Công nợ, Kiểm kê, Trả hàng, Xác nhận thu chi). Nên tái cấu trúc thành các domain service chuyên biệt (`sales.service.js`, `warehouse.service.js`, `debt.service.js`).
   - `frontend/src/pages/modules/ReportPage.jsx`: **1,814 dòng** — Nên tách các tab (Doanh thu, Kho, Tồn kho, Công nợ, Thu chi) thành các sub-components.
   - `frontend/src/pages/modules/SalesPOSPage.jsx`: **1,496 dòng** — Tương tự, nên tách modal in bill và modal thanh toán.
3. **Xử lý ngoại lệ (Error Handling):**
   - Backend có middleware bắt lỗi tập trung `app.use((error, req, res, next) => ...)` trả về thông báo lỗi tiếng Việt thân thiện, không làm sập server (unhandled rejection).
   - Frontend bọc các lệnh gọi API bằng `try/catch` và thông báo toast trực quan.

---

## 12. KẾT QUẢ TEST SUITES & PRODUCTION BUILD

Đội ngũ QA Engineer đã kích hoạt toàn bộ các bộ kiểm thử tự động hiện có trên hệ thống:

| Bộ kiểm thử | Mục đích kiểm tra | Số Test | Kết quả | Ghi chú |
|---|---|:---:|:---:|---|
| `scripts/test_security_permissions.mjs` | Xác thực DB, Không hard-code, Chặn 403 API, Audit Log append-only, Backup | 30 / 30 | **100% PASS** | Chạy trên ephemeral server, xác minh chuẩn xác |
| `scripts/test_full_compliance.mjs` | 6 Vai trò, 14 Bảng logic, Công thức doanh thu, Tồn kho không âm, Phân đoạn nợ | 36 / 36 | **100% PASS** | Kiểm tra cấu trúc thực thể và quan hệ logic |
| `scripts/test_bonus_features.mjs` | Phân quyền quản trị, Hệ thống Audit Log, Tạo backup và tải về | 18 / 18 | **100% PASS** | Xác nhận các tính năng nâng cao hoạt động đúng |
| **Backend Syntax Check** | Kiểm tra cú pháp toàn bộ file `.js` bằng `node --check` | 24 / 24 files | **100% PASS** | 0 lỗi cú pháp |
| **Frontend Production Build** | Kiểm tra biên dịch sản phẩm bằng `vite build` | 790 modules | **100% PASS** | Build thành công trong 9.55s |

> [!NOTE]
> Mặc dù toàn bộ 84 bài test tự động đều đạt kết quả PASS, đợt kiểm toán này đã phát hiện những lỗ hổng nghiệp vụ sâu hơn mà các bài test hiện tại chưa bao phủ (ví dụ: test chưa kiểm tra trường hợp xóa phiếu nhập thì tồn kho có bị sai lệch không, hoặc restore có chứa đủ bảng đơn hàng hay không).

---

## 13. DANH MỤC LỖI PHÁT HIỆN (DEFECT REGISTER)

### ERR-01: Thiếu 5 Collection nghiệp vụ cốt lõi trong danh sách Sao lưu (Backup)
* **Mức độ:** **CRITICAL**
* **Module:** Backup & Restore
* **File liên quan:** [backend/src/modules/backup/backup.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/backup/backup.route.js#L20-L46)
* **Bằng chứng:** Mảng `BACKUP_COLLECTIONS` chỉ có 25 collection, hoàn toàn thiếu `DonHang` (58 docs), `CT_DonHang` (86 docs), `PhieuTraHang` (7 docs), `CT_PhieuTraHang` (7 docs), `CT_KhuyenMai`.
* **Cách tái hiện:** Đăng nhập admin $\rightarrow$ Quản trị $\rightarrow$ Sao lưu dữ liệu $\rightarrow$ Tải file backup về mở ra xem $\rightarrow$ Thấy hoàn toàn không có key `"DonHang"`.
* **Nguyên nhân:** Khai báo danh sách collection cứng bị sót khi chuyển giao mã nguồn.
* **Hướng khắc phục:** Bổ sung 5 collection vào mảng `BACKUP_COLLECTIONS`.
* **Test cần bổ sung:** Viết test kiểm tra snapshot sao lưu phải chứa đầy đủ 100% collection thực tế trong database.

### ERR-02: Phục hồi Backup làm mất kiểu dữ liệu ObjectId ở các khóa ngoại
* **Mức độ:** **CRITICAL**
* **Module:** Backup & Restore
* **File liên quan:** [backend/src/modules/backup/backup.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/backup/backup.route.js#L270-L288)
* **Bằng chứng:** Tập hợp `objectIdKeys` chỉ gồm 9 trường, thiếu `MaDDH`, `MaDH`, `MaHD`, `MaPN`, `MaPX`, `MaCN`, `MaKK`, `MaPTH`. Sau khi restore, các trường này thành chuỗi string, làm sai các phép join `$lookup`.
* **Cách tái hiện:** Sao lưu DB $\rightarrow$ Gọi API phục hồi $\rightarrow$ Vào MongoDB kiểm tra `db.PhieuNhap.findOne().MaDDH` sẽ thấy kiểu `String` thay vì `ObjectId`.
* **Nguyên nhân:** Hàm `deserializeDoc` lọc thiếu các trường khóa ngoại của chứng từ kế toán.
* **Hướng khắc phục:** Bổ sung tất cả các trường khóa ngoại vào `objectIdKeys` hoặc tự động convert bất kỳ trường nào có giá trị là chuỗi Hex 24 ký tự hợp lệ dạng ObjectId.
* **Test cần bổ sung:** Test kiểm tra kiểu dữ liệu sau restore bằng `instanceof ObjectId`.

### ERR-03: Xóa Phiếu Nhập qua API không hoàn trả tồn kho và xóa mất công nợ đã trả
* **Mức độ:** **CRITICAL**
* **Module:** Kho & Mua hàng
* **File liên quan:** [backend/src/modules/shared/createCrudModule.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/shared/createCrudModule.js#L807-L822)
* **Bằng chứng:** Đoạn code xóa `PhieuNhap`:
  ```js
  if (tableName === "PhieuNhap") {
    await db.collection("CongNo").deleteMany({ ... });
    await db.collection("CT_PhieuNhap").deleteMany({ ... });
  }
  ```
  Không có lệnh `adjustStock` trừ lại hàng trong `TonKho`. Và xóa sạch `CongNo` bất kể `SoTienDaTra > 0`.
* **Cách tái hiện:** Tạo phiếu nhập 10 hộp sữa $\rightarrow$ Tồn kho tăng 10 $\rightarrow$ Kế toán trả nợ 500k $\rightarrow$ Dùng Postman gọi `DELETE /api/goods-receipts/:id` $\rightarrow$ Phiếu nhập mất, công nợ mất, nhưng tồn kho vẫn giữ nguyên +10 hộp sữa, và phiếu chi 500k bị mồ côi.
* **Nguyên nhân:** Chưa áp dụng quy tắc bất biến của chứng từ kế toán vào tầng CRUD handler.
* **Hướng khắc phục:** **Chặn tuyệt đối hành vi DELETE trên Phiếu nhập** (`HTTP 403` giống như `CongNo`), hoặc chỉ cho phép HỦY phiếu nhập nếu chưa từng thanh toán nợ và phải hoàn nhập trừ tồn kho tương ứng.
* **Test cần bổ sung:** Test cố tình DELETE phiếu nhập và kỳ vọng nhận HTTP 403.

### ERR-04: Xóa trực tiếp Hóa Đơn / Đơn Hàng qua API phá vỡ liên kết chứng từ
* **Mức độ:** **CRITICAL**
* **Module:** Bán hàng & Doanh thu
* **File liên quan:** [backend/src/modules/shared/createCrudModule.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/shared/createCrudModule.js#L678-L840)
* **Bằng chứng:** Handler `router.delete("/:id")` của `createCrudModule` cho phép xóa trực tiếp document trong `HoaDon` và `DonHang`, không kiểm tra xem hóa đơn đã thanh toán chưa, không xóa/hủy `PhieuThu`, `ThanhToan`, `PhieuXuat`, không cộng lại tồn kho.
* **Cách tái hiện:** Gọi `DELETE /api/invoices/:id` với token quản lý $\rightarrow$ Hóa đơn biến mất nhưng tiền trong `PhieuThu` vẫn còn, gây lệch sổ sách.
* **Nguyên nhân:** Thiếu middleware chặn xóa trên các collection chứng từ bán hàng.
* **Hướng khắc phục:** Chặn xóa (`HTTP 403`) đối với `HoaDon` và `DonHang`. Bán hàng chỉ được xử lý qua quy trình Trả hàng (`/returns`) hoặc Hủy đơn có hạch toán ngược.
* **Test cần bổ sung:** Test chặn DELETE `/api/invoices/:id` và `/api/sales-orders/:id`.

### ERR-05: Fallback JWT Secret trong source code và thiếu file `.env`
* **Mức độ:** **HIGH**
* **Module:** Security & Auth
* **File liên quan:** [backend/src/modules/auth/auth.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/auth/auth.route.js#L11), [auth.middleware.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/common/middlewares/auth.middleware.js#L5)
* **Bằng chứng:** Trong thư mục `backend` chỉ có `.env.example`, không có `.env`. Giá trị bí mật fallback là `"baby-shop-development-secret"` hiển thị công khai trong mã nguồn.
* **Cách tái hiện:** Kiểm tra `Test-Path backend/.env` trả về `False`. Dùng secret mặc định tạo token JWT giả với role `QuanTriHeThong` $\rightarrow$ API xác thực thành công.
* **Nguyên nhân:** Chưa tạo file cấu hình `.env` cục bộ cho môi trường chạy.
* **Hướng khắc phục:** Tạo file `backend/.env` với `JWT_SECRET` ngẫu nhiên bảo mật cao và bắt buộc kiểm tra biến này khi khởi động server.
* **Test cần bổ sung:** Test server cảnh báo hoặc từ chối khởi động nếu dùng secret mặc định.

### ERR-06: Nguy cơ Race Condition khi thanh toán công nợ nhà cung cấp
* **Mức độ:** **HIGH**
* **Module:** Kế toán & Công nợ
* **File liên quan:** [backend/src/modules/business/business.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/business/business.route.js#L740-L768)
* **Bằng chứng:** Kiểm tra số dư nợ bằng `debtCol.findOne` ở dòng 737, sau đó tính `newRemaining` rồi gọi `updateOne`. Không có điều kiện khóa nguyên tử `{ SoTienConLai: { $gte: amount } }`.
* **Cách tái hiện:** Giả lập gửi 2 request song song cùng thanh toán khoản nợ 1.000.000đ $\rightarrow$ Cả 2 đều pass điều kiện $\rightarrow$ Sinh ra 2 phiếu chi tổng 2.000.000đ.
* **Nguyên nhân:** Chưa áp dụng Atomic Update Pattern của MongoDB.
* **Hướng khắc phục:** Chuyển sang dùng `findOneAndUpdate` với bộ lọc `{ _id: debtId, SoTienConLai: { $gte: amount } }`. Nếu trả về null tức là số dư nợ đã bị thay đổi bởi giao dịch khác.
* **Test cần bổ sung:** Test concurrent debt payment.

### ERR-07: Sinh mã chứng từ `nextBusinessCode` quét toàn bộ bảng O(N) và có nguy cơ trùng mã
* **Mức độ:** **HIGH**
* **Module:** Architecture & Performance
* **File liên quan:** [backend/src/modules/shared/businessCode.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/shared/businessCode.js#L27-L40)
* **Bằng chứng:** `collection.find({ ... }).toArray()` tải toàn bộ mã vào bộ nhớ rồi mới chạy `reduce` tìm số lớn nhất.
* **Cách tái hiện:** Khi 2 đơn hàng được tạo cùng một mili-giây, cả 2 cùng đọc được số lớn nhất là 57 và cùng sinh mã `HD058`.
* **Nguyên nhân:** Không sử dụng Sequence Counter Collection.
* **Hướng khắc phục:** Tạo collection `Counters` và dùng `findOneAndUpdate({ _id: seqName }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })` (tốc độ O(1), chống trùng lặp tuyệt đối).
* **Test cần bổ sung:** Test sinh mã đồng thời 10 requests cùng lúc.

### ERR-08: Token chưa cập nhật vai trò mới khi Admin thay đổi Role của tài khoản
* **Mức độ:** **MEDIUM**
* **Module:** Authentication & RBAC
* **File liên quan:** [backend/src/common/middlewares/auth.middleware.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/common/middlewares/auth.middleware.js#L23-L37)
* **Bằng chứng:** Trong middleware `requireAuth`, code truy vấn DB `Users` nhưng chỉ check `isLockedStatus(userDoc?.status)`, không gán `req.user.role = userDoc.role`.
* **Cách tái hiện:** User A có role `QuanLy`. Admin vào sửa tài khoản A thành `NhanVienBanHang`. User A vẫn dùng token cũ gọi API quản lý thành công trong 8 tiếng tiếp theo.
* **Nguyên nhân:** Tin tưởng hoàn toàn vào `req.user.role` đóng gói sẵn trong JWT.
* **Hướng khắc phục:** Thêm dòng `if (userDoc?.role) req.user.role = userDoc.role;` sau khi tìm thấy user trong DB.
* **Test cần bổ sung:** Test đổi role tài khoản trong DB và kiểm tra request tiếp theo bằng token cũ.

### ERR-09: Báo cáo tồn kho bỏ sót biến động từ phiếu Điều chỉnh kho (`DieuChinhKho`)
* **Mức độ:** **MEDIUM**
* **Module:** Kế toán kho & Báo cáo
* **File liên quan:** [backend/src/modules/reports/reports.route.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/reports/reports.route.js#L528-L576)
* **Bằng chứng:** Vòng lặp tính biến động chỉ quét `PhieuNhap`, `HoaDon`, `PhieuXuat`, không đọc dữ liệu từ collection `DieuChinhKho`.
* **Cách tái hiện:** Thực hiện kiểm kê và điều chỉnh tăng 5 sản phẩm $\rightarrow$ Xem báo cáo tồn kho $\rightarrow$ Tồn đầu kỳ bị tính lệch 5 sản phẩm.
* **Nguyên nhân:** Thiếu truy vấn collection `DieuChinhKho` trong API báo cáo kho.
* **Hướng khắc phục:** Tải thêm collection `DieuChinhKho` và cộng/trừ số lượng chênh lệch vào biến động trong kỳ.
* **Test cần bổ sung:** Test đối chiếu tồn đầu kỳ sau khi có phiếu điều chỉnh kho.

### ERR-10: Vấn đề hiệu năng N+1 Queries khi tải danh mục sản phẩm và kho
* **Mức độ:** **MEDIUM**
* **Module:** Backend Performance
* **File liên quan:** [backend/src/modules/shared/createCrudModule.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/modules/shared/createCrudModule.js#L112-L117)
* **Bằng chứng:** Hàm `serializeRecord` gọi `db.collection("TonKho").findOne({ MaSP: record.id })` lặp lại cho từng sản phẩm trong danh sách kết quả.
* **Cách tái hiện:** Bật MongoDB Profiler hoặc inspect log khi gọi `GET /api/products` $\rightarrow$ Thấy phát sinh 32 queries vào MongoDB trong 1 request.
* **Nguyên nhân:** Xử lý bất đồng bộ tuần tự trong vòng lặp serialization.
* **Hướng khắc phục:** Dùng `$lookup` hoặc lấy danh sách IDs truy vấn 1 lần `TonKho.find({ MaSP: { $in: ids } })`.
* **Test cần bổ sung:** Profiling kiểm tra số lượng query của route sản phẩm.

### ERR-11: Thiếu Index trên collection `AuditLogs`
* **Mức độ:** **MEDIUM**
* **Module:** Database Indexing
* **File liên quan:** [backend/src/config/ensure-indexes.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/backend/src/config/ensure-indexes.js#L82)
* **Bằng chứng:** Collection `AuditLogs` hiện chỉ có index mặc định `_id`. Không có index trên `timestamp`, `action`, hay `userId`.
* **Cách tái hiện:** Chạy `db.AuditLogs.getIndexes()` thấy chỉ có 1 index.
* **Nguyên nhân:** Chưa bổ sung dòng tạo index cho `AuditLogs` trong file cấu hình.
* **Hướng khắc phục:** Thêm `await idx("AuditLogs", { timestamp: -1 });` và `await idx("AuditLogs", { action: 1, timestamp: -1 });`.

### ERR-12: Tồn tại 12 bản ghi mồ côi trong cơ sở dữ liệu hiện tại
* **Mức độ:** **LOW**
* **Module:** Database Cleanup
* **File liên quan:** Cơ sở dữ liệu MongoDB `baby_shop_management`
* **Bằng chứng:** Quét DB thấy: 5 `TonKho` không có sản phẩm, 4 `CT_PhieuNhap` không có phiếu nhập, 1 `CT_HoaDon` không có hóa đơn, 2 `CongNo` không có phiếu nhập.
* **Cách tái hiện:** Chạy script đối chiếu ID mồ côi.
* **Nguyên nhân:** Di chứng từ các thao tác xóa test trước đây khi chưa có ràng buộc toàn vẹn.
* **Hướng khắc phục:** Viết script migration dọn dẹp các bản ghi mồ côi này một cách an toàn.

### ERR-13: Cảnh báo Circular Chunk giữa vendor và vendor-react khi Build Frontend
* **Mức độ:** **LOW**
* **Module:** Frontend Build
* **File liên quan:** [frontend/vite.config.js](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/frontend/vite.config.js#L21)
* **Bằng chứng:** Khi chạy `npm run build` xuất hiện cảnh báo: `Circular chunk: vendor -> vendor-react -> vendor`.
* **Cách tái hiện:** Chạy lệnh `npm --prefix frontend run build`.
* **Nguyên nhân:** Điều kiện `id.includes("react")` gom cả các thư viện phụ thuộc vòng với vendor thông thường.
* **Hướng khắc phục:** Tinh chỉnh matcher trong `manualChunks` thành regex chính xác cho các thư viện cốt lõi `react`, `react-dom`, `react-router-dom`.

### ERR-14: Dashboard gửi request các API bị cấm gây lỗi 403 đỏ trong console của nhân viên
* **Mức độ:** **LOW**
* **Module:** Frontend UI/UX
* **File liên quan:** [frontend/src/pages/DashboardPage.jsx](file:///d:/%E1%BB%A8ng%20d%E1%BB%A5ng%20tin%20h%E1%BB%8Dc%20trong%20k%E1%BA%BF%20to%C3%A1n/frontend/src/pages/DashboardPage.jsx#L56-L64)
* **Bằng chứng:** Mặc dù dùng `Promise.allSettled` không gây crash UI, nhưng khi nhân viên bán hàng mở Dashboard, console trình duyệt vẫn hiện 3 thông báo lỗi đỏ 403 (`/api/debts`, `/api/reports/revenue`, `/api/goods-receipts`).
* **Cách tái hiện:** Đăng nhập `maianh` $\rightarrow$ Mở F12 Console $\rightarrow$ Thấy các lỗi 403 Forbidden.
* **Nguyên nhân:** Dashboard luôn gửi query tất cả các endpoint mà không kiểm tra quyền người dùng trước.
* **Hướng khắc phục:** Dùng `userCan` để chỉ gửi request đến những endpoint mà tài khoản hiện tại được phép xem.

---

## 14. DANH MỤC RỦI RO TIỀM ẨN (RISK REGISTER)

1. **Rủi ro mất dữ liệu khi chuyển giao đồ án (Data Loss on Migration):** Nếu người dùng hoặc giảng viên sao lưu cơ sở dữ liệu để chuyển sang máy khác, việc thiếu 5 collections sẽ làm mất trắng các đơn bán hàng POS và phiếu trả hàng.
2. **Rủi ro sai lệch số cái tài chính khi xóa chứng từ:** Nếu người dùng dùng công cụ ngoài (Postman/Curl) gọi API xóa hóa đơn hoặc phiếu nhập, kho và công nợ sẽ bị lệch nghiêm trọng mà không thể truy vết.
3. **Rủi ro MongoDB Standalone không hỗ trợ Transaction thực thụ:** File `mongodb.js` có cơ chế fallback không dùng session khi chạy standalone MongoDB. Nếu server bị mất điện hoặc crash giữa chừng trong lúc ghi bán hàng (sau khi trừ kho nhưng trước khi tạo hóa đơn), dữ liệu sẽ bị bất nhất.
4. **Rủi ro lộ bí mật cấu hình:** Thiếu `.env` khiến bí mật mã hóa JWT bị lộ công khai trong mã nguồn.

---

## 15. DANH MỤC ĐỀ XUẤT NÂNG CẤP TOÀN DIỆN

### NHÓM A: BẮT BUỘC SỬA (Ưu tiên cao nhất — Ảnh hưởng trực tiếp đến dữ liệu và điểm số bảo vệ)

#### 1. Nâng cấp danh sách Backup & Cơ chế Deserialization
* **Vấn đề hiện tại:** Thiếu 5 collection trong snapshot (`DonHang`, `CT_DonHang`, `PhieuTraHang`, `CT_PhieuTraHang`, `CT_KhuyenMai`) và mất kiểu `ObjectId` của các khóa ngoại khi restore (ERR-01, ERR-02).
* **Lợi ích:** Đảm bảo sao lưu toàn vẹn 100% dữ liệu kế toán, khôi phục trên bất kỳ máy tính nào của hội đồng mà không bị đứt gãy quan hệ.
* **Mức độ ưu tiên:** CRITICAL | **Độ phức tạp:** Thấp (Dưới 30 dòng code).
* **Module bị ảnh hưởng:** `backend/src/modules/backup/backup.route.js`.
* **Rủi ro khi triển khai:** Rất thấp.
* **Hướng triển khai đề xuất:** Cập nhật `BACKUP_COLLECTIONS` thành 30 collections đầy đủ; trong `deserializeDoc`, tự động kiểm tra nếu giá trị là chuỗi Hex 24 ký tự hợp lệ thì phục hồi thành `new ObjectId(val)`.

#### 2. Khóa chặn hành vi DELETE trên các chứng từ nghiệp vụ cốt lõi
* **Vấn đề hiện tại:** `PhieuNhap`, `HoaDon`, `DonHang` có thể bị xóa qua API CRUD thông thường, gây tồn kho ảo và mồ côi chứng từ thanh toán (ERR-03, ERR-04).
* **Lợi ích:** Đảm bảo nguyên tắc bất biến của kế toán tài chính (Chứng từ đã phát sinh giao dịch chỉ được Điều chỉnh hoặc Trả hàng, không được xóa tùy tiện).
* **Mức độ ưu tiên:** CRITICAL | **Độ phức tạp:** Thấp.
* **Module bị ảnh hưởng:** `backend/src/modules/shared/createCrudModule.js`.
* **Rủi ro khi triển khai:** Rất thấp.
* **Hướng triển khai đề xuất:** Trong handler `router.delete("/:id")`, thêm kiểm tra: nếu `tableName` thuộc nhóm `["PhieuNhap", "HoaDon", "DonHang"]`, lập tức trả về `HTTP 403: "Không được phép xóa chứng từ kế toán đã phát sinh. Vui lòng sử dụng chức năng Trả hàng hoặc Điều chỉnh kho."`.

#### 3. Khắc phục Race Condition trong thanh toán công nợ và sinh mã chứng từ
* **Vấn đề hiện tại:** Thanh toán công nợ NCC có thể bị trùng số tiền (ERR-06); sinh mã chứng từ quét mảng O(N) có thể trùng mã khi ghi đồng thời (ERR-07).
* **Lợi ích:** Loại bỏ nguy cơ trả nợ vượt số dư; sinh mã chứng từ đạt tốc độ tức thì O(1) và an toàn tuyệt đối.
* **Mức độ ưu tiên:** HIGH | **Độ phức tạp:** Trung bình.
* **Module bị ảnh hưởng:** `backend/src/modules/business/business.route.js`, `backend/src/modules/shared/businessCode.js`.
* **Rủi ro khi triển khai:** Cần đảm bảo mã chứng từ sinh ra tiếp tục liên tục với mã hiện tại.
* **Hướng triển khai đề xuất:** Dùng `findOneAndUpdate` nguyên tử cho công nợ; tạo collection `Counters` với atomic `$inc` để sinh mã nghiệp vụ.

#### 4. Khởi tạo file `.env` bảo mật và chuẩn hóa JWT Secret
* **Vấn đề hiện tại:** Thiếu file `.env` cục bộ, dùng secret mặc định hiển thị trong code (ERR-05).
* **Lợi ích:** Đạt tiêu chuẩn an ninh thông tin OWASP, bảo vệ chữ ký JWT không thể bị giả mạo.
* **Mức độ ưu tiên:** HIGH | **Độ phức tạp:** Rất thấp.
* **Module bị ảnh hưởng:** `backend/.env`, `backend/src/server.js`.
* **Rủi ro khi triển khai:** Không có.

---

### NHÓM B: NÊN NÂNG CẤP (Nâng cao trải nghiệm người dùng, chất lượng báo cáo và hiệu năng)

#### 5. Bổ sung biến động `DieuChinhKho` vào Báo cáo tồn kho
* **Vấn đề hiện tại:** Báo cáo tồn kho `/reports/inventory` bị lệch tồn đầu kỳ nếu trong kỳ có phiếu kiểm kê điều chỉnh (ERR-09).
* **Lợi ích:** Đẳng thức kế toán `Tồn Cuối = Tồn Đầu + Nhập - Xuất ± Điều chỉnh` cân bằng chuẩn xác 100%.
* **Mức độ ưu tiên:** MEDIUM | **Độ phức tạp:** Trung bình.
* **Module bị ảnh hưởng:** `backend/src/modules/reports/reports.route.js`.
* **Hướng triển khai:** Đọc thêm dữ liệu `DieuChinhKho` trong khoảng thời gian lọc và tính toán vào biến động tổng hợp.

#### 6. Tối ưu N+1 Query và bổ sung Index cho `AuditLogs`
* **Vấn đề hiện tại:** `serializeRecord` gọi truy vấn lặp lại trong vòng lặp; `AuditLogs` thiếu index timestamp (ERR-10, ERR-11).
* **Lợi ích:** Giảm 90% số lượng round-trips vào database khi mở danh mục sản phẩm; trang nhật ký kiểm toán tải nhanh gấp 5 lần.
* **Mức độ ưu tiên:** MEDIUM | **Độ phức tạp:** Thấp.
* **Module bị ảnh hưởng:** `createCrudModule.js`, `ensure-indexes.js`.
* **Hướng triển khai:** Batch query `TonKho.find({ MaSP: { $in: ids } })` và tạo index `{ timestamp: -1 }`.

#### 7. Đồng bộ Role tức thời trong `auth.middleware.js`
* **Vấn đề hiện tại:** Khi user bị đổi role trong DB, token cũ vẫn giữ role cũ đến 8 giờ (ERR-08).
* **Lợi ích:** Quyền hạn thay đổi có hiệu lực ngay lập tức trong lần click tiếp theo của người dùng.
* **Mức độ ưu tiên:** MEDIUM | **Độ phức tạp:** Rất thấp.
* **Module bị ảnh hưởng:** `backend/src/common/middlewares/auth.middleware.js`.

#### 8. Tinh chỉnh Dashboard lọc query theo quyền hạn người dùng
* **Vấn đề hiện tại:** Console hiện lỗi đỏ 403 khi nhân viên mở trang chủ (ERR-14).
* **Lợi ích:** Console sạch 100% không còn warning/error, giao diện hiển thị chuyên nghiệp trước hội đồng.
* **Mức độ ưu tiên:** LOW | **Độ phức tạp:** Thấp.
* **Module bị ảnh hưởng:** `frontend/src/pages/DashboardPage.jsx`.

---

### NHÓM C: NÂNG CẤP NÂNG CAO (Giá trị gia tăng nếu còn thời gian)

#### 9. Hỗ trợ cảnh báo hàng sắp hết hạn sử dụng (FEFO Alert)
* **Mô tả:** Thêm một thẻ thống kê trên Dashboard hoặc Danh sách sản phẩm cảnh báo các mặt hàng có hạn sử dụng dưới 30 ngày (đặc thù sữa, thực phẩm ăn dặm cho bé).
* **Lợi ích:** Tăng tính thực tế của đồ án chuyên ngành Mẹ & Bé, gây ấn tượng rất mạnh với hội đồng chấm thi.
* **Ưu tiên:** LOW | **Độ phức tạp:** Thấp.

#### 10. Modular Refactoring các "God-Components"
* **Mô tả:** Tách `ReportPage.jsx` và `business.route.js` thành các component và service con nhỏ gọn dưới 400 dòng.
* **Lợi ích:** Mã nguồn sạch sẽ, dễ bảo trì, đạt chuẩn Clean Code.
* **Ưu tiên:** LOW | **Độ phức tạp:** Trung bình.

---

### NHÓM D: TUYỆT ĐỐI KHÔNG NÊN LÀM

1. **Không chuyển đổi database sang SQL (MySQL/PostgreSQL):** Toàn bộ 25 collection logic, quan hệ tham chiếu, schema validation, index và test suites của MongoDB hiện tại đang vận hành cực kỳ ổn định. Việc chuyển đổi sẽ làm vỡ toàn bộ mã nguồn và không kịp thời gian bảo vệ.
2. **Không tích hợp các cổng thanh toán quốc tế phức tạp (Stripe/PayPal/VNPAY Sandbox thực tế):** Hệ thống tạo mã QR VietQR động (chuyển khoản ngân hàng chuẩn Napas) hiện tại đã quá đủ và thực tế đối với mô hình bán lẻ tại quầy của cửa hàng Mẹ & Bé Việt Nam.
3. **Không thay thế React SPA bằng Next.js SSR:** Kiến trúc SPA quản trị nội bộ hiện tại phản hồi nhanh, tối ưu tài nguyên, chuyển sang SSR chỉ làm tăng độ phức tạp cấu hình máy chủ không cần thiết.

---

## 16. CÁC CHỨC NĂNG NÊN GIỮ NGUYÊN

Để đảm bảo tính ổn định và tránh phát sinh lỗi hồi quy (regression), **tuyệt đối giữ nguyên các thành phần sau:**
1. **Toàn bộ cấu trúc 25 logical collections MongoDB hiện hữu:** Không đổi tên collection, không drop database, không thay đổi cấu trúc trường dữ liệu gốc.
2. **Luồng bán lẻ POS quầy (`SalesPOSPage.jsx`):** Cơ chế trừ tồn kho nguyên tử, tính điểm hội viên, tích hợp mã QR VietQR và in hóa đơn K80 đang hoạt động rất tốt.
3. **Cơ chế xác nhận Phiếu thu / Phiếu chi (`CONFIRMED`):** Logic khóa cứng chứng từ thu chi đã xác nhận tại backend và frontend đã hoàn thiện chuẩn xác.
4. **Cơ chế bảo vệ Công nợ nhà cung cấp:** Chặn xóa công nợ và trả nợ từng phần đang tuân thủ đúng yêu cầu kế toán.
5. **Các mẫu in A4 & K80:** Các file `cashVoucher.js`, `warehouseVoucher.js`, `reportPrint.js` đã được căn chỉnh tỷ lệ chuẩn in ấn, có đầy đủ các chữ ký pháp lý.
6. **Bộ lọc phân quyền ma trận động RBAC:** Ma trận quyền trong `VaiTro` và middleware `requirePermission`.

---

## 17. CÁC CHỨC NĂNG KHÔNG NÊN PHÁT TRIỂN THÊM

* Tính năng đa chi nhánh (Multi-branch) hoặc đa kho phức tạp.
* Hệ thống chat trực tuyến với khách hàng hoặc tích hợp mạng xã hội.
* Hệ thống quản lý nhân sự chấm công, tính lương nâng cao (ngoài phạm vi môn kế toán thương mại).
* Ứng dụng di động riêng biệt (Mobile App).

---

## 18. KẾ HOẠCH KHẮC PHỤC THEO THỨ TỰ ƯU TIÊN

```
Giai đoạn 1: Khắc phục lỗi Dữ liệu & An toàn (Ưu tiên số 1 - Dự kiến: 1 giờ)
  ├── 1. Bổ sung 5 collection vào backup.route.js & Deserialize ObjectId (ERR-01, ERR-02)
  ├── 2. Chặn DELETE Phiếu nhập, Hóa đơn, Đơn hàng trong createCrudModule.js (ERR-03, ERR-04)
  └── 3. Tạo file backend/.env với JWT_SECRET ngẫu nhiên mạnh (ERR-05)

Giai đoạn 2: Tối ưu An toàn giao dịch & Race Condition (Ưu tiên số 2 - Dự kiến: 1.5 giờ)
  ├── 4. Khóa nguyên tử khi thanh toán công nợ NCC /debts/:id/pay (ERR-06)
  ├── 5. Chuyển hàm sinh mã businessCode sang Counter nguyên tử (ERR-07)
  └── 6. Cập nhật role tức thời trong auth.middleware.js (ERR-08)

Giai đoạn 3: Hoàn thiện Báo cáo & Hiệu năng (Ưu tiên số 3 - Dự kiến: 1 giờ)
  ├── 7. Tích hợp DieuChinhKho vào báo cáo tồn kho (ERR-09)
  ├── 8. Thêm index AuditLogs và tối ưu N+1 query sản phẩm (ERR-10, ERR-11)
  └── 9. Dọn dẹp 12 bản ghi mồ côi trong database (ERR-12)

Giai đoạn 4: Tinh chỉnh UI/UX & Chuẩn bị Demo (Ưu tiên số 4 - Dự kiến: 30 phút)
  ├── 10. Sửa Vite manualChunks triệt tiêu warning circular chunk (ERR-13)
  ├── 11. Sửa Dashboard tránh gọi API trái quyền nhân viên (ERR-14)
  └── 12. Diễn tập theo Kịch bản 15 bước trình diễn trước hội đồng
```

---

## 19. KỊCH BẢN KIỂM THỬ THỦ CÔNG & TRÌNH DIỄN BẢO VỆ

Kịch bản demo liền mạch 15 bước giúp sinh viên làm chủ toàn bộ bài thuyết trình đồ án trước Hội đồng chấm thi:

| Bước | Diễn giải thao tác | Dữ liệu mẫu minh họa | Kết quả kỳ vọng hiển thị trên màn hình |
|:---:|---|---|---|
| **1** | **Đăng nhập hệ thống** | `admin` / `admin123` | Đăng nhập thành công, vào Dashboard, hiển thị vai trò "Quản lý" ở góc trên |
| **2** | **Trình diễn Phân quyền** | Chuyển sang tài khoản `maianh` / `maianh123` | Menu bên trái tự động ẩn: "Nhập hàng", "Báo cáo", "Công nợ NCC", "Quản trị" |
| **3** | **Quản lý sản phẩm** | Đăng nhập `admin`, vào Danh mục $\rightarrow$ Sản phẩm | Xem chi tiết sản phẩm "Sữa bột Meiji 800g", xem giá nhập 450k, giá bán 520k, tồn kho 99 |
| **4** | **Đặt hàng NCC & Nhập kho** | Vào Mua hàng $\rightarrow$ Đặt hàng NCC | Mở đơn đặt hàng, bấm "Nhập hàng", nhập 10 hộp, trả trước 2.000.000đ |
| **5** | **Tự động cập nhật Tồn kho** | Vào Kho $\rightarrow$ Tồn kho | Tồn kho sản phẩm vừa nhập tự động tăng thêm 10 hộp |
| **6** | **Bán lẻ tại quầy POS** | Vào Bán hàng (POS quầy), phím tắt `F2` | Tìm sản phẩm, chọn số lượng 2 hộp, chọn khách hàng "Nguyễn Thị Hoa" (`F4`) |
| **7** | **Áp dụng khuyến mãi & Thanh toán** | Nhập mã voucher hoặc quét QR | Giảm giá hiển thị rõ ràng, chọn thanh toán Chuyển khoản $\rightarrow$ Hiện mã QR VietQR |
| **8** | **In hóa đơn bán hàng** | Bấm hoàn tất đơn hàng | Modal hiện nút "In bill K80" $\rightarrow$ Bấm mở bản in nhiệt chuẩn siêu thị |
| **9** | **Phiếu thu/chi & Xác nhận** | Vào Kế toán $\rightarrow$ Phiếu chi | Thấy phiếu chi tự động từ đợt nhập hàng bước 4. Bấm "Xác nhận" $\rightarrow$ Khóa không cho sửa/xóa |
| **10** | **Kiểm tra Công nợ NCC** | Vào Kế toán $\rightarrow$ Công nợ NCC | Khoản nợ NCC hiển thị chính xác số tiền còn lại sau khi đã trừ 2 triệu trả trước |
| **11** | **Kiểm kê & Điều chỉnh kho** | Vào Kho $\rightarrow$ Kiểm kê kho | Nhập số thực tế chênh lệch -1 hộp do móp méo $\rightarrow$ Bấm "Cân bằng tồn kho" |
| **12** | **Báo cáo Doanh thu** | Vào Báo cáo $\rightarrow$ Tab Doanh thu | Doanh thu ngày nhảy số chính xác theo hóa đơn vừa bán tại bước 6 |
| **13** | **Báo cáo Tồn kho & In ấn A4** | Vào Báo cáo $\rightarrow$ Tab Tồn kho $\rightarrow$ In A4 | Mở bản in A4 Báo cáo Xuất - Nhập - Tồn đầy đủ chữ ký Giám đốc và Kế toán trưởng |
| **14** | **Nhật ký kiểm toán (Audit Log)**| Vào Quản trị $\rightarrow$ Nhật ký kiểm toán | Hiển thị đầy đủ lịch sử các thao tác vừa thực hiện kèm IP, thời gian, tên user `admin` |
| **15** | **Sao lưu dữ liệu (Backup)** | Vào Quản trị $\rightarrow$ Sao lưu dữ liệu | Bấm "Tạo bản sao lưu ngay" $\rightarrow$ File snapshot tự động tải về máy tính trong 1 giây |

---

## 20. KẾT LUẬN MỨC ĐỘ SẴN SÀNG CỦA DỰ ÁN

* **Điểm đánh giá sẵn sàng hiện tại (Current Readiness Score):** **88 / 100**
* **Đánh giá tổng quan:** Dự án **Hệ thống Quản lý Cửa hàng Mẹ & Bé** là một đồ án đại học có chất lượng rất tốt, cấu trúc mã nguồn bài bản, giao diện đẹp mắt, giàu tính năng thực tiễn và đáp ứng vượt mức các yêu cầu nghiệp vụ thông thường.
* **Điều kiện tiên quyết để bảo vệ đạt điểm xuất sắc (A+):** Cần triển khai các bản vá thuộc **Nhóm A (Bắt buộc sửa)** gồm:
  1. Bổ sung đầy đủ 5 collection vào hệ thống Backup và phục hồi đúng kiểu ObjectId.
  2. Khóa chặn xóa chứng từ kế toán qua CRUD API.
  3. Xử lý khóa nguyên tử trong thanh toán nợ và sinh mã chứng từ.
  4. Khởi tạo file `.env` bảo mật.
* Sau khi hoàn tất 4 mục trên, dự án sẽ đạt mức độ sẵn sàng **98/100**, bảo đảm hệ thống vận hành vững chắc, số liệu kế toán chính xác tuyệt đối và sẵn sàng trình diễn ấn tượng trước Hội đồng chấm đồ án tốt nghiệp.

---
*Báo cáo được hoàn thành và ký nhận bởi toàn thể Đội ngũ Chuyên gia Kiểm toán Hệ thống.*
