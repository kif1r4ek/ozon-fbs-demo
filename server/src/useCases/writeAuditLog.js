import prisma from "../infrastructure/prismaClient.js";

export async function writeAuditLog({ userId, action, targetType = null, targetId = null, details = null, ipAddress = null }) {
  return prisma.auditLog.create({
    data: { userId, action, targetType, targetId, details, ipAddress },
  });
}
