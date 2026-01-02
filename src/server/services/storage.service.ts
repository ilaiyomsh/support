// @ts-ignore - @mondaycom/apps-sdk types issue
import { Storage } from '@mondaycom/apps-sdk';
import { logger } from '../utils/logger.js';

import type { LinkData } from '@shared/types';

/**
 * Storage Service - ניהול נתונים עם Monday Storage
 * 
 * Storage Keys:
 * - link_{linkCode} - פרטי לינק
 * - links_list_{accountId} - רשימת לינקים של account
 */
class StorageService {
  private storage!: Storage;
  // MVP: Fallback in-memory storage if Monday Storage fails
  private fallbackStorage: Map<string, any> = new Map();
  private useFallback: boolean = false;

  constructor(accessToken: string) {
    // TODO: Spiral 3 - get real access token from OAuth
    try {
      this.storage = new Storage(accessToken);
      // Will detect failure on first use and switch to fallback
    } catch (err) {
      logger.warn('Failed to initialize Monday Storage, using fallback', { err });
      this.useFallback = true;
    }
  }

  /**
   * שמירת לינק
   * Key: link_{linkCode}
   */
  async setLink(linkCode: string, linkData: LinkData): Promise<void> {
    const key = `link_${linkCode}`;

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      this.fallbackStorage.set(key, linkData);
      logger.info('Link saved (fallback)', { key, linkCode });
      return;
    }

