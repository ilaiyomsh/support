import type { ColumnMapping } from '@shared/types';
import type { Column } from '../types/board.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateMapping(
  mapping: ColumnMapping,
  columns: Column[]
): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!mapping.description) {
    errors.push('נדרש למפות עמודת תיאור (description)');
  }
  if (!mapping.video) {
    errors.push('נדרש למפות עמודת וידאו (video)');
  }

  // Create a map of column IDs to columns for quick lookup
  const columnMap = new Map<string, Column>();
  columns.forEach(col => columnMap.set(col.id, col));

  // Validate description (text/long_text)
  if (mapping.description) {
    const col = columnMap.get(mapping.description);
    if (!col) {
      errors.push(`עמודת תיאור (${mapping.description}) לא נמצאה בלוח`);
    } else if (col.type !== 'text' && col.type !== 'long_text') {
      errors.push(`עמודת תיאור חייבת להיות מסוג text או long_text (נמצא: ${col.type})`);
    }
  }

  // Validate video (file)
  if (mapping.video) {
    const col = columnMap.get(mapping.video);
    if (!col) {
      errors.push(`עמודת וידאו (${mapping.video}) לא נמצאה בלוח`);
    } else if (col.type !== 'file') {
      errors.push(`עמודת וידאו חייבת להיות מסוג file (נמצא: ${col.type})`);
    }
  }

  // Validate requesterName (text)
  if (mapping.requesterName) {
    const col = columnMap.get(mapping.requesterName);
    if (!col) {
      errors.push(`עמודת שם פונה (${mapping.requesterName}) לא נמצאה בלוח`);
    } else if (col.type !== 'text' && col.type !== 'long_text') {
      errors.push(`עמודת שם פונה חייבת להיות מסוג text (נמצא: ${col.type})`);
    }
  }

  // Validate accountName (text)
  if (mapping.accountName) {
    const col = columnMap.get(mapping.accountName);
    if (!col) {
      errors.push(`עמודת שם חשבון (${mapping.accountName}) לא נמצאה בלוח`);
    } else if (col.type !== 'text' && col.type !== 'long_text') {
      errors.push(`עמודת שם חשבון חייבת להיות מסוג text (נמצא: ${col.type})`);
    }
  }

  // Validate sourceBoardName (link)
  if (mapping.sourceBoardName) {
    const col = columnMap.get(mapping.sourceBoardName);
    if (!col) {
      errors.push(`עמודת שם לוח מקור (${mapping.sourceBoardName}) לא נמצאה בלוח`);
    } else if (col.type !== 'link') {
      errors.push(`עמודת שם לוח מקור חייבת להיות מסוג link (נמצא: ${col.type})`);
    }
  }

  // Validate status
  if (mapping.status?.columnId) {
    const col = columnMap.get(mapping.status.columnId);
    if (!col) {
      errors.push(`עמודת סטטוס (${mapping.status.columnId}) לא נמצאה בלוח`);
    } else if (col.type !== 'status') {
      errors.push(`עמודת סטטוס חייבת להיות מסוג status (נמצא: ${col.type})`);
    }
    if (!mapping.status.defaultValue) {
      errors.push('נדרש ערך ברירת מחדל לעמודת סטטוס');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

