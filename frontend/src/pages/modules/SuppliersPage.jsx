import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";

export function SuppliersPage({ title, description }) {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    TenNCC: "",
    SDT: "",
    Email: "",
    DiaChi: "",
  });

  useEffect(() => {
    listRecords("suppliers").then(setSuppliers);
    listRecords("purchase-orders").then(setPurchaseOrders).catch(() => []);
  }, []);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const poCount = purchaseOrders.length;
    const areas = new Set(
      suppliers.map((s) => {
        const addr = s.DiaChi || "";
        if (addr.includes("Hà Nội")) return "Hà Nội";
        if (addr.includes("TP.HCM") || addr.includes("Hồ Chí Minh")) return "TP.HCM";
        if (addr.includes("Đồng Nai")) return "Đồng Nai";
        if (addr.includes("Bắc Ninh")) return "Bắc Ninh";
        return "Khác";
      })
    ).size;
    return { total, poCount, areas };
  }, [suppliers, purchaseOrders]);

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return suppliers.filter((item) => {
      if (!q) return true;
      return (
        (item.TenNCC || "").toLowerCase().includes(q) ||
        (item.MaNCC || item.id || "").toLowerCase().includes(q) ||
        (item.SDT || "").includes(q) ||
        (item.Email || "").toLowerCase().includes(q) ||
        (item.DiaChi || "").toLowerCase().includes(q)
      );
    });
  }, [suppliers, query]);

  function openCreate() {
    setEditing(null);
    setFormData({ TenNCC: "", SDT: "", Email: "", DiaChi: "" });
    setModalOpen(true);
  }

  function openEdit(supplier) {
    setEditing(supplier);
    setFormData({
      id: supplier.id,
      TenNCC: supplier.TenNCC || "",
      SDT: supplier.SDT || "",
      Email: supplier.Email || "",
      DiaChi: supplier.DiaChi || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.TenNCC.trim()) return toast("Tên nhà cung cấp là bắt buộc");
    if (formData.SDT && !/^0\d{8,10}$/.test(formData.SDT.trim())) {
      return toast("Số điện thoại hợp lệ phải từ 9-11 chữ số (bắt đầu bằng 0)");
    }
    if (formData.Email && !/^\S+@\S+\.\S+$/.test(formData.Email.trim())) {
      return toast("Định dạng email không hợp lệ");
    }

    try {
      const saved = await saveRecord("suppliers", formData);
      setSuppliers((prev) =>
        editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật nhà cung cấp" : "Đã thêm nhà cung cấp mới");
    } catch (err) {
      toast(err.message || "Lỗi khi lưu");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn xóa nhà cung cấp "${name}"?`)) return;
    try {
      await deleteRecord("suppliers", id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      toast("Đã xóa nhà cung cấp");
    } catch (err) {
      toast(err.message || "Không thể xóa");
    }
  }

  return (
    <section aria-labelledby="suppliers-page-heading" className="module-specialized supp-page">
      <header className="page-header">
        <hgroup>
          <h1 id="suppliers-page-heading">{title}</h1>
          <p>{description || "Đối tác cung ứng hàng hóa cho cửa hàng, thông tin đầu mối và hợp đồng nhập kho."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Thêm nhà cung cấp
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng nhà cung cấp"
          value={String(stats.total)}
          delta="Đang hợp tác"
          icon={BuildingStorefrontIcon}
        />
        <StatCard
          label="Đơn đặt hàng NCC"
          value={String(stats.poCount)}
          delta="Tổng số đơn đã lập"
          valueClass="accent"
          icon={ShoppingCartIcon}
        />
        <StatCard
          label="Khu vực cung ứng"
          value={String(stats.areas)}
          delta="Tỉnh / Thành phố"
        />
      </div>

      {/* Search toolbar */}
      <div className="cust-toolbar">
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên NCC, mã, số ĐT hoặc địa chỉ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>STT</th>
              <th style={{ width: 120 }}>Mã NCC</th>
              <th>Tên nhà cung cấp</th>
              <th>Thông tin liên hệ</th>
              <th>Địa chỉ / Khu vực</th>
              <th style={{ width: 150, textAlign: "center" }}>Tác vụ nhanh</th>
              <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((supp, idx) => (
              <tr key={supp.id} className="supp-row">
                <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                <td>
                  <span className="po-product-code" style={{ color: "var(--primary)" }}>
                    {supp.MaNCC || supp.id}
                  </span>
                </td>
                <td>
                  <div className="supp-name-cell">
                    <strong className="cust-name">{supp.TenNCC}</strong>
                    <span className="supp-tag">Đối tác phân phối</span>
                  </div>
                </td>
                <td>
                  <div className="cust-contact-cell">
                    {supp.SDT && (
                      <span className="cust-contact-item">
                        <PhoneIcon className="cust-mini-ic" />
                        <a href={`tel:${supp.SDT}`}>{supp.SDT}</a>
                      </span>
                    )}
                    {supp.Email && (
                      <span className="cust-contact-item">
                        <EnvelopeIcon className="cust-mini-ic" />
                        <small>{supp.Email}</small>
                      </span>
                    )}
                    {!supp.SDT && !supp.Email && <span className="cell-note">Chưa có liên hệ</span>}
                  </div>
                </td>
                <td>
                  <div className="cust-address-cell">
                    {supp.DiaChi ? (
                      <>
                        <MapPinIcon className="cust-mini-ic" />
                        <span>{supp.DiaChi}</span>
                      </>
                    ) : (
                      <span className="cell-note">—</span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    title="Lập đơn đặt hàng mới cho NCC này"
                    onClick={() => navigate("/purchase-orders")}
                  >
                    <ShoppingCartIcon className="btn-icon" />
                    Đặt hàng
                  </button>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div className="row-actions" style={{ justifyContent: "center" }}>
                    <button
                      type="button"
                      className="icon-sm-btn"
                      title="Chỉnh sửa"
                      onClick={() => openEdit(supp)}
                    >
                      <PencilSquareIcon className="ic" />
                    </button>
                    <button
                      type="button"
                      className="icon-sm-btn del"
                      title="Xóa"
                      onClick={() => handleDelete(supp.id, supp.TenNCC)}
                    >
                      <TrashIcon className="ic" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  Không tìm thấy nhà cung cấp nào phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật thông tin nhà cung cấp" : "Thêm nhà cung cấp mới"}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="field">
          <label htmlFor="supp-name">Tên nhà cung cấp / Công ty phân phối *</label>
          <input
            id="supp-name"
            type="text"
            required
            placeholder="Ví dụ: Công ty TNHH Pigeon Việt Nam"
            value={formData.TenNCC}
            onChange={(e) => setFormData({ ...formData, TenNCC: e.target.value })}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="supp-phone">Số điện thoại liên hệ</label>
            <input
              id="supp-phone"
              type="tel"
              placeholder="0281234567"
              value={formData.SDT}
              onChange={(e) => setFormData({ ...formData, SDT: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="supp-email">Email đối tác</label>
            <input
              id="supp-email"
              type="email"
              placeholder="contact@doitac.vn"
              value={formData.Email}
              onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="supp-address">Địa chỉ trụ sở / kho hàng</label>
          <input
            id="supp-address"
            type="text"
            placeholder="KCN, quận/huyện, tỉnh/thành..."
            value={formData.DiaChi}
            onChange={(e) => setFormData({ ...formData, DiaChi: e.target.value })}
          />
        </div>
      </Modal>
    </section>
  );
}