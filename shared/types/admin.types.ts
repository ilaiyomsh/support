/**
 * Admin Types - מבני נתונים לניהול מנהלים וחיבורים
 */

/**
 * נתוני מנהל (נשמרים ב-SecureStorage)
 */
export interface AdminData {
  /** טוקן גישה */
  accessToken: string;
  /** מזהה החשבון */
  accountId: string;
  /** slug של החשבון */
  accountSlug: string;
  /** שם החשבון */
  accountName: string;
  /** מזהה המשתמש המנהל */
  adminUserId: string;
  /** שם המשתמש המנהל */
  adminUserName: string;
  /** אימייל המנהל */
  adminEmail: string;
  /** תאריך התקנה */
  installedAt: string;
  /** תאריך עדכון אחרון */
  lastUpdated: string;
}

/**
 * קונפיגורציית לקוח (נשמרת ב-Storage)
 */
export interface ClientConfig {
  /** קוד הלינק המחובר */
  linkedCode: string;
  /** תאריך החיבור */
  connectedAt: string;
}

/**
 * סטטוס חיבור לקוח
 */
export interface ConnectionStatus {
  /** האם מחובר */
  connected: boolean;
  /** קוד הלינק */
  linkCode?: string;
  /** שם המנהל/חשבון */
  adminName?: string;
}

