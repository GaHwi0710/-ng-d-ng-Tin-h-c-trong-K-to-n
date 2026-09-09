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
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";

function getMemberTier(points = 0) {
  const pts = Number(points) || 0;
  if (pts >= 1000) return { name: "Kim Cương", badgeClass: "tier-diamond", icon: "💎" };
  if (pts >= 500) return { name: "Hạng Vàng", badgeClass: "tier-gold", icon: "👑" };
  if (pts >= 100) return { name: "Hạng Bạc", badgeClass: "tier-silver", icon: "🥈" };
  return { name: "Hạng Đồng", badgeClass: "tier-bronze", icon: "🥉" };
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    HoTen: "",
    SDT: "",
    Email: "",
    DiaChi: "",
    DiemTichLuy: 0,
  });

  useEffect(() => {
    listRecords("customers").then(setCustomers);
  }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const vipCount = customers.filter((c) => (Number(c.DiemTichLuy) || 0) >= 500).length;
    const totalPoints = customers.reduce((sum, c) => sum + (Number(c.DiemTichLuy) || 0), 0);
    const avgPoints = total ? Math.round(totalPoints / total) : 0;
    return { total, vipCount, totalPoints, avgPoints };
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
      if (tierFilter === "all") return true;
      const tier = getMemberTier(item.DiemTichLuy);
      return tier.name.toLowerCase().includes(tierFilter.toLowerCase());
    });
  }, [customers, query, tierFilter]);

  function openCreate() {
    setEditing(null);
    setFormData({ HoTen: "", SDT: "", Email: "", DiaChi: "", DiemTichLuy: 0 });
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

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) return;
    try {
      await deleteRecord("customers", id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast("Đã xóa khách hàng");
    } catch (err) {
      toast(err.message || "Không thể xóa");
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

      <div className="stats-grid">
        <StatCard
          label="Tổng khách hàng"
          value={String(stats.total)}
          delta={`${stats.vipCount} khách VIP`}
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

      <div className="cust-toolbar">
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
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
            { id: "all", label: "Tất cả hạng" },
            { id: "kim cương", label: "💎 Kim Cương" },
            { id: "vàng", label: "👑 Hạng Vàng" },
            { id: "bạc", label: "🥈 Hạng Bạc" },
            { id: "đồng", label: "🥉 Hạng Đồng" },
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
              <th style={{ width: 50 }}>STT</th>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Địa chỉ</th>
              <th>Hạng thành viên</th>
              <th style={{ textAlign: "right" }}>Điểm tích lũy</th>
              <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((cust, idx) => {
              const tier = getMemberTier(cust.DiemTichLuy);
              return (
                <tr key={cust.id} className="cust-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <div className="cust-profile-cell">
                      <div className="cust-avatar">{getInitials(cust.HoTen)}</div>
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
                    <span className={`cust-tier-badge ${tier.badgeClass}`}>
                      <span>{tier.icon}</span>
                      <strong>{tier.name}</strong>
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="cust-points-cell">
                      <strong>{(Number(cust.DiemTichLuy) || 0).toLocaleString("vi-VN")}</strong>
                      <small>điểm</small>
                    </div>
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
                        title="Xóa"
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
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
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
          <label htmlFor="cust-name">Họ và tên khách hàng *</label>
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
      </Modal>
    </section>
  );
}