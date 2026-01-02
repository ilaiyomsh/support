import { useState, useEffect, useCallback } from 'react';
import { adminApi, type LinkIndexItem } from '../services/api';

export function useLinksIndex() {
  const [links, setLinks] = useState<LinkIndexItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshIndex = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const indexLinks = await adminApi.getLinksIndex();
      setLinks(indexLinks);
    } catch (err: any) {
      setError(err.message || 'שגיאה בטעינת אינדקס הלינקים');
      console.error('Error loading links index:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshIndex(true);
  }, [refreshIndex]);

  const addLinkToIndex = useCallback(async (linkData: {
    code: string;
    name: string;
    boardName: string;
    boardId: string;
    boardUrl?: string;
  }) => {
    try {
      await adminApi.updateLinksIndex(linkData);
      await refreshIndex(false); // Refresh to get updated list
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספת לינק לאינדקס');
      throw err;
    }
  }, [refreshIndex]);

  const updateLinkInIndex = useCallback(async (code: string, updates: {
    name?: string;
    boardName?: string;
    boardId?: string;
    boardUrl?: string;
    isActive?: boolean;
  }) => {
    try {
      await adminApi.updateLinkInIndex(code, updates);
      await refreshIndex(false); // Refresh to get updated list
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון לינק באינדקס');
      throw err;
    }
  }, [refreshIndex]);

  const removeLinkFromIndex = useCallback(async (code: string) => {
    try {
      await adminApi.removeLinkFromIndex(code);
      await refreshIndex(false); // Refresh to get updated list
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת לינק מהאינדקס');
      throw err;
    }
  }, [refreshIndex]);

  return {
    links,
    isLoading,
    isRefreshing,
    error,
    refreshIndex,
    addLinkToIndex,
    updateLinkInIndex,
    removeLinkFromIndex
  };
}

