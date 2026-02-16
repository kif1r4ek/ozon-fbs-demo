import { useState, useEffect } from "react";
import { fetchCurrentUser, login as apiLogin, logout as apiLogout } from "./services/authApiService";
import { LoginPage } from "./pages/LoginPage";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { UserPage } from "./pages/UserPage";
import "./App.css";

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        setCurrentUser(user || null);
        setAuthChecked(true);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthChecked(true);
      });
  }, []);

  const handleLogin = async (loginValue, password) => {
    setLoginError("");
    setLoginBusy(true);
    try {
      const data = await apiLogin(loginValue, password);
      setCurrentUser(data.user);
      setAuthChecked(true);
    } catch (err) {
      setLoginError(err.message || "Не удалось войти.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {}
    setCurrentUser(null);
  };

  // 1. Auth not checked yet — show loading
  if (!authChecked) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">OZON FBS</h1>
          <p className="login-subtitle">Проверяем доступ...</p>
        </div>
      </div>
    );
  }

  // 2. Not logged in — show login
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        loginError={loginError}
        loginBusy={loginBusy}
      />
    );
  }

  // 3. Role-based rendering
  const role = currentUser.role;

  if (role === "super_admin" || role === "admin") {
    return (
      <AdminPanelPage
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // 4. User role — assembly page
  return (
    <UserPage
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;
