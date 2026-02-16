import prisma from "../infrastructure/prismaClient.js";
import { verifyPassword } from "../infrastructure/passwordUtils.js";
import { signToken, setAuthCookie } from "../infrastructure/jwtUtils.js";
import { writeAuditLog } from "./writeAuditLog.js";

export async function authenticateUser(login, password, res, ipAddress) {
  const user = await prisma.user.findUnique({ where: { login } });

  if (!user) {
    return { error: "Неверный логин или пароль" };
  }

  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    return { error: "Неверный логин или пароль" };
  }

  const token = signToken({ id: user.id, login: user.login, role: user.role });
  setAuthCookie(res, token);

  writeAuditLog({
    userId: user.id,
    action: "USER_LOGIN",
    ipAddress,
  }).catch(() => {});

  return {
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      role: user.role,
    },
  };
}
