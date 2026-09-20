import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api.js";
import { EyeIcon, EyeSlashIcon, LockClosedIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demoAccounts = [
    { label: "👑 Quản lý", user: "admin", pass: "123456" },
    { label: "🧮 Kế toán", user: "ketoan", pass: "123456" },
    { label: "🛒 Bán hàng", user: "banhang", pass: "123456" },
    { label: "📦 Thủ kho", user: "kho", pass: "123456" },
    { label: "🚚 Mua hàng", user: "muahang", pass: "123456" },
  ];

  function fillDemo(u, p) {
    setUsername(u);
    setPassword(p);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (authError) {
      setError(authError.message || "Tên đăng nhập hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <header className="login-brand">
          <span className="brand-mark" aria-hidden="true">MB</span>
          <hgroup>
            <strong>Mẹ &amp; Bé ERP</strong>
            <small>Hệ thống Quản lý Doanh nghiệp</small>
          </hgroup>
        </header>

        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">
          Truy cập trung tâm điều hành quản lý bán hàng, kho &amp; kế toán
        </p>

        <form onSubmit={submit} noValidate>
          <div className="login-field">
            <label htmlFor="login-username">Tên đăng nhập</label>
            <div className="login-input-wrap">
              <input
                id="login-username"
                name="username"
                className="login-input"
                placeholder="Ví dụ: admin hoặc ketoan"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                name="password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon style={{ width: 18, height: 18 }} />
                ) : (
                  <EyeIcon style={{ width: 18, height: 18 }} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="alert danger" role="alert" style={{ margin: "4px 0 12px", fontSize: 13 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Đang xác thực...</span>
            ) : (
              <>
                <LockClosedIcon style={{ width: 17, height: 17 }} />
                <span>Đăng nhập hệ thống</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Pills */}
        <div className="login-demo-section">
          <div className="login-demo-title">⚡ Chọn nhanh tài khoản phân quyền:</div>
          <div className="login-demo-grid">
            {demoAccounts.map((acc) => (
              <button
                key={acc.user}
                type="button"
                className="login-demo-chip"
                onClick={() => fillDemo(acc.user, acc.pass)}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11.5, color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <ShieldCheckIcon style={{ width: 15, height: 15, color: "#16a34a" }} />
          <span>Bảo mật kết nối máy chủ mã hóa TLS 256-bit</span>
        </div>
      </div>
    </main>
  );
}
