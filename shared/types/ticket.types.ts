/**
 * Ticket Types - מבני נתונים לפניות תמיכה
 */

/**
 * מטאדאטה של פנייה - מידע על הלקוח והסביבה
 */
export interface TicketMetadata {
  /** מזהה חשבון הלקוח */
  accountId: string;
  /** מזהה המשתמש */
  userId: string;
  /** שם המשתמש */
  userName: string;
  /** אימייל המשתמש (אופציונלי) */
  userEmail?: string;
  /** מזהה הלוח */
  boardId: string;
  /** שם הלוח */
  boardName: string;
  /** מזהה ה-workspace */
  workspaceId: string;
  /** חותמת זמן */
  timestamp: string;
  /** שם הפונה (default: userName) - נדרש על ידי השרת */
  requesterName?: string;
  /** שם החשבון (נטען מ-InstanceMetadata) - נדרש על ידי השרת */
  accountName?: string;
  /** שם לוח מקור (default: boardName) - נדרש על ידי השרת */
  sourceBoardName?: string;
  /** URL של לוח מקור - נדרש לעמודת LINK */
  sourceBoardUrl?: string;
}

/**
 * בקשת שליחת פנייה
 */
export interface TicketSubmission {
  /** קוד הלינק */
  linkCode: string;
  /** תיאור הבעיה */
  description: string;
  /** URL של קובץ וידאו בשרת (אופציונלי) */
  videoUrl?: string;
  /** מטאדאטה */
  metadata: TicketMetadata;
}

/**
 * תגובה לשליחת פנייה
 */
export interface TicketResponse {
  /** האם הצליח */
  success: boolean;
  /** מזהה האייטם שנוצר */
  itemId?: string;
  /** הודעה למשתמש */
  message: string;
}

/**
 * מצב הקלטה
 */
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * מצב ההקלטה המלא
 */
export interface RecordingState {
  /** סטטוס נוכחי */
  status: RecordingStatus;
  /** משך ההקלטה בשניות */
  duration: number;
  /** ה-Blob של הוידאו (אחרי עצירה) */
  blob?: Blob;
  /** הודעת שגיאה */
  error?: string;
}

