import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await login(form.get("username"), form.get("password"));
      navigate("/dashboard", { replace: true });
    } catch (authError) {
      setError(authError.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <header className="login-brand">
          <span className="brand-mark" aria-hidden="true">MB</span>
          <hgroup>
            <strong>Mẹ &amp; Bé</strong>
            <small>Hệ thống quản lý cửa hàng</small>
          </hgroup>
        </header>

        <h1>Đăng nhập</h1>
        <p className="login-subtitle">
          Đăng nhập vào hệ thống quản lý cửa hàng mẹ và bé
        </p>

        <label>
          Tên đăng nhập
          <input
            name="username"
            placeholder="admin"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="alert danger" role="alert">{error}</p>
        )}

        <button type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
