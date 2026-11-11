export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan sistem.'): string {
  return error instanceof Error ? error.message : fallback;
}
