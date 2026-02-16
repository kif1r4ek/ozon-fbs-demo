import { listDeliveries, getDeliveryById, assignDelivery, bulkAssignDeliveries, getDeliveryStats, assignDeliveriesByGroup, getGroupAssignments, getMyAssignedPostingNumbers, getMyAssignedGroups, getAssignedShipmentDates, getAssignedPostingNumbers } from "../useCases/manageDeliveries.js";
import { writeAuditLog } from "../useCases/writeAuditLog.js";

export async function handleGetDeliveries(req, res) {
  try {
    const { status, assignedUserId, search, page, limit } = req.query;
    const result = await listDeliveries({
      status,
      assignedUserId,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json(result);
  } catch (error) {
    console.error("[Deliveries] List error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetDeliveryById(req, res) {
  try {
    const id = Number(req.params.id);
    const delivery = await getDeliveryById(id);
    if (!delivery) {
      return res.status(404).json({ error: "Отгрузка не найдена" });
    }
    res.json({ delivery });
  } catch (error) {
    console.error("[Deliveries] Get error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleAssignDelivery(req, res) {
  try {
    const id = Number(req.params.id);
    const { userId } = req.body;
    const delivery = await assignDelivery(id, userId);

    writeAuditLog({
      userId: req.user.id,
      action: "DELIVERY_ASSIGNED",
      targetType: "delivery",
      targetId: id,
      details: { assignedUserId: userId },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json({ delivery });
  } catch (error) {
    console.error("[Deliveries] Assign error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleBulkAssign(req, res) {
  try {
    const { deliveryIds, userId } = req.body;
    if (!Array.isArray(deliveryIds) || !deliveryIds.length) {
      return res.status(400).json({ error: "Укажите массив deliveryIds" });
    }

    const result = await bulkAssignDeliveries(deliveryIds, userId);

    writeAuditLog({
      userId: req.user.id,
      action: "DELIVERY_ASSIGNED",
      targetType: "delivery",
      details: { deliveryIds, assignedUserId: userId, count: result.count },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json({ updated: result.count });
  } catch (error) {
    console.error("[Deliveries] Bulk assign error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleAssignGroup(req, res) {
  try {
    const { shipmentDate, assignments } = req.body;
    if (!shipmentDate || !Array.isArray(assignments)) {
      return res.status(400).json({ error: "Укажите shipmentDate и assignments" });
    }

    const result = await assignDeliveriesByGroup(shipmentDate, assignments);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    writeAuditLog({
      userId: req.user.id,
      action: "DELIVERY_ASSIGNED",
      targetType: "delivery_group",
      details: { shipmentDate, assignments, ...result },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(result);
  } catch (error) {
    console.error("[Deliveries] Assign group error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetGroupAssignments(req, res) {
  try {
    const { shipmentDate } = req.query;
    if (!shipmentDate) {
      return res.status(400).json({ error: "Укажите shipmentDate" });
    }
    const result = await getGroupAssignments(shipmentDate);
    res.json(result);
  } catch (error) {
    console.error("[Deliveries] Group assignments error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetMyAssignments(req, res) {
  try {
    const postingNumbers = await getMyAssignedPostingNumbers(req.user.id);
    res.json({ postingNumbers });
  } catch (error) {
    console.error("[Deliveries] My assignments error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetMyGroups(req, res) {
  try {
    const groups = await getMyAssignedGroups(req.user.id);
    res.json({ groups });
  } catch (error) {
    console.error("[Deliveries] My groups error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetDeliveryStats(req, res) {
  try {
    const stats = await getDeliveryStats();
    res.json(stats);
  } catch (error) {
    console.error("[Deliveries] Stats error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetAssignedPostings(req, res) {
  try {
    const { shipmentDate } = req.query;
    if (!shipmentDate) {
      return res.status(400).json({ error: "Укажите shipmentDate" });
    }
    const postingNumbers = await getAssignedPostingNumbers(shipmentDate);
    res.json({ postingNumbers });
  } catch (error) {
    console.error("[Deliveries] Assigned postings error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetAssignedDates(req, res) {
  try {
    const dates = await getAssignedShipmentDates();
    res.json({ assignedDates: dates });
  } catch (error) {
    console.error("[Deliveries] Assigned dates error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
