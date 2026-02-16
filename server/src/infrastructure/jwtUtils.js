import jwt from "jsonwebtoken";
import { jwtSecret, jwtExpiresIn, cookieSecure } from "../config/environment.js";

export function signToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

export function setAuthCookie(res, token) {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const parts = [
    `auth_token=${token}`,
    `Path=/`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge / 1000}`,
  ];
  if (cookieSecure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearAuthCookie(res) {
  const parts = [
    `auth_token=`,
    `Path=/`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=0`,
  ];
  if (cookieSecure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
