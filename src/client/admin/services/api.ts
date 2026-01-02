import mondaySdk from 'monday-sdk-js';
import type {
  CreateLinkRequest,
  CreateLinkResponse,
  GetLinksResponse,
  ColumnMapping
} from '@shared/types';

const API_BASE = '/api';
const monday = mondaySdk();
const STORAGE_KEY = 'global_links_index'; // לפי bridge_architecture.md

export interface LinkIndexItem {
  code: string;
  name: string;
  boardName: string;
  boardId: string;
  boardUrl?: string;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  isActive: boolean;
}

export const adminApi = {
  /**
   * יצירת לינק חדש
   * לפי bridge_architecture.md - שולח boardId, boardName, columnMapping
   */
  async createLink(
    boardId: string,
    boardName: string,
    columnMapping?: ColumnMapping,
    formTitle?: string,
    formDescription?: string,
    newRequestIndicator?: {
      enabled: boolean;
      statusColumnId: string;
      targetStatusIndex: number;
      targetStatusLabel: string;
    }
  ): Promise<CreateLinkResponse> {
    // Get accountId from Monday context
    const context = await monday.get('context');
    
    // ✅ לוג להדפסת הקונטקסט
    console.log('[Admin API] Monday Context:', context);
    console.log('[Admin API] Context Data:', context.data);
    console.log('[Admin API] Account:', context.data?.account);
    
    const accountId = context.data?.account?.id;
    
    console.log('[Admin API] Extracted Account ID:', accountId);
    
    if (!accountId) {
      console.error('[Admin API] Account ID not found in context!', {
        context,
        contextData: context.data,
        account: context.data?.account
      });
      throw new Error('Account ID not found in context');
    }

    console.log('[Admin API] Creating link with accountId:', accountId);

    const response = await fetch(`${API_BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId,
        boardName,
        columnMapping,
        adminAccountId: accountId,
        formTitle,
        formDescription,
        newRequestIndicator
      } as CreateLinkRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  /**
   * עדכון האינדקס המקומי (global_links_index) לפי bridge_architecture.md
   */
  async updateLinksIndex(linkData: {
    code: string;
    name: string;
    boardName: string;
    boardId: string;
    boardUrl?: string;
  }): Promise<void> {
    try {
      // Get user info using me query
      let creatorId = '';
      let creatorName = 'Unknown';
      
      try {
        const meResponse = await monday.api(`
          query {
            me {
              id
              name
            }
          }
        `);
        
        if (meResponse?.data?.me) {
          creatorId = meResponse.data.me.id || '';
          creatorName = meResponse.data.me.name || 'Unknown';
        }
      } catch (meError) {
        console.error('Error fetching user info from me query:', meError);
        // If me query fails, we'll use Unknown as default
      }

      const currentData = await monday.storage.getItem(STORAGE_KEY);
      const list: LinkIndexItem[] = currentData?.data?.value 
        ? JSON.parse(currentData.data.value) 
        : [];

      list.push({
        code: linkData.code,
        name: linkData.name,
        boardName: linkData.boardName,
        boardId: linkData.boardId,
        boardUrl: linkData.boardUrl,
        creatorId,
        creatorName,
        createdAt: Date.now(),
        isActive: true
      });

      await monday.storage.setItem(STORAGE_KEY, JSON.stringify(list));
      console.log('[Admin API] Links index updated', { code: linkData.code, creatorName });
    } catch (error) {
      console.error('Error updating links index:', error);
      throw error;
    }
  },

  /**
   * קבלת רשימת הלינקים מהאינדקס המקומי (global_links_index)
   */
  async getLinksIndex(): Promise<LinkIndexItem[]> {
    try {
      const result = await monday.storage.getItem(STORAGE_KEY);
      if (!result?.data?.value) {
        return [];
      }
      return JSON.parse(result.data.value);
    } catch (error) {
      console.error('Error getting links index:', error);
      return [];
    }
  },

  /**
   * עדכון פריט באינדקס (למשל בעריכה)
   */
  async updateLinkInIndex(code: string, updates: {
    name?: string;
    boardName?: string;
    boardId?: string;
    boardUrl?: string;
    isActive?: boolean;
  }): Promise<void> {
    try {
      const result = await monday.storage.getItem(STORAGE_KEY);
      if (!result?.data?.value) {
        return;
      }
      
      const list: LinkIndexItem[] = JSON.parse(result.data.value);
      const index = list.findIndex(item => item.code === code);
      
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        await monday.storage.setItem(STORAGE_KEY, JSON.stringify(list));
        console.log('[Admin API] Link updated in index', { code, updates });
      }
    } catch (error) {
      console.error('Error updating link in index:', error);
      throw error;
    }
  },

  /**
   * מחיקת פריט מהאינדקס
   */
  async removeLinkFromIndex(code: string): Promise<void> {
    try {
      const result = await monday.storage.getItem(STORAGE_KEY);
      if (!result?.data?.value) {
        return;
      }
      
      const list: LinkIndexItem[] = JSON.parse(result.data.value);
      const filtered = list.filter(item => item.code !== code);
      
      await monday.storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('[Admin API] Link removed from index', { code });
    } catch (error) {
      console.error('Error removing link from index:', error);
      throw error;
    }
  },

  /**
   * קבלת כל הלינקים (legacy - משמש רק ל-fallback)
   */
  async getLinks(): Promise<GetLinksResponse> {
    // Get accountId from Monday context
    const context = await monday.get('context');
    
    // ✅ לוג להדפסת הקונטקסט
    console.log('[Admin API] Get Links - Monday Context:', context);
    console.log('[Admin API] Get Links - Account ID:', context.data?.account?.id);
    
    const accountId = context.data?.account?.id;
    
    if (!accountId) {
      console.warn('[Admin API] Account ID not found, returning empty links');
      return { links: [] };
    }

    const response = await fetch(`${API_BASE}/links?accountId=${accountId}`);
    return response.json();
  },

  /**
   * מחיקת לינק
   */
  async deleteLink(code: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/links/${code}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  /**
   * קבלת פרטי לינק מלאים (לעריכה)
   */
  async fetchLinkDetails(code: string): Promise<any> {
    const response = await fetch(`${API_BASE}/links/${code}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.link; // Returns LinkConfig
  },

  /**
   * עדכון לינק
   * לפי bridge_architecture.md - משתמש ב-boardId/boardName
   */
  async updateLink(
    code: string,
    updates: {
      boardId?: string;
      boardName?: string;
      columnMapping?: ColumnMapping;
      formTitle?: string;
      formDescription?: string;
    }
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/links/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

