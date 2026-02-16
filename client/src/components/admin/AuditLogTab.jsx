import { useState, useEffect, useCallback } from "react";
import { fetchAuditLogs } from "../../services/adminApiService";

const ACTION_LABELS = {
  USER_CREATED: "Создание пользователя",
  USER_UPDATED: "Обновление пользователя",
  USER_DELETED: "Удаление пользователя",
  USER_LOGIN: "Вход в систему",
  USER_LOGOUT: "Выход из системы",
  DELIVERY_CREATED: "Создание отгрузки",
  DELIVERY_UPDATED: "Обновление отгрузки",
  DELIVERY_ASSIGNED: "Назначение отгрузки",
  SYNC_TRIGGERED: "Синхронизация",
  SETTINGS_CHANGED: "Изменение настроек",
};

export function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAuditLogs({ action: filterAction, page, limit: 30 });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("ru-RU");
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-toolbar">
        <select
          className="admin-select"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
        >
          <option value="">Все действия</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="admin-total-count">Всего записей: {total}</span>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">Загрузка...</div>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Детали</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="admin-date-cell">{formatDate(log.createdAt)}</td>
                  <td>{log.user?.login || log.userId}</td>
                  <td>{ACTION_LABELS[log.action] || log.action}</td>
                  <td className="admin-details-cell">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                  <td>{log.ipAddress || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="admin-empty">Записи не найдены</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination-button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Назад
              </button>
              <span className="admin-pagination-info">
                Стр. {page} из {totalPages}
              </span>
              <button
                className="admin-pagination-button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
