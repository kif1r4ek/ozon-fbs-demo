import { useState, useEffect, useCallback } from 'react';
import { getPublishedGroups } from '../utils/publishedGroupsStorage';

/**
 * Хук для работы с опубликованными группами
 * Автоматически обновляется при изменениях в localStorage
 * @returns {Object} { groups, isLoading, refresh }
 */
export function usePublishedGroups() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadGroups = useCallback(() => {
    setIsLoading(true);
    try {
      const publishedGroups = getPublishedGroups();
      setGroups(publishedGroups);
    } catch (error) {
      console.error('Error loading published groups:', error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Загружаем при монтировании
    loadGroups();

    // Слушаем изменения от других компонентов
    const handleUpdate = () => {
      loadGroups();
    };

    window.addEventListener('published-groups-updated', handleUpdate);

    // Слушаем изменения в других вкладках браузера
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('published-groups-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadGroups]);

  return {
    groups,
    isLoading,
    refresh: loadGroups
  };
}
