import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  PrinterIcon,
  EyeIcon,
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { deleteRecord, getReport, listRecords, saveRecord } from "../lib/api.js";
import {
  buildWarehouseVoucherHtml,
  buildWarehouseVoucherModel,
  printWarehouseVoucher,
} from "../lib/warehouseVoucher.js";
import { Modal } from "../components/Modal.jsx";
import { toast } from "../components/Toast.jsx";
import { Badge, StatusBadge } from "../components/Badge.jsx";
import { FilterChips } from "../components/FilterChips.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { ProgressBar } from "../components/BarChart.jsx";
import { CustomersPage } from "./modules/CustomersPage.jsx";
import { SuppliersPage } from "./modules/SuppliersPage.jsx";
import { ProductsPage } from "./modules/ProductsPage.jsx";
import { CategoriesPage } from "./modules/CategoriesPage.jsx";
import { DebtsPage } from "./modules/DebtsPage.jsx";
import { PromotionsPage } from "./modules/PromotionsPage.jsx";
import { AdminPage } from "./modules/AdminPage.jsx";
import { StocktakePage } from "./modules/StocktakePage.jsx";
import { ReturnPage } from "./modules/ReturnPage.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const roleLabels = {
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  NhanVienKho: "Nhân viên kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};

/* ================================================================
   CONFIG — column + field definitions per resource
   ================================================================ */
const configs = {
  customers: {
    key: "HoTen",
    columns: [
      ["MaKH", "Mã KH"],
      ["HoTen", "Họ tên"],
      ["SDT", "Số điện thoại"],
      ["Email", "Email"],
      ["DiaChi", "Địa chỉ"],
      ["DiemTichLuy", "Điểm tích lũy"],
    ],
    fields: [
      { name: "HoTen", label: "Họ và tên", required: true, full: true },
      { name: "SDT", label: "Số điện thoại", type: "tel", pattern: "0[0-9]{9,10}" },
      { name: "Email", label: "Email" },
      { name: "DiaChi", label: "Địa chỉ", full: true },
    ],
  },
  suppliers: {
    key: "TenNCC",
    columns: [
      ["MaNCC", "Mã NCC"],
      ["TenNCC", "Tên nhà cung cấp"],
      ["SDT", "Số điện thoại"],
      ["Email", "Email"],
      ["DiaChi", "Địa chỉ"],
    ],
    fields: [
      { name: "TenNCC", label: "Tên nhà cung cấp", required: true, full: true },
      { name: "SDT", label: "Số điện thoại", type: "tel", pattern: "0[0-9]{9,10}" },
      { name: "Email", label: "Email" },
      { name: "DiaChi", label: "Địa chỉ", full: true },
    ],
  },
  products: {
    key: "TenSP",
    columns: [
      ["MaSP", "Mã hàng"],
      ["TenSP", "Tên hàng"],
      ["LoaiHang", "Loại"],
      ["DonViTinh", "ĐVT"],
      ["GiaNhap", "Giá nhập"],
      ["GiaBan", "Giá bán"],
      ["stock", "Tồn kho"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "MaSP", label: "Mã sản phẩm", required: true },
      { name: "TenSP", label: "Tên sản phẩm", required: true },
      { name: "MaLoai", label: "Loại hàng", lookup: "categories" },
      { name: "DonViTinh", label: "Đơn vị tính" },
      { name: "GiaNhap", label: "Giá nhập (đ)", type: "number" },
      { name: "GiaBan", label: "Giá bán (đ)", type: "number" },
      { name: "HanSuDung", label: "Hạn sử dụng", type: "date" },
      { name: "TrangThai", label: "Trạng thái", options: [{ value: "Đang bán", label: "Đang bán" }, { value: "Ngừng bán", label: "Ngừng bán" }] },
    ],
  },
  "product-categories": {
    key: "TenLoai",
    columns: [
      ["TenLoai", "Tên loại"],
      ["MoTa", "Mô tả"],
    ],
    fields: [
      { name: "TenLoai", label: "Tên loại hàng", required: true },
      { name: "MoTa", label: "Mô tả", full: true },
    ],
  },
  "purchase-orders": {
    key: "MaDDH",
    columns: [
      ["MaDDH", "Mã ĐĐH"],
      ["MaNCCCode", "Nhà cung cấp"],
      ["NgayDat", "Ngày đặt"],
      ["TongTien", "Tổng tiền"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "MaNCC", label: "Nhà cung cấp", required: true, lookup: "suppliers" },
      { name: "NgayDat", label: "Ngày đặt", type: "date" },
      { name: "TongTien", label: "Tổng tiền", type: "number" },
      { name: "TrangThai", label: "Trạng thái" },
    ],
  },
  promotions: {
    key: "TenKM",
    columns: [
      ["TenKM", "Tên chương trình"],
      ["PhanTramGiam", "% giảm"],
      ["NgayBatDau", "Bắt đầu"],
      ["NgayKetThuc", "Kết thúc"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "TenKM", label: "Tên chương trình", required: true, full: true },
      { name: "PhanTramGiam", label: "Phần trăm giảm", type: "number" },
      { name: "NgayBatDau", label: "Ngày bắt đầu", type: "date" },
      { name: "NgayKetThuc", label: "Ngày kết thúc", type: "date" },
      { name: "DieuKienApDung", label: "Điều kiện áp dụng", full: true },
      { name: "TrangThai", label: "Trạng thái" },
    ],
  },
  debts: {
    key: "MaCN",
    columns: [
      ["MaKHCode", "Khách hàng"],
      ["MaNCCCode", "Nhà cung cấp"],
      ["MaHDCode", "Hóa đơn"],
      ["NgayPhatSinh", "Ngày phát sinh"],
      ["SoTien", "Số tiền"],
      ["SoTienDaTra", "Đã trả"],
      ["SoTienConLai", "Còn lại"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "MaNCC", label: "Mã nhà cung cấp", required: true },
      { name: "NgayPhatSinh", label: "Ngày phát sinh", type: "date" },
      { name: "SoTien", label: "Số tiền", type: "number" },
      { name: "SoTienDaTra", label: "Đã trả", type: "number" },
      { name: "SoTienConLai", label: "Còn lại", type: "number" },
      { name: "TrangThai", label: "Trạng thái" },
    ],
  },
  "admin/accounts": {
    key: "username",
    columns: [
      ["username", "Tên đăng nhập"],
      ["fullName", "Họ tên"],
      ["role", "Vai trò"],
      ["status", "Trạng thái"],
    ],
    fields: [
      { name: "username", label: "Tên đăng nhập", required: true },
      { name: "fullName", label: "Họ và tên", required: true },
      { name: "password", label: "Mật khẩu" },
      {
        name: "role",
        label: "Vai trò",
        options: Object.entries(roleLabels).map(([value, label]) => ({ value, label })),
      },
      { name: "status", label: "Trạng thái" },
    ],
  },
  "admin/employees": {
    key: "HoTen",
    columns: [
      ["MaNV", "Mã NV"],
      ["HoTen", "Họ tên"],
      ["SDT", "Số điện thoại"],
      ["VaiTro", "Vai trò"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "HoTen", label: "Họ và tên", required: true },
      { name: "SDT", label: "Số điện thoại", type: "tel", pattern: "0[0-9]{9,10}" },
      { name: "VaiTro", label: "Vai trò" },
      { name: "TrangThai", label: "Trạng thái" },
    ],
  },
  "admin/roles": {
    key: "TenVaiTro",
    columns: [
      ["TenVaiTro", "Tên vai trò"],
      ["MoTa", "Mô tả"],
    ],
    fields: [
      { name: "TenVaiTro", label: "Tên vai trò", required: true },
      { name: "MoTa", label: "Mô tả", full: true },
    ],
  },
};

const numericFields = new Set([
  "GiaNhap", "GiaBan", "PhanTramGiam", "SoTien",
  "SoTienDaTra", "SoTienConLai", "DiemTichLuy", "TongTien",
]);

