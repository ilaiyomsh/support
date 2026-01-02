// Generate random link code (6 chars alphanumeric)
export function generateLinkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Validate link code format
export function isValidLinkCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

