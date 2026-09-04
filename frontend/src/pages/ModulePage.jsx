import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  PrinterIcon,
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
      { name: "SDT", label: "Số điện thoại" },
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
      { name: "SDT", label: "Số điện thoại" },
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
      { name: "TrangThai", label: "Trạng thái" },
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
      ["HoTen", "Họ tên"],
      ["SDT", "Số điện thoại"],
      ["VaiTro", "Vai trò"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "HoTen", label: "Họ và tên", required: true },
      { name: "SDT", label: "Số điện thoại" },
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
    const cats = [...new Set(records.map((p) => p.LoaiHang).filter(Boolean))];
    return [
      { id: "all", label: "Tất cả" },
      ...cats.map((c) => ({ id: c, label: c })),
    ];
  }, [records, resource]);

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
                    <button
                      className="icon-sm-btn del"
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Xóa ${item[config.key] || item.id}`}
                    >
                      <TrashIcon className="ic" aria-hidden="true" />
                    </button>
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
                />
              )}
            </div>
          ))}
        </fieldset>
      </Modal>
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
  const [vouchers, setVouchers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [supplierId, setSupplierId] = useState("");
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
      (isReceipt && !supplierId) ||
      (!isReceipt && invalid) ||
      (!isReceipt && reason === "Hủy hàng hỏng" && !note.trim())
    ) {
      setMessage(
        isReceipt
          ? "Cần chọn nhà cung cấp và ít nhất một sản phẩm."
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
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        p.TenSP.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [products, searchQuery]
  );

  function add(product) {
    if (Number(product.stock ?? 0) <= 0) {
      toast("Sản phẩm đã hết tồn kho");
      return;
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.quantity >= Number(product.stock || 0)) {
      toast("Số lượng bán không được vượt tồn kho");
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
    toast("Đã thêm vào giỏ hàng");
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

  async function submitSale() {
    if (!cart.length) return toast("Giỏ hàng đang trống");
    if (!customerId) return toast("Vui lòng chọn khách hàng trước khi lập hóa đơn");
    try {
      await saveRecord("sales-orders", {
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
      toast("Đã lập đơn hàng — chuyển sang Hóa đơn & Thanh toán");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="pos-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="pos-heading">{title}</h1>
          <p>Chọn sản phẩm, lập hóa đơn và chuyển đơn sang quy trình xuất kho.</p>
        </hgroup>
      </header>

      <div className="pos-grid">
        {/* Product selection */}
        <div>
          <header className="section-head">
            <hgroup>
              <h3>Chọn sản phẩm</h3>
              <p className="desc">Nhấn vào sản phẩm để thêm vào giỏ hàng</p>
            </hgroup>
          </header>
          <nav className="toolbar" aria-label="Tìm sản phẩm">
            <input
              className="search-input"
              type="search"
              placeholder="Tìm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm sản phẩm"
            />
          </nav>
          <div className="prod-grid">
            {filteredProducts.map((product) => (
              <button
                className="prod-tile"
                type="button"
                key={product.id}
                onClick={() => add(product)}
              >
                <span className="tile-cat">{product.LoaiHang || "Sản phẩm"}</span>
                <strong className="tile-name">{product.TenSP}</strong>
                <span className="tile-price">{money.format(product.GiaBan)}</span>
                <span className="tile-stock">
                  Tồn: {product.stock || 0} {product.DonViTinh}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cart panel */}
        <aside className="cart-panel" aria-label="Giỏ hàng">
          <label className="field" style={{ marginBottom: 14 }}>
            <strong>Khách hàng *</strong>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Chọn khách hàng</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.MaKH || customer.id} · {customer.HoTen} · {customer.SDT}
                </option>
              ))}
            </select>
            {customerError && <small className="text-danger">{customerError}</small>}
          </label>

          <div style={{ margin: "10px 0" }}>
            {cart.length > 0 ? (
              cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="nm">
                    <strong>{item.TenSP}</strong>
                    <small>{item.quantity} x {money.format(item.GiaBan)}</small>
                  </div>
                  <div className="qty-ctrl">
                    <button type="button" onClick={() => changeQty(item.id, -1)} aria-label="Giảm">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => changeQty(item.id, 1)} aria-label="Tăng">+</button>
                  </div>
                  <strong>{money.format(item.quantity * item.GiaBan)}</strong>
                </article>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "24px 10px" }}>
                <InboxIcon className="empty-icon" aria-hidden="true" />
                <p>Giỏ hàng trống</p>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-total-row">
                <span>Tạm tính</span>
                <span>{money.format(total)}</span>
              </div>
              <div className="cart-total-row grand">
                <span>Tổng cộng</span>
                <span>{money.format(total)}</span>
              </div>
            </>
          )}

          <button
            className="btn btn-primary btn-block"
            type="button"
            style={{ marginTop: 12 }}
            onClick={submitSale}
          >
            Lập đơn &amp; chuyển thanh toán
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
  const [payModal, setPayModal] = useState(null);
  const [payMethod, setPayMethod] = useState("Tiền mặt");
  const [payAmount, setPayAmount] = useState(0);

  useEffect(() => {
    listRecords("invoices").then(setInvoices);
  }, []);

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
          <p>Danh sách hóa đơn phát sinh từ đơn hàng và lịch sử thanh toán.</p>
        </hgroup>
      </header>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã hóa đơn</th>
              <th scope="col">Đơn hàng</th>
              <th scope="col">Ngày lập</th>
              <th scope="col">Tổng tiền</th>
              <th scope="col">Đã trả</th>
              <th scope="col">Còn nợ</th>
              <th scope="col">Trạng thái</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><strong>{invoice.MaHD || invoice.id}</strong></td>
                <td>{invoice.MaDHCode || invoice.MaDH || "—"}</td>
                <td>{invoice.NgayLap}</td>
                <td>{money.format(invoice.TongTien || 0)}</td>
                <td>{money.format(invoice.SoTienDaTra || 0)}</td>
                <td>{money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</td>
                <td><StatusBadge status={invoice.TrangThai} /></td>
                <td>
                  {invoice.TrangThai !== "Đã thanh toán" && (
                    <button
                      className="btn btn-accent btn-sm"
                      type="button"
                      onClick={() => { setPayModal(invoice); setPayAmount(Number(invoice.SoTienConLai ?? invoice.TongTien)); }}
                    >
                      Ghi nhận thanh toán
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!invoices.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>
                  Chưa có hóa đơn nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
   STOCKTAKE PAGE
   ================================================================ */
function StocktakePage({ title }) {
  const [products, setProducts] = useState([]);
  const [actual, setActual] = useState({});

  useEffect(() => {
    listRecords("products").then(setProducts);
  }, []);

  async function submit() {
    try {
      await saveRecord("stocktakes", {
        note: "Kiểm kê định kỳ",
        NgayKiemKe: new Date().toISOString().slice(0, 10),
        items: products.map((product) => ({
          productId: product.id,
          sys: Number(product.stock || 0),
          actual: Number(actual[product.id] ?? product.stock ?? 0),
        })),
      });
      toast("Đã lưu kiểm kê và điều chỉnh tồn kho");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="stocktake-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="stocktake-heading">{title}</h1>
          <p>Đối chiếu tồn kho hệ thống với số lượng thực tế tại cửa hàng.</p>
        </hgroup>
      </header>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Sản phẩm</th>
              <th scope="col">ĐVT</th>
              <th scope="col">Tồn hệ thống</th>
              <th scope="col">Thực tế</th>
              <th scope="col">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const sys = Number(product.stock || 0);
              const real = Number(actual[product.id] ?? sys);
              const diff = real - sys;
              return (
                <tr key={product.id}>
                  <td>
                    <strong>{product.TenSP}</strong>
                    <span className="cell-note">{product.MaSP}</span>
                  </td>
                  <td>{product.DonViTinh}</td>
                  <td>{sys}</td>
                  <td>
                    <input
                      className="quantity-input"
                      type="number"
                      min="0"
                      value={actual[product.id] ?? sys}
                      onChange={(e) =>
                        setActual((current) => ({
                          ...current,
                          [product.id]: e.target.value,
                        }))
                      }
                      aria-label={`Số lượng thực tế ${product.TenSP}`}
                    />
                  </td>
                  <td
                    className={
                      diff < 0
                        ? "diff-neg"
                        : diff > 0
                        ? "diff-pos"
                        : "diff-zero"
                    }
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        className="btn btn-primary"
        type="button"
        onClick={submit}
        style={{ marginTop: 16 }}
      >
        Lưu phiếu kiểm kê
      </button>
    </section>
  );
}

/* ================================================================
   RETURN PAGE
   ================================================================ */
function ReturnPage({ title }) {
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  useEffect(() => {
    listRecords("products").then(setProducts);
    listRecords("returns").then(setReturns);
  }, []);

  async function submit() {
    if (!productId || !reason.trim()) {
      toast("Vui lòng chọn sản phẩm và nhập lý do");
      return;
    }
    try {
      const product = products.find((p) => p.id === productId);
      const record = await saveRecord("returns", {
        productId,
        quantity,
        price: product?.GiaNhap || 0,
        reason,
        NgayTra: new Date().toISOString().slice(0, 10),
        TrangThai: "Đã xử lý",
      });
      setReturns((current) => [...current, record]);
      setModalOpen(false);
      setProductId("");
      setQuantity(1);
      setReason("");
      toast("Đã ghi nhận trả hàng và cộng tồn kho");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="return-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="return-heading">{title}</h1>
          <p>Ghi nhận hàng khách trả và cập nhật lại tồn kho.</p>
        </hgroup>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Tạo phiếu trả hàng
        </button>
      </header>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã PTH</th>
              <th scope="col">Sản phẩm</th>
              <th scope="col">SL trả</th>
              <th scope="col">Lý do</th>
              <th scope="col">Ngày trả</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.MaPTH || r.id}</strong></td>
                <td>{r.details?.map((line) => line.TenSP || products.find((p) => String(p.id) === String(line.MaSP))?.TenSP || line.MaSPCode).join(", ") || "—"}</td>
                <td>{r.SoLuong || r.details?.reduce((sum, line) => sum + Number(line.SoLuong || line.quantity || 0), 0) || 0}</td>
                <td>{r.LyDo || r.reason || "—"}</td>
                <td>{r.NgayTra}</td>
                <td><StatusBadge status={r.TrangThai} /></td>
              </tr>
            ))}
            {!returns.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>
                  Chưa có phiếu trả hàng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title="Tạo phiếu trả hàng"
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
      >
        <div className="field">
          <label htmlFor="rt-prod">Sản phẩm trả</label>
          <select
            id="rt-prod"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Chọn sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.TenSP}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="form-grid" style={{ border: "none", padding: 0, margin: 0 }}>
          <div className="field">
            <label htmlFor="rt-qty">Số lượng trả</label>
            <input
              id="rt-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="rt-reason">Lý do</label>
            <input
              id="rt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sản phẩm lỗi, không đúng mô tả..."
              required
            />
          </div>
        </fieldset>
      </Modal>
    </section>
  );
}

/* ================================================================
   REPORT PAGE
   ================================================================ */
function ReportPage({ title }) {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    Promise.all([
      getReport("revenue"),
      getReport("debts"),
      getReport("inventory"),
      listRecords("products"),
      listRecords("goods-receipts"),
      listRecords("goods-issues"),
    ]).then(([revenue, debts, inventory, prods, recs, iss]) => {
      setData({ revenue, debts, inventory });
      setProducts(prods);
      setReceipts(recs);
      setIssues(iss);
    });
  }, []);

  if (!data) return <p>Đang tải báo cáo...</p>;

  const categories = [
    { name: "Sữa", value: 2815000 },
    { name: "Bỉm/tã", value: 916000 },
    { name: "Đồ dùng cho bé", value: 370000 },
    { name: "Quần áo trẻ em", value: 198000 },
    { name: "Đồ chơi", value: 188000 },
    { name: "Chăm sóc mẹ và bé", value: 228000 },
  ];
  const maxCatValue = Math.max(1, ...categories.map((c) => c.value));

  return (
    <section aria-labelledby="report-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="report-heading">{title}</h1>
          <p>Tổng hợp doanh thu, nhập xuất kho và công nợ.</p>
        </hgroup>
      </header>

      <div className="stats-grid">
        <StatCard
          label="Doanh thu đã thu"
          value={money.format(data.revenue?.total || 0)}
          valueClass="accent"
        />
        <StatCard
          label="Tổng đơn hàng"
          value={String(data.revenue?.orders || 0)}
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

      <article className="card">
        <header className="section-head">
          <h3>Nhập – Xuất kho gần đây</h3>
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

  useEffect(() => {
    listRecords("products").then(setProducts);
  }, []);

  return (
    <section aria-labelledby="inventory-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="inventory-heading">{title}</h1>
          <p>Theo dõi số lượng tồn kho từng sản phẩm theo thời gian thực.</p>
        </hgroup>
      </header>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã SP</th>
              <th scope="col">Tên sản phẩm</th>
              <th scope="col">Loại</th>
              <th scope="col">ĐVT</th>
              <th scope="col">Tồn kho</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
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
                <td><StatusBadge status={p.TrangThai} /></td>
              </tr>
            ))}
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

  if (pathname === "/goods-receipts")
    return <StockDocument type="receipt" title={title} />;
  if (pathname === "/goods-issues")
    return <StockDocument type="issue" title={title} />;
  if (pathname === "/sales-orders") return <SalesPage title={title} />;
  if (pathname === "/invoices") return <InvoicePage title={title} />;
  if (pathname === "/stocktakes") return <StocktakePage title={title} />;
  if (pathname === "/returns") return <ReturnPage title={title} />;
  if (pathname === "/reports") return <ReportPage title={title} />;
  if (pathname === "/inventory") return <InventoryPage title={title} />;

  const resource =
    pathname === "/products/categories"
      ? "product-categories"
      : pathname.slice(1);

  return (
    <RecordsPage title={title} description={description} resource={resource} />
  );
}
