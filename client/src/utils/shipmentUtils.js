/**
 * Генерирует уникальный QR-код поставки в формате OZON-XXXXXXXX
 * @returns {string} QR-код поставки (например: OZON-21614063)
 */
export function generateShipmentNumber() {
  // Генерируем случайное 8-значное число
  const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
  return `OZON-${randomNumber}`;
}
