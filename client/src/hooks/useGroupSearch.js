import { useMemo } from "react";

/**
 * Хук для поиска внутри групп отгрузок
 * @param {Array} groups - Массив групп
 * @param {string} searchQuery - Поисковый запрос
 * @returns {Array} - Отфильтрованные группы
 */
export function useGroupSearch(groups, searchQuery) {
  const filteredGroups = useMemo(() => {
    if (!searchQuery || !groups || groups.length === 0) {
      return groups;
    }

    const query = searchQuery.toLowerCase().trim();

    // Фильтруем группы, проверяя каждый заказ внутри группы
    const filtered = groups.map((group) => {
      const matchingPostings = group.postings.filter((posting) => {
        // Проверяем postingNumber
        if (posting.postingNumber?.toLowerCase().includes(query)) {
          return true;
        }

        // Проверяем offerId в каждом продукте
        const hasMatchingProduct = posting.products.some((product) =>
          product.offerId?.toLowerCase().includes(query)
        );

        return hasMatchingProduct;
      });

      if (matchingPostings.length > 0) {
        return {
          ...group,
          postings: matchingPostings,
          count: matchingPostings.length,
        };
      }

      return null;
    }).filter(Boolean); // Убираем null значения

    return filtered;
  }, [groups, searchQuery]);

  return filteredGroups;
}
