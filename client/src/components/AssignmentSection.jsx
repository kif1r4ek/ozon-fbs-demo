import { useState, useEffect, useCallback } from "react";
import { fetchUsers } from "../services/adminApiService";
import { assignGroup, fetchGroupAssignments } from "../services/adminApiService";

export function AssignmentSection({ shipmentDate, totalOrders, isLocked = false }) {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("manual"); // "equal" | "manual"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, assignmentsData] = await Promise.all([
        fetchUsers(),
        fetchGroupAssignments(shipmentDate),
      ]);

      // Only show users with role "user"
      const workers = (usersData.users || []).filter((u) => u.role === "user");
      setAvailableUsers(workers);

      // Restore existing assignments
      if (assignmentsData.assignments && assignmentsData.assignments.length > 0) {
        setRows(
          assignmentsData.assignments.map((a) => ({
            userId: a.user.id,
            count: a.count,
          }))
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shipmentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRow = () => {
    // Pick first user not already in rows
    const usedIds = new Set(rows.map((r) => r.userId));
    const next = availableUsers.find((u) => !usedIds.has(u.id));
    if (!next) return;
    setRows([...rows, { userId: next.id, count: 0 }]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const distributeEqual = () => {
    if (rows.length === 0) return;
    const perUser = Math.floor(totalOrders / rows.length);
    const remainder = totalOrders % rows.length;
    setRows(
      rows.map((r, i) => ({
        ...r,
        count: perUser + (i < remainder ? 1 : 0),
      }))
    );
    setMode("equal");
  };

  const assignedTotal = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  const remaining = totalOrders - assignedTotal;

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (assignedTotal > totalOrders) {
      setError(`Назначено ${assignedTotal} заказов, но всего ${totalOrders}`);
      return;
    }

    // Check for duplicate users
    const userIds = rows.map((r) => r.userId);
    if (new Set(userIds).size !== userIds.length) {
      setError("Один сотрудник не может быть назначен дважды");
      return;
    }

    setSaving(true);
    try {
      await assignGroup(
        shipmentDate,
        rows.map((r) => ({ userId: r.userId, count: Number(r.count) || 0 }))
      );
      setSuccess("Назначение сохранено");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const usedUserIds = new Set(rows.map((r) => r.userId));

  if (loading) {
    return <div className="admin-loading">Загрузка...</div>;
  }

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <h3 className="settings-section-title">НАЗНАЧЕНИЕ СОТРУДНИКОВ</h3>
      </div>

      <div className="settings-section-content">
        {availableUsers.length === 0 ? (
          <div className="assignment-empty">
            Нет доступных сотрудников. Создайте пользователей с ролью "Пользователь".
          </div>
        ) : (
          <>
            <div className="assignment-summary">
              <span>Всего заказов: <strong>{totalOrders}</strong></span>
              <span className={remaining < 0 ? "assignment-over" : remaining === 0 ? "assignment-done" : ""}>
                {remaining === 0
                  ? "Все заказы распределены"
                  : remaining > 0
                  ? `Не распределено: ${remaining}`
                  : `Превышение: ${Math.abs(remaining)}`}
              </span>
            </div>

            <div className="assignment-actions-top">
              <button
                className="assignment-btn-add"
                onClick={addRow}
                disabled={isLocked || usedUserIds.size >= availableUsers.length}
                type="button"
              >
                + Добавить сотрудника
              </button>
              {rows.length > 0 && (
                <button
                  className="assignment-btn-equal"
                  onClick={distributeEqual}
                  disabled={isLocked}
                  type="button"
                >
                  Распределить равномерно
                </button>
              )}
            </div>

            {rows.length > 0 && (
              <div className="assignment-rows">
                {rows.map((row, index) => (
                  <div className="assignment-row" key={index}>
                    <select
                      className="assignment-select"
                      value={row.userId}
                      disabled={isLocked}
                      onChange={(e) => updateRow(index, "userId", Number(e.target.value))}
                    >
                      {availableUsers
                        .filter((u) => u.id === row.userId || !usedUserIds.has(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.login})
                          </option>
                        ))}
                    </select>
                    <div className="assignment-count-wrapper">
                      <input
                        className="assignment-count-input"
                        type="number"
                        min="0"
                        max={totalOrders}
                        value={row.count}
                        disabled={isLocked}
                        onChange={(e) => {
                          updateRow(index, "count", Number(e.target.value) || 0);
                          setMode("manual");
                        }}
                      />
                      <span className="assignment-count-label">заказов</span>
                    </div>
                    <button
                      className="assignment-btn-remove"
                      onClick={() => removeRow(index)}
                      disabled={isLocked}
                      type="button"
                      title="Убрать"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="assignment-error">{error}</div>}
            {success && <div className="assignment-success">{success}</div>}

            {rows.length > 0 && (
              <div className="assignment-actions-bottom">
                <button
                  className="settings-button-primary"
                  onClick={handleSave}
                  disabled={isLocked || saving || assignedTotal === 0}
                  type="button"
                >
                  {saving ? "Сохраняем..." : "Сохранить назначение"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
