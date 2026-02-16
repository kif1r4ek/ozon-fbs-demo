import { useState, useEffect, useCallback } from "react";
import { fetchSyncStatus, triggerSync, fetchDeliveryStats } from "../../services/adminApiService";

const STATUS_LABELS = {
  idle: "Готов",
  running: "Выполняется...",
  error: "Ошибка",
  never: "Не запускался",
};

export function SyncTab() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [status, deliveryStats] = await Promise.all([
        fetchSyncStatus(),
        fetchDeliveryStats(),
      ]);
      setSyncStatus(status);
      setStats(deliveryStats);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setResult(null);
    try {
      const res = await triggerSync();
      setResult(res);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ru-RU");
  };

  return (
    <div className="admin-tab-content">
      <div className="sync-section">
        <h2 className="admin-section-title">Синхронизация с OZON</h2>

        <div className="sync-info-grid">
          <div className="sync-info-card">
            <div className="sync-info-label">Статус</div>
            <div className={`sync-info-value status-${syncStatus?.status || "never"}`}>
              {STATUS_LABELS[syncStatus?.status] || syncStatus?.status || "—"}
            </div>
          </div>
          <div className="sync-info-card">
            <div className="sync-info-label">Последняя синхронизация</div>
            <div className="sync-info-value">{formatDate(syncStatus?.lastSyncAt)}</div>
          </div>
        </div>

        {syncStatus?.error && (
          <div className="admin-error">Ошибка: {syncStatus.error}</div>
        )}

        <button
          className="admin-primary-button"
          onClick={handleSync}
          disabled={syncing}
          type="button"
        >
          {syncing ? "Синхронизация..." : "Синхронизировать"}
        </button>

        {result && (
          <div className="sync-result">
            Создано: {result.created}, обновлено: {result.updated}, всего: {result.total}
          </div>
        )}
      </div>

      {stats && (
        <div className="sync-section">
          <h2 className="admin-section-title">Статистика заказов</h2>
          <div className="sync-stats-grid">
            <div className="sync-stat-card">
              <div className="sync-stat-value">{stats.total}</div>
              <div className="sync-stat-label">Всего</div>
            </div>
            <div className="sync-stat-card">
              <div className="sync-stat-value">{stats.statusCounts?.awaiting_packaging || 0}</div>
              <div className="sync-stat-label">Ожидают сборки</div>
            </div>
            <div className="sync-stat-card">
              <div className="sync-stat-value">{stats.statusCounts?.awaiting_deliver || 0}</div>
              <div className="sync-stat-label">Ожидают отгрузки</div>
            </div>
            <div className="sync-stat-card">
              <div className="sync-stat-value">{stats.assigned}</div>
              <div className="sync-stat-label">Назначено</div>
            </div>
            <div className="sync-stat-card">
              <div className="sync-stat-value">{stats.unassigned}</div>
              <div className="sync-stat-label">Не назначено</div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
    </div>
  );
}
