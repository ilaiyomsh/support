import { useEffect, useState, useCallback } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { LinkIndexItem } from '../services/api';
import { adminApi } from '../services/api';

const monday = mondaySdk();

const CACHE_TTL = 1000 * 60 * 5; // 5 דקות
const POLLING_INTERVAL = 1000 * 60 * 2; // 2 דקות

interface CacheItem {
  value: boolean;
  timestamp: number;
}

/**
 * Hook לבדיקת פניות חדשות לכל הלינקים
 * משתמש ב-Monday SDK ישירות (לא דרך השרת)
 * עם מטמון ב-localStorage
 */
export function useNewRequestsStatus(links: LinkIndexItem[]) {
  const [newRequestsMap, setNewRequestsMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * בדיקת פניות חדשות ללינק ספציפי
   */
  const checkLinkForNewRequests = useCallback(async (link: LinkIndexItem): Promise<boolean> => {
    // בדוק מטמון
    const cacheKey = `new_requests_${link.code}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheItem: CacheItem = JSON.parse(cached);
        if (Date.now() - cacheItem.timestamp < CACHE_TTL) {
          return cacheItem.value;
        }
      }
    } catch (e) {
      // אם יש שגיאה בקריאת המטמון, נמשיך לבדיקה
    }

    try {
      // שלוף את ה-LinkConfig מהשרת כדי לקבל את ההגדרות
      const linkConfig = await adminApi.fetchLinkDetails(link.code);
      
      if (!linkConfig?.newRequestIndicator?.enabled) {
        return false;
      }

      // שלוף boardId מ-targetConfig (לא מ-newRequestIndicator)
      const boardId = linkConfig.targetConfig?.boardId;
      if (!boardId) {
        console.warn(`[useNewRequestsStatus] No boardId found for link ${link.code}`);
        return false;
      }

      const { statusColumnId, targetStatusLabel } = linkConfig.newRequestIndicator;

      const query = `
        query CheckNewRequests($boardId: ID!, $columnId: ID!, $value: CompareValue!) {
          boards(ids: [$boardId]) {
            items_page(
              limit: 1,
              query_params: {
                rules: [
                  {
                    column_id: $columnId
                    compare_value: $value
                    operator: contains_terms
                  }
                ]
              }
            ) {
              items {
                id
              }
            }
          }
        }
      `;

      const variables = {
        boardId: boardId,
        columnId: statusColumnId,
        value: [targetStatusLabel]
      };

      // לוג לקונסול
      console.log('[useNewRequestsStatus] Checking new requests:', {
        linkCode: link.code,
        boardId,
        statusColumnId,
        targetStatusLabel,
        query,
        variables
      });

      // בדוק ישירות דרך Monday SDK
      const response = await monday.api(query, { variables });

      const items = response.data?.boards?.[0]?.items_page?.items || [];
      const hasNew = items.length > 0;

      // שמור במטמון
      try {
        const cacheItem: CacheItem = {
          value: hasNew,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (e) {
        // אם יש שגיאה בשמירת המטמון, זה לא קריטי
      }

      return hasNew;
    } catch (error) {
      console.error(`Error checking new requests for ${link.code}:`, error);
      return false;
    }
  }, []);

  /**
   * בדיקת כל הלינקים
   */
  const checkAllLinks = useCallback(async () => {
    if (links.length === 0) {
      setNewRequestsMap({});
      return;
    }

    setIsLoading(true);
    try {
      const promises = links.map(async (link) => {
        const hasNew = await checkLinkForNewRequests(link);
        return { code: link.code, hasNew };
      });

      const results = await Promise.all(promises);
      const map: Record<string, boolean> = {};
      results.forEach(({ code, hasNew }) => {
        map[code] = hasNew;
      });
      setNewRequestsMap(map);
    } catch (error) {
      console.error('Error checking new requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [links, checkLinkForNewRequests]);

  // בדיקה ראשונית + polling
  useEffect(() => {
    if (links.length === 0) {
      setNewRequestsMap({});
      return;
    }

    // בדיקה ראשונית
    checkAllLinks();

    // Polling כל 2 דקות
    const interval = setInterval(checkAllLinks, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [links, checkAllLinks]);

  return {
    newRequestsMap,
    isLoading,
    refresh: checkAllLinks
  };
}

