import { verifyToken } from "../infrastructure/jwtUtils.js";

export function authenticate(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, login: payload.login, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.auth_token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, login: payload.login, role: payload.role };
  } catch {
    req.user = null;
  }
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}
