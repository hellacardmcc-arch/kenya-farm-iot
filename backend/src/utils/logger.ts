export function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
}

export function logError(error: any, context?: string) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR${context ? ` in ${context}` : ''}:`, error.message || error);
}
