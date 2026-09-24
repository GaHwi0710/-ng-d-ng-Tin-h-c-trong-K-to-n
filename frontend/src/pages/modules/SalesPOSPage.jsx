import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  TicketIcon,
  CheckCircleIcon,
  XMarkIcon,
  ShoppingBagIcon,
  UserPlusIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import { ProductImage } from "../../components/ProductImage.jsx";
import { Badge, StatusBadge } from "../../components/Badge.jsx";
import { FilterChips } from "../../components/FilterChips.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { getMemberTier } from "./CustomersPage.jsx";
import { getCategoryIcon } from "./ProductsPage.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
import { currentUserInfo } from "../../lib/permissions.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function SalesPOSPage({ title }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Voucher / Promotion state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [custSearchQuery, setCustSearchQuery] = useState("");
  const [custDropdownOpen, setCustDropdownOpen] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ HoTen: "", SDT: "", Email: "", DiaChi: "" });
  const [appliedRedeemedVoucher, setAppliedRedeemedVoucher] = useState(null);
  const [showRedeemModalSales, setShowRedeemModalSales] = useState(false);
  const [salesRedeemCode, setSalesRedeemCode] = useState("BAC50K");
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");

  useEffect(() => {
    const loadCustomers = () => {
      listRecords("customers")
        .then(setCustomers)
        .catch((error) => setCustomerError(error.message || "Không tải được danh sách khách hàng"));
    };

    listRecords("products").then(setProducts);
    listRecords("promotions").then(setPromotions).catch(() => []);
    loadCustomers();
    window.addEventListener("focus", loadCustomers);
    document.addEventListener("visibilitychange", loadCustomers);

    return () => {
      window.removeEventListener("focus", loadCustomers);
      document.removeEventListener("visibilitychange", loadCustomers);
    };
  }, []);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.TrangThai !== "Ngưng hoạt động" && customer.status !== "inactive"),
    [customers]
  );

  const filteredCustSearch = useMemo(() => {
    if (!custSearchQuery) return activeCustomers;
    const q = custSearchQuery.toLowerCase();
    return activeCustomers.filter(c =>
      (c.HoTen || "").toLowerCase().includes(q) ||
      (c.SDT || "").includes(q) ||
      (c.MaKH || c.id || "").toLowerCase().includes(q)
    );
  }, [activeCustomers, custSearchQuery]);

  const customerRedeemedVouchers = useMemo(() => {
    if (!selectedCustomer || !Array.isArray(selectedCustomer.VouchersDaDoi)) return [];
    return selectedCustomer.VouchersDaDoi.filter((v) => v.status === "Chưa sử dụng" || !v.status);
  }, [selectedCustomer]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".sales-cust-search")) setCustDropdownOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setCustDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const customerPts = Number(selectedCustomer?.DiemTichLuy || 0);
  const customerTier = !selectedCustomer
    ? null
    : customerPts >= 1000
    ? "Kim Cương"
    : customerPts >= 500
    ? "Vàng"
    : customerPts >= 100
    ? "Bạc"
    : "Đồng";

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.GiaBan,
    0
  );
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Auto recalculate discount when cart or applied promo changes
  useEffect(() => {
    if (appliedPromo) {
      let disc = 0;
      if (appliedPromo.GiaTriGiam && Number(appliedPromo.GiaTriGiam) > 0) {
        disc = Math.min(subtotal, Number(appliedPromo.GiaTriGiam));
      } else if (appliedPromo.PhanTramGiam && Number(appliedPromo.PhanTramGiam) > 0) {
        disc = Math.min(subtotal, Math.round((subtotal * Number(appliedPromo.PhanTramGiam)) / 100));
      }
      setDiscountAmount(disc);
    } else {
      setDiscountAmount(0);
    }
  }, [subtotal, appliedPromo]);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const categories = useMemo(() => {
    return ["all", ...new Set(products.map((p) => p.LoaiHang).filter(Boolean))];
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        if (p.TrangThai === "Ngừng bán" || p.status === "inactive") return false;
        const matchSearch =
          !searchQuery ||
          p.TenSP.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.MaSP || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = selectedCat === "all" || p.LoaiHang === selectedCat;
        return matchSearch && matchCat;
      }),
    [products, searchQuery, selectedCat]
  );

  function applyPromo(code) {
    const cleanCode = (code || promoInput).trim().toUpperCase();
    if (!cleanCode) return toast("Vui lòng nhập mã khuyến mãi hoặc voucher");

    const found = promotions.find(
      (p) => (p.MaKM && p.MaKM.toUpperCase() === cleanCode) || p.id === cleanCode
    );
    if (!found) {
      return toast(`Mã giảm giá "${cleanCode}" không hợp lệ hoặc đã hết hạn`);
    }
    if (found.TrangThai === "Đã kết thúc") {
      return toast(`Chương trình "${found.TenKM}" đã kết thúc`);
    }

    if (found.PhamVi === "Theo đối tượng" && found.DoiTuong && found.DoiTuong !== "Tất cả") {
      if (!selectedCustomer) {
        return toast(`Mã "${cleanCode}" chỉ dành cho thành viên ${found.DoiTuong}. Vui lòng chọn khách hàng!`);
      }
      if (!found.DoiTuong.toLowerCase().includes(customerTier.toLowerCase())) {
        return toast(`Mã "${cleanCode}" áp dụng cho ${found.DoiTuong}. Khách hàng hiện tại đang là Hạng ${customerTier}.`);
      }
    }

    // Check if customer has enough points to redeem
    const requiredPoints = Number(found.DiemYeuCau || 0) || (
      cleanCode === "BAC50K" ? 100 :
      cleanCode === "VANG100K" ? 500 :
      cleanCode === "KC200K" ? 1000 : 0
    );
    if (requiredPoints > 0) {
      if (!selectedCustomer) return toast("Cần chọn khách hàng để đổi điểm lấy voucher");
      const currentPoints = Number(selectedCustomer.DiemTichLuy || 0);
      if (currentPoints < requiredPoints) {
        return toast(`Khách hàng không đủ điểm (cần ${requiredPoints} điểm, hiện có ${currentPoints} điểm)`);
      }
    }

    let disc = 0;
    if (found.GiaTriGiam && Number(found.GiaTriGiam) > 0) {
      disc = Math.min(subtotal, Number(found.GiaTriGiam));
    } else if (found.PhanTramGiam && Number(found.PhanTramGiam) > 0) {
      disc = Math.min(subtotal, Math.round((subtotal * Number(found.PhanTramGiam)) / 100));
    }

    setAppliedPromo({ ...found, DiemYeuCau: requiredPoints });
    setDiscountAmount(disc);
    setPromoInput(cleanCode);
    toast(`Đã áp dụng mã "${cleanCode}": Giảm ${money.format(disc)}${requiredPoints > 0 ? ` (Trừ ${requiredPoints} điểm khi thanh toán)` : ""}`);
  }

  function removePromo() {
    setAppliedPromo(null);
    setAppliedRedeemedVoucher(null);
    setDiscountAmount(0);
    setPromoInput("");
    toast("Đã gỡ bỏ mã khuyến mãi");
  }

  function applyRedeemedVoucher(v) {
    if (!v) {
      setAppliedRedeemedVoucher(null);
      setAppliedPromo(null);
      setDiscountAmount(0);
      setPromoInput("");
      return;
    }
    setAppliedRedeemedVoucher(v);
    const disc = Number(v.discountAmount || (v.code === "BAC50K" ? 50000 : v.code === "VANG100K" ? 100000 : 200000));
    setAppliedPromo({
      MaKM: v.code,
      TenKM: v.name,
      GiaTriGiam: disc,
      DiemYeuCau: 0,
      isRedeemedVoucher: true,
      voucherId: v.id,
    });
    setDiscountAmount(disc);
    setPromoInput(v.code);
    toast(`Đã áp dụng voucher đã đổi: "${v.code}" (Giảm ${money.format(disc)}). Không trừ thêm điểm.`);
  }

  async function handleRedeemInSales() {
    if (!selectedCustomer) return;
    const vOpt = [
      { code: "BAC50K", name: "Voucher giảm 50.000đ", points: 100, discount: 50000 },
      { code: "VANG100K", name: "Voucher giảm 100.000đ", points: 500, discount: 100000 },
      { code: "KC200K", name: "Voucher VIP giảm 200.000đ", points: 1000, discount: 200000 },
    ].find((x) => x.code === salesRedeemCode);
    if (!vOpt) return;
    const currentPts = Number(selectedCustomer.DiemTichLuy || 0);
    if (currentPts < vOpt.points) {
      return toast(`Khách hàng không đủ điểm (cần ${vOpt.points} điểm, hiện có ${currentPts} điểm)`);
    }
    try {
      const newPoints = currentPts - vOpt.points;
      const newVoucher = {
        id: "VCH-" + Date.now().toString(36).toUpperCase(),
        code: vOpt.code,
        name: vOpt.name,
        discountAmount: vOpt.discount,
        points: vOpt.points,
        redeemedAt: new Date().toISOString().slice(0, 10),
        status: "Chưa sử dụng",
      };
      const updatedVouchers = [...(selectedCustomer.VouchersDaDoi || []), newVoucher];
      await saveRecord("customers", {
        ...selectedCustomer,
        DiemTichLuy: newPoints,
        VouchersDaDoi: updatedVouchers,
      });
      const updatedCusts = await listRecords("customers");
      setCustomers(updatedCusts);
      applyRedeemedVoucher(newVoucher);
      setShowRedeemModalSales(false);
      toast(`Đã đổi thành công voucher "${vOpt.code}" (-${vOpt.points} điểm) và áp dụng ngay vào đơn hàng!`);
    } catch (err) {
      toast(err?.message || "Lỗi khi đổi voucher");
    }
  }

  function add(product) {
    if (product.TrangThai === "Ngừng bán" || product.status === "inactive") {
      toast("Sản phẩm đã ngừng kinh doanh, không thể bán");
      return;
    }
    if (Number(product.stock ?? 0) <= 0) {
      toast("Sản phẩm này đã hết tồn kho");
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.quantity >= Number(product.stock || 0)) {
      toast("Số lượng bán không được vượt quá số tồn kho hiện có");
      return;
    }
    setCart((current) =>
      current.some((item) => item.id === product.id)
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, { ...product, quantity: 1 }]
    );
    toast(`Đã thêm "${product.TenSP}" vào giỏ`);
  }

  function changeQty(id, delta) {
    setCart((current) => {
      const updated = current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(item.stock === undefined ? Infinity : Number(item.stock), item.quantity + delta) }
          : item
      );
      if (delta > 0 && updated.some((item) => item.id === id && item.quantity >= (item.stock === undefined ? Infinity : Number(item.stock)))) {
        const currentItem = current.find((item) => item.id === id);
        if (currentItem && currentItem.quantity >= (currentItem.stock === undefined ? Infinity : Number(currentItem.stock))) {
          toast("Số lượng bán không được vượt tồn kho");
        }
      }
      return updated.filter((item) => item.quantity > 0);
    });
  }

  function clearCart() {
    if (!cart.length) return;
    setShowClearCartConfirm(true);
  }
  function executeClearCart() {
    setCart([]);
    setAppliedPromo(null);
    setAppliedRedeemedVoucher(null);
    setDiscountAmount(0);
    setPromoInput("");
    setShowClearCartConfirm(false);
    toast("Đã xóa giỏ hàng");
  }

  async function submitSale() {
    if (!cart.length) return toast("Giỏ hàng đang trống");
    if (selectedCustomer?.TrangThai === "Ngưng hoạt động" || selectedCustomer?.status === "inactive") {
      return toast("Không thể lập hóa đơn cho khách hàng đã ngưng hoạt động");
    }
    if (paymentMethod === "Ghi nợ" && !customerId) {
      return toast("Khách hàng mua ghi nợ bắt buộc phải chọn thông tin khách hàng cụ thể!");
    }
    if (cart.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) return toast("Số lượng sản phẩm không hợp lệ");
    if (cart.some((item) => !Number.isFinite(Number(item.GiaBan)) || Number(item.GiaBan) < 0)) return toast("Giá bán sản phẩm không hợp lệ");
    const pointsToRedeem = appliedPromo?.DiemYeuCau ? Number(appliedPromo.DiemYeuCau) : (
      appliedPromo?.MaKM === "BAC50K" ? 100 :
      appliedPromo?.MaKM === "VANG100K" ? 500 :
      appliedPromo?.MaKM === "KC200K" ? 1000 : 0
    );
    try {
      const result = await saveRecord("sales-orders", {
        customerId: customerId || null,
        usedVoucherId: appliedRedeemedVoucher?.id || null,
        redeemPoints: appliedRedeemedVoucher ? 0 : pointsToRedeem,
        paymentMethod: paymentMethod,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.GiaBan,
        })),
        TongTien: finalTotal,
        discount: discountAmount,
        promoCode: appliedPromo?.MaKM || (discountAmount > 0 ? promoInput : null),
        NguoiLap: currentUserInfo().name,
        NgayDat: new Date().toISOString().slice(0, 10),
        TrangThai: "Hoàn thành",
      });
      setCart([]);
      setAppliedPromo(null);
      setAppliedRedeemedVoucher(null);
      setDiscountAmount(0);
      setPromoInput("");
      setCreatedInvoice(result.invoice || result);
      // Cập nhật lại danh sách khách hàng từ CSDL để điểm tích lũy và voucher mới nhất hiển thị ngay lập tức
      listRecords("customers").then((custs) => {
        setCustomers(custs);
      }).catch(() => {});
      const payMsg = paymentMethod === "Ghi nợ" ? " (Đã ghi nhận công nợ)" : ` (${paymentMethod})`;
      toast(`Đã lập đơn hàng và xuất hóa đơn thành công!${payMsg}${appliedRedeemedVoucher ? ` (Đã áp dụng voucher ${appliedRedeemedVoucher.code})` : pointsToRedeem > 0 ? ` (Đã trừ ${pointsToRedeem} điểm đổi voucher)` : ""}`);
    } catch (error) {
      toast(error.message);
    }
  }

  function printPOSReceipt(inv) {
    if (!inv) return;
    const escapeHtml = (val) => String(val ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    const printWindow = window.open("", "_blank", "width=420,height=620");
    if (!printWindow) return;
    const lines = inv.details || [];
    const custName = selectedCustomer?.HoTen || "Khách lẻ";
    const custPhone = selectedCustomer?.SDT || "";
    const totalQty = lines.reduce((s, i) => s + Number(i.SoLuong || i.quantity || 1), 0);
    const subtotalVal = inv.TienHang || (inv.TongTien + (inv.GiamGia || 0));
    const discountVal = inv.GiamGia || 0;
    const totalVal = inv.TongTien || 0;
    const invCode = inv.MaHD || inv.id;

    printWindow.document.write(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>Hóa đơn bán hàng - ${escapeHtml(invCode)}</title>
<style>
  @page { size: 80mm auto; margin: 2mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    width: 74mm;
    margin: 0 auto;
    color: #1F2937;
    font-size: 11.5px;
    line-height: 1.35;
    background: #fff;
  }
  .receipt-scallop-top {
    height: 10px;
    background: radial-gradient(circle, #FECDD3 5px, transparent 6px) repeat-x;
    background-size: 12px 10px;
    margin-bottom: 8px;
  }
  .receipt-header {
    text-align: center;
    padding: 0 4px 10px;
    border-bottom: 1px dashed #CBD5E1;
  }
  .receipt-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #FBEAEC;
    color: #E11D48;
    font-size: 16px;
    margin-bottom: 4px;
  }
  .receipt-brand {
    font-size: 14px;
    font-weight: 800;
    color: #0F172A;
  }
  .receipt-slogan {
    font-size: 10.5px;
    color: #64748B;
    margin-bottom: 4px;
  }
  .receipt-meta {
    font-size: 10px;
    color: #64748B;
    line-height: 1.4;
  }
  .receipt-title {
    font-size: 14px;
    font-weight: 800;
    color: #0F172A;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 8px 0;
    text-align: center;
  }
  .receipt-info {
    padding: 4px 0 8px;
    border-bottom: 1px dashed #CBD5E1;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.5;
  }
  .info-flex {
    display: flex;
    justify-content: space-between;
  }
  table.receipt-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 11px;
  }
  table.receipt-table th {
    border-bottom: 1px solid #94A3B8;
    padding: 4px 0;
    font-weight: 600;
    color: #0F172A;
    text-align: left;
  }
  table.receipt-table td {
    padding: 4px 0;
    vertical-align: top;
    color: #1E293B;
  }
  .c { text-align: center; }
  .r { text-align: right; }
  .bold { font-weight: 700; }
  
  .receipt-summary {
    border-top: 1px dashed #CBD5E1;
    padding-top: 6px;
    margin-top: 4px;
  }
  .sum-line {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 11px;
    color: #475569;
  }
  .sum-highlight {
    background: #FBEAEC;
    color: #BE123C;
    padding: 6px 8px;
    border-radius: 4px;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 800;
  }
  .receipt-payment-line {
    margin-top: 8px;
    font-size: 11px;
    color: #334155;
  }
  .receipt-footer {
    text-align: center;
    margin-top: 14px;
    padding-top: 8px;
  }
  .receipt-thanks {
    font-size: 11.5px;
    font-weight: 600;
    color: #0F172A;
    margin-bottom: 6px;
  }
  .receipt-barcode {
    margin: 8px auto 0;
    text-align: center;
    letter-spacing: 3px;
    font-family: monospace;
    font-weight: bold;
    font-size: 15px;
    color: #0F172A;
  }
  .receipt-scallop-bottom {
    height: 10px;
    background: radial-gradient(circle, #FECDD3 5px, transparent 6px) repeat-x;
    background-size: 12px 10px;
    margin-top: 12px;
  }
  @media print {
    body { width: 100%; margin: 0; }
  }
</style>
</head>
<body>
  <div class="receipt-scallop-top"></div>
  
  <div class="receipt-header">
    <div class="receipt-logo">👶</div>
    <div class="receipt-brand">Cửa hàng Mẹ &amp; Bé</div>
    <div class="receipt-slogan">Đồng hành cùng bé yêu</div>
    <div class="receipt-meta">
      <div>Đ/c: 123 Nguyễn Văn Cừ, Long Biên, Hà Nội</div>
      <div>ĐT: 0987 654 321 | MST: 0109876543</div>
    </div>
  </div>

  <div class="receipt-title">HÓA ĐƠN BÁN HÀNG</div>

  <div class="receipt-info">
    <div class="info-flex">
      <span>Mã HĐ: <strong>${escapeHtml(invCode)}</strong></span>
      <span>Ngày: ${escapeHtml(inv.NgayLap || new Date().toLocaleDateString("vi-VN"))}</span>
    </div>
    <div>Thu ngân: <strong>${escapeHtml(inv.NguoiLap || currentUserInfo().name)}</strong></div>
    <div>Khách hàng: <strong>${escapeHtml(custName)}</strong>${custPhone ? ` (${escapeHtml(custPhone)})` : ""}</div>
  </div>

  <table class="receipt-table">
    <thead>
      <tr>
        <th style="width: 44%">Tên sản phẩm</th>
        <th class="c" style="width: 14%">SL</th>
        <th class="r" style="width: 21%">Đơn giá</th>
        <th class="r" style="width: 21%">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map((l) => {
        const qty = Number(l.SoLuong || l.quantity || 1);
        const price = Number(l.DonGia || l.price || 0);
        const amt = Number(l.ThanhTien || qty * price);
        return `
          <tr>
            <td>${escapeHtml(l.TenSP || l.MaSPCode || "Sản phẩm")}</td>
            <td class="c">${qty}</td>
            <td class="r">${price.toLocaleString("vi-VN")}</td>
            <td class="r bold">${amt.toLocaleString("vi-VN")}</td>
          </tr>
        `;
      }).join("")}
    </tbody>
  </table>

  <div class="receipt-summary">
    <div class="sum-line">
      <span>Tổng tiền hàng:</span>
      <span>${money.format(subtotalVal)}</span>
    </div>
    <div class="sum-line">
      <span>Giảm giá:</span>
      <span>${money.format(discountVal)}</span>
    </div>
    <div class="sum-highlight">
      <span>Thanh toán:</span>
      <span>${money.format(totalVal)}</span>
    </div>
    <div class="receipt-payment-line">
      <span>Phương thức: <strong>${escapeHtml(inv.HinhThucThanhToan || paymentMethod || "Tiền mặt")}</strong></span>
    </div>
  </div>

  <div class="receipt-footer">
    <div class="receipt-thanks">❤️ Cảm ơn quý khách!</div>
    <div class="receipt-barcode">||||| | ||||| ||||</div>
    <small style="font-size: 9.5px; color: #64748B; font-family: monospace;">${escapeHtml(invCode)}</small>
  </div>

  <div class="receipt-scallop-bottom"></div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  }

  return (
    <section aria-labelledby="pos-heading" className="pos-workspace">
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <hgroup>
          <h1 id="pos-heading">{title}</h1>
          <p>Màn hình bán lẻ POS: Chọn món nhanh, áp dụng voucher thành viên và in hóa đơn tức thời.</p>
        </hgroup>
        <div
          style={{
            background: "var(--surface-sunken, #f1f5f9)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            color: "var(--text-soft)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span>👤 Thu ngân:</span>
          <strong style={{ color: "var(--primary-dark)" }}>{currentUserInfo().display}</strong>
        </div>
      </header>

      {createdInvoice && (
        <div className="alert success" role="status" style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            Đã lập hóa đơn <strong>{createdInvoice.MaHD || createdInvoice.id}</strong> với tổng thanh toán {money.format(createdInvoice.TongTien || finalTotal)}.
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-sm btn-primary" type="button" onClick={() => printPOSReceipt(createdInvoice)}>
              <PrinterIcon className="btn-icon" aria-hidden="true" style={{ width: 15, height: 15 }} /> In bill K80
            </button>
            <button className="btn btn-sm" type="button" onClick={() => navigate("/invoices")}>Xem chi tiết</button>
          </div>
        </div>
      )}

      <div className="pos-grid">
        {/* Product selection Catalog */}
        <div className="pos-catalog-panel">
          <div className="pos-catalog-header">
            <div className="invoice-search" style={{ flex: 1 }}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                className="search-input"
                type="search"
                placeholder="Tìm nhanh mặt hàng theo tên hoặc mã SP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="filter-chips" style={{ margin: "12px 0 16px" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${selectedCat === cat ? "active" : ""}`}
                onClick={() => setSelectedCat(cat)}
              >
                {cat === "all" ? "Tất cả" : cat}
              </button>
            ))}
          </div>

          <div className="prod-grid">
            {filteredProducts.map((product) => {
              const st = Number(product.stock || 0);
              const isOutOfStock = st <= 0;

              return (
                <button
                  className={`prod-tile ${isOutOfStock ? "tile-disabled" : ""}`}
                  type="button"
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => add(product)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                    <span className="tile-cat">{product.LoaiHang || "Sản phẩm"}</span>
                    <span className={`tile-stock-badge ${st <= 0 ? "badge-out" : st <= 10 ? "badge-low" : "badge-ok"}`}>
                      {st <= 0 ? "Hết hàng" : `Tồn ${st}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", margin: "6px 0" }}>
                    <ProductImage
                      src={product.HinhAnh}
                      alt={product.TenSP}
                      category={product.LoaiHang || ""}
                      size={38}
                      borderRadius={6}
                    />
                    <strong className="tile-name" style={{ margin: 0, textAlign: "left", flex: 1, fontSize: 13, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {product.TenSP}
                    </strong>
                  </div>
                  <span className="tile-price">{money.format(product.GiaBan)}</span>
                </button>
              );
            })}
            {!filteredProducts.length && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 36, color: "var(--text-faint)" }}>
                Không tìm thấy sản phẩm phù hợp
              </div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <aside className="cart-panel" aria-label="Giỏ hàng bán lẻ">
          <div className="cart-header-row">
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--primary-dark)" }}>Giỏ hàng thu ngân</h3>
              <small style={{ color: "var(--text-soft)" }}>{totalItemCount} sản phẩm đã chọn</small>
            </div>
            {cart.length > 0 && (
              <button type="button" className="cart-clear-link" onClick={clearCart}>
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Customer Selection & Membership Badge */}
          <div style={{ margin: "14px 0 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Khách hàng:</label>
              <button
                type="button"
                className="sales-cust-add-btn"
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 7 }}
                onClick={() => setShowAddCustomerModal(true)}
                title="Thêm khách hàng mới"
              >
                <PlusIcon style={{ width: 13, height: 13 }} /> Thêm KH mới
              </button>
            </div>
            <div className="sales-cust-search" style={{ width: "100%", marginBottom: 10 }}>
              <div className="sales-cust-input-wrap">
                <MagnifyingGlassIcon style={{ width: 16, height: 16, color: "var(--text-faint)" }} />
                <input
                  className="sales-cust-input"
                  type="text"
                  placeholder="Tìm theo tên, SĐT, mã KH..."
                  value={custSearchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setCustSearchQuery(val);
                    if (!val.trim()) {
                      setCustDropdownOpen(false);
                    } else {
                      setCustDropdownOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (custSearchQuery.trim()) {
                      setCustDropdownOpen(true);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Escape") {
                      setCustDropdownOpen(false);
                    }
                  }}
                />
                {customerId && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 2 }}
                    onClick={() => {
                      setCustomerId("");
                      setCustSearchQuery("");
                      setCustDropdownOpen(false);
                      setAppliedPromo(null);
                      setDiscountAmount(0);
                      setPromoInput("");
                    }}
                    title="Bỏ chọn khách hàng"
                  >
                    ✕
                  </button>
                )}
              </div>
              {custDropdownOpen && (
                <div className="sales-cust-dropdown">
                  {filteredCustSearch.length === 0 ? (
                    <div style={{ padding: "12px", color: "var(--text-faint)", fontSize: 13 }}>Không tìm thấy khách hàng</div>
                  ) : filteredCustSearch.slice(0, 8).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="sales-cust-option"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustSearchQuery(c.HoTen || "");
                        setCustDropdownOpen(false);
                        setAppliedPromo(null);
                        setDiscountAmount(0);
                        setPromoInput("");
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{c.HoTen}</span>
                      <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{c.SDT || ""}</span>
                      <span style={{ color: "var(--primary)", fontSize: 11, fontWeight: 700 }}>{c.MaKH || c.id}</span>
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", padding: "4px" }}>
                    <button
                      type="button"
                      className="sales-cust-option"
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                      onClick={() => {
                        setCustomerId("");
                        setCustSearchQuery("");
                        setCustDropdownOpen(false);
                        setAppliedPromo(null);
                        setDiscountAmount(0);
                        setPromoInput("");
                      }}
                    >
                      Khách vãng lai (không tích điểm)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background:
                    customerTier === "Kim Cương"
                      ? "#f0f9ff"
                      : customerTier === "Vàng"
                      ? "#fefce8"
                      : customerTier === "Bạc"
                      ? "#f8fafc"
                      : "#f9fafb",
                  border:
                    customerTier === "Kim Cương"
                      ? "1px solid #7dd3fc"
                      : customerTier === "Vàng"
                      ? "1px solid #fde047"
                      : customerTier === "Bạc"
                      ? "1px solid #cbd5e1"
                      : "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#1e293b" }}>
                    ⭐ {selectedCustomer.HoTen} · {customerPts} điểm
                    {appliedPromo && Number(appliedPromo.DiemYeuCau || 0) > 0 && (
                      <span style={{ color: "var(--danger, #ef4444)", marginLeft: 8, fontSize: 11, fontWeight: 600 }}>
                        (Đổi mã {appliedPromo.MaKM}: Trừ {appliedPromo.DiemYeuCau} điểm → Còn {Math.max(0, customerPts - Number(appliedPromo.DiemYeuCau))} điểm)
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background:
                        customerTier === "Kim Cương"
                          ? "#0284c7"
                          : customerTier === "Vàng"
                          ? "#d97706"
                          : customerTier === "Bạc"
                          ? "#475569"
                          : "#94a3b8",
                      color: "#fff",
                      fontSize: 11,
                    }}
                  >
                    Hạng {customerTier}
                  </span>
                </div>

                {/* Quick Voucher recommendation based on tier */}
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-soft)" }}>Voucher hợp lệ:</span>
                  <button
                    type="button"
                    onClick={() => applyPromo("BAC50K")}
                    disabled={customerPts < 100}
                    style={{
                      padding: "2px 8px",
                      fontSize: 11,
                      borderRadius: 6,
                      border: "1px solid #94a3b8",
                      background: appliedPromo?.MaKM === "BAC50K" ? "#475569" : "#fff",
                      color: appliedPromo?.MaKM === "BAC50K" ? "#fff" : "#334155",
                      cursor: customerPts < 100 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: customerPts < 100 ? 0.5 : 1
                    }}
                  >
                    Đổi 100 điểm → BAC50K
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPromo("VANG100K")}
                    disabled={customerPts < 500}
                    style={{
                      padding: "2px 8px",
                      fontSize: 11,
                      borderRadius: 6,
                      border: "1px solid #d97706",
                      background: appliedPromo?.MaKM === "VANG100K" ? "#d97706" : "#fff",
                      color: appliedPromo?.MaKM === "VANG100K" ? "#fff" : "#b45309",
                      cursor: customerPts < 500 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: customerPts < 500 ? 0.5 : 1
                    }}
                  >
                    Đổi 500 điểm → VANG100K
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPromo("KC200K")}
                    disabled={customerPts < 1000}
                    style={{
                      padding: "2px 8px",
                      fontSize: 11,
                      borderRadius: 6,
                      border: "1px solid #0284c7",
                      background: appliedPromo?.MaKM === "KC200K" ? "#0284c7" : "#fff",
                      color: appliedPromo?.MaKM === "KC200K" ? "#fff" : "#0369a1",
                      cursor: customerPts < 1000 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: customerPts < 1000 ? 0.5 : 1
                    }}
                  >
                    Đổi 1000 điểm → KC200K
                  </button>
                  {customerPts < 100 && (
                    <span style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic" }}>
                      Chưa đủ 100 điểm đổi voucher
                    </span>
                  )}
                </div>

                {/* PHẦN CHỌN VOUCHER ĐÃ ĐỔI CỦA KHÁCH HÀNG */}
                <div style={{ marginTop: 10, padding: "10px 12px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontWeight: 700, fontSize: 12.5, color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      🎟️ Voucher đã đổi của khách:
                      <span style={{ fontSize: 10.5, background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>
                        {customerRedeemedVouchers.length} khả dụng
                      </span>
                    </label>
                    {customerPts >= 100 && (
                      <button
                        type="button"
                        onClick={() => setShowRedeemModalSales(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary-dark)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0
                        }}
                      >
                        + Đổi thêm voucher
                      </button>
                    )}
                  </div>

                  {customerRedeemedVouchers.length > 0 ? (
                    <div>
                      <select
                        value={appliedRedeemedVoucher?.id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            applyRedeemedVoucher(null);
                          } else {
                            const foundV = customerRedeemedVouchers.find((x) => x.id === val);
                            if (foundV) applyRedeemedVoucher(foundV);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: appliedRedeemedVoucher ? "2px solid #16a34a" : "1px solid var(--border)",
                          fontSize: 12.5,
                          fontWeight: 600,
                          background: "#fff",
                          color: "var(--text)"
                        }}
                      >
                        <option value="">-- Nhấp vào đây để chọn voucher đã đổi --</option>
                        {customerRedeemedVouchers.map((v) => (
                          <option key={v.id} value={v.id}>
                            🎟️ {v.code} · {v.name} (Giảm {money.format(v.discountAmount || 50000)})
                          </option>
                        ))}
                      </select>
                      {appliedRedeemedVoucher && (
                        <div style={{ marginTop: 5, fontSize: 11.5, color: "#15803d", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>✅ Đang dùng: <strong>{appliedRedeemedVoucher.code}</strong> (-{money.format(discountAmount)}) · Đã đổi trước đó</span>
                          <button
                            type="button"
                            onClick={() => applyRedeemedVoucher(null)}
                            style={{ background: "none", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                          >
                            Hủy dùng
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                      Khách hàng chưa có voucher nào đổi sẵn.{" "}
                      {customerPts >= 100 ? (
                        <span
                          style={{ color: "var(--primary-dark)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => setShowRedeemModalSales(true)}
                        >
                          Đổi ngay bằng {customerPts} điểm tích lũy
                        </span>
                      ) : (
                        <span>(Cần tối thiểu 100 điểm để đổi voucher)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cart items list */}
          <div className="cart-list-scroll">
            {cart.length > 0 ? (
              cart.map((item) => (
                <article className="cart-item" key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ProductImage
                    src={item.HinhAnh}
                    alt={item.TenSP}
                    category={item.LoaiHang || ""}
                    size={34}
                    borderRadius={6}
                  />
                  <div className="nm" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.TenSP}</strong>
                    <small style={{ color: "var(--text-soft)" }}>{money.format(item.GiaBan)} / {item.DonViTinh || "cái"}</small>
                  </div>
                  <div className="qty-ctrl">
                    <button type="button" onClick={() => changeQty(item.id, -1)} aria-label="Giảm">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => changeQty(item.id, 1)} aria-label="Tăng">+</button>
                  </div>
                  <strong style={{ minWidth: 70, textAlign: "right", color: "var(--primary-dark)" }}>
                    {money.format(item.quantity * item.GiaBan)}
                  </strong>
                </article>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "40px 10px" }}>
                <ShoppingBagIcon className="empty-icon" aria-hidden="true" style={{ width: 44, height: 44, margin: "0 auto 10px", color: "var(--text-faint)", strokeWidth: 1.5 }} />
                <p>Chưa có sản phẩm nào trong giỏ</p>
                <small style={{ color: "var(--text-faint)" }}>Nhấn vào sản phẩm bên trái để thêm</small>
              </div>
            )}
          </div>

          {/* Promo code input */}
          <div style={{ margin: "10px 0", padding: "10px", background: "var(--surface-sunken, #f8fafc)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft)", display: "block", marginBottom: 6 }}>
              🏷️ Mã khuyến mãi / Voucher giảm giá:
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder="Nhập mã (VD: KMALL10, BAC50K)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              />
              {appliedPromo ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={removePromo}
                  style={{ background: "#fee2e2", color: "#b91c1c", border: "none" }}
                >
                  Gỡ bỏ
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => applyPromo(promoInput)}
                  disabled={!cart.length}
                >
                  Áp dụng
                </button>
              )}
            </div>
            {appliedPromo && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: "#059669", fontWeight: 600 }}>
                ✓ Đang áp dụng: {appliedPromo.TenKM} ({appliedPromo.MaKM})
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="cart-summary-box">
              <div className="cart-total-row">
                <span>Số lượng món</span>
                <strong>{totalItemCount}</strong>
              </div>
              <div className="cart-total-row">
                <span>Tạm tính</span>
                <span>{money.format(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="cart-total-row" style={{ color: "#059669" }}>
                  <span>Chiết khấu / Ưu đãi</span>
                  <strong>-{money.format(discountAmount)}</strong>
                </div>
              )}
              <div className="cart-total-row grand">
                <span>TỔNG THANH TOÁN</span>
                <strong style={{ color: "var(--primary)", fontSize: 18 }}>{money.format(finalTotal)}</strong>
              </div>
            </div>
          )}

          {/* Phương thức thanh toán (UC13, UC15, UC17, UC19) */}
          <div style={{ marginTop: 12, padding: "10px", background: "var(--surface-sunken, #f8fafc)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-soft)", display: "block", marginBottom: 6 }}>
              💳 Phương thức thanh toán:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { id: "Tiền mặt", label: "Tiền mặt", icon: "💵" },
                { id: "Chuyển khoản", label: "Chuyển khoản", icon: "💳" },
                { id: "Ghi nợ", label: "Ghi nợ (Nợ)", icon: "📝" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    border: paymentMethod === m.id ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #e2e8f0)",
                    background: paymentMethod === m.id ? "var(--primary-light, #e6f4f1)" : "#fff",
                    color: paymentMethod === m.id ? "var(--primary-dark, #1f433e)" : "var(--text, #1e293b)",
                    transition: "all .15s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {paymentMethod === "Ghi nợ" && !customerId && (
              <small style={{ color: "#dc2626", fontWeight: 600, display: "block", marginTop: 6, fontSize: 11.5 }}>
                ⚠️ Mua ghi nợ bắt buộc phải chọn Khách hàng ở trên (không áp dụng khách vãng lai)
              </small>
            )}
            {paymentMethod === "Ghi nợ" && customerId && (
              <small style={{ color: "#d97706", fontWeight: 600, display: "block", marginTop: 6, fontSize: 11.5 }}>
                ℹ️ Đơn hàng sẽ được ghi nợ vào công nợ của khách hàng {selectedCustomer?.HoTen}
              </small>
            )}
            {paymentMethod === "Tiền mặt" && (
              <small style={{ color: "#16a34a", fontWeight: 600, display: "block", marginTop: 6, fontSize: 11.5 }}>
                ℹ️ Tự động lập Phiếu thu tiền mặt và hoàn tất thanh toán
              </small>
            )}
          </div>

          <button
            className="btn btn-primary btn-block"
            type="button"
            disabled={!cart.length}
            style={{ marginTop: 14, padding: "12px", fontSize: 15 }}
            onClick={submitSale}
          >
            Lập đơn &amp; Xuất hóa đơn
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={showClearCartConfirm}
        title="Xóa giỏ hàng"
        message="Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?"
        confirmLabel="Xóa tất cả"
        variant="warning"
        onConfirm={executeClearCart}
        onCancel={() => setShowClearCartConfirm(false)}
      />

      <Modal
        open={showAddCustomerModal}
        title="Thêm khách hàng mới"
        onClose={() => setShowAddCustomerModal(false)}
        onSubmit={async () => {
          if (!newCustForm.HoTen.trim()) return toast("Họ và tên là bắt buộc");
          if (!newCustForm.SDT.trim()) return toast("Số điện thoại là bắt buộc");
          if (!/^0\d{9,10}$/.test(newCustForm.SDT.trim())) return toast("Số điện thoại phải gồm 10-11 chữ số");
          if (newCustForm.Email && !/^\S+@\S+\.\S+$/.test(newCustForm.Email.trim())) return toast("Email không hợp lệ");
          try {
            const saved = await saveRecord("customers", { ...newCustForm, TrangThai: "Đang hoạt động", DiemTichLuy: 0 });
            setCustomers(prev => [...prev, saved]);
            setCustomerId(saved.id);
            setCustSearchQuery(saved.HoTen || "");
            setCustDropdownOpen(false);
            setShowAddCustomerModal(false);
            setNewCustForm({ HoTen: "", SDT: "", Email: "", DiaChi: "" });
            toast(`Đã thêm khách hàng "${saved.HoTen}" và chọn vào đơn hàng`);
          } catch (err) {
            toast(err?.message || "Lỗi khi thêm khách hàng");
          }
        }}
        submitLabel="Thêm khách hàng"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Họ và tên <span className="required-star">*</span></label>
            <input
              style={{ padding: "8px 10px", fontSize: 13 }}
              placeholder="VD: Nguyễn Thị Lan"
              value={newCustForm.HoTen}
              onChange={e => setNewCustForm(f => ({ ...f, HoTen: e.target.value }))}
              required
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Số điện thoại <span className="required-star">*</span></label>
            <input
              style={{ padding: "8px 10px", fontSize: 13 }}
              placeholder="0912345678"
              value={newCustForm.SDT}
              onChange={e => setNewCustForm(f => ({ ...f, SDT: e.target.value }))}
              required
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Email</label>
            <input
              type="email"
              style={{ padding: "8px 10px", fontSize: 13 }}
              placeholder="khachhang@gmail.com"
              value={newCustForm.Email}
              onChange={e => setNewCustForm(f => ({ ...f, Email: e.target.value }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600 }}>Địa chỉ</label>
            <input
              style={{ padding: "8px 10px", fontSize: 13 }}
              placeholder="Số nhà, đường, quận..."
              value={newCustForm.DiaChi}
              onChange={e => setNewCustForm(f => ({ ...f, DiaChi: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Đổi điểm lấy voucher ngay tại quầy thu ngân */}
      <Modal
        open={showRedeemModalSales}
        title={`Đổi điểm lấy Voucher — ${selectedCustomer?.HoTen || ""}`}
        onClose={() => setShowRedeemModalSales(false)}
        onSubmit={handleRedeemInSales}
        submitLabel="Xác nhận đổi & Dùng ngay"
      >
        {selectedCustomer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "12px 14px", background: "var(--primary-light, #f0fdfa)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Khách hàng: <strong>{selectedCustomer.HoTen}</strong> ({selectedCustomer.MaKH || selectedCustomer.id})
              </div>
              <div style={{ fontSize: 14, color: "var(--primary-dark)", fontWeight: 700, marginTop: 4 }}>
                ⭐ Điểm tích lũy hiện có: <strong>{customerPts}</strong> điểm
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Chọn voucher muốn đổi <span className="required-star">*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { code: "BAC50K", name: "Voucher giảm 50.000đ", points: 100 },
                  { code: "VANG100K", name: "Voucher giảm 100.000đ", points: 500 },
                  { code: "KC200K", name: "Voucher VIP giảm 200.000đ", points: 1000 },
                ].map((v) => {
                  const isEligible = customerPts >= v.points;
                  const isSelected = salesRedeemCode === v.code;
                  return (
                    <label
                      key={v.code}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: isSelected ? "var(--primary-light)" : isEligible ? "#fff" : "#f8fafc",
                        cursor: isEligible ? "pointer" : "not-allowed",
                        opacity: isEligible ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="radio"
                          name="sales_voucher_redeem"
                          value={v.code}
                          checked={isSelected}
                          disabled={!isEligible}
                          onChange={() => setSalesRedeemCode(v.code)}
                        />
                        <div>
                          <strong style={{ fontSize: 13.5, color: isEligible ? "var(--text)" : "var(--text-faint)" }}>
                            🎟️ {v.name} (Mã: {v.code})
                          </strong>
                          <div style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
                            Cần đổi: <strong>{v.points} điểm</strong>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: isEligible ? "var(--danger)" : "var(--text-faint)" }}>
                        {isEligible ? `- ${v.points} điểm` : "Không đủ điểm"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "8px 12px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, fontSize: 12, color: "#854d0e" }}>
              💡 Voucher sau khi đổi sẽ được trừ điểm ngay và tự động chọn áp dụng vào giỏ hàng thu ngân.
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
