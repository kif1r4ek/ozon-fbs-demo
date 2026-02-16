import { S3Client, GetObjectCommand, PutObjectCommand, ListBucketsCommand, HeadBucketCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Пробуем разные конфигурации для TWC Storage
const s3Config = {
	region: process.env.S3_REGION || "ru-1",
	endpoint: process.env.S3_ENDPOINT || "https://swift.twcstorage.ru",
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true, // Необходимо для S3-совместимых хранилищ
	// Пробуем добавить дополнительные параметры
	s3ForcePathStyle: true,
	signatureVersion: 'v4',
};

console.log('S3 Config:', {
	endpoint: s3Config.endpoint,
	region: s3Config.region,
	accessKeyId: s3Config.credentials.accessKeyId?.substring(0, 8) + '...',
});

const s3Client = new S3Client(s3Config);

export { s3Client };

/**
 * Нормализует дату в формат "день-месяц-год" для имени папки
 * Принимает: "DD.MM.YYYY", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ssZ"
 * Возвращает: "день-месяц-год" (например, "09-02-2026")
 * @param {string} dateString - Дата в любом формате
 * @returns {string} - Дата в формате "день-месяц-год"
 */
function normalizeDateToFolderName(dateString) {
	let date;

	// Пытаемся распарсить дату
	if (dateString.includes("T")) {
		// ISO формат: "2026-02-09T10:00:00Z"
		date = new Date(dateString);
	} else if (dateString.includes(".")) {
		// Формат DD.MM.YYYY: "09.02.2026"
		const [day, month, year] = dateString.split(".");
		date = new Date(year, month - 1, day);
	} else if (dateString.includes("-") && dateString.split("-")[0].length === 4) {
		// Формат YYYY-MM-DD: "2026-02-09"
		date = new Date(dateString);
	} else {
		// Неизвестный формат, возвращаем как есть
		return dateString;
	}

	// Форматируем в "день-месяц-год"
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();

	return `${day}-${month}-${year}`;
}

/**
 * Генерирует presigned URL для доступа к файлу в S3
 * @param {string} shipmentDate - Дата поставки (DD.MM.YYYY)
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @param {string} postingNumber - Номер отправления (название файла без расширения)
 * @returns {Promise<string>} - Presigned URL
 */
export async function getLabelUrl(shipmentDate, shipmentNumber, postingNumber) {
	const bucket = process.env.S3_BUCKET_NAME || "postav-oz";
	const folderName = normalizeDateToFolderName(shipmentDate);
	// Структура: "Отгрузка от DD-MM-YYYY/OZON-XXXXXXXX/posting.pdf"
	const key = `Отгрузка от ${folderName}/${shipmentNumber}/${postingNumber}.pdf`;

	try {
		// Проверяем, что файл существует в S3
		await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

		// Генерируем URL с временем жизни 1 час
		const command = new GetObjectCommand({ Bucket: bucket, Key: key });
		const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
		return url;
	} catch (error) {
		console.error(`Ошибка при получении этикетки (key: ${key}):`, error.code || error.name);
		if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
			throw new Error(`Этикетка не найдена в S3. Ключ: ${key}`);
		}
		throw new Error(`Не удалось получить URL этикетки: ${error.message}`);
	}
}

/**
 * Генерирует presigned URLs для массива отправлений
 * @param {string} shipmentDate - Дата поставки (DD.MM.YYYY)
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @param {string[]} postingNumbers - Массив номеров отправлений
 * @returns {Promise<Object[]>} - Массив объектов с postingNumber и labelUrl
 */
export async function getLabelUrls(shipmentDate, shipmentNumber, postingNumbers) {
	const promises = postingNumbers.map(async (postingNumber) => {
		try {
			const labelUrl = await getLabelUrl(shipmentDate, shipmentNumber, postingNumber);
			return { postingNumber, labelUrl, success: true };
		} catch (error) {
			console.error(`Ошибка для ${postingNumber}:`, error);
			return { postingNumber, labelUrl: null, success: false, error: error.message };
		}
	});

	return Promise.all(promises);
}

/**
 * Создает папку в S3 (папка создастся автоматически при загрузке первого файла)
 * @param {string} shipmentDate - Дата поставки (DD.MM.YYYY)
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @returns {Promise<void>}
 */
