import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  HomeIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  TagIcon,
  ArchiveBoxArrowDownIcon,
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  WalletIcon,
  DocumentCurrencyDollarIcon,
  GiftIcon,
  ArrowUturnLeftIcon,
  ChartBarIcon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  CircleStackIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { getUserPermissions, userCanAccessPath } from "../lib/permissions.js";

const COMMAND_ITEMS = [
  // Quick Actions
  {
    id: "qa-pos",
    title: "Bán hàng nhanh (POS)",
    subtitle: "Mở giao diện bán hàng thu ngân tại quầy",
    path: "/sales-orders",
    icon: ShoppingCartIcon,
    category: "Hành động nhanh",
    shortcut: "F2",
  },
  {
    id: "qa-po",
    title: "Tạo đơn đặt hàng nhập",
    subtitle: "Lập đơn mua hàng từ nhà cung cấp",
    path: "/purchase-orders",
    icon: ArchiveBoxArrowDownIcon,
    category: "Hành động nhanh",
  },
  {
    id: "qa-stocktake",
    title: "Lập phiếu kiểm kê kho",
    subtitle: "Kiểm đếm và đối soát số lượng thực tế trong kho",
    path: "/stocktakes",
    icon: ClipboardDocumentCheckIcon,
    category: "Hành động nhanh",
  },
  {
    id: "qa-report",
    title: "Xem báo cáo doanh thu & quản trị",
    subtitle: "Phân tích doanh thu, tồn kho, công nợ, thu chi",
    path: "/reports",
    icon: ChartBarIcon,
    category: "Hành động nhanh",
    shortcut: "F9",
  },

  // Modules: Bán hàng
  {
    id: "nav-dashboard",
    title: "Bàn làm việc (Dashboard)",
    subtitle: "Tổng quan các chỉ số tài chính và tồn kho",
    path: "/dashboard",
    icon: HomeIcon,
    category: "Tổng quan",
  },
  {
    id: "nav-sales",
    title: "Đơn bán hàng",
    subtitle: "Quản lý các đơn đặt hàng bán lẻ của khách",
    path: "/sales-orders",
    icon: ShoppingCartIcon,
    category: "Bán hàng",
  },
  {
    id: "nav-invoices",
    title: "Hóa đơn bán hàng",
    subtitle: "Danh sách chứng từ hóa đơn xuất bán hàng",
    path: "/invoices",
    icon: DocumentTextIcon,
    category: "Bán hàng",
  },
  {
    id: "nav-customers",
    title: "Khách hàng & Hội viên",
    subtitle: "Quản lý thông tin, điểm tích lũy và voucher",
    path: "/customers",
    icon: UserGroupIcon,
    category: "Bán hàng",
  },
  {
    id: "nav-promotions",
    title: "Chương trình khuyến mãi",
    subtitle: "Thiết lập mã giảm giá, voucher theo mức chiết khấu",
    path: "/promotions",
    icon: GiftIcon,
    category: "Bán hàng",
  },
  {
    id: "nav-returns",
    title: "Đổi trả hàng",
    subtitle: "Xử lý hàng trả lại và hoàn tiền cho khách",
    path: "/returns",
    icon: ArrowUturnLeftIcon,
    category: "Bán hàng",
  },

  // Modules: Nhập hàng & Kho
  {
    id: "nav-suppliers",
    title: "Nhà cung cấp",
    subtitle: "Danh mục đối tác cung ứng hàng hóa",
    path: "/suppliers",
    icon: BuildingStorefrontIcon,
    category: "Nhập hàng",
  },
  {
    id: "nav-po",
    title: "Đơn đặt hàng nhập",
    subtitle: "Theo dõi đơn mua hàng và tiến độ giao hàng",
    path: "/purchase-orders",
    icon: ShoppingCartIcon,
    category: "Nhập hàng",
  },
  {
    id: "nav-gr",
    title: "Phiếu nhập kho (01-VT)",
    subtitle: "Ghi nhận hàng về kho và cập nhật công nợ NCC",
    path: "/goods-receipts",
    icon: ArchiveBoxArrowDownIcon,
    category: "Nhập hàng",
  },
  {
    id: "nav-inventory",
    title: "Kiểm tra tồn kho",
    subtitle: "Theo dõi số lượng tồn, giá trị vốn và hàng cận date",
    path: "/inventory",
    icon: CubeIcon,
    category: "Kho hàng",
  },
  {
    id: "nav-stocktake",
    title: "Kiểm kê & Điều chỉnh kho",
    subtitle: "Lập biên bản kiểm đếm và xử lý chênh lệch thừa thiếu",
    path: "/stocktakes",
    icon: ClipboardDocumentCheckIcon,
    category: "Kho hàng",
  },
  {
    id: "nav-gi",
    title: "Phiếu xuất kho (02-VT)",
    subtitle: "Xuất bán hàng, xuất hủy hỏng hoặc điều chuyển",
    path: "/goods-issues",
    icon: ArchiveBoxIcon,
    category: "Kho hàng",
  },
  {
    id: "nav-products",
    title: "Danh mục sản phẩm",
    subtitle: "Quản lý mã hàng, tên sản phẩm, giá bán, giá nhập",
    path: "/products",
    icon: CubeIcon,
    category: "Kho hàng",
  },
  {
    id: "nav-categories",
    title: "Ngành hàng & Nhóm sản phẩm",
    subtitle: "Phân loại bỉm, tã, sữa, đồ chơi, thời trang mẹ bé",
    path: "/products/categories",
    icon: TagIcon,
    category: "Kho hàng",
  },

  // Modules: Kế toán & Quỹ
  {
    id: "nav-debts",
    title: "Sổ công nợ (Phải thu & Phải trả)",
    subtitle: "Theo dõi hạn nợ khách hàng và nhà cung cấp",
    path: "/debts",
    icon: CreditCardIcon,
    category: "Kế toán & Quỹ",
  },
  {
    id: "nav-cash-receipts",
    title: "Phiếu thu tiền mặt (01-TT)",
    subtitle: "Ghi nhận thu tiền bán lẻ, thu hồi nợ khách hàng",
    path: "/cash-receipts",
    icon: WalletIcon,
    category: "Kế toán & Quỹ",
  },
  {
    id: "nav-cash-payments",
    title: "Phiếu chi tiền mặt (02-TT)",
    subtitle: "Thanh toán công nợ NCC và chi phí vận hành cửa hàng",
    path: "/cash-payments",
    icon: DocumentCurrencyDollarIcon,
    category: "Kế toán & Quỹ",
  },

  // Modules: Báo cáo
  {
    id: "nav-reports",
    title: "Báo cáo doanh thu & Quản trị",
    subtitle: "Báo cáo doanh thu, tồn kho, xuất nhập, công nợ, quỹ",
    path: "/reports",
    icon: ChartBarIcon,
    category: "Báo cáo",
  },

  // Modules: Quản trị
  {
    id: "nav-admin-emp",
    title: "Quản lý nhân viên",
    subtitle: "Hồ sơ nhân sự, phân công ca làm việc",
    path: "/admin/employees",
    icon: UsersIcon,
    category: "Quản trị",
  },
  {
    id: "nav-admin-roles",
    title: "Phân quyền vai trò (RBAC)",
    subtitle: "Thiết lập ma trận phân quyền theo từng vai trò",
    path: "/admin/roles",
    icon: ShieldCheckIcon,
    category: "Quản trị",
  },
  {
    id: "nav-admin-acc",
    title: "Tài khoản hệ thống",
    subtitle: "Cấp tài khoản đăng nhập và đặt lại mật khẩu",
    path: "/admin/accounts",
    icon: KeyIcon,
    category: "Quản trị",
  },
  {
    id: "nav-admin-audit",
    title: "Nhật ký kiểm toán (Audit Logs)",
    subtitle: "Truy vết hoạt động người dùng và lịch sử giao dịch",
    path: "/admin/audit-logs",
    icon: ClipboardDocumentListIcon,
    category: "Quản trị",
  },
  {
    id: "nav-admin-backup",
    title: "Sao lưu & Khôi phục dữ liệu",
    subtitle: "Tạo bản sao lưu định kỳ bảo vệ cơ sở dữ liệu MongoDB",
    path: "/admin/backup",
    icon: CircleStackIcon,
    category: "Quản trị",
  },
];

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter items by user role permission
  const authorizedItems = useMemo(() => {
    return COMMAND_ITEMS.filter((item) => {
      if (item.path === "/dashboard") return true;
      return userCanAccessPath(item.path);
    });
  }, []);

  // Filter items by user search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return authorizedItems;
    const q = query.toLowerCase().trim();
    return authorizedItems.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [authorizedItems, query]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      if (target) {
        onClose();
        navigate(target.path);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(".cmd-item.selected");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="cmd-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh hệ thống"
    >
      <div className="cmd-palette-card">
        {/* Search Input Box */}
        <div className="cmd-palette-input-wrap">
          <MagnifyingGlassIcon className="cmd-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Tìm tính năng, phân hệ, báo cáo hoặc hành động nhanh... (Gõ để tìm)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-esc-badge" onClick={onClose} title="Nhấn ESC để đóng">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="cmd-palette-list" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="cmd-empty">
              <SparklesIcon className="cmd-empty-icon" />
              <div className="cmd-empty-title">Không tìm thấy phân hệ nào phù hợp</div>
              <div className="cmd-empty-desc">
                Thử tìm với từ khóa khác như "bán hàng", "kho", "thu chi", "hóa đơn", "công nợ"...
              </div>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon || DocumentTextIcon;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onClose();
                    navigate(item.path);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cmd-item-icon-wrap">
                    <Icon className="cmd-item-icon" />
                  </div>
                  <div className="cmd-item-content">
                    <div className="cmd-item-header">
                      <span className="cmd-item-title">{item.title}</span>
                      <span className="cmd-item-cat">{item.category}</span>
                    </div>
                    <div className="cmd-item-sub">{item.subtitle}</div>
                  </div>
                  {item.shortcut && (
                    <kbd className="cmd-item-shortcut">{item.shortcut}</kbd>
                  )}
                  <ArrowRightIcon className="cmd-item-arrow" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="cmd-palette-footer">
          <div className="cmd-footer-hints">
            <span>
              <kbd className="cmd-mini-kbd">↑</kbd> <kbd className="cmd-mini-kbd">↓</kbd> để di chuyển
            </span>
            <span>
              <kbd className="cmd-mini-kbd">↵</kbd> để chọn
            </span>
            <span>
              <kbd className="cmd-mini-kbd">ESC</kbd> để thoát
            </span>
          </div>
          <span className="cmd-footer-brand" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 14, height: 14, objectFit: "contain" }} />
            Cửa hàng Mẹ & Bé
          </span>
        </div>
      </div>
    </div>
  );
}
