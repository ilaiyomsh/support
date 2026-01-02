import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { Column } from '../types/board.types';

const monday = mondaySdk();

export interface StatusColumnWithSettings extends Column {
  settings?: {
    labels?: Array<{
      id: number;
      color: number;
      label: string;
      index: number;
      is_done: boolean;
      is_deactivated?: boolean;
      hex: string;
    }>;
  };
}

export function useBoardColumns(boardId: string | undefined) {
  const [fileColumns, setFileColumns] = useState<Column[]>([]);
  const [textColumns, setTextColumns] = useState<Column[]>([]);
  const [statusColumns, setStatusColumns] = useState<Column[]>([]);
  const [statusColumnsWithSettings, setStatusColumnsWithSettings] = useState<StatusColumnWithSettings[]>([]);
  const [emailColumns, setEmailColumns] = useState<Column[]>([]);
  const [allColumns, setAllColumns] = useState<Column[]>([]);
  const [boardUrl, setBoardUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      setFileColumns([]);
      setTextColumns([]);
      setStatusColumns([]);
      setStatusColumnsWithSettings([]);
      setEmailColumns([]);
      setAllColumns([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    monday.api(`
      query GetBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
        url
          columns(types: [text, long_text, file, status, email, link]) {
            id
            title
            type
            settings
          }
        }
      }
    `, {
      variables: { boardId }
    })
      .then((response: any) => {
        const board = response.data?.boards[0];
        const columns = board?.columns || [];
        const url = board?.url || '';
        
        setAllColumns(columns);
        setFileColumns(columns.filter((col: Column) => col.type === 'file'));
        setTextColumns(columns.filter((col: Column) => 
          col.type === 'text' || col.type === 'long_text'
        ));
        
        const statusCols = columns.filter((col: Column) => col.type === 'status');
        setStatusColumns(statusCols);
        
        // שמור עמודות סטטוס עם הגדרות
        const statusColsWithSettings: StatusColumnWithSettings[] = statusCols.map((col: any) => {
          let parsedSettings = null;
          if (col.settings) {
            try {
              // אם settings הוא string, פרסר אותו
              parsedSettings = typeof col.settings === 'string' 
                ? JSON.parse(col.settings) 
                : col.settings;
            } catch (e) {
              console.warn('Failed to parse settings for column', col.id, e);
              parsedSettings = null;
            }
          }
          
          return {
            id: col.id,
            title: col.title,
            type: col.type,
            settings: parsedSettings
          };
        });
        setStatusColumnsWithSettings(statusColsWithSettings);
        
        setEmailColumns(columns.filter((col: Column) => col.type === 'email'));
        setBoardUrl(url);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'שגיאה בטעינת עמודות');
        setIsLoading(false);
      });
  }, [boardId]);

  return {
    fileColumns,
    textColumns,
    statusColumns,
    statusColumnsWithSettings,
    emailColumns,
    allColumns,
    boardUrl,
    isLoading,
    error
  };
}

