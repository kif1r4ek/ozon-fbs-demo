import { useState } from "react";
import { createUser, updateUser } from "../../services/adminApiService";

export function UserFormModal({ user, currentUserRole, onClose }) {
  const isEditing = !!user;
  const isSuper = currentUserRole === "super_admin";

  const [form, setForm] = useState({
    login: user?.login || "",
    name: user?.name || "",
    password: "",
    role: user?.role || "user",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (isEditing) {
        const data = { name: form.name, role: form.role };
        if (form.password) data.password = form.password;
        await updateUser(user.id, data);
      } else {
        if (!form.login || !form.name || !form.password) {
          setError("Все поля обязательны");
          setSaving(false);
          return;
        }
        await createUser(form);
      }
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={() => onClose(false)}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>{isEditing ? "Редактировать пользователя" : "Создать пользователя"}</h2>
          <button className="admin-modal-close" onClick={() => onClose(false)} type="button">
            &times;
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit}>
          {error && <div className="admin-error">{error}</div>}

          {!isEditing && (
            <div className="admin-form-field">
              <label htmlFor="user-login">Логин</label>
              <input
                id="user-login"
                className="admin-input"
                type="text"
                value={form.login}
                onChange={handleChange("login")}
                required
              />
            </div>
          )}

          <div className="admin-form-field">
            <label htmlFor="user-name">Имя</label>
            <input
              id="user-name"
              className="admin-input"
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              required
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="user-password">
              Пароль {isEditing && "(оставьте пустым, чтобы не менять)"}
            </label>
            <input
              id="user-password"
              className="admin-input"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              required={!isEditing}
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="user-role">Роль</label>
            <select
              id="user-role"
              className="admin-select"
              value={form.role}
              onChange={handleChange("role")}
            >
              <option value="user">Пользователь</option>
              {isSuper && <option value="admin">Админ</option>}
            </select>
          </div>

          <div className="admin-modal-footer">
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => onClose(false)}
            >
              Отмена
            </button>
            <button className="admin-primary-button" type="submit" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
