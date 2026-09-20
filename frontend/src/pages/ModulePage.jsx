import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LOW_STOCK_THRESHOLD } from "../lib/constants.js";
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
import { ProductImage } from "../components/ProductImage.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
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
import { CashVouchersPage } from "./modules/CashVouchersPage.jsx";
import { PurchaseOrderPage } from "./modules/PurchaseOrderPage.jsx";
import { WarehouseDocumentsPage } from "./modules/WarehouseDocumentsPage.jsx";
import { SalesPOSPage } from "./modules/SalesPOSPage.jsx";
import { InvoicePage } from "./modules/InvoicePage.jsx";
import { ReportPage } from "./modules/ReportPage.jsx";
import { InventoryPage } from "./modules/InventoryPage.jsx";

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
      ["CCCD", "Số CCCD"],
      ["SDT", "Số điện thoại"],
      ["DiaChi", "Địa chỉ"],
      ["VaiTro", "Vai trò"],
      ["TrangThai", "Trạng thái"],
    ],
    fields: [
      { name: "HoTen", label: "Họ và tên", required: true },
      { name: "CCCD", label: "Số CCCD (12 số)", pattern: "[0-9]{12}" },
      { name: "SDT", label: "Số điện thoại", type: "tel", pattern: "0[0-9]{9,10}" },
      { name: "DiaChi", label: "Địa chỉ thường trú" },
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });

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

  function handleDelete(id) {
    setConfirmDialog({ open: true, id });
  }

  async function executeDelete() {
    const { id } = confirmDialog;
    setConfirmDialog({ open: false, id: null });
    try {
      await deleteRecord(resource, id);
      setRecords((current) => current.filter((item) => item.id !== id));
      toast("Đã xóa thành công");
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
    }
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
                    ) : field === "TenSP" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <ProductImage src={item.HinhAnh} alt={item.TenSP} category={item.LoaiHang} size={32} />
                        {displayValue(item[field], field)}
                      </div>
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
              <label htmlFor={`field-${f.name}`}>{f.label}{f.required && <span className="required-star">*</span>}</label>
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

      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác."
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null })}
      />
    </section>
  );
}

function currentUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    const roleName = roleLabels[user.role] || user.role || "Nhân viên";
    return {
      name: user.fullName || user.username || "Nhân viên",
      role: user.role || "",
      roleName,
      username: user.username || "",
      display: `${user.fullName || user.username || "Nhân viên"} · ${roleName}`,
    };
  } catch {
    return { name: "Nhân viên", roleName: "Nhân viên", display: "Nhân viên" };
  }
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
    return <WarehouseDocumentsPage type="receipt" title={title} />;
  if (pathname === "/goods-issues")
    return <WarehouseDocumentsPage type="issue" title={title} />;
  if (pathname === "/sales-orders")
    return <SalesPOSPage title={title} />;
  if (pathname === "/invoices")
    return <InvoicePage title={title} />;
  if (pathname === "/inventory")
    return <InventoryPage title={title} />;
  if (pathname === "/stocktakes")
    return <StocktakePage title={title} />;
  if (pathname === "/returns")
    return <ReturnPage title={title} />;
  if (pathname === "/cash-receipts")
    return <CashVouchersPage type="thu" title={title} description={description} />;
  if (pathname === "/cash-payments")
    return <CashVouchersPage type="chi" title={title} description={description} />;
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
