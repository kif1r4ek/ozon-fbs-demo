/**
 * Сервис для верификации баркодов через серверный прокси к МойСклад API
 */

const API_BASE_URL = "http://localhost:5000/api/assembly";

/**
 * Нормализует баркод (удаляет пробелы, приводит к единому формату)
 */
function normalizeBarcode(barcode) {
  if (!barcode) return '';
  return String(barcode).trim().replace(/\s+/g, '');
}

/**
 * Проверяет соответствие отсканированного баркода баркодам товара через МойСклад (серверный прокси)
 */
export async function verifyBarcodeForArticle(scannedBarcode, article) {
  if (!scannedBarcode || !article) {
    return { valid: false, error: 'Неверные данные' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/verify-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: scannedBarcode, article }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        valid: false,
        error: errorData?.error || `Ошибка сервера: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      valid: false,
      error: 'Ошибка проверки баркода: ' + error.message,
    };
  }
}

/**
 * Ищет товар по баркоду среди списка артикулов через МойСклад (серверный прокси)
 * Возвращает { found: boolean, article: string|null }
 */
export async function findProductByBarcode(scannedBarcode, articles) {
  if (!scannedBarcode || !articles || articles.length === 0) {
    return { found: false, article: null };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/find-product-by-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: scannedBarcode, articles }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        found: false,
        article: null,
        error: errorData?.error || `Ошибка сервера: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      found: false,
      article: null,
      error: 'Ошибка поиска товара: ' + error.message,
    };
  }
}

/**
 * Проверяет баркод этикетки заказа через МойСклад (серверный прокси)
 * Сверяет со всеми полями: баркоды, ШКНИЗ, ШКВЕРХ, дополнительные поля + postingNumber
 */
export async function verifyLabelBarcode(scannedBarcode, articles, postingNumber) {
  if (!scannedBarcode || !articles || articles.length === 0) {
    return { valid: false, error: 'Нет данных для проверки' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/verify-label-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: scannedBarcode, articles, postingNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        valid: false,
        error: errorData?.error || `Ошибка сервера: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      valid: false,
      error: 'Ошибка проверки этикетки: ' + error.message,
    };
  }
}
