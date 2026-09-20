import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  SparklesIcon,
  UserGroupIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import ConfirmDialog from "../../components/ConfirmDialog";

export function getMemberTier(points = 0) {
  const pts = Number(points) || 0;
  if (pts >= 1000) return { name: "Kim Cương", badgeClass: "tier-diamond", icon: "💎", voucher: "Voucher 200.000đ", voucherVal: 200000 };
  if (pts >= 500) return { name: "Hạng Vàng", badgeClass: "tier-gold", icon: "👑", voucher: "Voucher 100.000đ", voucherVal: 100000 };
  if (pts >= 100) return { name: "Hạng Bạc", badgeClass: "tier-silver", icon: "🥈", voucher: "Voucher 50.000đ", voucherVal: 50000 };
  return { name: "Hạng Đồng", badgeClass: "tier-bronze", icon: "🥉", voucher: "Tích điểm mua hàng", voucherVal: 0 };
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return "KH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CustomersPage({ title, description }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: "" });
  const [redeemCustomer, setRedeemCustomer] = useState(null);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState("BAC50K");
  const [formData, setFormData] = useState({
    HoTen: "",
    SDT: "",
    Email: "",
    DiaChi: "",
    DiemTichLuy: 0,
    TrangThai: "Đang hoạt động",
  });

  useEffect(() => {
    listRecords("customers").then(setCustomers);
  }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const activeCount = customers.filter((c) => c.TrangThai !== "Ngưng hoạt động").length;
    const vipCount = customers.filter((c) => (Number(c.DiemTichLuy) || 0) >= 500).length;
    const totalPoints = customers.reduce((sum, c) => sum + (Number(c.DiemTichLuy) || 0), 0);
    const avgPoints = total ? Math.round(totalPoints / total) : 0;
    return { total, activeCount, vipCount, totalPoints, avgPoints };
  }, [customers]);

  const visible = useMemo(() => {
    return customers.filter((item) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        (item.HoTen || "").toLowerCase().includes(q) ||
        (item.SDT || "").includes(q) ||
        (item.MaKH || item.id || "").toLowerCase().includes(q) ||
        (item.Email || "").toLowerCase().includes(q);

      if (!matchQuery) return false;

      // Status filter
      if (statusFilter === "active" && item.TrangThai === "Ngưng hoạt động") return false;
      if (statusFilter === "inactive" && item.TrangThai !== "Ngưng hoạt động") return false;

      // Tier filter
      if (tierFilter === "all") return true;
      const tier = getMemberTier(item.DiemTichLuy);
      return tier.name.toLowerCase().includes(tierFilter.toLowerCase());
    });
  }, [customers, query, tierFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setFormData({ HoTen: "", SDT: "", Email: "", DiaChi: "", DiemTichLuy: 0, TrangThai: "Đang hoạt động" });
    setModalOpen(true);
  }

  function openEdit(customer) {
    setEditing(customer);
    setFormData({
      id: customer.id,
      HoTen: customer.HoTen || "",
      SDT: customer.SDT || "",
      Email: customer.Email || "",
      DiaChi: customer.DiaChi || "",
      DiemTichLuy: customer.DiemTichLuy || 0,
      TrangThai: customer.TrangThai || "Đang hoạt động",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.HoTen.trim()) return toast("Họ và tên khách hàng là bắt buộc");
    if (formData.SDT && !/^0\d{9,10}$/.test(formData.SDT.trim())) {
      return toast("Số điện thoại phải gồm 10-11 chữ số (bắt đầu bằng số 0)");
    }
    if (formData.Email && !/^\S+@\S+\.\S+$/.test(formData.Email.trim())) {
      return toast("Định dạng email không hợp lệ");
    }

    try {
      const payload = {
        ...formData,
        DiemTichLuy: Number(formData.DiemTichLuy) || 0,
        TrangThai: formData.TrangThai || "Đang hoạt động",
      };
      const saved = await saveRecord("customers", payload);
      setCustomers((prev) =>
        editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật thông tin khách hàng" : "Đã thêm khách hàng mới");
    } catch (err) {
      toast(err.message || "Lỗi lưu thông tin");
    }
  }

  function handleDelete(id, name) {
    setConfirmDialog({ open: true, id, name });
  }

  async function executeDelete() {
    const { id, name } = confirmDialog;
    setConfirmDialog({ open: false, id: null, name: "" });
    try {
      const res = await deleteRecord("customers", id);
      if (res?.softDeleted || res?.status === "Ngưng hoạt động") {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, TrangThai: "Ngưng hoạt động" } : c));
        toast(`Khách hàng "${name}" đã được chuyển sang trạng thái ngưng hoạt động do có đơn hàng phát sinh`);
      } else {
        setCustomers(prev => prev.filter(c => c.id !== id));
        toast("Đã xóa khách hàng thành công");
      }
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
    }
  }

  const VOUCHER_OPTIONS = [
    { code: "BAC50K", name: "Voucher giảm 50.000đ", points: 100 },
    { code: "VANG100K", name: "Voucher giảm 100.000đ", points: 500 },
    { code: "KC200K", name: "Voucher VIP giảm 200.000đ", points: 1000 },
  ];

  async function handleRedeemVoucher() {
    if (!redeemCustomer) return;
    const v = VOUCHER_OPTIONS.find((opt) => opt.code === selectedVoucherCode);
    if (!v) return;
    const currentPts = Number(redeemCustomer.DiemTichLuy || 0);
    if (currentPts < v.points) {
      return toast(`Khách hàng không đủ điểm (cần ${v.points} điểm, hiện có ${currentPts} điểm)`);
    }
    try {
      const newPoints = currentPts - v.points;
      const newVoucher = {
        id: "VCH-" + Date.now().toString(36).toUpperCase(),
        code: v.code,
        name: v.name,
        discountAmount: v.code === "BAC50K" ? 50000 : v.code === "VANG100K" ? 100000 : 200000,
        points: v.points,
        redeemedAt: new Date().toISOString().slice(0, 10),
        status: "Chưa sử dụng",
      };
      const updatedVouchers = [...(redeemCustomer.VouchersDaDoi || []), newVoucher];
      await saveRecord("customers", {
        ...redeemCustomer,
        DiemTichLuy: newPoints,
        VouchersDaDoi: updatedVouchers,
      });
      setCustomers((prev) =>
        prev.map((c) => (c.id === redeemCustomer.id ? { ...c, DiemTichLuy: newPoints, VouchersDaDoi: updatedVouchers } : c))
      );
      toast(`Đã đổi thành công mã "${v.code}" (${v.name})! Đã trừ ${v.points} điểm tích lũy. Voucher đã được lưu vào hồ sơ khách hàng để dùng khi bán hàng.`);
      setRedeemCustomer(null);
    } catch (err) {
      toast(err?.message || "Lỗi khi đổi voucher");
    }
  }

  return (
    <section aria-labelledby="customers-page-heading" className="module-specialized cust-page">
      <header className="page-header">
        <hgroup>
          <h1 id="customers-page-heading">{title}</h1>
          <p>{description || "Quản lý hồ sơ khách hàng, phân hạng thành viên và điểm thưởng tích lũy."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Thêm khách hàng
        </button>
      </header>

      {/* Member Voucher Tier Policy Banner */}
      <div className="alert" style={{ background: "linear-gradient(135deg, rgba(61,112,104,0.08) 0%, rgba(200,121,65,0.08) 100%)", border: "1px solid var(--border)", marginBottom: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TicketIcon style={{ width: 24, height: 24, color: "var(--primary)" }} />
          <div>
            <strong style={{ color: "var(--primary-dark)" }}>Chính sách Voucher thành viên (dựa trên Điểm tích lũy):</strong>
            <div style={{ fontSize: "13px", color: "var(--text-soft)", marginTop: 2 }}>
              🥈 <strong>Hạng Bạc</strong>: Đổi 100 điểm → Voucher giảm 50.000đ (BAC50K) &nbsp;·&nbsp;
              👑 <strong>Hạng Vàng</strong>: Đổi 500 điểm → Voucher giảm 100.000đ (VANG100K) &nbsp;·&nbsp;
              💎 <strong>Kim Cương</strong>: Đổi 1.000 điểm → Voucher giảm 200.000đ (KC200K)
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Tổng khách hàng"
          value={String(stats.total)}
          delta={`${stats.activeCount} đang hoạt động`}
          icon={UserGroupIcon}
        />
        <StatCard
          label="Khách hàng VIP"
          value={String(stats.vipCount)}
          delta="Hạng Vàng & Kim Cương"
          valueClass="accent"
          icon={SparklesIcon}
        />
        <StatCard
          label="Tổng điểm tích lũy"
          value={stats.totalPoints.toLocaleString("vi-VN")}
          delta={`TB: ${stats.avgPoints} điểm/khách`}
        />
      </div>

      <div className="cust-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="invoice-search" style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên, SĐT, mã hoặc email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          {[
            { id: "all", label: "Tất cả trạng thái" },
            { id: "active", label: "🟢 Đang hoạt động" },
            { id: "inactive", label: "⚪ Ngưng hoạt động" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip ${statusFilter === tab.id ? "active" : ""}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-chips">
          {[
            { id: "all", label: "Tất cả hạng" },
            { id: "kim cương", label: "💎 Kim Cương" },
            { id: "vàng", label: "👑 Vàng" },
            { id: "bạc", label: "🥈 Bạc" },
            { id: "đồng", label: "🥉 Đồng" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip ${tierFilter === tab.id ? "active" : ""}`}
              onClick={() => setTierFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 45 }}>STT</th>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Địa chỉ</th>
              <th>Hạng &amp; Quyền lợi Voucher</th>
              <th style={{ textAlign: "right" }}>Điểm tích lũy</th>
              <th style={{ width: 140, textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((cust, idx) => {
              const tier = getMemberTier(cust.DiemTichLuy);
              const isInactive = cust.TrangThai === "Ngưng hoạt động";
              return (
                <tr key={cust.id} className="cust-row" style={{ opacity: isInactive ? 0.65 : 1 }}>
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <div className="cust-profile-cell">
                      <div className="cust-avatar" style={{ filter: isInactive ? "grayscale(100%)" : "none" }}>{getInitials(cust.HoTen)}</div>
                      <div>
                        <strong className="cust-name">{cust.HoTen}</strong>
                        <small className="cust-code">{cust.MaKH || cust.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cust-contact-cell">
                      {cust.SDT && (
                        <span className="cust-contact-item">
                          <PhoneIcon className="cust-mini-ic" />
                          <a href={`tel:${cust.SDT}`}>{cust.SDT}</a>
                        </span>
                      )}
                      {cust.Email && (
                        <span className="cust-contact-item">
                          <EnvelopeIcon className="cust-mini-ic" />
                          <small>{cust.Email}</small>
                        </span>
                      )}
                      {!cust.SDT && !cust.Email && <span className="cell-note">Chưa có liên hệ</span>}
                    </div>
                  </td>
                  <td>
                    <div className="cust-address-cell">
                      {cust.DiaChi ? (
                        <>
                          <MapPinIcon className="cust-mini-ic" />
                          <span>{cust.DiaChi}</span>
                        </>
                      ) : (
                        <span className="cell-note">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className={`cust-tier-badge ${tier.badgeClass}`}>
                        <span>{tier.icon}</span>
                        <strong>{tier.name}</strong>
                      </span>
                      {Number(cust.DiemTichLuy || 0) >= 100 ? (
                        <div style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              padding: "2px 8px",
                              fontSize: "11px",
                              borderRadius: "6px",
                              fontWeight: 600,
                              borderColor: "var(--primary)",
                              color: "var(--primary-dark)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                            onClick={() => {
                              setRedeemCustomer(cust);
                              setSelectedVoucherCode(
                                Number(cust.DiemTichLuy || 0) >= 1000
                                  ? "KC200K"
                                  : Number(cust.DiemTichLuy || 0) >= 500
                                  ? "VANG100K"
                                  : "BAC50K"
                              );
                            }}
                          >
                            🎟️ Đổi voucher (-điểm)
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: 3 }}>
                          Chưa đủ 100đ đổi voucher
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="cust-points-cell">
                      <strong>{(Number(cust.DiemTichLuy) || 0).toLocaleString("vi-VN")}</strong>
                      <small>điểm</small>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status-pill ${isInactive ? "danger" : "success"}`}>
                      {cust.TrangThai || "Đang hoạt động"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="row-actions" style={{ justifyContent: "center" }}>
                      <button
                        type="button"
                        className="icon-sm-btn"
                        title="Chỉnh sửa"
                        onClick={() => openEdit(cust)}
                      >
                        <PencilSquareIcon className="ic" />
                      </button>
                      <button
                        type="button"
                        className="icon-sm-btn del"
                        title={isInactive ? "Xóa vĩnh viễn" : "Xóa hoặc ngưng hoạt động"}
                        onClick={() => handleDelete(cust.id, cust.HoTen)}
                      >
                        <TrashIcon className="ic" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  Không tìm thấy khách hàng nào phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật hồ sơ khách hàng" : "Thêm khách hàng mới"}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="field">
          <label htmlFor="cust-name">Họ và tên khách hàng <span className="required-star">*</span></label>
          <input
            id="cust-name"
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Thị Lan"
            value={formData.HoTen}
            onChange={(e) => setFormData({ ...formData, HoTen: e.target.value })}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="cust-phone">Số điện thoại</label>
            <input
              id="cust-phone"
              type="tel"
              placeholder="0912345678"
              value={formData.SDT}
              onChange={(e) => setFormData({ ...formData, SDT: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cust-email">Email</label>
            <input
              id="cust-email"
              type="email"
              placeholder="khachhang@gmail.com"
              value={formData.Email}
              onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="cust-address">Địa chỉ</label>
          <input
            id="cust-address"
            type="text"
            placeholder="Số nhà, tên đường, quận/huyện..."
            value={formData.DiaChi}
            onChange={(e) => setFormData({ ...formData, DiaChi: e.target.value })}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="cust-points">Điểm tích lũy khởi tạo</label>
            <input
              id="cust-points"
              type="number"
              min="0"
              value={formData.DiemTichLuy}
              onChange={(e) => setFormData({ ...formData, DiemTichLuy: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cust-status">Trạng thái</label>
            <select
              id="cust-status"
              value={formData.TrangThai}
              onChange={(e) => setFormData({ ...formData, TrangThai: e.target.value })}
            >
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Ngưng hoạt động">Ngưng hoạt động</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal Đổi điểm lấy Voucher */}
      <Modal
        open={!!redeemCustomer}
        title={`Đổi điểm lấy Voucher — ${redeemCustomer?.HoTen || ""}`}
        onClose={() => setRedeemCustomer(null)}
        onSubmit={handleRedeemVoucher}
        submitLabel="Xác nhận đổi voucher & Trừ điểm"
      >
        {redeemCustomer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "12px 16px", background: "var(--primary-light, #f0fdfa)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Khách hàng: <strong>{redeemCustomer.HoTen}</strong> ({redeemCustomer.MaKH || redeemCustomer.id})
              </div>
              <div style={{ fontSize: 15, color: "var(--primary-dark)", fontWeight: 700, marginTop: 4 }}>
                ⭐ Điểm tích lũy hiện có: <strong>{Number(redeemCustomer.DiemTichLuy || 0).toLocaleString("vi-VN")}</strong> điểm
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Chọn loại Voucher muốn đổi <span className="required-star">*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {VOUCHER_OPTIONS.map((v) => {
                  const pts = Number(redeemCustomer.DiemTichLuy || 0);
                  const isEligible = pts >= v.points;
                  const isSelected = selectedVoucherCode === v.code;
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
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          type="radio"
                          name="voucher_redeem"
                          value={v.code}
                          checked={isSelected}
                          disabled={!isEligible}
                          onChange={() => setSelectedVoucherCode(v.code)}
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

            {selectedVoucherCode && (
              <div style={{ padding: "10px 14px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, fontSize: 12.5, color: "#854d0e" }}>
                ⚠️ <strong>Lưu ý</strong>: Khi bấm xác nhận, khách hàng sẽ bị <strong>trừ {VOUCHER_OPTIONS.find((v) => v.code === selectedVoucherCode)?.points} điểm</strong> tích lũy ngay lập tức. Điểm còn lại sau khi đổi: <strong>{Math.max(0, Number(redeemCustomer.DiemTichLuy || 0) - (VOUCHER_OPTIONS.find((v) => v.code === selectedVoucherCode)?.points || 0))} điểm</strong>.
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa khách hàng"
        itemName={confirmDialog.name}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, name: "" })}
      />
    </section>
  );
}