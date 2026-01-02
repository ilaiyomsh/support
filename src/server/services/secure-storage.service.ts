// @ts-ignore - @mondaycom/apps-sdk types issue
import { SecureStorage } from '@mondaycom/apps-sdk';
import { logger } from '../utils/logger.js';
import type { ColumnMapping } from '@shared/types';

/**
 * קונפיגורציה של קוד יעד - מבנה חדש לפי bridge_architecture.md
 */
export interface LinkConfig {
  targetConfig: {
    boardId: string;
    boardName: string;
    ownerAccountId: string;
  };
  columnMapping: ColumnMapping;
  formConfig?: {
    title?: string;
    description?: string;
  };
  newRequestIndicator?: {
    enabled: boolean;
    statusColumnId: string;
    targetStatusIndex: number;
    targetStatusLabel: string;
  };
  metadata: {
    createdAt: number; // timestamp
    createdByUserId: string;
    version: number;
  };
}

/**
 * מבנה ישן (legacy) - לתאימות backwards
 */
export interface LegacyLinkConfig {
  boardId: string;
  ownerAccountId: string;
  columnMapping: ColumnMapping;
  createdAt: string;
}

/**
 * Secure Storage Service - אחסון נתונים רגישים (tokens, credentials)
 * 
 * Secure Storage Keys:
 * - token_{accountId} - נתוני Admin כולל Access token (אובייקט)
 * - link_{linkCode} - קונפיגורציה של קוד יעד
 */
class SecureStorageService {
  private secureStorage: any; // זמני - SecureStorage type issue

  constructor() {
    this.secureStorage = new SecureStorage();
  }

  /**
   * Retry helper עם exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        // אם זה rate limit error, ננסה שוב
        if (err?.message?.includes('request limit exceeded') || err?.message?.includes('rate limit')) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt); // exponential backoff
            logger.warn(`Rate limit hit, retrying after ${delay}ms`, { 
              attempt: attempt + 1, 
              maxRetries 
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        // אם זה לא rate limit, נזרוק מיד
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * קבלת טוקן אדמין
   * Key: token_{accountId} (מכיל אובייקט עם accessToken)
   */
  async getAdminToken(accountId: string): Promise<string | null> {
    const key = `token_${accountId}`;
    try {
      const data = await this.secureStorage.get(key);
      
      logger.info('Token retrieved from SecureStorage', { 
        key, 
        accountId,
        dataType: typeof data,
        hasData: !!data
      });
      
      if (!data) {
        return null;
      }
      
      // SecureStorage של Monday מחזיר { value: {...} }
      let adminData: any = data;
      if (data && typeof data === 'object' && 'value' in data) {
        adminData = (data as any).value;
      }
      
      // אם זה אובייקט עם accessToken (הפורמט החדש)
      if (adminData && typeof adminData === 'object' && 'accessToken' in adminData) {
        return adminData.accessToken;
      }
      
      // Fallback: אם זה string ישיר
      if (typeof adminData === 'string') {
        return adminData;
      }
      
      logger.warn('Token format not recognized', { key, dataType: typeof adminData });
      return null;
    } catch (err) {
      logger.error('SecureStorage get error', { key, err });
      return null;
    }
  }

  /**
   * מחיקת טוקן אדמין
   */
  async deleteAdminToken(accountId: string): Promise<boolean> {
    const key = `token_${accountId}`;
    try {
      logger.info('Deleting admin token from SecureStorage', { key, accountId });
      
      await this.secureStorage.delete(key);
      
      logger.info('Admin token deleted from SecureStorage successfully', { 
        key, 
        accountId 
      });
      return true;
    } catch (err: any) {
      logger.error('SecureStorage delete error - failed to delete admin token', { 
        key, 
        accountId,
        error: err?.message,
        stack: err?.stack
      });
      return false;
    }
  }

  /**
   * שמירת טוקן ונתוני admin יחד (קריאה אחת בלבד)
   * Key: token_{accountId}
   */
  async setAdminComplete(accountId: string, adminData: {
    accessToken: string;
    accountId: string;
    accountName?: string;
    userName?: string;
    userEmail?: string;
  }): Promise<void> {
    const key = `token_${accountId}`;
    
    return this.retryWithBackoff(async () => {
      try {
        logger.info('Saving admin data to SecureStorage', {
          key,
          accountId,
          tokenLength: adminData.accessToken.length,
          accountName: adminData.accountName,
          userName: adminData.userName
        });

        // שמירת כל הנתונים תחת token_{accountId} (קריאה אחת בלבד)
        await this.secureStorage.set(key, adminData);
        
        logger.info('Admin data saved to SecureStorage successfully', { 
          key,
          accountId,
          accountName: adminData.accountName,
          userName: adminData.userName
        });
      } catch (err: any) {
        logger.error('SecureStorage set error - failed to save admin data', { 
          key,
          accountId,
          error: err?.message,
          stack: err?.stack
        });
        throw err;
      }
    });
  }

