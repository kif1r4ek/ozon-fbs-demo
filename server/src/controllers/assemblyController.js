import { getAllAssemblyPostings } from "../useCases/fetchAssemblyPostings.js";
import { getAllAssemblyProducts } from "../useCases/fetchAssemblyProducts.js";
import { getAllAwaitingDeliverPostings } from "../useCases/fetchAwaitingDeliverPostings.js";
import { fetchPackageLabel } from "../infrastructure/ozonApiClient.js";
import { generatePostingsXlsx } from "../useCases/generatePostingsXlsx.js";
import { getLabelUrl, getLabelUrls, uploadLabelToS3, createFolderInS3, testS3Connection } from "../infrastructure/s3Client.js";
import { verifyBarcodeForArticle, findArticleByBarcode, verifyLabelBarcode } from "../infrastructure/moySkladApiClient.js";

export async function handleGetAssemblyPostings(_request, response) {
	try {
		const assemblyPostings = await getAllAssemblyPostings();
		response.json({ postings: assemblyPostings });
	} catch (error) {
		console.error("Ошибка при получении сборочных заданий:", error.message);
		response.status(500).json({
			error: "Не удалось получить список сборочных заданий",
			details: error.message,
		});
	}
}

export async function handleGetAssemblyProducts(_request, response) {
	try {
		const assemblyProductsResult = await getAllAssemblyProducts();
		response.json(assemblyProductsResult);
	} catch (error) {
		console.error("Ошибка при получении товаров для сборки:", error.message);
		response.status(500).json({
			error: "Не удалось получить список товаров для сборки",
			details: error.message,
		});
	}
}

export async function handleGetAwaitingDeliverPostings(_request, response) {
	try {
		const postings = await getAllAwaitingDeliverPostings();
		response.json({ postings });
	} catch (error) {
		console.error("Ошибка при получении отправлений awaiting_deliver:", error.message);
		response.status(500).json({
			error: "Не удалось получить список отправлений для отгрузки",
			details: error.message,
		});
	}
}

export async function handleExportDeliverSheet(_request, response) {
	try {
		const postings = await getAllAwaitingDeliverPostings();
		const xlsxBuffer = await generatePostingsXlsx(postings, "Лист отгрузки");

		response.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		);
		response.setHeader(
			"Content-Disposition",
			'attachment; filename="deliver-sheet.xlsx"'
		);
		response.send(Buffer.from(xlsxBuffer));
	} catch (error) {
		console.error("Ошибка при экспорте листа отгрузки:", error.message);
		response.status(500).json({
			error: "Не удалось сформировать XLSX файл листа отгрузки",
			details: error.message,
		});
	}
}

/**
 * Получение URLs этикеток из S3 хранилища
 * POST /api/assembly/labels
 * Body: { shipmentDate: "02.03.2026", shipmentNumber: "OZON-21614063", postingNumbers: ["12345-0001-1", "12345-0002-1"] }
 */
export async function handleGetLabelsFromS3(request, response) {
	try {
		const { shipmentDate, shipmentNumber, postingNumbers } = request.body;

		if (!shipmentDate || typeof shipmentDate !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentDate (дата поставки)",
			});
		}

		if (!shipmentNumber || typeof shipmentNumber !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentNumber (QR-код поставки)",
			});
		}

		if (!Array.isArray(postingNumbers) || postingNumbers.length === 0) {
			return response.status(400).json({
				error: "Необходимо передать массив postingNumbers",
			});
		}

		const labels = await getLabelUrls(shipmentDate, shipmentNumber, postingNumbers);

		response.json({ labels });
	} catch (error) {
		console.error("Ошибка при получении этикеток из S3:", error.message);
		response.status(500).json({
			error: "Не удалось получить этикетки из S3",
			details: error.message,
		});
	}
}

/**
 * Загрузка этикеток в S3 хранилище с прогрессом
 * POST /api/assembly/upload-labels
 * Body: { shipmentDate: "02.03.2026", shipmentNumber: "OZON-21614063", postingNumbers: ["12345-0001-1", "12345-0002-1"] }
 *
 * Использует Server-Sent Events (SSE) для отправки прогресса в реальном времени
 */
