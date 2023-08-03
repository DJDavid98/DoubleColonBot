export const getExceptionMessage = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'Unknown error';
