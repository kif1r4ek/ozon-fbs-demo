/**
 * Утилиты для работы с баркодами товаров
 */

// Маппинг артикулов на баркоды (для демонстрации)
// В реальном приложении эти данные должны приходить с сервера
const BARCODE_MAP = {
  // Товары из test_my_sklad
  'GRA-08020': '2043855094983',
  'NFS-01395': '2043987235650',
  'CGN-00934': '2043987911875',
  'GRA-08080': '2043017893973',
  'GRA-07813': '2042392959496',
  'GRA-00302GRA-00302': '2043687481623',
  'GRA-09100': '2038515111568',
  'GRA-04510': '2039961382502',
  'GRA-04400': '2039497995337',
  'GRA-07770': '2041472293901',
  'GRA-08240': '2043205194158',
  'GRA-00350': '2039772529813',
  'GRA-09802': '2042441167445',
  'GRA-08902': '2039543680071',
};

/**
 * Генерирует баркод на основе артикула
 * Если артикул есть в маппинге, возвращает реальный баркод
 * Иначе генерирует случайный баркод формата 20XXXXXXXXXXX
 * @param {string} offerId - Артикул товара
 * @returns {string} - Баркод товара
 */
export function generateBarcode(offerId) {
  // Если есть в маппинге, возвращаем реальный баркод
  if (BARCODE_MAP[offerId]) {
    return BARCODE_MAP[offerId];
  }

  // Иначе генерируем псевдо-случайный баркод на основе артикула
  // Используем простое хэширование для консистентности
  let hash = 0;
  for (let i = 0; i < offerId.length; i++) {
    const char = offerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Генерируем 13-значный баркод
  const absHash = Math.abs(hash);
  const barcode = '20' + String(absHash).padStart(11, '0').slice(0, 11);

  return barcode;
}

/**
 * Добавляет баркоды ко всем товарам в постинге
 * @param {object} posting - Объект постинга
 * @returns {object} - Постинг с добавленными баркодами
 */
export function enrichPostingWithBarcodes(posting) {
  if (!posting || !posting.products) {
    return posting;
  }

  return {
    ...posting,
    products: posting.products.map((product) => ({
      ...product,
      barcode: product.barcode || generateBarcode(product.offerId),
    })),
  };
}

/**
 * Добавляет баркоды ко всем товарам во всех постингах группы
 * @param {object} group - Группа постингов
 * @returns {object} - Группа с обогащенными баркодами
 */
export function enrichGroupWithBarcodes(group) {
  if (!group || !group.postings) {
    return group;
  }

  return {
    ...group,
    postings: group.postings.map(enrichPostingWithBarcodes),
  };
}

/**
 * Проверяет валидность баркода (простая проверка формата)
 * @param {string} barcode - Баркод для проверки
 * @returns {boolean} - true если баркод валиден
 */
export function isValidBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  // Проверяем что баркод состоит только из цифр
  // и имеет длину от 8 до 13 символов (стандартные форматы EAN-8, EAN-13)
  const cleaned = barcode.trim();
  return /^\d{8,13}$/.test(cleaned);
}

/**
 * Форматирует баркод для отображения (добавляет пробелы)
 * @param {string} barcode - Баркод
 * @returns {string} - Отформатированный баркод
 */
export function formatBarcode(barcode) {
  if (!barcode) return '';

  // Разбиваем на группы по 4 цифры для читаемости
  return barcode.match(/.{1,4}/g)?.join(' ') || barcode;
}
