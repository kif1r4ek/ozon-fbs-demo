import { moySkladBaseUrl, moySkladToken } from "../config/environment.js";

async function msRequest(endpoint) {
	const response = await fetch(`${moySkladBaseUrl}${endpoint}`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${moySkladToken}`,
			Accept: "application/json;charset=utf-8",
			"Accept-Encoding": "gzip",
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`МойСклад API ${response.status}: ${text.slice(0, 400)}`);
	}

	return response.json();
}

function extractBarcodes(product) {
	const out = [];
	const list = Array.isArray(product?.barcodes) ? product.barcodes : [];

	for (const entry of list) {
		if (entry === null || entry === undefined) continue;

		if (typeof entry === "string" || typeof entry === "number") {
			const value = String(entry).trim();
			if (value && !out.includes(value)) out.push(value);
			continue;
		}

		if (typeof entry === "object") {
			for (const value of Object.values(entry)) {
				if (value === null || value === undefined) continue;
				const str = String(value).trim();
				if (str && !out.includes(str)) out.push(str);
			}
		}
	}

	return out;
}

function normalizeBarcode(barcode) {
	if (!barcode) return "";
	return String(barcode).trim().replace(/[\s\r\n]+/g, "");
}

export async function getBarcodesByArticle(article) {
	const data = await msRequest(
		`/entity/product?filter=article=${encodeURIComponent(article)}`
	);
	const rows = Array.isArray(data?.rows) ? data.rows : [];
	const product = rows[0] || null;

	if (!product) {
		return [];
	}

	return extractBarcodes(product);
}

export async function verifyBarcodeForArticle(scannedBarcode, article) {
	if (!scannedBarcode || !article) {
		return { valid: false, error: "Неверные данные" };
	}

	const barcodes = await getBarcodesByArticle(article);
	const normalizedScanned = normalizeBarcode(scannedBarcode);
	const normalizedBarcodes = barcodes.map(normalizeBarcode);

	const matched = normalizedBarcodes.includes(normalizedScanned);

	return {
		valid: matched,
		error: matched ? null : "Баркод не совпадает с товаром в МойСклад",
		barcodes,
	};
}

/**
 * Получает ВСЕ поля товара из МойСклад для верификации этикетки.
 * Возвращает массив всех значений: баркоды + дополнительные поля (ШКАНИЗ, ШКВЕРХ и др.)
 */
async function getProductAllVerificationValues(article) {
	const data = await msRequest(
		`/entity/product?filter=article=${encodeURIComponent(article)}`
	);
	const rows = Array.isArray(data?.rows) ? data.rows : [];
	const product = rows[0] || null;

	if (!product) {
		return [];
	}

	const values = [];

	// 1. Все баркоды
	const barcodes = extractBarcodes(product);
	values.push(...barcodes);

	// 2. Дополнительные поля (attributes) — ШКНИЗ, ШКВЕРХ и другие
	const attributes = Array.isArray(product.attributes) ? product.attributes : [];
	for (const attr of attributes) {
		if (attr.value !== null && attr.value !== undefined) {
			const val = String(attr.value).trim();
			if (val && !values.includes(val)) {
				values.push(val);
			}
		}
	}

	// 3. Артикул товара
	if (product.article) {
		const art = String(product.article).trim();
		if (art && !values.includes(art)) {
			values.push(art);
		}
	}

	// 4. Код товара
	if (product.code) {
		const code = String(product.code).trim();
		if (code && !values.includes(code)) {
			values.push(code);
		}
	}

	return values;
}

/**
 * Верифицирует баркод этикетки через МойСклад.
 * Проверяет отсканированный баркод против ВСЕХ полей (баркоды, ШКНИЗ, ШКВЕРХ, и др.)
 * для ВСЕХ товаров в заказе.
 * Дополнительно проверяет postingNumber (номер заказа на этикетке).
 */
export async function verifyLabelBarcode(scannedBarcode, articles, postingNumber) {
	if (!scannedBarcode || !articles || articles.length === 0) {
		return { valid: false, error: "Нет данных для проверки" };
	}

	const normalizedScanned = normalizeBarcode(scannedBarcode);
	console.log(`[LabelVerify] Проверяем баркод: "${scannedBarcode}" (нормализован: "${normalizedScanned}")`);

	// Проверяем postingNumber (номер заказа, напечатанный на этикетке)
	if (postingNumber && normalizeBarcode(postingNumber) === normalizedScanned) {
		console.log(`[LabelVerify] Совпадение по postingNumber: ${postingNumber}`);
		return { valid: true, matchedField: "postingNumber" };
	}

	const results = await Promise.all(
		articles.map(async (article) => {
			try {
				const allValues = await getProductAllVerificationValues(article);
				console.log(`[LabelVerify] Артикул ${article}: найдено ${allValues.length} значений:`, allValues);
				const normalizedValues = allValues.map(normalizeBarcode);
				if (normalizedValues.includes(normalizedScanned)) {
					return { matched: true, article };
				}
			} catch (err) {
				console.error(`[LabelVerify] Ошибка для артикула ${article}:`, err.message);
			}
			return { matched: false };
		})
	);

	const match = results.find((r) => r.matched);
	if (match) {
		console.log(`[LabelVerify] Совпадение по МойСклад, артикул: ${match.article}`);
		return {
			valid: true,
			matchedArticle: match.article,
		};
	}

	console.log(`[LabelVerify] Баркод "${scannedBarcode}" не найден среди артикулов:`, articles);
	return {
		valid: false,
		error: "Баркод этикетки не совпадает ни с одним полем товаров в МойСклад",
	};
}

/**
 * Ищет товар по баркоду среди списка артикулов.
 * Возвращает артикул, которому принадлежит баркод, или null.
 */
export async function findArticleByBarcode(scannedBarcode, articles) {
	if (!scannedBarcode || !articles || articles.length === 0) {
		return null;
	}

	const normalizedScanned = normalizeBarcode(scannedBarcode);

	// Проверяем каждый артикул параллельно
	const results = await Promise.all(
		articles.map(async (article) => {
			try {
				const barcodes = await getBarcodesByArticle(article);
				const normalizedBarcodes = barcodes.map(normalizeBarcode);
				if (normalizedBarcodes.includes(normalizedScanned)) {
					return article;
				}
			} catch {
				// Пропускаем ошибки отдельных артикулов
			}
			return null;
		})
	);

	return results.find((r) => r !== null) || null;
}
