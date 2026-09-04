import React, { useState, useMemo } from "react";
import {
  Search,
  ScanBarcode,
  Trash2,
  Plus,
  Minus,
  User,
  UserRound,
  Printer,
  Save,
  X,
  BadgePercent,
  Wallet,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Dữ liệu mẫu (giả lập bảng san_pham, khach_hang, hang_thanh_vien)
// ---------------------------------------------------------------------------
const SAN_PHAM_MAU = [
  { ma: "SP001", ten: "Bỉm Pampers size M (44 miếng)", gia: 285000, ton: 42 },
  { ma: "SP002", ten: "Bình sữa Pigeon cổ rộng 240ml", gia: 195000, ton: 18 },
  { ma: "SP003", ten: "Sữa bột NAN Optipro 4 800g", gia: 425000, ton: 25 },
  { ma: "SP004", ten: "Khăn ướt Mamamy 3 gói", gia: 89000, ton: 60 },
  { ma: "SP005", ten: "Combo đồ ăn dặm HiPP (3 hộp)", gia: 210000, ton: 12 },
  { ma: "SP006", ten: "Kem chống hăm Bepanthen 30g", gia: 118000, ton: 30 },
];

const KHACH_HANG_MAU = {
  "0987654321": {
    ma: "KH0021",
    ten: "Nguyễn Thị Lan",
    hang: "Hạng Vàng",
    giam: 5,
    diem: 320,
  },
  "0912345678": {
    ma: "KH0045",
    ten: "Trần Minh Anh",
    hang: "Hạng Bạc",
    giam: 2,
    diem: 85,
  },
};

const KHACH_LE = { ma: "KL000", ten: "Khách lẻ", hang: "—", giam: 0, diem: 0 };

const formatVND = (n) =>
  n.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " đ";

// ---------------------------------------------------------------------------
export default function ManHinhLapHoaDon() {
  const [gioHang, setGioHang] = useState([
    { ma: "SP001", ten: "Bỉm Pampers size M (44 miếng)", gia: 285000, sl: 2 },
    { ma: "SP002", ten: "Bình sữa Pigeon cổ rộng 240ml", gia: 195000, sl: 1 },
  ]);
  const [timSp, setTimSp] = useState("");
  const [sdt, setSdt] = useState("");
  const [khachHang, setKhachHang] = useState(KHACH_LE);
  const [dungDiem, setDungDiem] = useState(0);
  const [phuongThuc, setPhuongThuc] = useState("Tiền mặt");
  const [tienKhachTra, setTienKhachTra] = useState("");
  const [choMuaChiu, setChoMuaChiu] = useState(true);
  const [thongBao, setThongBao] = useState(null);

  // --- Tra cứu khách hàng theo SĐT (nghiệp vụ: định danh khách hàng) -------
  const traCuuKhach = () => {
    const kq = KHACH_HANG_MAU[sdt.trim()];
    if (kq) {
      setKhachHang(kq);
      setThongBao(null);
    } else if (sdt.trim() === "") {
      setKhachHang(KHACH_LE);
    } else {
      setKhachHang({ ...KHACH_LE, ten: "Khách hàng mới", hang: "Chưa có hồ sơ" });
      setThongBao({
        loai: "warn",
        text: "Chưa tìm thấy khách hàng — nếu bán chịu, cần tạo hồ sơ khách hàng trước khi lưu hóa đơn.",
      });
    }
  };

  // --- Giỏ hàng --------------------------------------------------------
  const themSanPham = (sp) => {
    setGioHang((prev) => {
      const idx = prev.findIndex((i) => i.ma === sp.ma);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], sl: clone[idx].sl + 1 };
        return clone;
      }
      return [...prev, { ma: sp.ma, ten: sp.ten, gia: sp.gia, sl: 1 }];
    });
  };

  const suaSoLuong = (ma, delta) => {
    setGioHang((prev) =>
      prev
        .map((i) => (i.ma === ma ? { ...i, sl: Math.max(1, i.sl + delta) } : i))
        .filter(Boolean)
    );
  };

  const xoaSanPham = (ma) => setGioHang((prev) => prev.filter((i) => i.ma !== ma));

  const sanPhamGoiY = SAN_PHAM_MAU.filter(
    (sp) =>
      timSp.trim() !== "" &&
      (sp.ma.toLowerCase().includes(timSp.toLowerCase()) ||
        sp.ten.toLowerCase().includes(timSp.toLowerCase()))
  );

  // --- Tính tiền (nghiệp vụ: tính thành tiền / tổng tiền / khuyến mãi) ----
  const tongTienHang = useMemo(
    () => gioHang.reduce((s, i) => s + i.gia * i.sl, 0),
    [gioHang]
  );
  const tienGiamHang = Math.round((tongTienHang * khachHang.giam) / 100);
  const tienDiemQuyDoi = Math.min(dungDiem, khachHang.diem) * 1000; // 1 điểm = 1.000đ
  const tongThanhToan = Math.max(
    0,
    tongTienHang - tienGiamHang - tienDiemQuyDoi
  );

  const soTienTra = Number(tienKhachTra) || 0;
  const tienThua = soTienTra > tongThanhToan ? soTienTra - tongThanhToan : 0;
  const conNo = soTienTra < tongThanhToan ? tongThanhToan - soTienTra : 0;

  // --- Trạng thái thanh toán (đúng theo tài liệu ngoại lệ mục 4) ----------
  const trangThai = useMemo(() => {
    if (gioHang.length === 0) return null;
    if (soTienTra <= 0)
      return { nhan: "Chưa thanh toán", mau: "rose", Icon: AlertTriangle };
    if (soTienTra < tongThanhToan)
      return { nhan: "Thanh toán một phần", mau: "amber", Icon: Clock };
    if (soTienTra === tongThanhToan)
      return { nhan: "Đã thanh toán", mau: "emerald", Icon: CheckCircle2 };
    return { nhan: "Thanh toán thừa", mau: "sky", Icon: CheckCircle2 };
  }, [soTienTra, tongThanhToan, gioHang.length]);

  const mauBadge = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  };

  // --- Lưu hóa đơn (áp dụng đúng ngoại lệ: chặn nếu không cho mua chịu) --
  const luuHoaDon = () => {
    if (gioHang.length === 0) {
      setThongBao({ loai: "warn", text: "Chưa có sản phẩm nào trong hóa đơn." });
      return;
    }
    if (conNo > 0) {
      if (khachHang.ma === "KL000") {
        setThongBao({
          loai: "error",
          text: "Không thể ghi nhận công nợ cho \"Khách lẻ\" — cần tra cứu hoặc tạo hồ sơ khách hàng cụ thể trước.",
        });
        return;
      }
      if (!choMuaChiu) {
        setThongBao({
          loai: "error",
          text: `Cửa hàng không cho phép mua chịu. Khách còn thiếu ${formatVND(
            conNo
          )} — yêu cầu thanh toán đủ hoặc cần quản lý phê duyệt.`,
        });
        return;
      }
    }
    setThongBao({
      loai: "success",
      text:
        conNo > 0
          ? `Đã lưu hóa đơn. Ghi nhận công nợ ${formatVND(conNo)} cho khách hàng ${khachHang.ten}.`
          : "Đã lưu hóa đơn thành công.",
    });
  };

  const maHoaDon = "HD" + new Date().toISOString().slice(2, 10).replace(/-/g, "");

  return (
    <div className="min-h-screen w-full bg-[#FBF6F1] text-stone-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                MB
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-stone-800">
                Lập hóa đơn bán hàng — Mẹ &amp; Bé
              </h1>
            </div>
            <p className="text-xs text-stone-400 mt-1 ml-10">
              Mã hóa đơn <span className="font-medium text-stone-600">{maHoaDon}</span>
              {"  ·  "}
              Ngày lập{" "}
              <span className="font-medium text-stone-600">
                {new Date().toLocaleDateString("vi-VN")}
              </span>
              {"  ·  "}
              Thu ngân <span className="font-medium text-stone-600">Đinh Tiến Đạt</span>
            </p>
          </div>
          {trangThai && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${mauBadge[trangThai.mau]}`}
            >
              <trangThai.Icon size={15} />
              {trangThai.nhan}
            </div>
          )}
        </div>

        {thongBao && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
              thongBao.loai === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : thongBao.loai === "warn"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{thongBao.text}</span>
            <button
              onClick={() => setThongBao(null)}
              className="ml-auto text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CỘT TRÁI: Khách hàng + sản phẩm */}
          <div className="lg:col-span-2 space-y-4">
            {/* Khách hàng */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-stone-500 text-xs font-semibold uppercase tracking-wide">
                <User size={14} /> Khách hàng
              </div>
              <div className="flex gap-2">
                <input
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && traCuuKhach()}
                  placeholder="Nhập số điện thoại để tra cứu (VD: 0987654321)"
                  className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={traCuuKhach}
                  className="rounded-xl bg-stone-800 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700 flex items-center gap-1.5"
                >
                  <Search size={14} /> Tra cứu
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <UserRound size={18} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-stone-800">{khachHang.ten}</p>
                    <p className="text-xs text-stone-400">
                      {khachHang.ma !== "KL000" ? khachHang.ma + " · " : ""}
                      {khachHang.hang}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>
                    Điểm tích lũy:{" "}
                    <span className="font-semibold text-stone-700">{khachHang.diem}</span>
                  </p>
                  <p>
                    Ưu đãi hạng:{" "}
                    <span className="font-semibold text-stone-700">{khachHang.giam}%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Sản phẩm */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-stone-500 text-xs font-semibold uppercase tracking-wide">
                <ScanBarcode size={14} /> Sản phẩm
              </div>
              <div className="relative">
                <input
                  value={timSp}
                  onChange={(e) => setTimSp(e.target.value)}
                  placeholder="Quét mã vạch hoặc tìm theo tên / mã sản phẩm..."
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {sanPhamGoiY.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                    {sanPhamGoiY.map((sp) => (
                      <button
                        key={sp.ma}
                        onClick={() => {
                          themSanPham(sp);
                          setTimSp("");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-teal-50 text-left"
                      >
                        <span>
                          <span className="text-stone-400 mr-2">{sp.ma}</span>
                          {sp.ten}
                        </span>
                        <span className="font-medium text-stone-700">{formatVND(sp.gia)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-stone-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-medium px-3 py-2">Sản phẩm</th>
                      <th className="text-right font-medium px-3 py-2">Đơn giá</th>
                      <th className="text-center font-medium px-3 py-2">SL</th>
                      <th className="text-right font-medium px-3 py-2">Thành tiền</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {gioHang.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-stone-400 text-sm py-6">
                          Chưa có sản phẩm — tìm hoặc quét mã để thêm vào hóa đơn
                        </td>
                      </tr>
                    )}
                    {gioHang.map((i) => (
                      <tr key={i.ma} className="border-t border-stone-100">
                        <td className="px-3 py-2">
                          <p className="font-medium text-stone-700">{i.ten}</p>
                          <p className="text-xs text-stone-400">{i.ma}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-stone-600">{formatVND(i.gia)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => suaSoLuong(i.ma, -1)}
                              className="h-6 w-6 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center">{i.sl}</span>
                            <button
                              onClick={() => suaSoLuong(i.ma, 1)}
                              className="h-6 w-6 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-stone-800">
                          {formatVND(i.gia * i.sl)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => xoaSanPham(i.ma)}
                            className="text-stone-300 hover:text-rose-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Tổng tiền + thanh toán */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-stone-500 text-xs font-semibold uppercase tracking-wide">
                <BadgePercent size={14} /> Tổng kết hóa đơn
              </div>
              <div className="space-y-2 text-sm">
                <Row label="Tổng tiền hàng" value={formatVND(tongTienHang)} />
                <Row
                  label={`Giảm giá hạng thành viên (${khachHang.giam}%)`}
                  value={"-" + formatVND(tienGiamHang)}
                  muted
                />
                <div className="flex items-center justify-between">
                  <label className="text-stone-500">Dùng điểm tích lũy</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={khachHang.diem}
                      value={dungDiem}
                      onChange={(e) =>
                        setDungDiem(
                          Math.max(0, Math.min(khachHang.diem, Number(e.target.value) || 0))
                        )
                      }
                      className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-right text-sm"
                    />
                    <span className="text-xs text-stone-400">/ {khachHang.diem} điểm</span>
                  </div>
                </div>
                <Row label="Quy đổi điểm" value={"-" + formatVND(tienDiemQuyDoi)} muted />
                <div className="border-t border-dashed border-stone-200 my-2" />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-stone-800">Tổng thanh toán</span>
                  <span className="font-bold text-teal-700">{formatVND(tongThanhToan)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-stone-500 text-xs font-semibold uppercase tracking-wide">
                <Wallet size={14} /> Thanh toán
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {["Tiền mặt", "Chuyển khoản / QR"].map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPhuongThuc(pt)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${
                      phuongThuc === pt
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-stone-200 text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {pt === "Tiền mặt" ? <Wallet size={14} /> : <QrCode size={14} />}
                    {pt}
                  </button>
                ))}
              </div>

              <label className="text-xs text-stone-500">Số tiền khách trả</label>
              <input
                type="number"
                min={0}
                value={tienKhachTra}
                onChange={(e) => setTienKhachTra(e.target.value)}
                placeholder="0"
                className="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2 text-right text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="mt-3 space-y-1.5 text-sm">
                {tienThua > 0 && <Row label="Tiền thừa trả khách" value={formatVND(tienThua)} accent="sky" />}
                {conNo > 0 && <Row label="Còn phải thu (công nợ)" value={formatVND(conNo)} accent="rose" />}
              </div>

              {conNo > 0 && (
                <label className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                  <input
                    type="checkbox"
                    checked={choMuaChiu}
                    onChange={(e) => setChoMuaChiu(e.target.checked)}
                    className="rounded border-stone-300"
                  />
                  Cửa hàng cho phép khách mua chịu khoản còn thiếu
                </label>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={luuHoaDon}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700"
                >
                  <Save size={15} /> Lưu &amp; in hóa đơn
                </button>
                <button className="rounded-xl border border-stone-200 px-3 py-2.5 text-stone-500 hover:bg-stone-50">
                  <Printer size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, accent }) {
  const color = accent === "rose" ? "text-rose-600" : accent === "sky" ? "text-sky-600" : muted ? "text-stone-400" : "text-stone-700";
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}