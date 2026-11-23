const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * Valida que a URL base da API usa HTTPS em builds de produção.
 */
export function assertSecureApiUrl(url: string | undefined, isDev: boolean): string {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  if (!isDev && !trimmed.startsWith('https://')) {
    throw new Error('API_BASE_URL deve usar HTTPS em produção');
  }

  return trimmed;
}

/**
 * Verifica se a URL da requisição pertence à mesma origem da API base
 * ou é um caminho relativo seguro (sem protocol-relative `//`).
 */
export function isSameOriginRequest(
  requestUrl: string | undefined,
  baseUrl: string | undefined
): boolean {
  const trimmed = requestUrl?.trim() ?? '';
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('//') || trimmed.startsWith('\\\\')) {
    return false;
  }

  if (!URL_SCHEME_REGEX.test(trimmed)) {
    return true;
  }

  const trimmedBase = baseUrl?.trim() ?? '';
  if (!trimmedBase) {
    return false;
  }

  try {
    const parsedRequest = new URL(trimmed);
    const parsedBase = new URL(trimmedBase);
    return (
      parsedRequest.origin !== 'null' &&
      parsedRequest.origin === parsedBase.origin
    );
  } catch {
    return false;
  }
}
