import { listUsers, createUser, updateUser, deleteUser } from "../useCases/manageUsers.js";
import { writeAuditLog } from "../useCases/writeAuditLog.js";

export async function handleGetUsers(req, res) {
  try {
    const users = await listUsers(req.user.role);
    res.json({ users });
  } catch (error) {
    console.error("[Users] List error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleCreateUser(req, res) {
  try {
    const { login, name, password, role } = req.body;
    if (!login || !name || !password || !role) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const result = await createUser({ login, name, password, role }, req.user.role);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    writeAuditLog({
      userId: req.user.id,
      action: "USER_CREATED",
      targetType: "user",
      targetId: result.user.id,
      details: { login, name, role },
      ipAddress: req.ip,
    }).catch(() => {});

    res.status(201).json(result);
  } catch (error) {
    console.error("[Users] Create error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleUpdateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, password, role } = req.body;

    const result = await updateUser(id, { name, password, role }, req.user.role);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    writeAuditLog({
      userId: req.user.id,
      action: "USER_UPDATED",
      targetType: "user",
      targetId: id,
      details: { name, role, passwordChanged: !!password },
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(result);
  } catch (error) {
    console.error("[Users] Update error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleDeleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await deleteUser(id, req.user.id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    writeAuditLog({
      userId: req.user.id,
      action: "USER_DELETED",
      targetType: "user",
      targetId: id,
      ipAddress: req.ip,
    }).catch(() => {});

    res.json(result);
  } catch (error) {
    console.error("[Users] Delete error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}
