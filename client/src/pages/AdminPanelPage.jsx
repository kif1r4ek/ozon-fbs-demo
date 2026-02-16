import { useState } from "react";
import { OrdersTab } from "../components/admin/OrdersTab";
import { UsersTab } from "../components/admin/UsersTab";
import { AuditLogTab } from "../components/admin/AuditLogTab";
import { SyncTab } from "../components/admin/SyncTab";
import "../App.css";

const ROLE_LABELS = {
  super_admin: "Супер-админ",
  admin: "Админ",
  user: "Пользователь",
};

export function AdminPanelPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("orders");

  const isSuper = user?.role === "super_admin";

  const tabs = [
    { id: "orders", label: "Заказы" },
    { id: "users", label: "Пользователи" },
    { id: "sync", label: "Синхронизация" },
    ...(isSuper ? [{ id: "audit", label: "Журнал" }] : []),
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">OZON FBS — Панель управления</h1>
        <div className="app-header-actions">
          <span className="admin-user-info">
            {user?.login}
            <span className="admin-user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
          </span>
          <button className="admin-logout-button" onClick={onLogout} type="button">
            Выйти
          </button>
        </div>
      </header>

      <nav className="admin-nav-simple">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`admin-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="admin-tab-content">
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "users" && <UsersTab currentUser={user} />}
        {activeTab === "sync" && <SyncTab />}
        {activeTab === "audit" && isSuper && <AuditLogTab />}
      </div>
    </div>
  );
}
