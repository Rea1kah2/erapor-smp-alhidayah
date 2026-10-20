import type { Response } from 'express';

const DATABASE_ERROR_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1017']);

export function isDatabaseUnavailableError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && DATABASE_ERROR_CODES.has(error.code);
}

export function sendDatabaseUnavailable(res: Response, error: unknown, operation: string): void {
  console.error(`Database unavailable during ${operation}:`, error);
  res.status(503).json({
    error: 'Layanan database sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.'
  });
}
