import prisma from "../infrastructure/prismaClient.js";
import { fetchFbsPostingsByStatus } from "../infrastructure/ozonApiClient.js";
import { mapRawFbsPostingToEntity } from "../domain/fbsPostingEntity.js";

export async function syncOzonOrders() {
  // Update sync state to running
  const syncState = await prisma.syncState.upsert({
    where: { id: 1 },
    create: { id: 1, lastSyncAt: new Date(), status: "running" },
    update: { status: "running", error: null },
  });

  try {
    // Fetch postings from OZON API
    const [packagingRaw, deliverRaw] = await Promise.all([
      fetchAllPostings("awaiting_packaging"),
      fetchAllPostings("awaiting_deliver"),
    ]);

    const allPostings = [...packagingRaw, ...deliverRaw];
    let created = 0;
    let updated = 0;

    for (const posting of allPostings) {
      const existingDelivery = await prisma.delivery.findUnique({
        where: { postingNumber: posting.postingNumber },
      });

      if (!existingDelivery) {
        await prisma.delivery.create({
          data: {
            postingNumber: posting.postingNumber,
            status: posting.status === "awaiting_packaging" ? "awaiting_packaging" : "awaiting_deliver",
            shipmentDate: posting.shipmentDate ? new Date(posting.shipmentDate) : null,
            labelBarcode: posting.labelBarcode || null,
            warehouse: posting.warehouse || null,
            syncedAt: new Date(),
            products: {
              create: posting.products.map((p) => ({
                offerId: p.offerId,
                sku: String(p.sku || p.productId || ""),
                name: p.name,
                quantity: p.quantity,
                price: p.price ? String(p.price) : null,
              })),
            },
          },
        });
        created++;
      } else {
        const newStatus = posting.status === "awaiting_packaging" ? "awaiting_packaging" : "awaiting_deliver";
        const needsUpdate = existingDelivery.status !== newStatus
          || (!existingDelivery.labelBarcode && posting.labelBarcode);

        if (needsUpdate) {
          const updateData = { syncedAt: new Date() };
          if (existingDelivery.status !== newStatus) updateData.status = newStatus;
          if (!existingDelivery.labelBarcode && posting.labelBarcode) updateData.labelBarcode = posting.labelBarcode;

          await prisma.delivery.update({
            where: { postingNumber: posting.postingNumber },
            data: updateData,
          });
          updated++;
        }
      }
    }

    await prisma.syncState.update({
      where: { id: 1 },
      data: { status: "idle", lastSyncAt: new Date(), error: null },
    });

    return { created, updated, total: allPostings.length };
  } catch (error) {
    await prisma.syncState.update({
      where: { id: 1 },
      data: { status: "error", error: error.message },
    }).catch(() => {});

    throw error;
  }
}

async function fetchAllPostings(status) {
  const result = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const raw = await fetchFbsPostingsByStatus(status, offset, limit);
    const postings = raw?.result?.postings;
    if (!postings || postings.length === 0) break;

    for (const item of postings) {
      result.push(mapRawFbsPostingToEntity(item));
    }

    if (!raw.result.has_next || postings.length < limit) break;
    offset += limit;
  }

  return result;
}

export async function getSyncStatus() {
  const state = await prisma.syncState.findUnique({ where: { id: 1 } });
  return state || { status: "never", lastSyncAt: null, error: null };
}
