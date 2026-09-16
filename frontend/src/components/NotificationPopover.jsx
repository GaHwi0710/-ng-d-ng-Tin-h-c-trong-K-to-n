import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { listRecords } from "../lib/api.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState("all");
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("baby-shop-read-notifs") || "[]");
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Load real business notifications from database
  useEffect(() => {
    async function loadAlerts() {
      try {
        const [products, debts, invoices] = await Promise.all([
          listRecords("products").catch(() => []),
          listRecords("debts").catch(() => []),
          listRecords("invoices").catch(() => []),
        ]);

        const items = [];
        const now = new Date();

        // 1. Cảnh báo tồn kho thấp (Low stock <= 10)
        products
          .filter((p) => p.stock !== undefined && Number(p.stock) <= 10 && p.TrangThai !== "Ngừng bán")
          .slice(0, 4)
          .forEach((p) => {
            const stock = Number(p.stock || 0);
            items.push({
              id: `stock-${p.id || p.MaSP}`,
              type: stock === 0 ? "danger" : "warning",
              category: "inventory",
              title: stock === 0 ? "Sản phẩm đã hết hàng!" : "Sản phẩm sắp hết hàng",
              message: `Mặt hàng "${p.TenSP}" hiện chỉ còn ${stock} ${p.DonViTinh || "cái"} trong kho.`,
              time: "Cần nhập thêm",
              path: "/products",
              icon: ArchiveBoxIcon,
            });
          });

        // 2. Cảnh báo hạn sử dụng (cận date trong 60 ngày hoặc đã hết hạn)
        products
          .filter((p) => p.HanSuDung && p.TrangThai !== "Ngừng bán")
          .forEach((p) => {
            const expDate = new Date(p.HanSuDung);
            if (!isNaN(expDate.getTime())) {
              const diffTime = expDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) {
                items.push({
                  id: `exp-${p.id || p.MaSP}`,
                  type: "danger",
                  category: "inventory",
                  title: "Sản phẩm ĐÃ HẾT HẠN",
                  message: `Mặt hàng "${p.TenSP}" đã quá hạn sử dụng (${p.HanSuDung}). Vui lòng thu hồi ngay.`,
                  time: "Quá hạn",
                  path: "/products",
                  icon: ExclamationTriangleIcon,
                });
              } else if (diffDays <= 60) {
                items.push({
                  id: `exp-${p.id || p.MaSP}`,
                  type: "warning",
                  category: "inventory",
                  title: "Sản phẩm cận date",
                  message: `Mặt hàng "${p.TenSP}" chỉ còn ${diffDays} ngày là hết hạn (${p.HanSuDung}).`,
                  time: `Còn ${diffDays} ngày`,
                  path: "/products",
                  icon: ClockIcon,
                });
              }
            }
          });

        // 3. Cảnh báo công nợ còn nợ
        debts
          .filter((d) => d.TrangThai === "Còn nợ" || (d.SoTienConLai && Number(d.SoTienConLai) > 0))
          .slice(0, 3)
          .forEach((d) => {
            const conLai = Number(d.SoTienConLai || d.SoTien || 0);
            items.push({
              id: `debt-${d.id || d.MaCN}`,
              type: "finance",
              category: "finance",
              title: "Công nợ đến hạn thanh toán",
              message: `Khoản nợ ${d.LoaiCongNo || "đối tác"} (${d.MaCN || "CN"}) còn nợ ${money.format(conLai)}.`,
              time: d.NgayPhatSinh || "Cần thanh toán",
              path: "/debts",
              icon: BanknotesIcon,
            });
          });

        // 4. Giao dịch / Hóa đơn mới gần đây
        invoices.slice(0, 2).forEach((inv) => {
          items.push({
            id: `inv-${inv.id || inv.MaHD}`,
            type: "success",
            category: "finance",
            title: "Giao dịch bán hàng mới",
            message: `Hóa đơn ${inv.MaHD || "HD"} đã hoàn tất thanh toán ${money.format(inv.TongTien || 0)}.`,
            time: inv.NgayLap || "Hôm nay",
            path: "/invoices",
            icon: CheckCircleIcon,
          });
        });

        setNotifications(items);
      } catch {
        // Ignored
      }
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // cập nhật mỗi phút
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  function markAllRead() {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("baby-shop-read-notifs", JSON.stringify(allIds));
  }

  function handleItemClick(item) {
    if (!readIds.includes(item.id)) {
      const next = [...readIds, item.id];
      setReadIds(next);
      localStorage.setItem("baby-shop-read-notifs", JSON.stringify(next));
    }
    setOpen(false);
    if (item.path) navigate(item.path);
  }

  const filteredNotifs = notifications.filter((n) => {
    if (tab === "inventory") return n.category === "inventory";
    if (tab === "finance") return n.category === "finance";
    return true;
  });

  return (
    <div className="notification-wrapper" ref={popoverRef} style={{ position: "relative" }}>
      <button
        className="notification-button"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Thông báo hệ thống"
        title="Thông báo hệ thống"
      >
        <BellIcon className="nav-icon" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge-count" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <aside
          className="notification-popover"
          aria-label="Hộp thoại thông báo"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxWidth: "92vw",
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid var(--border, #e2e8f0)",
            zIndex: 100,
            overflow: "hidden",
            animation: "notifFadeIn 0.18s ease-out",
          }}
        >
          {/* Header */}
          <header
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-muted, #f8fafc)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text, #1e293b)" }}>
                🔔 Thông báo hệ thống
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary, #3D7068)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px",
                  borderRadius: 4,
                }}
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckIcon style={{ width: 14, height: 14 }} />
                Đã đọc hết
              </button>
            )}
          </header>

          {/* Filter Tabs */}
          <nav
            aria-label="Lọc thông báo"
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              background: "#fff",
              padding: "4px 8px",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setTab("all")}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: "none",
                background: tab === "all" ? "var(--bg-muted, #f1f5f9)" : "transparent",
                color: tab === "all" ? "var(--primary, #3D7068)" : "var(--text-soft, #64748b)",
                fontWeight: tab === "all" ? 700 : 500,
                fontSize: 12,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("inventory")}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: "none",
                background: tab === "inventory" ? "var(--bg-muted, #f1f5f9)" : "transparent",
                color: tab === "inventory" ? "var(--primary, #3D7068)" : "var(--text-soft, #64748b)",
                fontWeight: tab === "inventory" ? 700 : 500,
                fontSize: 12,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Kho &amp; Date ({notifications.filter((n) => n.category === "inventory").length})
            </button>
            <button
              type="button"
              onClick={() => setTab("finance")}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: "none",
                background: tab === "finance" ? "var(--bg-muted, #f1f5f9)" : "transparent",
                color: tab === "finance" ? "var(--primary, #3D7068)" : "var(--text-soft, #64748b)",
                fontWeight: tab === "finance" ? 700 : 500,
                fontSize: 12,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Tài chính ({notifications.filter((n) => n.category === "finance").length})
            </button>
          </nav>

          {/* List items */}
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "4px 0" }}>
            {filteredNotifs.length > 0 ? (
              filteredNotifs.map((item) => {
                const isRead = readIds.includes(item.id);
                const IconComponent = item.icon || BellIcon;

                let iconBg = "#fef2f2";
                let iconColor = "#ef4444";
                if (item.type === "warning") {
                  iconBg = "#fffbeb";
                  iconColor = "#f59e0b";
                } else if (item.type === "success") {
                  iconBg = "#ecfdf5";
                  iconColor = "#10b981";
                } else if (item.type === "finance") {
                  iconBg = "#eff6ff";
                  iconColor = "#3b82f6";
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      background: isRead ? "#ffffff" : "rgba(61, 112, 104, 0.04)",
                      transition: "background 0.15s ease",
                    }}
                    className="notif-item"
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: iconBg,
                        color: iconColor,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <IconComponent style={{ width: 18, height: 18 }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: isRead ? 600 : 700,
                            color: "var(--text, #1e293b)",
                          }}
                        >
                          {item.title}
                        </h4>
                        <span style={{ fontSize: 11, color: "var(--text-faint, #94a3b8)", flexShrink: 0 }}>
                          {item.time}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: 12,
                          color: "var(--text-soft, #64748b)",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.message}
                      </p>
                    </div>

                    {!isRead && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--primary, #3D7068)",
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-faint, #94a3b8)" }}>
                <CheckCircleIcon style={{ width: 36, height: 36, margin: "0 auto 8px", color: "#10b981" }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Không có thông báo mới nào</p>
                <small style={{ fontSize: 11.5, color: "#94a3b8" }}>Hệ thống kho và công nợ đang hoạt động tốt</small>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border, #e2e8f0)",
              background: "var(--bg-muted, #f8fafc)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11.5, color: "var(--text-faint, #64748b)" }}>
              Tự động cập nhật mỗi 60 giây
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/products");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--primary, #3D7068)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Xem kho hàng &rarr;
            </button>
          </footer>
        </aside>
      )}
    </div>
  );
}
