// src/utils/urlSecurity.ts

/**
 * Validates that an identifier is a safe positive integer (> 0),
 * preventing path traversal or malformed segments in numeric route parameters.
 */
export function validatePositiveIntId(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('Identificador inválido');
    }
    return value;
  }

  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) {
      throw new Error('Identificador inválido');
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error('Identificador inválido');
    }
    return parsed;
  }

  throw new Error('Identificador inválido');
}

/**
 * Trims, validates against empty or traversal segments, and URI-encodes a URL path segment.
 */
export function encodePathSegment(value: string | number): string {
  if (value === null || value === undefined) {
    throw new Error('Parâmetro de rota inválido');
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Parâmetro de rota inválido');
  }

  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || trimmed.includes('..')) {
    throw new Error('Parâmetro de rota inválido');
  }

  return encodeURIComponent(trimmed);
}
