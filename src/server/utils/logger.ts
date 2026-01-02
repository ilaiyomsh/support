// Simple console logger (will be replaced with @mondaycom/apps-sdk Logger)
export const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data || ''),
};

