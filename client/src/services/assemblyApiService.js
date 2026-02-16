const API_BASE_URL = "/api/assembly";

export async function fetchAssemblyPostings() {
	const response = await fetch(`${API_BASE_URL}/postings`);
	if (!response.ok) {
		throw new Error(`Ошибка загрузки заданий: ${response.status}`);
	}
	const data = await response.json();
	return data.postings;
}

export async function fetchAssemblyProducts() {
	const response = await fetch(`${API_BASE_URL}/products`);
	if (!response.ok) {
		throw new Error(`Ошибка загрузки товаров: ${response.status}`);
	}
	const data = await response.json();
	return data;
}

export async function fetchAwaitingDeliverPostings() {
	const response = await fetch(`${API_BASE_URL}/awaiting-deliver`);
	if (!response.ok) {
		throw new Error(`Ошибка загрузки отправлений: ${response.status}`);
	}
	const data = await response.json();
	return data.postings;
}

export async function downloadDeliverSheet() {
	const response = await fetch(`${API_BASE_URL}/export/deliver-sheet`);
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(
			errorData?.details || `Ошибка скачивания листа отгрузки: ${response.status}`
		);
	}
	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "deliver-sheet.xlsx";
	link.click();
	URL.revokeObjectURL(url);
}

/**
 * Получение presigned URL одной этикетки из S3
 * @param {string} shipmentDate - Дата поставки
 * @param {string} shipmentNumber - QR-код поставки
 * @param {string} postingNumber - Номер отправления
 * @returns {Promise<string>} - Presigned URL этикетки
 */
export async function fetchLabelUrl(shipmentDate, shipmentNumber, postingNumber) {
	const response = await fetch(`${API_BASE_URL}/label-url`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ shipmentDate, shipmentNumber, postingNumber }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(
			errorData?.error || `Ошибка получения этикетки: ${response.status}`
		);
	}
	const data = await response.json();
	return data.labelUrl;
}

/**
 * Получение URLs этикеток из S3 хранилища
 * @param {string} shipmentDate - Дата поставки в формате DD.MM.YYYY
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @param {string[]} postingNumbers - Массив номеров отправлений
 * @returns {Promise<Array>} - Массив объектов с postingNumber и labelUrl
 */
export async function fetchLabelsFromS3(shipmentDate, shipmentNumber, postingNumbers) {
	const response = await fetch(`${API_BASE_URL}/labels`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ shipmentDate, shipmentNumber, postingNumbers }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(
			errorData?.details || `Ошибка получения этикеток: ${response.status}`
		);
	}
	const data = await response.json();
	return data.labels;
}

/**
 * Создание папки в S3 для новой поставки
 * @param {string} shipmentDate - Дата поставки в формате DD.MM.YYYY
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @returns {Promise<Object>} - Результат создания папки
 */
export async function createFolderInS3(shipmentDate, shipmentNumber) {
	const response = await fetch(`${API_BASE_URL}/create-folder`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ shipmentDate, shipmentNumber }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(
			errorData?.details || `Ошибка создания папки: ${response.status}`
		);
	}
	const data = await response.json();
	return data;
}

/**
 * Загрузка этикеток в S3 с прогрессом (Server-Sent Events)
 * @param {string} shipmentDate - Дата поставки в формате DD.MM.YYYY
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @param {string[]} postingNumbers - Массив номеров отправлений
 * @param {Function} onProgress - Callback для обновления прогресса
 * @returns {Promise<Array>} - Массив результатов загрузки
 */
/**
 * Получение баркода этикетки для отправления (из БД или OZON API)
 * @param {string} postingNumber - Номер отправления
 * @returns {Promise<string>} - Баркод этикетки
 */
export async function fetchLabelBarcode(postingNumber) {
	const response = await fetch(`${API_BASE_URL}/label-barcode`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ postingNumber }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(
			errorData?.error || `Ошибка получения баркода: ${response.status}`
		);
	}
	const data = await response.json();
	return data.barcode;
}

/**
 * Пометить заказ как собранный (после сканирования всех товаров + этикетки)
 * @param {string} postingNumber - Номер отправления
 * @returns {Promise<{success: boolean}>}
 */
export async function markPostingAssembled(postingNumber) {
	const response = await fetch(`${API_BASE_URL}/mark-assembled`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ postingNumber }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(errorData?.error || `Ошибка отметки сборки: ${response.status}`);
	}
	return response.json();
}

/**
 * Пакетная отгрузка группы заказов в Ozon
 * @param {string[]} postingNumbers - Массив номеров отправлений
 * @returns {Promise<{shipped: string[], failed: Array}>}
 */
export async function shipGroup(postingNumbers) {
	const response = await fetch(`${API_BASE_URL}/ship-group`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ postingNumbers }),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(errorData?.error || `Ошибка отгрузки: ${response.status}`);
	}
	return response.json();
}

/**
 * Получить список собранных заказов для даты отгрузки
 * @param {string} shipmentDate - Дата отгрузки (ISO string)
 * @returns {Promise<{postingNumbers: string[], count: number}>}
 */
export async function fetchAssembledPostings(shipmentDate) {
	const response = await fetch(`${API_BASE_URL}/assembled?shipmentDate=${encodeURIComponent(shipmentDate)}`);
	if (!response.ok) {
		const errorData = await response.json().catch(() => null);
		throw new Error(errorData?.error || `Ошибка: ${response.status}`);
	}
	return response.json();
}

export async function uploadLabelsToS3(shipmentDate, shipmentNumber, postingNumbers, onProgress) {
	return new Promise((resolve, reject) => {
		fetch(`${API_BASE_URL}/upload-labels`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ shipmentDate, shipmentNumber, postingNumbers }),
		}).then(async (response) => {
			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				reject(new Error(errorData?.details || `Ошибка загрузки: ${response.status}`));
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			const results = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n\n");
				buffer = lines.pop(); // Сохраняем неполную строку

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));

							if (data.type === "progress") {
								results.push({
									postingNumber: data.postingNumber,
									success: data.success,
									labelUrl: data.labelUrl,
									error: data.error,
								});
								onProgress(data);
							} else if (data.type === "complete") {
								resolve(data.results);
								return;
							} else if (data.type === "error") {
								reject(new Error(data.message));
								return;
							}
						} catch (e) {
							console.error("Ошибка парсинга SSE:", e);
						}
					}
				}
			}

			resolve(results);
		}).catch(reject);
	});
}
