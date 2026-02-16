import { ozonApiBaseUrl, ozonClientId, ozonApiKey, useMockData } from "../config/environment.js";
import { mockPostingsResponse, mockProductsResponse, mockAwaitingPackagingResponse, mockAwaitingDeliverResponse } from "./mockAssemblyData.js";


async function sendPostRequest(endpointPath, requestBody) {
	const fullUrl = `${ozonApiBaseUrl}${endpointPath}`;

	const response = await fetch(fullUrl, {
		method: "POST",
		headers: {
			"Client-Id": ozonClientId,
			"Api-Key": ozonApiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`OZON API ответил ошибкой ${response.status}: ${errorText}`
		);
	}

	return response.json();
}


async function sendPostRequestRaw(endpointPath, requestBody) {
	const fullUrl = `${ozonApiBaseUrl}${endpointPath}`;

	const response = await fetch(fullUrl, {
		method: "POST",
		headers: {
			"Client-Id": ozonClientId,
			"Api-Key": ozonApiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`OZON API ответил ошибкой ${response.status}: ${errorText}`
		);
	}

	return response;
}


function buildAssemblyCutoffFilter() {
	const cutoffTo = new Date();
	cutoffTo.setHours(23, 59, 59, 0);

	const cutoffFrom = new Date(cutoffTo);
	cutoffFrom.setDate(cutoffFrom.getDate() - 7);
	cutoffFrom.setHours(0, 0, 0, 0);

	return {
		cutoff_from: cutoffFrom.toISOString(),
		cutoff_to: cutoffTo.toISOString(),
	};
}


export async function fetchAssemblyPostingsList(cursor = "", limit = 50) {
	if (useMockData) {
		console.log("[MOCK] Возвращаю тестовые данные postings");
		return mockPostingsResponse;
	}

	const requestBody = {
		filter: buildAssemblyCutoffFilter(),
		limit,
		sort_dir: "ASC",
	};
	if (cursor) {
		requestBody.cursor = cursor;
	}

	return sendPostRequest("/v1/assembly/fbs/posting/list", requestBody);
}


export async function fetchAssemblyProductsList(cursor = "", limit = 50) {
	if (useMockData) {
		console.log("[MOCK] Возвращаю тестовые данные products");
		return mockProductsResponse;
	}

	const requestBody = {
		filter: buildAssemblyCutoffFilter(),
		limit,
		sort_dir: "ASC",
	};
	if (cursor) {
		requestBody.cursor = cursor;
	}

	return sendPostRequest("/v1/assembly/fbs/product/list", requestBody);
}


function buildFbsDateFilter() {
	const to = new Date();
	to.setHours(23, 59, 59, 0);

	const since = new Date(to);
	since.setDate(since.getDate() - 7);
	since.setHours(0, 0, 0, 0);

	return {
		since: since.toISOString(),
		to: to.toISOString(),
	};
}


export async function fetchFbsPostingsByStatus(status, offset = 0, limit = 1000) {
	if (useMockData) {
		console.log(`[MOCK] Возвращаю тестовые данные FBS postings (status: ${status})`);
		if (status === "awaiting_packaging") {
			return mockAwaitingPackagingResponse;
		}
		if (status === "awaiting_deliver") {
			return mockAwaitingDeliverResponse;
		}
		// Возвращаем пустой результат для других статусов
		return { result: { postings: [], has_next: false } };
	}

	const dateFilter = buildFbsDateFilter();

	const requestBody = {
		dir: "ASC",
		filter: {
			...dateFilter,
			status,
		},
		limit,
		offset,
		with: {
			barcodes: true,
		},
	};

	return sendPostRequest("/v3/posting/fbs/list", requestBody);
}


export async function fetchPackageLabel(postingNumbers) {
	const requestBody = {
		posting_number: postingNumbers,
	};

	const response = await sendPostRequestRaw(
		"/v2/posting/fbs/package-label",
		requestBody
	);

	const contentType = response.headers.get("content-type") || "";

	if (contentType.includes("application/json")) {
		const json = await response.json();
		return { type: "json", data: json };
	}

	const arrayBuffer = await response.arrayBuffer();
	return { type: "pdf", data: Buffer.from(arrayBuffer) };
}