function displayValue(value, field) {
  if (numericFields.has(field) && field !== "stock")
    return money.format(Number(value) || 0);
  if (field === "role") return roleLabels[value] || String(value ?? "—");
  return String(value ?? "—");
}

function isStatusField(field) {
  return field === "TrangThai" || field === "status";
}

/* ================================================================
   GENERIC RECORDS PAGE (CRUD)
   ================================================================ */
function RecordsPage({ title, description, resource }) {
  const config = configs[resource] || {
    key: "id",
    columns: [["code", "Mã"], ["TrangThai", "Trạng thái"]],
    fields: [{ name: "TrangThai", label: "Trạng thái" }],
  };

  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [catFilter, setCatFilter] = useState("all");
  const [lookups, setLookups] = useState({ suppliers: [], categories: [] });

  useEffect(() => {
    listRecords(resource).then(setRecords);
  }, [resource]);

  useEffect(() => {
    if (resource === "purchase-orders") {
      listRecords("suppliers").then((suppliers) => setLookups((current) => ({ ...current, suppliers })));
    }
    if (resource === "products") {
      listRecords("product-categories").then((categories) => setLookups((current) => ({ ...current, categories })));
    }
  }, [resource]);

  const visible = useMemo(() => {
    let filtered = records.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
    );
    if (resource === "products" && catFilter !== "all") {
      filtered = filtered.filter((item) => item.LoaiHang === catFilter);
    }
    return filtered;
  }, [records, query, resource, catFilter]);

  const categoryChips = useMemo(() => {
    if (resource !== "products") return [];
    const cats = lookups.categories.length
      ? lookups.categories.map((category) => category.TenLoai).filter(Boolean)
      : [...new Set(records.map((p) => p.LoaiHang).filter(Boolean))];
    return [
      { id: "all", label: "Tất cả" },
      ...cats.map((c) => ({ id: c, label: c })),
    ];
  }, [records, resource, lookups.categories]);

  function openModal(record = null) {
    const data = {};
      config.fields.forEach((f) => {
      data[f.name] = record ? record[f.name] ?? "" : "";
    });
    if (record?.id) data.id = record.id;
    setFormData(data);
    setEditing(record || {});
  }

  async function handleSave() {
    const record = { ...formData };
    const requiredField = config.fields.find((field) => field.required && !String(record[field.name] ?? "").trim());
    if (requiredField) return toast(`${requiredField.label} là bắt buộc`);
    if (record.SDT && !/^0\d{9,10}$/.test(String(record.SDT).trim())) return toast("Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0");
    if (record.Email && !/^\S+@\S+\.\S+$/.test(String(record.Email).trim())) return toast("Email không hợp lệ");
    config.fields.forEach((f) => {
      if (numericFields.has(f.name)) record[f.name] = Number(record[f.name] || 0);
    });
    try {
      const saved = await saveRecord(resource, record);
      setRecords((current) =>
        formData.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
      );
      setEditing(null);
      toast(formData.id ? "Đã cập nhật dữ liệu" : "Đã thêm mới thành công");
    } catch (err) {
      toast(err.message || "Có lỗi xảy ra");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa?")) return;
    await deleteRecord(resource, id);
    setRecords((current) => current.filter((item) => item.id !== id));
    toast("Đã xóa thành công");
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="page-heading">{title}</h1>
          <p>{description}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={() => openModal()}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Thêm mới
        </button>
      </header>

      <nav className="toolbar" aria-label="Tìm kiếm và lọc">
        <label className="sr-only" htmlFor="search-input">Tìm kiếm</label>
        <input
          id="search-input"
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm..."
        />
      </nav>

      {categoryChips.length > 0 && (
        <FilterChips
          items={categoryChips}
          activeId={catFilter}
          onSelect={setCatFilter}
        />
      )}

      <div className="table-shell" style={{ marginTop: categoryChips.length ? 14 : 0 }}>
        <table>
          <thead>
            <tr>
              {config.columns.map(([, label]) => (
                <th key={label} scope="col">{label}</th>
              ))}
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                {config.columns.map(([field]) => (
                  <td key={field}>
                    {isStatusField(field) ? (
                      <StatusBadge status={item[field]} />
                    ) : field === "DiemTichLuy" ? (
                      <Badge variant="primary">{item[field]} đ</Badge>
                    ) : field === "stock" ? (
                      <Badge variant={Number(item[field]) <= 10 ? "red" : "gray"}>
                        {item[field]}
                      </Badge>
                    ) : (
                      displayValue(item[field], field)
                    )}
                  </td>
                ))}
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-sm-btn"
                      type="button"
                      onClick={() => openModal(item)}
                      aria-label={`Sửa ${item[config.key] || item.id}`}
                    >
                      <PencilSquareIcon className="ic" aria-hidden="true" />
                    </button>
                    {resource !== "products" && resource !== "debts" && (
                      <button
                        className="icon-sm-btn del"
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Xóa ${item[config.key] || item.id}`}
                      >
                        <TrashIcon className="ic" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td
                  colSpan={config.columns.length + 1}
                  style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}
                >
                  Chưa có dữ liệu phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        open={editing !== null}
        title={formData.id ? `Sửa ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`}
        onClose={() => setEditing(null)}
        onSubmit={handleSave}
      >
        <fieldset className="form-grid" style={{ border: "none", padding: 0, margin: 0 }}>
          {config.fields.map((f) => (
            <div className={`field ${f.full ? "full" : ""}`} key={f.name}>
              <label htmlFor={`field-${f.name}`}>{f.label}</label>
              {f.lookup ? (
                <select
                  id={`field-${f.name}`}
                  value={formData[f.name] ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  required={f.required}
                >
                  <option value="">Chọn {f.label.toLowerCase()}</option>
                  {(lookups[f.lookup] || []).map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.MaNCC || option.MaLoai} · {option.TenNCC || option.TenLoai}
                    </option>
                  ))}
                </select>
              ) : f.options ? (
                <select
                  id={`field-${f.name}`}
                  value={formData[f.name] ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [f.name]: e.target.value }))
                  }
                  required={f.required}
                >
                  <option value="">Chọn vai trò</option>
                  {f.options.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${f.name}`}
                  type={f.type || "text"}
                  value={formData[f.name] ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [f.name]: e.target.value }))
                  }
                  required={f.required}
                  pattern={f.pattern}
                />
              )}
            </div>
          ))}
        </fieldset>
      </Modal>
    </section>
  );
}

