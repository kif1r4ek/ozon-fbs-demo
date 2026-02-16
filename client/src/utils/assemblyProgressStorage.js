const STORAGE_KEY = 'ozon-assembly-progress';

/**
 * Получить список обработанных заказов для группы
 * @param {string} shipmentDate - Дата отгрузки группы
 * @returns {Set<string>} Set с postingNumber обработанных заказов
 */
export function getCompletedPostings(shipmentDate) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();

    const data = JSON.parse(stored);
    const postings = data[shipmentDate];
    if (!Array.isArray(postings)) return new Set();

    return new Set(postings);
  } catch (error) {
    console.error('Error reading assembly progress:', error);
    return new Set();
  }
}

/**
 * Пометить заказ как обработанный
 * @param {string} shipmentDate - Дата отгрузки группы
 * @param {string} postingNumber - Номер заказа
 */
export function markPostingCompleted(shipmentDate, postingNumber) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};

    if (!Array.isArray(data[shipmentDate])) {
      data[shipmentDate] = [];
    }

    if (!data[shipmentDate].includes(postingNumber)) {
      data[shipmentDate].push(postingNumber);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving assembly progress:', error);
  }
}

/**
 * Очистить прогресс сборки для группы
 * @param {string} shipmentDate - Дата отгрузки группы
 */
export function clearAssemblyProgress(shipmentDate) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const data = JSON.parse(stored);
    delete data[shipmentDate];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error clearing assembly progress:', error);
  }
}
