const STORAGE_KEY = 'ozon-published-groups';

/**
 * Структура данных в localStorage:
 * {
 *   "2025-02-12T10:00:00.000Z": {
 *     shipmentDate: "2025-02-12T10:00:00.000Z",
 *     publishedAt: "2025-02-12T10:30:00.000Z",  // Время публикации
 *     postings: [...],  // Массив заказов
 *     count: 5,
 *     labelUrls: [...]  // URLs этикеток из S3
 *   }
 * }
 */

/**
 * Получить все опубликованные группы
 * @returns {Array<Object>} Массив опубликованных групп
 */
export function getPublishedGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const groupsMap = JSON.parse(stored);
    const groups = Object.values(groupsMap);

    // Сортируем по дате публикации (новые первыми)
    return groups.sort((a, b) => {
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });
  } catch (error) {
    console.error('Error reading published groups:', error);
    return [];
  }
}

/**
 * Опубликовать группу (сохранить в localStorage)
 * @param {Object} group - Группа для публикации
 * @param {Array<string>} labelUrls - URLs этикеток
 * @returns {boolean} Успешность операции
 */
export function publishGroup(group, labelUrls = []) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const groupsMap = stored ? JSON.parse(stored) : {};

    const publishedGroup = {
      ...group,
      publishedAt: new Date().toISOString(),
      labelUrls: labelUrls
    };

    groupsMap[group.shipmentDate] = publishedGroup;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groupsMap));

    // Отправляем событие для автообновления других компонентов
    window.dispatchEvent(new CustomEvent('published-groups-updated', {
      detail: { shipmentDate: group.shipmentDate }
    }));

    return true;
  } catch (error) {
    console.error('Error publishing group:', error);
    return false;
  }
}

/**
 * Проверить, опубликована ли группа
 * @param {string} shipmentDate - Дата отгрузки группы
 * @returns {boolean}
 */
export function isGroupPublished(shipmentDate) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const groupsMap = JSON.parse(stored);
    return !!groupsMap[shipmentDate];
  } catch (error) {
    console.error('Error checking group publication:', error);
    return false;
  }
}

/**
 * Удалить опубликованную группу
 * @param {string} shipmentDate - Дата отгрузки группы
 * @returns {boolean} Успешность операции
 */
export function unpublishGroup(shipmentDate) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const groupsMap = JSON.parse(stored);
    delete groupsMap[shipmentDate];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(groupsMap));

    window.dispatchEvent(new CustomEvent('published-groups-updated', {
      detail: { shipmentDate }
    }));

    return true;
  } catch (error) {
    console.error('Error unpublishing group:', error);
    return false;
  }
}

/**
 * Очистить все опубликованные группы
 * @returns {boolean} Успешность операции
 */
export function clearPublishedGroups() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('published-groups-updated'));
    return true;
  } catch (error) {
    console.error('Error clearing published groups:', error);
    return false;
  }
}