export async function createFolderInS3(shipmentDate, shipmentNumber) {
	const folderName = normalizeDateToFolderName(shipmentDate);
	const fullPath = `Отгрузка от ${folderName}/${shipmentNumber}`;
	console.log(`Папка "${fullPath}" будет создана автоматически при загрузке файлов`);
	// TWC Storage не поддерживает создание пустых папок
	// Папка создастся автоматически при загрузке первого файла
	return Promise.resolve();
}

/**
 * Загружает PDF файл этикетки в S3
 * @param {string} shipmentDate - Дата поставки (DD.MM.YYYY)
 * @param {string} shipmentNumber - QR-код поставки (например: OZON-21614063)
 * @param {string} postingNumber - Номер отправления (название файла без расширения)
 * @param {Buffer} pdfBuffer - Buffer с содержимым PDF файла
 * @returns {Promise<string>} - URL загруженного файла
 */
export async function uploadLabelToS3(shipmentDate, shipmentNumber, postingNumber, pdfBuffer) {
	const bucket = process.env.S3_BUCKET_NAME || "postav-oz";
	const folderName = normalizeDateToFolderName(shipmentDate);
	// Структура: "Отгрузка от DD-MM-YYYY/OZON-XXXXXXXX/posting.pdf"
	const key = `Отгрузка от ${folderName}/${shipmentNumber}/${postingNumber}.pdf`;

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: pdfBuffer,
		ContentType: "application/pdf",
		ContentLength: pdfBuffer.length,
	});

	try {
		await s3Client.send(command);
		console.log(`Этикетка ${postingNumber} загружена в S3 (${key})`);

		// Генерируем presigned URL для доступа к файлу
		const url = await getLabelUrl(shipmentDate, shipmentNumber, postingNumber);
		return url;
	} catch (error) {
		console.error(`Ошибка при загрузке этикетки ${postingNumber}:`, error);
		console.error(`HTTP Status: ${error.$metadata?.httpStatusCode}`);
		console.error(`Request ID: ${error.$metadata?.requestId}`);
		console.error(`Bucket: ${bucket}, Key: ${key}`);
		console.error(`Endpoint: ${process.env.S3_ENDPOINT}`);
		throw new Error(`Не удалось загрузить этикетку в S3: ${error.message}`);
	}
}

/**
 * Тестирует подключение к S3 и проверяет доступность бакета
 * @returns {Promise<Object>} - Результат теста
 */
export async function testS3Connection() {
	const bucket = process.env.S3_BUCKET_NAME || "postav-oz";
	const results = {
		endpoint: process.env.S3_ENDPOINT,
		region: process.env.S3_REGION,
		bucket,
		accessKeyId: process.env.S3_ACCESS_KEY_ID?.substring(0, 8) + "...",
		tests: [],
	};

	// Тест 0: Прямой HTTP запрос для отладки
	try {
		const response = await fetch(process.env.S3_ENDPOINT + "/");
		const responseText = await response.text();
		results.tests.push({
			name: "DirectHTTPRequest",
			success: response.ok,
			httpStatus: response.status,
			statusText: response.statusText,
			responsePreview: responseText.substring(0, 500),
			headers: Object.fromEntries(response.headers.entries()),
		});
	} catch (error) {
		results.tests.push({
			name: "DirectHTTPRequest",
			success: false,
			error: error.message,
		});
	}

	// Тест 1: ListBuckets через AWS SDK
	try {
		const listCommand = new ListBucketsCommand({});
		const listResponse = await s3Client.send(listCommand);
		const buckets = listResponse.Buckets || [];
		results.tests.push({
			name: "ListBuckets",
			success: true,
			bucketsFound: buckets.length,
			bucketsList: buckets.map(b => b.Name),
		});

		// Проверяем, есть ли наш бакет в списке
		const targetBucket = buckets.find(b => b.Name === bucket);
		if (targetBucket) {
			results.bucketExists = true;
			results.success = true;
			results.message = `Бакет "${bucket}" найден и доступен`;
		} else {
			results.bucketExists = false;
			results.success = false;
			results.message = `Бакет "${bucket}" не найден. Доступные бакеты: ${buckets.map(b => b.Name).join(", ") || "нет"}`;
		}
	} catch (error) {
		results.tests.push({
			name: "ListBuckets",
			success: false,
			error: error.message,
			httpStatus: error.$metadata?.httpStatusCode,
			requestId: error.$metadata?.requestId,
		});
		results.success = false;
		results.error = error.message;
		results.httpStatus = error.$metadata?.httpStatusCode;
		results.message = `Ошибка при получении списка бакетов: ${error.message}`;
	}

	return results;
}