export async function handleUploadLabelsToS3(request, response) {
	try {
		const { shipmentDate, shipmentNumber, postingNumbers } = request.body;

		if (!shipmentDate || typeof shipmentDate !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentDate (дата поставки)",
			});
		}

		if (!shipmentNumber || typeof shipmentNumber !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentNumber (QR-код поставки)",
			});
		}

		if (!Array.isArray(postingNumbers) || postingNumbers.length === 0) {
			return response.status(400).json({
				error: "Необходимо передать массив postingNumbers",
			});
		}

		// Настраиваем SSE
		response.setHeader("Content-Type", "text/event-stream");
		response.setHeader("Cache-Control", "no-cache");
		response.setHeader("Connection", "keep-alive");

		// Создаем папку в S3 (опционально, папка создастся автоматически при загрузке файлов)
		try {
			await createFolderInS3(shipmentDate, shipmentNumber);
			response.write(`data: ${JSON.stringify({ type: "folder_created", shipmentDate, shipmentNumber })}\n\n`);
		} catch (error) {
			console.error("Предупреждение при создании папки:", error);
			// Продолжаем выполнение, так как папка создастся автоматически
		}

		const results = [];
		const total = postingNumbers.length;

		// Загружаем этикетки по одной
		for (let i = 0; i < postingNumbers.length; i++) {
			const postingNumber = postingNumbers[i];

			try {
				// Получаем этикетку от Ozon API
				const labelResult = await fetchPackageLabel([postingNumber]);

				if (labelResult.type !== "pdf") {
					throw new Error("Получен не PDF файл");
				}

				// Загружаем в S3
				const labelUrl = await uploadLabelToS3(shipmentDate, shipmentNumber, postingNumber, labelResult.data);

				results.push({
					postingNumber,
					success: true,
					labelUrl,
				});

				// Отправляем прогресс
				response.write(`data: ${JSON.stringify({
					type: "progress",
					postingNumber,
					current: i + 1,
					total,
					labelUrl,
					success: true,
				})}\n\n`);

			} catch (error) {
				console.error(`Ошибка при загрузке этикетки ${postingNumber}:`, error);

				results.push({
					postingNumber,
					success: false,
					error: error.message,
				});

				// Отправляем прогресс с ошибкой
				response.write(`data: ${JSON.stringify({
					type: "progress",
					postingNumber,
					current: i + 1,
					total,
					success: false,
					error: error.message,
				})}\n\n`);
			}
		}

		// Отправляем финальный результат
		response.write(`data: ${JSON.stringify({
			type: "complete",
			results,
		})}\n\n`);

		response.end();

	} catch (error) {
		console.error("Ошибка при загрузке этикеток в S3:", error.message);

		// Если SSE еще не начался, отправляем JSON ошибку
		if (!response.headersSent) {
			response.status(500).json({
				error: "Не удалось загрузить этикетки в S3",
				details: error.message,
			});
		} else {
			// Если SSE уже начался, отправляем ошибку через SSE
			response.write(`data: ${JSON.stringify({
				type: "error",
				message: error.message,
			})}\n\n`);
			response.end();
		}
	}
}

/**
 * Создание папки в S3 для новой поставки
 * POST /api/assembly/create-folder
 * Body: { shipmentDate: "02.03.2026", shipmentNumber: "OZON-21614063" }
 */
export async function handleCreateFolderInS3(request, response) {
	try {
		const { shipmentDate, shipmentNumber } = request.body;

		if (!shipmentDate || typeof shipmentDate !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentDate (дата поставки)",
			});
		}

		if (!shipmentNumber || typeof shipmentNumber !== "string") {
			return response.status(400).json({
				error: "Необходимо передать shipmentNumber (QR-код поставки)",
			});
		}

		await createFolderInS3(shipmentDate, shipmentNumber);

		response.json({
			success: true,
			message: `Папка для поставки ${shipmentNumber} (${shipmentDate}) готова в S3 (будет создана автоматически при загрузке файлов)`,
		});
	} catch (error) {
		console.error("Предупреждение при создании папки в S3:", error.message);
		// Все равно возвращаем успех, так как папка создастся автоматически
		response.json({
			success: true,
			message: `Папка ${shipmentDate} будет создана автоматически при загрузке файлов`,
		});
	}
}