  /**
   * קבלת פרטי admin
   * Key: token_{accountId}
   */
  async getAdmin(accountId: string): Promise<{
    accessToken: string;
    accountId: string;
    accountName?: string;
    userName?: string;
    userEmail?: string;
  } | null> {
    const key = `token_${accountId}`;
    try {
      const data = await this.secureStorage.get(key);
      
      logger.info('Admin data retrieved from SecureStorage', { 
        key, 
        accountId,
        dataType: typeof data,
        hasData: !!data
      });
      
      if (!data) {
        return null;
      }

      // SecureStorage של Monday מחזיר { value: {...} } או ישירות את האובייקט
      let adminData: any = data;
      
      // טיפול בפורמט { value: {...} }
      if (data && typeof data === 'object' && 'value' in data) {
        adminData = (data as any).value;
      }

      // וידוא שזה אובייקט עם accessToken
      if (adminData && typeof adminData === 'object' && 'accessToken' in adminData) {
        return adminData;
      }

      logger.warn('Admin data format not recognized', { key, dataType: typeof adminData });
      return null;
    } catch (err) {
      logger.error('SecureStorage get error', { key, err });
      return null;
    }
  }

  /**
   * מחיקת פרטי admin
   * Key: token_{accountId}
   */
  async deleteAdmin(accountId: string): Promise<boolean> {
    return this.deleteAdminToken(accountId);
  }

  /**
   * בדיקה אם קונפיג הוא מבנה ישן (legacy)
   */
  private isLegacyConfig(config: any): config is LegacyLinkConfig {
    return config && 'boardId' in config && !('targetConfig' in config);
  }

  /**
   * המרת מבנה ישן למבנה חדש
   */
  private migrateLegacyToNew(legacy: LegacyLinkConfig, userId: string = ''): LinkConfig {
    const createdAt = legacy.createdAt 
      ? new Date(legacy.createdAt).getTime() 
      : Date.now();
    
    return {
      targetConfig: {
        boardId: legacy.boardId,
        boardName: legacy.boardId, // Fallback - לא נשמר בשדה הישן
        ownerAccountId: legacy.ownerAccountId
      },
      columnMapping: legacy.columnMapping,
      metadata: {
        createdAt,
        createdByUserId: userId || legacy.ownerAccountId,
        version: 1
      }
    };
  }

  /**
   * שמירת קונפיגורציה של קוד יעד
   * Key: link_{linkCode}
   */
  async setLinkConfig(linkCode: string, config: LinkConfig): Promise<void> {
    const key = `link_${linkCode}`;
    
    return this.retryWithBackoff(async () => {
      try {
        logger.info('Saving link config to SecureStorage', {
          key,
          linkCode,
          boardId: config.targetConfig.boardId,
          boardName: config.targetConfig.boardName,
          ownerAccountId: config.targetConfig.ownerAccountId,
          version: config.metadata.version
        });

        await this.secureStorage.set(key, config);
        
        logger.info('Link config saved to SecureStorage successfully', { 
          key, 
          linkCode, 
          boardId: config.targetConfig.boardId,
          ownerAccountId: config.targetConfig.ownerAccountId,
          version: config.metadata.version
        });
      } catch (err: any) {
        logger.error('SecureStorage set error - failed to save link config', { 
          key, 
          linkCode,
          error: err?.message,
          stack: err?.stack,
          boardId: config.targetConfig.boardId
        });
        throw err;
      }
    });
  }

  /**
   * קבלת קונפיגורציה של קוד יעד
   * Key: link_{linkCode}
   * תומך גם במבנה ישן (legacy) - ממיר אוטומטית למבנה חדש
   */
  async getLinkConfig(linkCode: string): Promise<LinkConfig | null> {
    const key = `link_${linkCode}`;
    try {
      const data = await this.secureStorage.get(key);
      
      logger.info('Link config retrieved from SecureStorage', { 
        key, 
        linkCode,
        dataType: typeof data,
        hasData: !!data
      });
      
      if (!data) {
        logger.warn('Link config not found in SecureStorage', { key, linkCode });
        return null;
      }

      // SecureStorage של Monday מחזיר { value: {...} } או ישירות את האובייקט
      let linkConfig: any = data;
      
      // טיפול בפורמט { value: {...} }
      if (data && typeof data === 'object' && 'value' in data) {
        linkConfig = (data as any).value;
      }

      if (!linkConfig) {
        logger.warn('Link config value is null/undefined', { key, linkCode });
        return null;
      }

      // אם זה מבנה ישן, המר אותו למבנה חדש
      if (this.isLegacyConfig(linkConfig)) {
        logger.info('Migrating legacy link config to new format', { linkCode });
        const migrated = this.migrateLegacyToNew(linkConfig);
        // שמור את המבנה החדש במקום הישן
        await this.setLinkConfig(linkCode, migrated);
        return migrated;
      }

      logger.info('Link config found and valid', { key, linkCode, boardId: linkConfig?.targetConfig?.boardId });
      return linkConfig as LinkConfig;
    } catch (err) {
      logger.error('SecureStorage get error', { key, linkCode, err });
      return null;
    }
  }

  /**
   * מחיקת קונפיגורציה של קוד יעד
   */
  async deleteLinkConfig(linkCode: string): Promise<boolean> {
    const key = `link_${linkCode}`;
    try {
      logger.info('Deleting link config from SecureStorage', { key, linkCode });
      
      await this.secureStorage.delete(key);
      
      logger.info('Link config deleted from SecureStorage successfully', { 
        key, 
        linkCode 
      });
      return true;
    } catch (err: any) {
      logger.error('SecureStorage delete error - failed to delete link config', { 
        key, 
        linkCode,
        error: err?.message,
        stack: err?.stack
      });
      return false;
    }
  }
}

export const secureStorageService = new SecureStorageService();

