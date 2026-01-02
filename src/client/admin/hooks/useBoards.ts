import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { Board } from '../types/board.types';

const monday = mondaySdk();

const loadAllBoards = async (): Promise<Board[]> => {
  const allBoards: Board[] = [];
  let page = 1;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await monday.api(`
        query GetBoards($page: Int!, $limit: Int!) {
          boards(page: $page, limit: $limit) {
            id
            name
            type
          }
        }
      `, {
        variables: { page, limit }
      });

      const boards = response.data?.boards || [];
      // סינון: רק לוחות אמיתיים (לא workflows, לא custom_object, לא templates וכו')
      const filteredBoards = boards.filter((board: Board) => {
        // רק לוחות עם type === "board" (לא custom_object, לא workflow, לא template וכו')
        // זה מבטיח שרק לוחות אמיתיים שניתן ליצור בהם אייטמים יוצגו
        return board.type === 'board';
      });
      allBoards.push(...filteredBoards);

      // אם קיבלנו פחות מ-500, אין עוד עמודים
      if (boards.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      throw error;
    }
  }

  return allBoards;
};

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    loadAllBoards()
      .then(loadedBoards => {
        setBoards(loadedBoards);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message || 'שגיאה בטעינת לוחות');
        setIsLoading(false);
      });
  }, []);

  const searchBoards = (query: string): Board[] => {
    if (!query.trim()) {
      return boards;
    }
    const lowerQuery = query.toLowerCase();
    return boards.filter(board => 
      board.name.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    boards,
    isLoading,
    error,
    searchBoards
  };
}

