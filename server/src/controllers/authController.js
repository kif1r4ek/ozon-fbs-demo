import { authenticateUser } from "../useCases/authenticateUser.js";
import { clearAuthCookie } from "../infrastructure/jwtUtils.js";
import { writeAuditLog } from "../useCases/writeAuditLog.js";

export async function handleLogin(req, res) {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: "Логин и пароль обязательны" });
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const result = await authenticateUser(login, password, res, ip);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error("[Auth] Login error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleLogout(req, res) {
  try {
    if (req.user) {
      writeAuditLog({
        userId: req.user.id,
        action: "USER_LOGOUT",
        ipAddress: req.ip,
      }).catch(() => {});
    }
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (error) {
    console.error("[Auth] Logout error:", error.message);
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

export async function handleGetMe(req, res) {
  try {
    if (!req.user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: req.user.id,
        login: req.user.login,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Get me error:", error.message);
    res.json({ user: null });
  }
}
