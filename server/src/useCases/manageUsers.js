import prisma from "../infrastructure/prismaClient.js";
import { createPasswordHash } from "../infrastructure/passwordUtils.js";

export async function listUsers(requestorRole) {
  const where = requestorRole === "admin" ? { role: "user" } : {};
  const users = await prisma.user.findMany({
    where,
    select: { id: true, login: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return users;
}

export async function createUser({ login, name, password, role }, requestorRole) {
  // Admin can only create users, Super Admin can create admin and user
  if (requestorRole === "admin" && role !== "user") {
    return { error: "Администратор может создавать только пользователей" };
  }
  if (role === "super_admin") {
    return { error: "Нельзя создать Super Admin" };
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return { error: "Пользователь с таким логином уже существует" };
  }

  const { salt, hash } = createPasswordHash(password);

  const user = await prisma.user.create({
    data: {
      login,
      name,
      role,
      passwordHash: hash,
      passwordSalt: salt,
    },
    select: { id: true, login: true, name: true, role: true, createdAt: true },
  });

  return { user };
}

export async function updateUser(id, { name, password, role }, requestorRole) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "Пользователь не найден" };
  }

  // Admin cannot modify admins or super_admins
  if (requestorRole === "admin" && target.role !== "user") {
    return { error: "Недостаточно прав" };
  }
  if (role === "super_admin") {
    return { error: "Нельзя назначить роль Super Admin" };
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (password) {
    const { salt, hash } = createPasswordHash(password);
    data.passwordHash = hash;
    data.passwordSalt = salt;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, login: true, name: true, role: true, createdAt: true },
  });

  return { user };
}

export async function deleteUser(id, requestorId) {
  if (id === requestorId) {
    return { error: "Нельзя удалить самого себя" };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "Пользователь не найден" };
  }
  if (target.role === "super_admin") {
    return { error: "Нельзя удалить Super Admin" };
  }

  await prisma.user.delete({ where: { id } });
  return { success: true };
}
