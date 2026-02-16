import { useMemo } from "react";

/**
 * Хук для группировки заказов по дате отгрузки (shipmentDate)
 * @param {Array} postings - Массив заказов
 * @returns {Array} - Массив групп, где каждая группа содержит { shipmentDate, postings, count }
 */
export function useShipmentGroups(postings) {
  const groups = useMemo(() => {
    if (!postings || postings.length === 0) {
      return [];
    }

    // Группируем по shipmentDate
    const groupsMap = new Map();

    postings.forEach((posting) => {
      const date = posting.shipmentDate;

      // Если нет shipmentDate, пропускаем
      if (!date) {
        return;
      }

      if (!groupsMap.has(date)) {
        groupsMap.set(date, {
          shipmentDate: date,
          postings: [],
          count: 0,
        });
      }

      const group = groupsMap.get(date);
      group.postings.push(posting);
      group.count = group.postings.length;
    });

    // Преобразуем Map в массив и сортируем по дате (новые первыми)
    const groupsArray = Array.from(groupsMap.values());
    groupsArray.sort((a, b) => {
      const dateA = new Date(a.shipmentDate);
      const dateB = new Date(b.shipmentDate);
      return dateB - dateA; // Сортировка по убыванию (новые первыми)
    });

    return groupsArray;
  }, [postings]);

  return groups;
}
