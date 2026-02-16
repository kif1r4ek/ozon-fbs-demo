import { queryAuditLogs } from "../useCases/queryAuditLog.js";

export async function handleGetAuditLogs(req, res) {
  try {
    const { userId, action, dateFrom, dateTo, page, limit } = req.query;
    const result = await queryAuditLogs({
      userId,
      action,
      dateFrom,
      dateTo,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json(result);
  } catch (error) {
    console.error("[Audit] Query error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
