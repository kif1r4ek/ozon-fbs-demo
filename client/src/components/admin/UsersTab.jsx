import { useState, useEffect, useCallback } from "react";
import { fetchUsers, deleteUser } from "../../services/adminApiService";
import { UserFormModal } from "./UserFormModal";

const ROLE_LABELS = {
  super_admin: "Супер-админ",
  admin: "Админ",
  user: "Пользователь",
};

export function UsersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const isSuper = currentUser?.role === "super_admin";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (id, login) => {
    if (!confirm(`Удалить пользователя "${login}"?`)) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleModalClose = (saved) => {
    setModalOpen(false);
    setEditingUser(null);
    if (saved) loadUsers();
  };

  const filteredUsers = filterRole
    ? users.filter((u) => u.role === filterRole)
    : users;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-toolbar">
        <button className="admin-primary-button" onClick={handleCreate} type="button">
          + Создать пользователя
        </button>
        <select
          className="admin-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Все роли</option>
          {isSuper && <option value="admin">Админы</option>}
          <option value="user">Пользователи</option>
        </select>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Загрузка...</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Создан</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.login}</td>
                <td>{u.name}</td>
                <td>
                  <span className={`admin-role-badge role-${u.role}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td>{formatDate(u.createdAt)}</td>
                <td className="admin-actions-cell">
                  <button
                    className="admin-action-button edit"
                    onClick={() => handleEdit(u)}
                    type="button"
                  >
                    Изменить
                  </button>
                  {isSuper && u.role !== "super_admin" && (
                    <button
                      className="admin-action-button delete"
                      onClick={() => handleDelete(u.id, u.login)}
                      type="button"
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="admin-empty">
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          currentUserRole={currentUser?.role}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
