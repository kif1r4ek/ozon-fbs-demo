import prisma from "../infrastructure/prismaClient.js";
import { fetchFbsPostingDetails, shipFbsPosting } from "../infrastructure/ozonApiClient.js";

/**
 * Отгрузить группу заказов в Ozon (пакетно).
 * Для каждого postingNumber:
 *   1. Проверяет статус в Ozon через /v3/posting/fbs/get
 *   2. Формирует packages из products
 *   3. Отправляет /v4/posting/fbs/ship
 *   4. Обновляет статус в БД
 *
 * @param {string[]} postingNumbers - Массив номеров отправлений
 * @returns {{ shipped: string[], failed: Array<{postingNumber: string, error: string}> }}
 */
export async function shipGroupToOzon(postingNumbers) {
	const shipped = [];
	const failed = [];

	for (const postingNumber of postingNumbers) {
		try {
			// 1. Получаем данные из БД
			const delivery = await prisma.delivery.findUnique({
				where: { postingNumber },
				include: { products: true },
			});

			if (!delivery) {
				failed.push({ postingNumber, error: "Не найден в БД" });
				continue;
			}

			if (delivery.status !== "awaiting_packaging") {
				failed.push({ postingNumber, error: `Неверный статус в БД: ${delivery.status}` });
				continue;
			}

			// 2. Проверяем статус в Ozon
			const ozonDetails = await fetchFbsPostingDetails(postingNumber);
			const ozonStatus = ozonDetails?.result?.status;

			if (ozonStatus !== "awaiting_packaging") {
				// Если в Ozon уже другой статус, обновляем БД и пропускаем
				if (ozonStatus === "awaiting_deliver") {
					await prisma.delivery.update({
						where: { postingNumber },
						data: { status: "awaiting_deliver", syncedAt: new Date() },
					});
					shipped.push(postingNumber);
					continue;
				}
				failed.push({ postingNumber, error: `Статус в Ozon: ${ozonStatus} (ожидался awaiting_packaging)` });
				continue;
			}

			// 3. Формируем packages из products
			const packages = [
				{
					products: delivery.products.map((p) => ({
						product_id: Number(p.sku),
						quantity: p.quantity,
					})),
				},
			];

			// 4. Отправляем отгрузку в Ozon
			await shipFbsPosting(postingNumber, packages);

			// 5. Обновляем статус в БД
			await prisma.delivery.update({
				where: { postingNumber },
				data: {
					status: "awaiting_deliver",
					syncedAt: new Date(),
				},
			});

			shipped.push(postingNumber);
		} catch (error) {
			console.error(`[Ship] Ошибка отгрузки ${postingNumber}:`, error.message);
			failed.push({ postingNumber, error: error.message });
		}
	}

	return { shipped, failed };
}