function PurchaseOrderPage({ title }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Đang chờ");
  const [selected, setSelected] = useState([]);

  // Combobox state
  const [cbQuery, setCbQuery] = useState("");
  const [cbOpen, setCbOpen] = useState(false);
  const [cbHighlight, setCbHighlight] = useState(0);

  useEffect(() => {
    listRecords("suppliers").then(setSuppliers);
    listRecords("products").then(setProducts);
    listRecords("purchase-orders").then(setOrders);
  }, []);

  const total = selected.reduce((sum, line) => sum + line.quantity * line.price, 0);

  // Combobox filtered list
  const cbFiltered = products.filter(
    (p) => p.TrangThai !== "Ngừng bán" &&
      !selected.some((s) => s.id === p.id) &&
      (cbQuery === "" ||
        p.MaSP?.toLowerCase().includes(cbQuery.toLowerCase()) ||
        p.TenSP?.toLowerCase().includes(cbQuery.toLowerCase()))
  );

  function addProductById(product) {
    if (!product || selected.some((item) => item.id === product.id)) return;
    setSelected((current) => [...current, { ...product, quantity: 1, price: Number(product.GiaNhap || 0) }]);
    setCbQuery("");
    setCbOpen(false);
    setCbHighlight(0);
  }

  function addProduct(event) {
    const product = products.find((item) => item.id === event.target.value);
    if (!product || selected.some((item) => item.id === product.id)) return;
    setSelected((current) => [...current, { ...product, quantity: 1, price: Number(product.GiaNhap || 0) }]);
    event.target.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    if (!supplierId || !selected.length) return toast("Cần chọn nhà cung cấp và ít nhất một sản phẩm");
    if (selected.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.price) || line.price < 0)) return toast("Số lượng và đơn giá đặt hàng không hợp lệ");
    try {
      const saved = await saveRecord("purchase-orders", { MaNCC: supplierId, NgayDat: orderDate, TrangThai: status, TongTien: total, items: selected.map((line) => ({ productId: line.id, quantity: line.quantity, price: line.price })) });
      setOrders((current) => [saved, ...current]);
      setSelected([]);
      toast("Đã lưu đơn đặt hàng NCC");
    } catch (error) { toast(error.message || "Không lưu được đơn đặt hàng"); }
  }

  return (
    <section aria-labelledby="purchase-order-heading">
      <header className="page-header"><hgroup><h1 id="purchase-order-heading">{title}</h1><p>Lập đơn đặt hàng có sản phẩm, số lượng và liên kết trực tiếp với phiếu nhập.</p></hgroup></header>
      <form onSubmit={submit} className="document-grid">
        <div className="stack">
          <section className="panel"><h2>THÔNG TIN ĐƠN ĐẶT HÀNG</h2><div className="form-grid">
            <label className="field"><span>Nhà cung cấp *</span><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required><option value="">Chọn nhà cung cấp</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.MaNCC} · {supplier.TenNCC}</option>)}</select></label>
            <label className="field"><span>Ngày đặt *</span><input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required /></label>
            <label className="field"><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Đang chờ</option><option>Đã xác nhận</option><option>Đã nhập kho</option><option>Đã hủy</option></select></label>
          </div></section>
          <section className="panel po-product-panel">
            <div className="po-panel-head">
              <h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                CHI TIẾT SẢN PHẨM
                {selected.length > 0 && <span className="po-item-count">{selected.length} mặt hàng</span>}
              </h2>
              {/* Custom searchable combobox */}
              <div className="po-combobox" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setCbOpen(false); setCbHighlight(0); } }}>
                <div className={`po-cb-input-wrap ${cbOpen ? "po-cb-open" : ""}`}>
                  <svg className="po-cb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="po-cb-input"
                    type="text"
                    autoComplete="off"
                    placeholder="Tìm và thêm sản phẩm…"
                    value={cbQuery}
                    onFocus={() => { setCbOpen(true); setCbHighlight(0); }}
                    onChange={(e) => { setCbQuery(e.target.value); setCbOpen(true); setCbHighlight(0); }}
                    onKeyDown={(e) => {
                      if (!cbOpen) return;
                      if (e.key === "ArrowDown") { e.preventDefault(); setCbHighlight((h) => Math.min(h + 1, cbFiltered.length - 1)); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setCbHighlight((h) => Math.max(h - 1, 0)); }
                      else if (e.key === "Enter") { e.preventDefault(); if (cbFiltered[cbHighlight]) addProductById(cbFiltered[cbHighlight]); }
                      else if (e.key === "Escape") { setCbOpen(false); setCbQuery(""); }
                    }}
                  />
                  {cbQuery ? (
                    <button type="button" className="po-cb-clear" onClick={() => { setCbQuery(""); setCbOpen(false); }} tabIndex={-1} title="Xóa">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ) : (
                    <svg className="po-cb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </div>
                {cbOpen && (
                  <div className="po-cb-dropdown">
                    {cbFiltered.length === 0 ? (
                      <div className="po-cb-empty">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        {cbQuery ? `Không tìm thấy "${cbQuery}"` : "Không còn sản phẩm để thêm"}
                      </div>
                    ) : cbFiltered.map((product, idx) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`po-cb-option ${idx === cbHighlight ? "po-cb-option-active" : ""}`}
                        onMouseEnter={() => setCbHighlight(idx)}
                        onMouseDown={(e) => { e.preventDefault(); addProductById(product); }}
                        tabIndex={-1}
                      >
                        <span className="po-cb-code">{product.MaSP}</span>
                        <span className="po-cb-name">{product.TenSP}</span>
                        <svg className="po-cb-plus" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {selected.length === 0 ? (
              <div className="po-empty-state">
                <div className="po-empty-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <p className="po-empty-title">Chưa có sản phẩm nào</p>
                <p className="po-empty-sub">Chọn sản phẩm từ danh sách phía trên để thêm vào đơn đặt hàng</p>
              </div>
            ) : (
              <div className="table-shell po-table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Mã hàng / Tên hàng</th>
                      <th style={{ width: 120 }}>Số lượng</th>
                      <th style={{ width: 150 }}>Đơn giá nhập</th>
                      <th style={{ width: 140 }}>Thành tiền</th>
                      <th style={{ width: 48 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((line, idx) => (
                      <tr key={line.id} className="po-product-row">
                        <td>
                          <div className="po-product-cell">
                            <span className="po-product-index">{idx + 1}</span>
                            <div>
                              <strong className="po-product-code">{line.MaSP}</strong>
                              <small className="po-product-name">{line.TenSP}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            className="po-num-input"
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(event) => setSelected((current) => current.map((item) => item.id === line.id ? { ...item, quantity: Number(event.target.value) || 1 } : item))}
                          />
                        </td>
                        <td>
                          <input
                            className="po-num-input po-price-input"
                            type="number"
                            min="0"
                            value={line.price}
                            onChange={(event) => setSelected((current) => current.map((item) => item.id === line.id ? { ...item, price: Number(event.target.value) || 0 } : item))}
                          />
                        </td>
                        <td>
                          <span className="po-line-total">{money.format(line.quantity * line.price)}</span>
                        </td>
                        <td>
                          <button
                            className="po-remove-btn"
                            type="button"
                            title="Xóa sản phẩm"
                            onClick={() => setSelected((current) => current.filter((item) => item.id !== line.id))}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <aside className="summary-card"><h2>TỔNG ĐƠN ĐẶT HÀNG</h2><dl><div><dt>Số mặt hàng</dt><dd>{selected.length}</dd></div><div><dt>Tổng số lượng</dt><dd>{selected.reduce((sum, line) => sum + line.quantity, 0)}</dd></div></dl><div className="summary-total"><span>Tổng tiền</span><strong>{money.format(total)}</strong></div><button className="btn btn-primary btn-block" type="submit">Lưu đơn đặt hàng</button></aside>
      </form>
      <section className="panel"><h2>ĐƠN ĐẶT HÀNG ĐÃ LƯU</h2><div className="table-shell"><table><thead><tr><th>Mã đơn</th><th>Nhà cung cấp</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.MaDDH || order.id}</strong></td><td>{order.MaNCCCode || order.MaNCC}</td><td>{order.NgayDat}</td><td>{money.format(order.TongTien || 0)}</td><td><StatusBadge status={order.TrangThai} /></td></tr>)}</tbody></table></div></section>
    </section>
  );
}

/* ================================================================
   STOCK DOCUMENT (Goods Receipts / Goods Issues)
   ================================================================ */
function currentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    return user.fullName || user.username || "";
  } catch {
    return "";
  }
}

function StockDocument({ type, title }) {
  const isReceipt = type === "receipt";
  const resource = isReceipt ? "goods-receipts" : "goods-issues";

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [reason, setReason] = useState("Bán hàng");
  const [note, setNote] = useState("");
  const [personName, setPersonName] = useState("");
  const [address, setAddress] = useState("");
  const [warehouse, setWarehouse] = useState("Kho chính");
  const [location, setLocation] = useState("Hà Nội");
  const [debit, setDebit] = useState(isReceipt ? "156" : "632");
  const [credit, setCredit] = useState(isReceipt ? "331" : "156");
  const [attachedDocs, setAttachedDocs] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    listRecords("products").then(setProducts).catch(() => setProducts([]));
    listRecords("suppliers").then(setSuppliers).catch(() => setSuppliers([]));
    if (isReceipt) listRecords("purchase-orders").then(setPurchaseOrders).catch(() => setPurchaseOrders([]));
    listRecords(resource)
      .then(setVouchers)
      .catch(() => setVouchers([]));
  }, [resource]);

  const total = selected.reduce(
    (sum, item) => sum + item.quantity * Number(item.price),
    0
  );
  const quantity = selected.reduce((sum, item) => sum + item.quantity, 0);
  const invalid =
    !isReceipt &&
    reason !== "Điều chỉnh kiểm kê thiếu" &&
    selected.some((item) => item.quantity > Number(item.stock));

  function addProduct(event) {
    const id = event.target.value;
    if (!id) return;
    const product = products.find((item) => item.id === id);
    if (selected.some((item) => item.id === id)) return;
    setSelected((current) => [
      ...current,
      { ...product, quantity: 1, price: product.GiaNhap },
    ]);
    event.target.value = "";
  }

  function updateQuantity(id, value) {
    setSelected((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Number(value) || 1) }
          : item
      )
    );
  }

  function draftRecord(savedId) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    return {
      id: savedId,
      MaNCC: supplierId,
      purchaseOrderId,
      LyDoXuat: reason,
      LyDoNhap: supplier ? `Nhập hàng từ ${supplier.TenNCC}` : "Nhập kho",
      GhiChu: note,
      NgayNhap: new Date().toISOString().slice(0, 10),
      NgayXuat: new Date().toISOString().slice(0, 10),
      TongTien: total,
      SoLuong: quantity,
      details: selected,
      NguoiLienQuan: personName || supplier?.TenNCC || "",
      DiaChi: address || supplier?.DiaChi || "",
      Kho: warehouse,
      DiaDiem: location,
      TkNo: debit,
      TkCo: credit,
      SoChungTuGoc: attachedDocs,
      NguoiLap: currentUserName(),
      TrangThai: "Đã lưu",
    };
  }

  function voucherModel(record) {
    return buildWarehouseVoucherModel({
      isReceipt,
      record,
      products,
      suppliers,
      userName: currentUserName(),
    });
  }

  function openPreview(record) {
    if (!(record.details || []).length) {
      toast("Thêm sản phẩm trước khi xem hoặc in phiếu");
      return;
    }
    setPreview(voucherModel(record));
  }

  async function submit(event) {
    event.preventDefault();
    if (
      !selected.length ||
      (isReceipt && (!supplierId || !purchaseOrderId)) ||
      (!isReceipt && invalid) ||
      (!isReceipt && reason === "Hủy hàng hỏng" && !note.trim())
    ) {
      setMessage(
        isReceipt
          ? "Cần chọn đơn đặt hàng NCC, nhà cung cấp và ít nhất một sản phẩm."
          : "Không thể lưu: kiểm tra tồn kho hoặc nhập mô tả hàng hỏng."
      );
      return;
    }
    const record = draftRecord();
    let saved;
    try {
      saved = await saveRecord(resource, record);
    } catch (error) {
      toast(error.message || "Không lưu được phiếu");
      return;
    }
    const next = { ...record, ...(saved || {}), id: saved?.id || record.id };

    // Update local stock
    const stored = JSON.parse(localStorage.getItem("baby-shop:products") || "[]");
    if (stored.length) {
      localStorage.setItem(
        "baby-shop:products",
        JSON.stringify(
          stored.map((product) => {
            const line = selected.find((item) => item.id === product.id);
            return line
              ? {
                  ...product,
                  stock: Math.max(
                    0,
                    Number(product.stock || 0) +
                      (isReceipt ? line.quantity : -line.quantity)
                  ),
                }
              : product;
          })
        )
      );
    }
    setMessage(
      `Đã lưu ${isReceipt ? "phiếu nhập" : "phiếu xuất"} và cập nhật tồn kho.`
    );
    setVouchers((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setSelected([]);
    toast(`Đã lưu ${isReceipt ? "phiếu nhập kho" : "phiếu xuất kho"}`);
    setPreview(voucherModel(next));
  }

  return (
    <section className="module-detail" aria-labelledby="doc-heading">
      <header className="document-header">
        <hgroup>
          <h1 id="doc-heading">
            <span className="brand-mark" aria-hidden="true" style={{ display: "inline-grid", width: 28, height: 28, fontSize: 10, borderRadius: 7, verticalAlign: "middle", marginRight: 8 }}>MB</span>
            {title} — Mẹ &amp; Bé
          </h1>
          <p>Lập chứng từ và cập nhật tồn kho theo nghiệp vụ.</p>
        </hgroup>
        <mark className={`status-pill ${invalid ? "danger" : ""}`}>
          {invalid ? "Phiếu chưa hợp lệ" : message ? "Đã lưu phiếu" : "Phiếu chưa lưu"}
        </mark>
      </header>

      {message && (
        <p className={`alert ${invalid ? "danger" : "success"}`} role="alert">
          {message}
        </p>
      )}

      <form onSubmit={submit} className="document-grid">
        <div className="stack">
          {/* Supplier / Reason section */}
          <section className="panel">
            <h2>{isReceipt ? "NHÀ CUNG CẤP" : "LÝ DO XUẤT KHO"}</h2>
            {isReceipt ? (
              <>
              <div className="field">
                <select
                  value={supplierId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSupplierId(id);
                    const supplier = suppliers.find((item) => item.id === id);
                    if (supplier) {
                      setPersonName((current) => current || supplier.TenNCC);
                      setAddress((current) => current || supplier.DiaChi || "");
                    }
                  }}
                  required
                  aria-label="Chọn nhà cung cấp"
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.TenNCC} · {item.SDT}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="purchase-order-select">Đơn đặt hàng NCC *</label>
                <select id="purchase-order-select" value={purchaseOrderId} onChange={(event) => setPurchaseOrderId(event.target.value)} required>
                  <option value="">Chọn đơn đặt hàng liên quan</option>
                  {purchaseOrders.filter((order) => !supplierId || String(order.MaNCC) === String(supplierId)).map((order) => (
                    <option value={order.id} key={order.id}>{order.MaDDH || order.id} · {order.NgayDat || "Chưa có ngày"} · {money.format(order.TongTien || 0)}</option>
                  ))}
                </select>
              </div>
              </>
            ) : (
              <>
                <div className="segmented-list" role="radiogroup" aria-label="Lý do xuất kho">
                  {[
                    { label: "Bán hàng", icon: "🛍️" },
                    { label: "Chuyển kho nội bộ", icon: "🔄" },
                    { label: "Hủy hàng hỏng", icon: "🗑️" },
                    { label: "Điều chỉnh kiểm kê thiếu", icon: "📋" },
                  ].map(({ label, icon }) => (
                    <button
                      className={reason === label ? "selected" : ""}
                      type="button"
                      onClick={() => setReason(label)}
                      key={label}
                      role="radio"
                      aria-checked={reason === label}
                    >
                      <span className="seg-icon">{icon}</span>
                      <span className="seg-label">{label}</span>
                    </button>
                  ))}
                </div>
                <label className="full-label">
                  Mô tả tình trạng / ghi chú
                  {reason === "Hủy hàng hỏng" && (
                    <span className="required-hint">* Bắt buộc khi hủy hàng</span>
                  )}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    required={reason === "Hủy hàng hỏng"}
                    placeholder="Ví dụ: sữa bị nháp hộp, hết hạn sử dụng, bao bì rách..."
                    rows={3}
                  />
                </label>
              </>
            )}
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="field">
                <span>{isReceipt ? "Người giao hàng" : "Người nhận hàng"}</span>
                <input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder={isReceipt ? "Tên người giao" : "Tên người nhận"}
                />
              </label>
              <label className="field">
                <span>Địa chỉ (bộ phận)</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Địa chỉ hoặc bộ phận"
                />
              </label>
              <label className="field">
                <span>{isReceipt ? "Nhập tại kho" : "Xuất tại kho"}</span>
                <input
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Địa điểm</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
              <label className="field">
                <span>TK Nợ</span>
                <input value={debit} onChange={(e) => setDebit(e.target.value)} />
              </label>
              <label className="field">
                <span>TK Có</span>
                <input value={credit} onChange={(e) => setCredit(e.target.value)} />
              </label>
              <label className="field full">
                <span>Số chứng từ gốc kèm theo</span>
                <input
                  value={attachedDocs}
                  onChange={(e) => setAttachedDocs(e.target.value)}
                  placeholder="Hóa đơn, biên bản giao nhận..."
                />
              </label>
            </div>
          </section>

          {/* Product details */}
          <section className="panel">
            <h2>CHI TIẾT HÀNG {isReceipt ? "NHẬP" : "XUẤT"}</h2>
            <div className="field">
              <select onChange={addProduct} defaultValue="" aria-label="Thêm sản phẩm">
                <option value="">+ Thêm sản phẩm</option>
                {products.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.MaSP} · {item.TenSP} · tồn {item.stock || 0}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Mã hàng / Tên hàng</th>
                    <th scope="col">ĐVT</th>
                    <th scope="col">Tồn hiện tại</th>
                    <th scope="col">SL {isReceipt ? "nhập" : "xuất"}</th>
                    <th scope="col">{isReceipt ? "Đơn giá nhập" : "Đơn giá vốn"}</th>
                    <th scope="col">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((item) => (
                    <tr
                      className={
                        !isReceipt &&
                        item.quantity > item.stock &&
                        reason !== "Điều chỉnh kiểm kê thiếu"
                          ? "invalid-row"
                          : ""
                      }
                      key={item.id}
                    >
                      <td>
                        <strong>{item.TenSP}</strong>
                        <span className="cell-note">{item.MaSP}</span>
                      </td>
                      <td>{item.DonViTinh}</td>
                      <td>{item.stock || 0}</td>
                      <td>
                        <input
                          className="quantity-input"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, e.target.value)
                          }
                          aria-label={`Số lượng ${item.TenSP}`}
                        />
                      </td>
                      <td>{money.format(item.price)}</td>
                      <td>
                        <strong>{money.format(item.quantity * item.price)}</strong>
                        <button
                          type="button"
                          className="remove-line"
                          onClick={() =>
                            setSelected((current) =>
                              current.filter((line) => line.id !== item.id)
                            )
                          }
                          aria-label={`Xóa ${item.TenSP}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!selected.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                        Thêm sản phẩm từ danh sách phía trên
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Summary sidebar */}
        <div className="stack">
          <aside className="summary-card">
            <h2>TỔNG KẾT PHIẾU {isReceipt ? "NHẬP" : "XUẤT"}</h2>
            <dl>
              <div>
                <dt>Số mặt hàng</dt>
                <dd>{selected.length}</dd>
              </div>
              <div>
                <dt>Tổng số lượng {isReceipt ? "nhập" : "xuất"}</dt>
                <dd>{quantity}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>{isReceipt ? "Tổng tiền nhập" : "Tổng giá trị (giá vốn)"}</span>
              <strong className={invalid ? "text-danger" : ""}>
                {money.format(total)}
              </strong>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={`btn ${isReceipt ? "btn-primary" : "btn-accent"} btn-block`}
                type="submit"
              >
                Lưu phiếu {isReceipt ? "nhập" : "xuất"}
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-label="Xem và in phiếu"
                onClick={() => openPreview(draftRecord("......"))}
              >
                <PrinterIcon className="ic" aria-hidden="true" />
              </button>
            </div>
          </aside>

          {/* Business notes */}
          <aside className="panel">
            <h2>GHI CHÚ NGHIỆP VỤ</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "12.5px", color: "var(--text-soft)" }}>
              {isReceipt ? (
                <>
                  <li>Sau khi lưu, hệ thống tự động cộng số lượng vào tồn kho.</li>
                  <li>Đơn giá nhập dùng để tính giá vốn, có thể khác giá bán.</li>
                  <li>Phiếu chỉ xác nhận khi đã chọn nhà cung cấp hợp lệ.</li>
                </>
              ) : (
                <>
                  <li><strong>Xuất quá số lượng:</strong> Phần lừa, lô đồ đông vượt tồn.</li>
                  <li><strong>Hàng hỏng:</strong> Bắt buộc mô tả tình trạng trước khi lưu.</li>
                  <li><strong>Kiểm kê thiếu:</strong> Ghi nhận chênh lệch không kiểm tra tồn.</li>
                </>
              )}
            </ul>
          </aside>
        </div>
      </form>

      <section className="panel">
        <h2>PHIẾU ĐÃ LƯU — IN MẪU 0{isReceipt ? "1" : "2"}-VT</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th scope="col">Số phiếu</th>
                <th scope="col">Ngày</th>
                <th scope="col">{isReceipt ? "Nhà cung cấp / người giao" : "Lý do xuất"}</th>
                <th scope="col">Tổng tiền</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => {
                const supplier = suppliers.find(
                  (item) => item.id === voucher.MaNCC || item.id === voucher.supplierId
                );
                return (
                  <tr key={voucher.id}>
                    <td><strong>{voucher.MaPN || voucher.MaPX || voucher.id}</strong></td>
                    <td>{voucher.NgayNhap || voucher.NgayXuat}</td>
                    <td>
                      {isReceipt
                        ? voucher.NguoiLienQuan || supplier?.TenNCC || "—"
                        : voucher.LyDoXuat || "—"}
                    </td>
                    <td>{money.format(voucher.TongTien || 0)}</td>
                    <td>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => openPreview(voucher)}
                      >
                        Xem / In
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!vouchers.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                    Chưa có phiếu {isReceipt ? "nhập" : "xuất"} kho
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={preview !== null}
        wide
        title={isReceipt ? "Phiếu nhập kho — Mẫu số 01-VT" : "Phiếu xuất kho — Mẫu số 02-VT"}
        onClose={() => setPreview(null)}
        onSubmit={() => {
          const frame = document.querySelector(".vt-preview-frame");
          if (frame?.contentWindow) {
            frame.contentWindow.focus();
            frame.contentWindow.print();
            return;
          }
          printWarehouseVoucher(preview);
        }}
        submitLabel="In phiếu"
      >
        {preview && (
          <iframe
            className="vt-preview-frame"
            title="Xem trước phiếu kho"
            srcDoc={buildWarehouseVoucherHtml(preview)}
          />
        )}
      </Modal>
    </section>
  );
}

/* ================================================================
   SALES PAGE (POS)
   ================================================================ */
function SalesPage({ title }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [createdInvoice, setCreatedInvoice] = useState(null);

  useEffect(() => {
    listRecords("products").then(setProducts);
    listRecords("customers")
      .then(setCustomers)
      .catch((error) => setCustomerError(error.message || "Không tải được danh sách khách hàng"));
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * item.GiaBan,
    0
  );
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = useMemo(() => {
    return ["all", ...new Set(products.map((p) => p.LoaiHang).filter(Boolean))];
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          !searchQuery ||
          p.TenSP.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.MaSP || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = selectedCat === "all" || p.LoaiHang === selectedCat;
        return matchSearch && matchCat;
      }),
    [products, searchQuery, selectedCat]
  );

  function add(product) {
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
    if (window.confirm("Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ?")) {
      setCart([]);
    }
  }

  async function submitSale() {
    if (!cart.length) return toast("Giỏ hàng đang trống");
    if (!customerId) return toast("Vui lòng chọn khách hàng trước khi lập hóa đơn");
    if (cart.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) return toast("Số lượng sản phẩm không hợp lệ");
    if (cart.some((item) => !Number.isFinite(Number(item.GiaBan)) || Number(item.GiaBan) < 0)) return toast("Giá bán sản phẩm không hợp lệ");
    try {
      const result = await saveRecord("sales-orders", {
        customerId: customerId || null,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.GiaBan,
        })),
        TongTien: total,
        NgayDat: new Date().toISOString().slice(0, 10),
        TrangThai: "Chờ xuất kho",
      });
      setCart([]);
      setCreatedInvoice(result.invoice || result);
      toast("Đã lập đơn hàng và xuất hóa đơn thành công!");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="pos-heading" className="pos-workspace">
      <header className="page-header">
        <hgroup>
          <h1 id="pos-heading">{title}</h1>
          <p>Màn hình bán lẻ POS: Chọn món nhanh, quản lý giỏ hàng và in hóa đơn tức thời.</p>
        </hgroup>
      </header>

      {createdInvoice && (
        <div className="alert success" role="status" style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <span>
            Đã lập hóa đơn <strong>{createdInvoice.MaHD || createdInvoice.id}</strong> với tổng tiền {money.format(createdInvoice.TongTien || total)}.
          </span>
          <button className="btn btn-sm" type="button" onClick={() => navigate("/invoices")}>Xem hóa đơn ngay</button>
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
                  <strong className="tile-name">{product.TenSP}</strong>
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

          <label className="field" style={{ margin: "14px 0 10px" }}>
            <span style={{ fontWeight: 600, fontSize: 12.5 }}>Khách hàng *</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.MaKH || customer.id} · {customer.HoTen} ({customer.SDT || "Chưa có SĐT"})
                </option>
              ))}
            </select>
            {customerError && <small className="text-danger">{customerError}</small>}
          </label>

          <div className="cart-list-scroll">
            {cart.length > 0 ? (
              cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="nm">
                    <strong style={{ display: "block", fontSize: 13 }}>{item.TenSP}</strong>
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
                <InboxIcon className="empty-icon" aria-hidden="true" />
                <p>Chưa có sản phẩm nào trong giỏ</p>
                <small style={{ color: "var(--text-faint)" }}>Nhấn vào sản phẩm bên trái để thêm</small>
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
                <span>{money.format(total)}</span>
              </div>
              <div className="cart-total-row grand">
                <span>TỔNG THANH TOÁN</span>
                <strong style={{ color: "var(--primary)", fontSize: 18 }}>{money.format(total)}</strong>
              </div>
            </div>
          )}

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
    </section>
  );
}

/* ================================================================
   INVOICE & PAYMENT PAGE
   ================================================================ */
function InvoicePage({ title }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payModal, setPayModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState("Tiền mặt");
  const [payAmount, setPayAmount] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  useEffect(() => {
    listRecords("invoices").then(setInvoices);
    listRecords("customers").then(setCustomers).catch(() => {});
  }, []);

  const visibleInvoices = invoices.filter((invoice) => {
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || JSON.stringify(invoice).toLowerCase().includes(search);
    return matchesQuery && (statusFilter === "Tất cả" || invoice.TrangThai === statusFilter);
  });

  const totalValue = invoices.reduce((sum, invoice) => sum + Number(invoice.TongTien || 0), 0);
  const collectedValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienDaTra || 0), 0);
  const outstandingValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienConLai ?? invoice.TongTien ?? 0), 0);

  function customerFor(invoice) {
    return customers.find((customer) => customer.id === String(invoice.MaKH) || customer.MaKH === invoice.MaKH);
  }

  function printInvoice(invoice) {
    const customer = customerFor(invoice);
    const lines = invoice.details || [];
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(invoice.MaHD || invoice.id)}</title><style>body{font-family:Arial,sans-serif;color:#1f2a37;margin:40px auto;max-width:780px}header{display:flex;justify-content:space-between;border-bottom:2px solid #3d7068;padding-bottom:18px}h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;text-transform:uppercase;letter-spacing:1px;color:#3d7068;margin:0}p{margin:5px 0;color:#6b7680}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:11px 8px;border-bottom:1px solid #e3e6e5;text-align:left}th:last-child,td:last-child{text-align:right}.summary{margin:24px 0 0 auto;width:300px}.summary div{display:flex;justify-content:space-between;padding:6px 0}.grand{border-top:2px solid #3d7068;margin-top:7px;padding-top:12px!important;font-size:18px;font-weight:bold;color:#2a4f49}.foot{margin-top:42px;text-align:center;font-size:12px;color:#9aa3ab}@media print{body{margin:20px}}</style></head><body><header><div><h2>Mẹ &amp; Bé</h2><p>Hệ thống bán lẻ mẹ và bé</p></div><div style="text-align:right"><h1>HÓA ĐƠN BÁN HÀNG</h1><p>${escapeHtml(invoice.MaHD || invoice.id)} · ${escapeHtml(invoice.NgayLap)}</p></div></header><section style="margin-top:22px"><strong>Khách hàng:</strong> ${escapeHtml(customer?.HoTen || invoice.MaKHCode || "Khách lẻ")}<br><span style="color:#6b7680">${escapeHtml(customer?.SDT || "")} ${customer?.DiaChi ? ` · ${escapeHtml(customer.DiaChi)}` : ""}</span></section><table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${lines.map((line) => `<tr><td>${escapeHtml(line.TenSP || line.MaSPCode || line.MaSP)}</td><td>${Number(line.SoLuong || line.quantity || 0)}</td><td>${money.format(Number(line.DonGia || line.price || 0))}</td><td>${money.format(Number(line.ThanhTien || (line.SoLuong || line.quantity || 0) * (line.DonGia || line.price || 0)))}</td></tr>`).join("")}</tbody></table><div class="summary"><div><span>Tổng tiền</span><strong>${money.format(invoice.TongTien || 0)}</strong></div><div><span>Đã thanh toán</span><strong>${money.format(invoice.SoTienDaTra || 0)}</strong></div><div class="grand"><span>Còn phải thu</span><strong>${money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</strong></div></div><p class="foot">Cảm ơn quý khách đã mua hàng tại Mẹ &amp; Bé.</p></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function pay() {
    if (!payModal) return;
    const remaining = Math.max(0, Number(payModal.SoTienConLai ?? payModal.TongTien));
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast(`Số tiền phải lớn hơn 0 và không vượt ${money.format(remaining)}`);
      return;
    }
    try {
      await saveRecord("payments", {
        invoiceId: payModal.id,
        amount,
        method: payMethod,
        NgayThanhToan: new Date().toISOString().slice(0, 10),
      });
      setInvoices((current) =>
        current.map((inv) =>
          inv.id === payModal.id
            ? { ...inv, SoTienDaTra: Number(inv.SoTienDaTra || 0) + amount, SoTienConLai: remaining - amount, TrangThai: amount >= remaining ? "Đã thanh toán" : "Thanh toán một phần" }
            : inv
        )
      );
      setPayModal(null);
      toast("Đã ghi nhận thanh toán");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="invoice-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="invoice-heading">{title}</h1>
          <p>Theo dõi chứng từ bán hàng, số đã thu và phần còn phải thu.</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={() => window.location.assign("/sales-orders")}>
          <PlusIcon className="btn-icon" aria-hidden="true" /> Lập hóa đơn mới
        </button>
      </header>

      <div className="invoice-stats">
        <article><span>Tổng hóa đơn</span><strong>{invoices.length}</strong><small>Chứng từ đã phát sinh</small></article>
        <article><span>Giá trị bán ra</span><strong>{money.format(totalValue)}</strong><small>Tổng giá trị hóa đơn</small></article>
        <article><span>Đã thu</span><strong className="positive">{money.format(collectedValue)}</strong><small>Thanh toán đã ghi nhận</small></article>
        <article><span>Còn phải thu</span><strong className="warning">{money.format(outstandingValue)}</strong><small>Cần theo dõi công nợ</small></article>
      </div>

      <div className="invoice-toolbar">
        <label className="invoice-search">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input type="search" placeholder="Tìm mã hóa đơn, đơn hàng, khách hàng..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="filter-chips" aria-label="Lọc trạng thái hóa đơn">
          {["Tất cả", "Chưa thanh toán", "Thanh toán một phần", "Đã thanh toán"].map((status) => (
            <button key={status} type="button" className={`filter-chip ${statusFilter === status ? "active" : ""}`} onClick={() => setStatusFilter(status)}>{status}</button>
          ))}
        </div>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã hóa đơn</th>
              <th scope="col">Khách hàng</th>
              <th scope="col">Ngày lập</th>
              <th scope="col">Giá trị</th>
              <th scope="col">Còn phải thu</th>
              <th scope="col">Trạng thái</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {visibleInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><button className="invoice-code" type="button" onClick={() => setSelectedInvoice(invoice)}>{invoice.MaHD || invoice.id}</button><small>{invoice.MaDHCode || invoice.MaDH || "Không có đơn hàng"}</small></td>
                <td>{customerFor(invoice)?.HoTen || invoice.MaKHCode || "Khách lẻ"}</td>
                <td>{invoice.NgayLap}</td>
                <td>{money.format(invoice.TongTien || 0)}</td>
                <td><strong>{money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</strong></td>
                <td><StatusBadge status={invoice.TrangThai} /></td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => setSelectedInvoice(invoice)}><EyeIcon className="ic" aria-hidden="true" /></button>
                    {invoice.TrangThai !== "Đã thanh toán" && <button className="btn btn-accent btn-sm" type="button" onClick={() => { setPayModal(invoice); setPayAmount(Number(invoice.SoTienConLai ?? invoice.TongTien)); }}>Thu tiền</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!visibleInvoices.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
                  <InboxIcon style={{ width: 28, margin: "0 auto 8px" }} aria-hidden="true" /><br />
                  {invoices.length ? "Không có hóa đơn phù hợp" : "Chưa có hóa đơn nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={selectedInvoice !== null}
        title={`Chi tiết hóa đơn · ${selectedInvoice?.MaHD || selectedInvoice?.id || ""}`}
        onClose={() => setSelectedInvoice(null)}
        onSubmit={() => printInvoice(selectedInvoice)}
        submitLabel="In hóa đơn"
        wide
      >
        {selectedInvoice && (
          <div className="invoice-detail">
            <div className="invoice-detail-head">
              <div><span className="eyebrow">Mẹ &amp; Bé · Hóa đơn bán hàng</span><h2>{selectedInvoice.MaHD || selectedInvoice.id}</h2><p>{selectedInvoice.NgayLap} · Đơn hàng {selectedInvoice.MaDHCode || selectedInvoice.MaDH || "—"}</p></div>
              <StatusBadge status={selectedInvoice.TrangThai} />
            </div>
            <div className="invoice-parties"><div><span>Khách hàng</span><strong>{customerFor(selectedInvoice)?.HoTen || selectedInvoice.MaKHCode || "Khách lẻ"}</strong><small>{customerFor(selectedInvoice)?.SDT || "Chưa có số điện thoại"}</small></div><div><span>Thanh toán</span><strong>{money.format(selectedInvoice.SoTienDaTra || 0)}</strong><small>Còn lại {money.format(selectedInvoice.SoTienConLai ?? selectedInvoice.TongTien ?? 0)}</small></div></div>
            <div className="table-shell invoice-lines"><table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{(selectedInvoice.details || []).map((line, index) => <tr key={`${line.MaSP || line.productId}-${index}`}><td><strong>{line.TenSP || line.MaSPCode || line.MaSP || line.productId}</strong></td><td>{line.SoLuong || line.quantity}</td><td>{money.format(line.DonGia || line.price || 0)}</td><td><strong>{money.format(line.ThanhTien || (line.SoLuong || line.quantity) * (line.DonGia || line.price || 0))}</strong></td></tr>)}</tbody></table></div>
            <div className="invoice-total"><span>Tổng cộng</span><strong>{money.format(selectedInvoice.TongTien || 0)}</strong></div>
          </div>
        )}
      </Modal>

      <Modal
        open={payModal !== null}
        title={`Ghi nhận thanh toán — ${payModal?.id || ""}`}
        onClose={() => setPayModal(null)}
        onSubmit={pay}
        submitLabel="Xác nhận thanh toán"
      >
        <div className="field">
          <label htmlFor="pay-amount">Số tiền thanh toán</label>
          <input
            id="pay-amount"
            type="number"
            min="1"
            max={payModal ? Number(payModal.SoTienConLai ?? payModal.TongTien) : undefined}
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
            required
          />
          <small>Còn nợ: {money.format(payModal ? Number(payModal.SoTienConLai ?? payModal.TongTien) : 0)}</small>
        </div>
        <div className="field">
          <label htmlFor="pay-method">Phương thức thanh toán</label>
          <select
            id="pay-method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          >
            <option>Tiền mặt</option>
            <option>Chuyển khoản</option>
            <option>Ví điện tử</option>
          </select>
        </div>
      </Modal>
    </section>
  );
}

/* ================================================================
   STOCKTAKE & RETURN PAGES ARE IMPORTED FROM ./modules/
   ================================================================ */

/* ================================================================
   REPORT PAGE
   ================================================================ */
function ReportPage({ title }) {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [debts, setDebts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [printing, setPrinting] = useState(null); // which report is printing
  const [printMenuOpen, setPrintMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getReport("revenue"),
      getReport("debts"),
      getReport("inventory"),
      listRecords("products"),
      listRecords("goods-receipts"),
      listRecords("goods-issues"),
      listRecords("debts"),
      listRecords("invoices"),
      listRecords("sales-orders"),
    ]).then(([revenue, debtsReport, inventory, prods, recs, iss, debtsList, invList, soList]) => {
      setData({ revenue, debts: debtsReport, inventory });
      setProducts(prods);
      setReceipts(recs);
      setIssues(iss);
      setDebts(debtsList);
      setInvoices(invList);
      setSalesOrders(soList);
    });
  }, []);

  async function handlePrint(type) {
    setPrinting(type);
    setPrintMenuOpen(false);
    try {
      const { printReport } = await import("../lib/reportPrint.js");
      switch (type) {
        case "revenue":
          printReport("revenue", { revenueData: data?.revenue, invoices, salesOrders });
          break;
        case "inventory":
          printReport("inventory", { products });
          break;
        case "warehouse":
          printReport("warehouse", { receipts, issues });
          break;
        case "debts":
          printReport("debts", { debts });
          break;
      }
    } catch (err) {
      toast("Không mở được cửa sổ in. Kiểm tra pop-up blocker.");
      console.error(err);
    } finally {
      setTimeout(() => setPrinting(null), 1500);
    }
  }

  if (!data) return (
    <section aria-labelledby="report-heading" style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "var(--text-soft)" }}>⏳ Đang tải báo cáo...</p>
    </section>
  );

  const categories = [
    { name: "Sữa", value: 2815000 },
    { name: "Bỉm/tã", value: 916000 },
    { name: "Đồ dùng cho bé", value: 370000 },
    { name: "Quần áo trẻ em", value: 198000 },
    { name: "Đồ chơi", value: 188000 },
    { name: "Chăm sóc mẹ và bé", value: 228000 },
  ];
  const maxCatValue = Math.max(1, ...categories.map((c) => c.value));

  const printReports = [
    { type: "revenue",   label: "Báo cáo doanh thu",     icon: "📊" },
    { type: "inventory", label: "Báo cáo tồn kho",        icon: "📦" },
    { type: "warehouse", label: "Báo cáo nhập – xuất kho", icon: "🏭" },
    { type: "debts",     label: "Báo cáo công nợ",         icon: "💳" },
  ];

  return (
    <section aria-labelledby="report-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="report-heading">{title}</h1>
          <p>Tổng hợp doanh thu, nhập xuất kho và công nợ.</p>
        </hgroup>
        {/* Print dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setPrintMenuOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <PrinterIcon className="btn-icon" aria-hidden="true" />
            In báo cáo
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {printMenuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setPrintMenuOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(31,42,55,.14)",
                  minWidth: 230,
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px 14px 6px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Chọn loại báo cáo
                </div>
                {printReports.map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handlePrint(r.type)}
                    disabled={printing === r.type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 14px",
                      border: "none",
                      background: printing === r.type ? "var(--primary-light)" : "transparent",
                      cursor: printing === r.type ? "wait" : "pointer",
                      fontSize: 13,
                      color: "var(--text)",
                      fontWeight: 500,
                      textAlign: "left",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => { if (printing !== r.type) e.currentTarget.style.background = "var(--primary-light)"; }}
                    onMouseLeave={(e) => { if (printing !== r.type) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    {printing === r.type ? "Đang mở cửa sổ in..." : r.label}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 14px" }}>
                  <p style={{ fontSize: 10.5, color: "var(--text-faint)", margin: 0 }}>
                    💡 Cho phép pop-up nếu trình duyệt yêu cầu
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="stats-grid">
        <StatCard
          label="Doanh thu đã thu"
          value={money.format(data.revenue?.total || 0)}
          valueClass="accent"
        />
        <StatCard
          label="Tổng đơn hàng"
          value={String(data.revenue?.orders || salesOrders.length || 0)}
        />
        <StatCard
          label="Số phiếu xuất kho"
          value={String(issues.length)}
        />
        <StatCard
          label="Công nợ chưa thu"
          value={money.format(data.debts?.total || 0)}
          valueClass="danger"
        />
      </div>

      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <h3>Doanh thu theo danh mục sản phẩm</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            title="In báo cáo doanh thu"
            onClick={() => handlePrint("revenue")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In doanh thu
          </button>
        </header>
        {categories.map((cat) => (
          <ProgressBar
            key={cat.name}
            label={cat.name}
            value={cat.value}
            max={maxCatValue}
            amount={money.format(cat.value)}
          />
        ))}
      </article>

      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <h3>Tình trạng tồn kho</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => handlePrint("inventory")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In tồn kho
          </button>
        </header>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { label: "Tổng mặt hàng", value: products.length, color: "var(--text)" },
            { label: "Còn hàng (>10)", value: products.filter(p => Number(p.stock||0) > 10).length, color: "var(--success)" },
            { label: "Sắp hết (1-10)", value: products.filter(p => Number(p.stock||0) > 0 && Number(p.stock||0) <= 10).length, color: "var(--warn)" },
            { label: "Hết hàng (0)", value: products.filter(p => Number(p.stock||0) <= 0).length, color: "var(--danger)" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 16px", textAlign: "center", border: "1px solid var(--border)", minWidth: 110 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <header className="section-head">
          <h3>Nhập – Xuất kho gần đây</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => handlePrint("warehouse")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In nhập – xuất kho
          </button>
        </header>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th scope="col">Loại</th>
                <th scope="col">Mã phiếu</th>
                <th scope="col">Ngày</th>
                <th scope="col">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((si) => (
                <tr key={si.id}>
                  <td><Badge variant="green">Nhập kho</Badge></td>
                  <td>{si.MaPN || si.id}</td>
                  <td>{si.NgayNhap}</td>
                  <td>{si.details?.length || 0} mặt hàng</td>
                </tr>
              ))}
              {issues.map((so) => (
                <tr key={so.id}>
                  <td><Badge variant="amber">Xuất kho</Badge></td>
                  <td>{so.MaPX || so.id}</td>
                  <td>{so.NgayXuat}</td>
                  <td>{so.LyDoXuat}</td>
                </tr>
              ))}
              {!receipts.length && !issues.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>
                    Chưa có dữ liệu nhập xuất
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

/* ================================================================
   INVENTORY PAGE
   ================================================================ */
function InventoryPage({ title }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");

  useEffect(() => {
    listRecords("inventory").then(setProducts);
  }, []);

  const categories = ["Tất cả", ...new Set(products.map((product) => product.LoaiHang).filter(Boolean))];
  const visible = products.filter((product) => {
    const matchesQuery = JSON.stringify(product).toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "Tất cả" || product.LoaiHang === category);
  });
  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock || 0) <= 10).length;
  const now = new Date();

  return (
    <section aria-labelledby="inventory-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="inventory-heading">{title}</h1>
          <p>Theo dõi số lượng tồn kho theo sản phẩm, danh mục và thời điểm cập nhật.</p>
        </hgroup>
        <time className="inventory-now" dateTime={now.toISOString()}>Cập nhật lúc {now.toLocaleString("vi-VN")}</time>
      </header>

      <div className="inventory-overview"><article><span>Tổng mặt hàng</span><strong>{products.length}</strong><small>SKU đang quản lý</small></article><article><span>Tổng số lượng tồn</span><strong>{totalUnits.toLocaleString("vi-VN")}</strong><small>Đơn vị sản phẩm</small></article><article><span>Sắp hết hàng</span><strong className="warning">{lowStock}</strong><small>Tồn kho không quá 10</small></article></div>

      <div className="inventory-toolbar"><label className="invoice-search"><MagnifyingGlassIcon aria-hidden="true" /><input type="search" placeholder="Tìm mã hoặc tên sản phẩm..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-chips">{categories.map((item) => <button type="button" className={`filter-chip ${category === item ? "active" : ""}`} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã SP</th>
              <th scope="col">Tên sản phẩm</th>
              <th scope="col">Loại</th>
              <th scope="col">ĐVT</th>
              <th scope="col">Tồn kho</th>
              <th scope="col">Cập nhật gần nhất</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td>{p.MaSP}</td>
                <td><strong>{p.TenSP}</strong></td>
                <td>{p.LoaiHang || "—"}</td>
                <td>{p.DonViTinh}</td>
                <td>
                  <Badge variant={Number(p.stock) <= 10 ? "red" : Number(p.stock) <= 30 ? "amber" : "green"}>
                    {p.stock} {p.DonViTinh}
                  </Badge>
                </td>
                <td>{p.stockUpdatedAt ? new Date(p.stockUpdatedAt).toLocaleString("vi-VN") : "Chưa có mốc thời gian"}</td>
                <td><StatusBadge status={p.TrangThai} /></td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>Không có sản phẩm phù hợp</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================================================================
   ROUTER — map pathname to the right component
   ================================================================ */
export function ModulePage({ title, description }) {
  const { pathname } = useLocation();

  if (pathname === "/customers")
    return <CustomersPage title={title} description={description} />;
  if (pathname === "/suppliers")
    return <SuppliersPage title={title} description={description} />;
  if (pathname === "/products")
    return <ProductsPage title={title} description={description} />;
  if (pathname === "/products/categories")
    return <CategoriesPage title={title} description={description} />;
  if (pathname === "/purchase-orders")
    return <PurchaseOrderPage title={title} />;
  if (pathname === "/goods-receipts")
    return <StockDocument type="receipt" title={title} />;
  if (pathname === "/goods-issues")
    return <StockDocument type="issue" title={title} />;
  if (pathname === "/sales-orders")
    return <SalesPage title={title} />;
  if (pathname === "/invoices")
    return <InvoicePage title={title} />;
  if (pathname === "/inventory")
    return <InventoryPage title={title} />;
  if (pathname === "/stocktakes")
    return <StocktakePage title={title} />;
  if (pathname === "/returns")
    return <ReturnPage title={title} />;
  if (pathname === "/debts")
    return <DebtsPage title={title} description={description} />;
  if (pathname === "/promotions")
    return <PromotionsPage title={title} description={description} />;
  if (pathname === "/reports")
    return <ReportPage title={title} />;
  if (pathname.startsWith("/admin"))
    return <AdminPage title={title} description={description} path={pathname} />;

  const resource = pathname.slice(1);
  return (
    <RecordsPage title={title} description={description} resource={resource} />
  );
}
