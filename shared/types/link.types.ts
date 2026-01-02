/**
 * Link Types - מבני נתונים לניהול לינקים
 */

/**
 * סוג ערך דינמי - מקור המידע
 */
export type DynamicSource =
  | 'accountId'
  | 'accountName'
  | 'userId'
  | 'userName'
  | 'boardId'
  | 'boardName'
  | 'workspaceId'
  | 'timestamp';

/**
 * מיפוי עמודות - מבנה חדש לפי bridge_architecture.md
 */
export interface ColumnMapping {
  description?: string;      // columnId של עמודת Text/Long Text
  video?: string;            // columnId של עמודת File
  requesterName?: string;    // columnId של עמודת Text
  accountName?: string;      // columnId של עמודת Text
  sourceBoardName?: string;  // columnId של עמודת Link
  userEmail?: string;        // columnId של עמודת Email
  status?: {                 // אופציונלי - ברירת מחדל סטטוס
    columnId: string;
    defaultValue: string;
  };
}

/**
 * מבנה ישן (legacy) - לתאימות backwards
 */
export interface LegacyColumnMapping {
  textColumnId: string;
  fileColumnId: string;
}

/**
 * נתוני לינק שמור
 * Legacy - לפי bridge_architecture.md המידע נשמר ב-SecureStorage כ-LinkConfig
 */
export interface LinkData {
  /** מזהה הלינק (6 תווים) */
  linkId: string;
  /** מזהה חשבון המנהל */
  adminAccountId: string;
  /** מזהה לוח היעד */
  boardId: string;
  /** שם לוח היעד */
  boardName: string;
  /** מיפוי העמודות */
  columnMapping: ColumnMapping;
  /** תאריך יצירה */
  createdAt: string;
  /** מזהה היוצר */
  createdBy: string;
}

