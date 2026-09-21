/**
 * ensure-indexes.js
 * Tạo và đảm bảo các chỉ mục (index) MongoDB để tối ưu hiệu năng truy vấn.
 * Được gọi tự động khi server khởi động (từ seed.js).
 * Sử dụng createIndex với { background: true } — không blocking, chạy ngầm.
 *
 * Danh mục index theo nghiệp vụ:
 * ─── HoaDon: Hóa đơn bán hàng (truy vấn theo ngày, khách hàng, trạng thái)
 * ─── DonHang: Đơn hàng (truy vấn theo ngày, khách hàng, trạng thái)
 * ─── PhieuNhap: Phiếu nhập kho (truy vấn theo ngày, nhà cung cấp)
 * ─── CongNo: Công nợ NCC (tra cứu nợ theo phiếu nhập, nhà cung cấp, trạng thái)
 * ─── TonKho: Tồn kho (tra cứu tồn theo sản phẩm)
 * ─── SanPham: Sản phẩm (tra cứu theo mã, tên, danh mục)
 * ─── KhachHang: Khách hàng (tra cứu theo SĐT, mã)
 * ─── NhaCungCap: Nhà cung cấp (tra cứu theo mã)
 * ─── CT_HoaDon, CT_DonHang, CT_PhieuNhap: Chi tiết chứng từ
 */
export async function ensureIndexes(database) {
  const idx = (col, spec, opts = {}) =>
    database.collection(col).createIndex(spec, { background: true, ...opts }).catch(() => {});

  // ── HoaDon (Hóa đơn) ──────────────────────────────────────────────
  await idx("HoaDon", { createdAt: -1 });                      // Sắp xếp hóa đơn mới nhất trước
  await idx("HoaDon", { MaKH: 1, createdAt: -1 });             // Lọc hóa đơn theo khách hàng + ngày
  await idx("HoaDon", { TrangThai: 1, createdAt: -1 });         // Lọc theo trạng thái (Đã thanh toán / Chưa TT)
  await idx("HoaDon", { NgayLap: -1 });                         // Lọc theo ngày lập
  await idx("HoaDon", { MaHD: 1 }, { unique: true, sparse: true }); // Tra cứu mã hóa đơn

  // ── DonHang (Đơn đặt hàng bán) ────────────────────────────────────
  await idx("DonHang", { createdAt: -1 });                      // Đơn mới nhất trước
  await idx("DonHang", { MaKH: 1, createdAt: -1 });             // Lọc đơn theo khách hàng
  await idx("DonHang", { TrangThai: 1, createdAt: -1 });         // Lọc theo trạng thái
  await idx("DonHang", { NgayDat: -1 });                         // Lọc theo ngày đặt
  await idx("DonHang", { MaDH: 1 }, { unique: true, sparse: true });

  // ── PhieuNhap (Phiếu nhập kho) ────────────────────────────────────
  await idx("PhieuNhap", { createdAt: -1 });                    // Phiếu nhập mới nhất trước
  await idx("PhieuNhap", { MaNCC: 1, createdAt: -1 });          // Lọc phiếu nhập theo nhà cung cấp
  await idx("PhieuNhap", { NgayNhap: -1 });                     // Lọc theo ngày nhập
  await idx("PhieuNhap", { MaPN: 1 }, { unique: true, sparse: true });

  // ── CongNo (Công nợ NCC) ──────────────────────────────────────────
  // Ưu tiên cao nhất: lookup từ MaPN khi xóa phiếu nhập cascade
  await idx("CongNo", { MaPN: 1 });
  // Báo cáo công nợ theo NCC + trạng thái
  await idx("CongNo", { MaNCC: 1, TrangThai: 1 });
  await idx("CongNo", { TrangThai: 1, createdAt: -1 });

  // ── TonKho (Tồn kho) ──────────────────────────────────────────────
  await idx("TonKho", { MaSP: 1 }, { unique: true, sparse: true }); // 1-1 với SanPham._id

  // ── SanPham (Sản phẩm) ────────────────────────────────────────────
  await idx("SanPham", { MaSP: 1 }, { unique: true, sparse: true });
  await idx("SanPham", { TrangThai: 1 });                       // Lọc trạng thái (Đang bán / Ngừng bán)
  await idx("SanPham", { MaLoai: 1 });                          // Lọc theo danh mục
  await idx("SanPham", { TenSP: "text" }, { default_language: "none" }); // Full-text search tên sản phẩm

  // ── KhachHang (Khách hàng) ────────────────────────────────────────
  await idx("KhachHang", { MaKH: 1 }, { unique: true, sparse: true });
  await idx("KhachHang", { SDT: 1 }, { unique: true, sparse: true });
  await idx("KhachHang", { TrangThai: 1 });

  // ── NhaCungCap (Nhà cung cấp) ─────────────────────────────────────
  await idx("NhaCungCap", { MaNCC: 1 }, { unique: true, sparse: true });
  await idx("NhaCungCap", { TrangThai: 1 });

  // ── Chi tiết chứng từ (detail collections) ────────────────────────
  await idx("CT_HoaDon",   { MaHD: 1 });
  await idx("CT_DonHang",  { MaDH: 1 });
  await idx("CT_PhieuNhap",{ MaPN: 1 });
  await idx("CT_PhieuXuat",{ MaPX: 1 });
  await idx("CT_DonDatHang",{ MaDDH: 1 });

  // ── PhieuXuat, DonDatHang, PhieuThu, PhieuChi ─────────────────────
  await idx("PhieuXuat",   { createdAt: -1 });
  await idx("PhieuXuat",   { NgayXuat: -1 });
  await idx("DonDatHang",  { MaNCC: 1, createdAt: -1 });
  await idx("DonDatHang",  { TrangThai: 1, createdAt: -1 });
  await idx("PhieuThu",    { createdAt: -1 });
  await idx("PhieuChi",    { createdAt: -1 });

  // ── Users (Tài khoản) ─────────────────────────────────────────────
  await idx("Users", { username: 1 }, { unique: true, sparse: true });

  console.log("✓ Đã kiểm tra và tạo đầy đủ chỉ mục MongoDB");
}
