import { useState, useCallback } from 'react';
import { adminApi } from '../services/api';
import type { ColumnMapping } from '@shared/types';

interface CreateLinkParams {
  linkName: string;
  boardId: string;
  boardName: string;
  boardUrl?: string;
  columnMapping: ColumnMapping;
  formTitle?: string;
  formDescription?: string;
  newRequestIndicator?: {
    enabled: boolean;
    statusColumnId: string;
    targetStatusIndex: number;
    targetStatusLabel: string;
  };
}

interface UpdateLinkParams {
  linkName?: string;
  boardId?: string;
  boardName?: string;
  boardUrl?: string;
  columnMapping?: ColumnMapping;
  formTitle?: string;
  formDescription?: string;
  newRequestIndicator?: {
    enabled: boolean;
    statusColumnId: string;
    targetStatusIndex: number;
    targetStatusLabel: string;
  };
}

export function useLinkMutation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLink = async (params: CreateLinkParams) => {
    setIsLoading(true);
    setError(null);
    try {
      // Create link on server
      const response = await adminApi.createLink(
        params.boardId,
        params.boardName,
        params.columnMapping,
        params.formTitle,
        params.formDescription,
        params.newRequestIndicator
      );

      if (!response.success) {
        throw new Error('יצירת הלינק נכשלה');
      }

      // Update index
      await adminApi.updateLinksIndex({
        code: response.linkCode,
        name: params.linkName,
        boardName: params.boardName,
        boardId: params.boardId,
        boardUrl: params.boardUrl
      });

      return response.linkCode;
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה ביצירת הלינק';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLink = async (code: string, updates: UpdateLinkParams) => {
    setIsLoading(true);
    setError(null);
    try {
      // Update link on server - לפי bridge_architecture.md משתמשים ב-boardId/boardName
      const updateData: any = {};
      if (updates.boardId) updateData.boardId = updates.boardId;
      if (updates.boardName) updateData.boardName = updates.boardName;
      if (updates.columnMapping) updateData.columnMapping = updates.columnMapping;
      if (updates.formTitle !== undefined) updateData.formTitle = updates.formTitle;
      if (updates.formDescription !== undefined) updateData.formDescription = updates.formDescription;
      if (updates.newRequestIndicator !== undefined) updateData.newRequestIndicator = updates.newRequestIndicator;

      const response = await adminApi.updateLink(code, updateData);

      if (!response.success) {
        throw new Error('עדכון הלינק נכשל');
      }

      // Update index if needed
      const indexUpdates: any = {};
      if (updates.linkName) indexUpdates.name = updates.linkName;
      if (updates.boardName) indexUpdates.boardName = updates.boardName;
      if (updates.boardId) indexUpdates.boardId = updates.boardId;
      if (updates.boardUrl !== undefined) indexUpdates.boardUrl = updates.boardUrl;

      if (Object.keys(indexUpdates).length > 0) {
        await adminApi.updateLinkInIndex(code, indexUpdates);
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה בעדכון הלינק';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFullLinkDetails = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const linkConfig = await adminApi.fetchLinkDetails(code);
      return linkConfig;
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה בטעינת פרטי הלינק';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createLink,
    updateLink,
    fetchFullLinkDetails,
    isLoading,
    error
  };
}

