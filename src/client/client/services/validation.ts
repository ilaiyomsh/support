/**
 * Validation utilities for client-side form validation
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * אימות תיאור התקלה (אופציונלי)
 * @param description - התיאור לאימות
 * @returns תוצאות האימות
 */
export function validateDescription(description: string): ValidationResult {
  const trimmed = description.trim();
  
  // תיאור הוא אופציונלי - אם ריק, זה תקין
  if (!trimmed) {
    return { valid: true };
  }
  
  // בדיקת מקסימום בלבד
  if (trimmed.length > 2000) {
    return {
      valid: false,
      error: 'תיאור התקלה לא יכול להכיל יותר מ-2000 תווים'
    };
  }
  
  return { valid: true };
}

/**
 * אימות פורמט אימייל
 * @param email - האימייל לאימות (אופציונלי)
 * @returns תוצאות האימות
 */
export function validateEmail(email: string | undefined): ValidationResult {
  if (!email) {
    // אימייל הוא אופציונלי
    return { valid: true };
  }
  
  const trimmed = email.trim();
  
  if (!trimmed) {
    return { valid: true }; // אימייל ריק נחשב תקין (אופציונלי)
  }
  
  // Regex בסיסי לאימות אימייל
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'פורמט אימייל לא תקין'
    };
  }
  
  return { valid: true };
}

