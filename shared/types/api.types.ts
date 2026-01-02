/**
 * API Types - Request/Response לכל endpoint
 */

import type { ColumnMapping } from './link.types';

// =====================
// Links API
// =====================

/**
 * POST /api/links - יצירת לינק חדש
 * לפי bridge_architecture.md - השרת מקבל boardId, boardName, mapping
 */
export interface CreateLinkRequest {
  /** מזהה לוח היעד */
  boardId: string;
  /** שם לוח היעד */
  boardName: string;
  /** מיפוי עמודות (אופציונלי - ברירת מחדל ב-MVP) */
  columnMapping?: ColumnMapping;
  /** מזהה חשבון האדמין (נשלח מה-client) */
  adminAccountId: string;
  /** כותרת טופס פנייה */
  formTitle?: string;
  /** תיאור טופס פנייה */
  formDescription?: string;
  /** הגדרות אינדיקטור פניות חדשות */
  newRequestIndicator?: {
    enabled: boolean;
    statusColumnId: string;
    targetStatusIndex: number;
    targetStatusLabel: string;
  };
}

export interface CreateLinkResponse {
  /** האם הצליח */
  success: boolean;
  /** קוד הלינק שנוצר */
  linkCode: string;
}

/**
 * GET /api/links - רשימת לינקים
 */
export interface GetLinksResponse {
  links: Array<{
    linkCode: string;
    boardId: string;
    boardName: string;
    createdAt: string;
  }>;
}

/**
 * GET /api/links/:code/validate - אימות לינק
 */
export interface ValidateLinkResponse {
  /** האם הלינק תקף */
  valid: boolean;
  /** שם המנהל/חשבון */
  adminName?: string;
}

// =====================
// Config API
// =====================

/**
 * POST /api/config/connect - חיבור לקוח
 */
export interface ConnectRequest {
  /** קוד הלינק */
  linkCode: string;
  /** מזהה ה-instance */
  instanceId: string;
}

export interface ConnectResponse {
  /** האם הצליח */
  success: boolean;
  /** שם המנהל */
  adminName?: string;
  /** הודעת שגיאה */
  error?: string;
}

// =====================
// Tickets API
// =====================

/**
 * POST /api/tickets - שליחת פנייה
 * Request: FormData with TicketSubmission fields
 */
export interface SubmitTicketResponse {
  /** האם הצליח */
  success: boolean;
  /** מזהה האייטם שנוצר */
  itemId?: string;
  /** הודעה למשתמש */
  message: string;
}

// =====================
// OAuth API
// =====================

/**
 * GET /oauth/status - סטטוס אימות
 */
export interface OAuthStatusResponse {
  /** האם מאומת */
  authenticated: boolean;
  /** פרטי חשבון */
  account?: {
    id: string;
    name: string;
    slug: string;
  };
}