/**
 * Тестирование подключения к S3
 * GET /api/assembly/test-s3
 */
export async function handleTestS3Connection(_request, response) {
	try {
		const result = await testS3Connection();
		response.json(result);
	} catch (error) {
		console.error("Ошибка при тестировании S3:", error);
		response.status(500).json({
			success: false,
			error: error.message,
		});
	}
}

/**
 * Верификация баркода товара через МойСклад
 * POST /api/assembly/verify-barcode
 * Body: { barcode: "2000588600313", article: "GRA-08020" }
 */
export async function handleVerifyBarcode(request, response) {
	try {
		const { barcode, article } = request.body;

		if (!barcode || !article) {
			return response.status(400).json({
				valid: false,
				error: "Необходимо передать barcode и article",
			});
		}

		const result = await verifyBarcodeForArticle(barcode, article);
		response.json(result);
	} catch (error) {
		console.error("Ошибка верификации баркода:", error.message);
		response.status(500).json({
			valid: false,
			error: "Ошибка проверки баркода: " + error.message,
		});
	}
}

/**
 * Поиск товара по баркоду среди списка артикулов через МойСклад
 * POST /api/assembly/find-product-by-barcode
 * Body: { barcode: "2000588600313", articles: ["GRA-00693", "GRA-08040"] }
 */
export async function handleFindProductByBarcode(request, response) {
	try {
		const { barcode, articles } = request.body;

		if (!barcode || !Array.isArray(articles) || articles.length === 0) {
			return response.status(400).json({
				found: false,
				error: "Необходимо передать barcode и articles (массив артикулов)",
			});
		}

		const matchedArticle = await findArticleByBarcode(barcode, articles);

		response.json({
			found: !!matchedArticle,
			article: matchedArticle,
		});
	} catch (error) {
		console.error("Ошибка поиска товара по баркоду:", error.message);
		response.status(500).json({
			found: false,
			error: "Ошибка поиска товара: " + error.message,
		});
	}
}

/**
 * Получение presigned URL этикетки из S3
 * POST /api/assembly/label-url
 * Body: { shipmentDate: "2026-02-14T19:00:00Z", shipmentNumber: "OZON-21614063", postingNumber: "0130847794-1410-1" }
 */
export async function handleGetLabelUrl(request, response) {
	try {
		const { shipmentDate, shipmentNumber, postingNumber } = request.body;

		if (!shipmentDate || !shipmentNumber || !postingNumber) {
			return response.status(400).json({
				error: "Необходимо передать shipmentDate, shipmentNumber и postingNumber",
			});
		}

		const labelUrl = await getLabelUrl(shipmentDate, shipmentNumber, postingNumber);
		response.json({ labelUrl });
	} catch (error) {
		console.error("Ошибка получения URL этикетки:", error.message);
		response.status(500).json({
			error: "Не удалось получить URL этикетки: " + error.message,
		});
	}
}

/**
 * Верификация баркода этикетки через МойСклад
 * POST /api/assembly/verify-label-barcode
 * Body: { barcode: "...", articles: ["GRA-00693", "GRA-08040"] }
 */
export async function handleVerifyLabelBarcode(request, response) {
	try {
		const { barcode, articles, postingNumber } = request.body;

		if (!barcode || !Array.isArray(articles) || articles.length === 0) {
			return response.status(400).json({
				valid: false,
				error: "Необходимо передать barcode и articles (массив артикулов)",
			});
		}

		const result = await verifyLabelBarcode(barcode, articles, postingNumber);
		response.json(result);
	} catch (error) {
		console.error("Ошибка верификации этикетки:", error.message);
		response.status(500).json({
			valid: false,
			error: "Ошибка проверки этикетки: " + error.message,
		});
	}
}