    try {
      const { success, error } = await this.storage.set(key, linkData);
      if (!success) {
        logger.warn('Monday Storage failed, switching to fallback', { key, error });
        this.useFallback = true;
        this.fallbackStorage.set(key, linkData);
        logger.info('Link saved (fallback)', { key, linkCode });
        return;
      }
      logger.info('Link saved', { key, linkCode });
    } catch (err: any) {
      logger.warn('Monday Storage error, switching to fallback', {
        key,
        linkCode,
        error: err?.message
      });
      this.useFallback = true;
      this.fallbackStorage.set(key, linkData);
      logger.info('Link saved (fallback)', { key, linkCode });
    }
  }

  /**
   * קבלת לינק
   * Key: link_{linkCode}
   */
  async getLink(linkCode: string): Promise<LinkData | null> {
    const key = `link_${linkCode}`;

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      return this.fallbackStorage.get(key) || null;
    }

    try {
      const result = await this.storage.get(key);
      if (!result.success || !('value' in result) || !result.value) {
        // Check fallback as backup
        return this.fallbackStorage.get(key) || null;
      }
      return result.value as any;
    } catch (err) {
      logger.warn('Storage get error, checking fallback', { key });
      return this.fallbackStorage.get(key) || null;
    }
  }

  /**
   * מחיקת לינק
   */
  async deleteLink(linkCode: string): Promise<boolean> {
    const key = `link_${linkCode}`;

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      const deleted = this.fallbackStorage.delete(key);
      if (deleted) {
        logger.info('Link deleted (fallback)', { key, linkCode });
      }
      return deleted;
    }

    try {
      const { success, error } = await this.storage.delete(key);
      if (!success) {
        logger.warn('Monday Storage delete failed, using fallback', { key, error });
        const deleted = this.fallbackStorage.delete(key);
        return deleted;
      }
      // Also delete from fallback if exists
      this.fallbackStorage.delete(key);
      logger.info('Link deleted', { key, linkCode });
      return true;
    } catch (err) {
      logger.warn('Storage delete error, using fallback', { key });
      const deleted = this.fallbackStorage.delete(key);
      return deleted;
    }
  }

  /**
   * חיפוש לינקים לפי account
   * Key: links_list_{accountId}
   * Legacy - לפי bridge_architecture.md האינדקס נשמר ב-client
   */
  async getLinksByAccount(accountId: string): Promise<Array<{
    linkCode: string;
    boardId: string;
    boardName?: string;
    createdAt: string;
  }>> {
    const key = `links_list_${accountId}`;

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      const data = this.fallbackStorage.get(key);
      return data?.links || [];
    }

    try {
      const result = await this.storage.get(key);
      if (!result.success || !('value' in result) || !result.value) {
        // Check fallback as backup
        const fallbackData = this.fallbackStorage.get(key);
        return fallbackData?.links || [];
      }
      return (result.value as any).links || [];
    } catch (err) {
      logger.warn('Storage get links error, checking fallback', { key });
      const fallbackData = this.fallbackStorage.get(key);
      return fallbackData?.links || [];
    }
  }

  /**
   * הוספת לינק לרשימת account
   * Legacy - לפי bridge_architecture.md האינדקס נשמר ב-client
   */
  async addLinkToAccount(accountId: string, linkData: {
    linkCode: string;
    boardId: string;
    boardName?: string;
    createdAt: string;
  }): Promise<void> {
    const key = `links_list_${accountId}`;

    const links = await this.getLinksByAccount(accountId);
    links.push(linkData);

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      this.fallbackStorage.set(key, { links });
      return;
    }

    try {
      const { success, error } = await this.storage.set(key, { links });
      if (!success) {
        logger.warn('Monday Storage failed, switching to fallback', { key, error });
        this.useFallback = true;
        this.fallbackStorage.set(key, { links });
        return;
      }
      // Also save to fallback as backup
      this.fallbackStorage.set(key, { links });
    } catch (err) {
      logger.warn('Storage update links error, switching to fallback', { key });
      this.useFallback = true;
      this.fallbackStorage.set(key, { links });
    }
  }

  /**
   * הסרת לינק מרשימת account
   */
  async removeLinkFromAccount(accountId: string, linkCode: string): Promise<void> {
    const key = `links_list_${accountId}`;

    const links = await this.getLinksByAccount(accountId);
    const filtered = links.filter(l => l.linkCode !== linkCode);

    // Use fallback if Monday Storage failed
    if (this.useFallback) {
      this.fallbackStorage.set(key, { links: filtered });
      return;
    }

    try {
      const { success, error } = await this.storage.set(key, { links: filtered });
      if (!success) {
        logger.warn('Monday Storage failed, switching to fallback', { key, error });
        this.useFallback = true;
        this.fallbackStorage.set(key, { links: filtered });
        return;
      }
      // Also save to fallback as backup
      this.fallbackStorage.set(key, { links: filtered });
    } catch (err) {
      logger.warn('Storage remove link error, switching to fallback', { key });
      this.useFallback = true;
      this.fallbackStorage.set(key, { links: filtered });
    }
  }

  /**
   * עדכון לינק ברשימת account
   * Legacy - לפי bridge_architecture.md האינדקס נשמר ב-client
   */
  async updateLinkInAccount(accountId: string, linkCode: string, updates: {
    boardId?: string;
    boardName?: string;
  }): Promise<void> {
    const key = `links_list_${accountId}`;
    const links = await this.getLinksByAccount(accountId);
    const linkIndex = links.findIndex(l => l.linkCode === linkCode);
    
    if (linkIndex !== -1) {
      links[linkIndex] = {
        ...links[linkIndex],
        ...updates
      };
      
      // Save updated list
      if (this.useFallback) {
        this.fallbackStorage.set(key, { links });
        return;
      }
      
      try {
        const { success, error } = await this.storage.set(key, { links });
        if (!success) {
          logger.warn('Monday Storage failed, switching to fallback', { key, error });
          this.useFallback = true;
          this.fallbackStorage.set(key, { links });
          return;
        }
        // Also save to fallback as backup
        this.fallbackStorage.set(key, { links });
      } catch (err) {
        logger.warn('Storage update link error, switching to fallback', { key });
        this.useFallback = true;
        this.fallbackStorage.set(key, { links });
      }
    }
  }
}

// MVP: Mock access token (hardcoded)
// TODO: Spiral 3 - get from OAuth context
const MOCK_ACCESS_TOKEN = process.env.MOCK_ACCESS_TOKEN || 'mock-token-for-dev';

export const storageService = new StorageService(MOCK_ACCESS_TOKEN);

