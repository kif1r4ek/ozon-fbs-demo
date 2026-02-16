import { syncOzonOrders, getSyncStatus } from "../useCases/syncOzonOrders.js";
import { writeAuditLog } from "../useCases/writeAuditLog.js";

export async function handleTriggerSync(req, res) {
  try {
    writeAuditLog({
      userId: req.user.id,
      action: "SYNC_TRIGGERED",
      ipAddress: req.ip,
    }).catch(() => {});

    const result = await syncOzonOrders();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[Sync] Trigger error:", error.message);
    res.status(500).json({ error: "Ошибка синхронизации", details: error.message });
  }
}

export async function handleGetSyncStatus(req, res) {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error("[Sync] Status error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
