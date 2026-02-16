import { useState } from "react";
import "../App.css";

export function LoginPage({ onLogin, loginError, loginBusy }) {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loginValue.trim() || !password) return;
    onLogin(loginValue.trim(), password);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">OZON FBS</h1>
        <p className="login-subtitle">Вход в систему</p>

        {loginError && <div className="login-error">{loginError}</div>}

        <div className="login-field">
          <label className="login-label" htmlFor="login">Логин</label>
          <input
            id="login"
            className="login-input"
            type="text"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            placeholder="Введите логин"
            autoComplete="username"
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="password">Пароль</label>
          <input
            id="password"
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          className="login-button"
          type="submit"
          disabled={loginBusy || !loginValue || !password}
        >
          {loginBusy ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
