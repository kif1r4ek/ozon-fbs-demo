import prisma from "../infrastructure/prismaClient.js";

export async function listDeliveries({ status, assignedUserId, search, page = 1, limit = 50 }) {
  const where = {};

  if (status) where.status = status;
  if (assignedUserId !== undefined) {
    where.assignedUserId = assignedUserId === "null" ? null : Number(assignedUserId);
  }
  if (search) {
    where.OR = [
      { postingNumber: { contains: search, mode: "insensitive" } },
      { products: { some: { offerId: { contains: search, mode: "insensitive" } } } },
      { products: { some: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      include: {
        products: true,
        assignedUser: { select: { id: true, login: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.delivery.count({ where }),
  ]);

  return { deliveries, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getDeliveryById(id) {
  return prisma.delivery.findUnique({
    where: { id },
    include: {
      products: true,
      assignedUser: { select: { id: true, login: true, name: true } },
    },
  });
}

export async function assignDelivery(deliveryId, userId) {
  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { assignedUserId: userId },
    include: {
      assignedUser: { select: { id: true, login: true, name: true } },
    },
  });
}

export async function bulkAssignDeliveries(deliveryIds, userId) {
  return prisma.delivery.updateMany({
    where: { id: { in: deliveryIds } },
    data: { assignedUserId: userId },
  });
}

export async function assignDeliveriesByGroup(shipmentDate, assignments) {
  // assignments: [{ userId, count }]
  // Find all deliveries for this shipment date
  const deliveries = await prisma.delivery.findMany({
    where: {
      shipmentDate: new Date(shipmentDate),
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (deliveries.length === 0) {
    return { error: "Нет заказов для указанной даты отгрузки" };
  }

  // Build batched updateMany operations (one per user + one for unassigned)
  const updateOps = [];
  let offset = 0;

  for (const assignment of assignments) {
    const count = assignment.count;
    const slice = deliveries.slice(offset, offset + count);
    if (slice.length > 0) {
      updateOps.push(
        prisma.delivery.updateMany({
          where: { id: { in: slice.map((d) => d.id) } },
          data: { assignedUserId: assignment.userId },
        })
      );
    }
    offset += count;
  }

  // Any remaining unassigned deliveries — clear assignment
  const remaining = deliveries.slice(offset);
  if (remaining.length > 0) {
    updateOps.push(
      prisma.delivery.updateMany({
        where: { id: { in: remaining.map((d) => d.id) } },
        data: { assignedUserId: null },
      })
    );
  }

  await prisma.$transaction(updateOps);

  return { success: true, totalAssigned: offset, totalCleared: remaining.length };
}

export async function getGroupAssignments(shipmentDate) {
  const deliveries = await prisma.delivery.findMany({
    where: {
      shipmentDate: new Date(shipmentDate),
    },
    select: {
      id: true,
      postingNumber: true,
      assignedUserId: true,
      assignedUser: { select: { id: true, login: true, name: true } },
    },
    orderBy: { id: "asc" },
  });

  // Group by userId
  const byUser = {};
  let unassigned = 0;
  for (const d of deliveries) {
    if (d.assignedUserId) {
      if (!byUser[d.assignedUserId]) {
        byUser[d.assignedUserId] = {
          user: d.assignedUser,
          count: 0,
        };
      }
      byUser[d.assignedUserId].count++;
    } else {
      unassigned++;
    }
  }

  return {
    total: deliveries.length,
    unassigned,
    assignments: Object.values(byUser),
  };
}

export async function getMyAssignedPostingNumbers(userId) {
  const deliveries = await prisma.delivery.findMany({
    where: { assignedUserId: userId },
    select: { postingNumber: true },
  });
  return deliveries.map((d) => d.postingNumber);
}

export async function getMyAssignedGroups(userId) {
  const deliveries = await prisma.delivery.findMany({
    where: { assignedUserId: userId },
    include: { products: true },
    orderBy: [{ shipmentDate: "desc" }, { id: "asc" }],
  });

  // Group by shipmentDate
  const groupsMap = {};
  for (const d of deliveries) {
    const key = d.shipmentDate ? d.shipmentDate.toISOString() : "no-date";
    if (!groupsMap[key]) {
      groupsMap[key] = {
        shipmentDate: key,
        postings: [],
        count: 0,
      };
    }
    groupsMap[key].postings.push({
      postingNumber: d.postingNumber,
      shipmentDate: key,
      shipmentNumber: d.shipmentNumber,
      labelBarcode: d.labelBarcode || null,
      products: d.products.map((p) => ({
        offerId: p.offerId,
        name: p.name,
        quantity: p.quantity,
        sku: p.sku,
        price: p.price,
      })),
    });
    groupsMap[key].count++;
  }

  return Object.values(groupsMap);
}



export async function getAssignedPostingNumbers(shipmentDate) {
  const deliveries = await prisma.delivery.findMany({
    where: {
      shipmentDate: new Date(shipmentDate),
      assignedUserId: { not: null },
    },
    select: { postingNumber: true },
  });
  return deliveries.map((d) => d.postingNumber);
}

export async function getAssignedShipmentDates() {
  const result = await prisma.delivery.groupBy({
    by: ["shipmentDate"],
    where: { assignedUserId: { not: null } },
    _count: { id: true },
  });

  // Return array of ISO date strings that have at least one assigned delivery
  return result.map((r) => r.shipmentDate.toISOString());
}

export async function getDeliveryStats() {
  const [byStatus, total, unassigned] = await Promise.all([
    prisma.delivery.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.delivery.count(),
    prisma.delivery.count({ where: { assignedUserId: null } }),
  ]);

  const statusCounts = {};
  for (const row of byStatus) {
    statusCounts[row.status] = row._count.id;
  }

  return { statusCounts, total, unassigned, assigned: total - unassigned };
}
