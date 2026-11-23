const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const MAX_DEPTH = 20;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'firebasetoken',
  'refreshtoken',
  'accesstoken',
  'idtoken',
  'password',
  'senha',
  'secret',
  'apikey',
  'cookie',
  'set-cookie',
  'setcookie',
  'email',
  'phonenumber',
  'phone',
  'code',
  'invitecode',
]);

const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) {
    return true;
  }
  const normalized = lower.replace(/[_-]/g, '');
  return SENSITIVE_KEYS.has(normalized);
}

/**
 * Redacts Bearer tokens and inline JWTs from a string.
 */
export function scrubString(input: string): string {
  return input.replace(BEARER_REGEX, REDACTED).replace(JWT_REGEX, REDACTED);
}

function sanitizeInternal(
  value: unknown,
  ancestors: WeakSet<object>,
  depth: number
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Error) {
    const errObj = value as Error & {
      code?: unknown;
      response?: { status?: unknown };
    };
    const sanitizedError: Record<string, unknown> = {
      name: value.name,
      message: scrubString(value.message || ''),
    };
    if (errObj.code !== undefined) {
      sanitizedError.code =
        typeof errObj.code === 'string' ? scrubString(errObj.code) : errObj.code;
    }
    if (errObj.response && typeof errObj.response === 'object' && errObj.response.status !== undefined) {
      sanitizedError.status = errObj.response.status;
    }
    return sanitizedError;
  }

  if (depth > MAX_DEPTH) {
    return '[MaxDepth]';
  }

  if (ancestors.has(value)) {
    return CIRCULAR;
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeInternal(item, ancestors, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [key, propValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = sanitizeInternal(propValue, ancestors, depth + 1);
      }
    }
    return result;
  } catch {
    return '[Unserializable]';
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Recursively sanitizes objects, arrays, Errors, and strings for safe logging
 * by redacting sensitive keys, Bearer/JWT tokens, and breaking circular references.
 */
export function sanitizeForLog(value: unknown): unknown {
  return sanitizeInternal(value, new WeakSet<object>(), 0);
}
