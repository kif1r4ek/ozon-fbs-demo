import dotenv from "dotenv";

dotenv.config();

export const ozonClientId = process.env.OZON_CLIENT_ID;
export const ozonApiKey = process.env.OZON_API_KEY;
export const serverPort = process.env.PORT || 5000;
export const ozonApiBaseUrl = "https://api-seller.ozon.ru";
export const useMockData = process.env.USE_MOCK_DATA === "true";
export const moySkladToken = process.env.MOYSKLAD_TOKEN;
export const moySkladBaseUrl = process.env.MOYSKLAD_BASE_URL || "https://api.moysklad.ru/api/remap/1.2";

// JWT & Auth
export const jwtSecret = process.env.JWT_SECRET;
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "30d";
export const cookieSecure = process.env.COOKIE_SECURE === "1";
