// src/services/api.ts
import axios from 'axios';
import {
  getToken,
  storeToken,
  getRefreshToken,
  storeRefreshToken,
  clearAuthData,
} from '../utils/storage';
import Constants from 'expo-constants';
import { ErrorHandler } from '../utils/errorHandling';
import { logger } from '../utils/logger';
import { assertSecureApiUrl, isSameOriginRequest } from '../utils/securityConfig';

// Obter e validar a URL base da API do Expo Constants
const extra = Constants.expoConfig?.extra || {};
const rawApiBaseUrl: string | undefined =
  extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL;

let API_BASE_URL = '';
let apiConfigError: Error | null = null;
try {
  API_BASE_URL = assertSecureApiUrl(rawApiBaseUrl, __DEV__);
} catch (configError) {
  apiConfigError =
    configError instanceof Error
      ? configError
      : new Error('API_BASE_URL deve usar HTTPS em produção');
  logger.error('Configuração insegura de API_BASE_URL:', apiConfigError.message);
  API_BASE_URL = '';
}

logger.debug('API_BASE_URL configurada como:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Adicionar log para diagnóstico de erros de rede apenas em desenvolvimento
if (__DEV__) {
  api.interceptors.request.use((request) => {
    logger.debug('Request:', request.method?.toUpperCase(), request.url);
    return request;
  });
}

const stripAuthorizationHeader = (headers: unknown): void => {
  if (!headers || typeof headers !== 'object') return;
  const headerMap = headers as Record<string, unknown> & {
    delete?: (key: string) => void;
  };
  if (typeof headerMap.delete === 'function') {
    headerMap.delete('Authorization');
  }
  delete headerMap.Authorization;
  delete headerMap.authorization;
};

const isTrustedApiRequest = (
  url?: string,
  requestBaseUrl?: string
): boolean => {
  if (
    API_BASE_URL &&
    requestBaseUrl &&
    !isSameOriginRequest(requestBaseUrl, API_BASE_URL)
  ) {
    return false;
  }
  const targetBaseUrl = requestBaseUrl || API_BASE_URL;
  return isSameOriginRequest(url, targetBaseUrl);
};

// Interceptor para adicionar o token JWT apenas para requisições à própria API
api.interceptors.request.use(
  (config) => {
    if (apiConfigError) {
      return Promise.reject(apiConfigError);
    }

    if (!isTrustedApiRequest(config.url, config.baseURL)) {
      stripAuthorizationHeader(config.headers);
      return config;
    }

    return getToken()
      .then((token) => {
        if (token) {
          if (!config.headers) {
            (config as unknown as { headers: Record<string, string> }).headers = {};
          }
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      })
      .catch((error) => {
        logger.error('Erro ao obter token do armazenamento:', error);
        return config;
      });
  },
  async (error) => {
    ErrorHandler.logError(await ErrorHandler.parseError(error));
    return Promise.reject(error);
  }
);

type UnauthorizedHandler = (() => void | Promise<void>) | null;

let unauthorizedHandler: UnauthorizedHandler = null;
let isHandlingUnauthorized = false;

export function setUnauthorizedHandler(
  handler: (() => void | Promise<void>) | null
): void {
  unauthorizedHandler = handler;
}

const isAuthLifecycleEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('/api/v1/auth/logout') ||
    url.includes('/api/v1/auth/refresh') ||
    url.includes('/api/v1/auth/login')
  );
};

// Controle de fila para evitar múltiplas chamadas simultâneas de refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token && !error) {
      prom.resolve(token);
    } else {
      prom.reject(error ?? new Error('Falha na renovação do token'));
    }
  });
  failedQueue = [];
};

// Interceptor para lidar com erros de resposta e renovação de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Se erro for 401 (Unauthorized) e não tentamos renovar o token ainda
    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthLifecycleEndpoint(originalRequest.url) &&
      !isHandlingUnauthorized &&
      isTrustedApiRequest(originalRequest.url, originalRequest.baseURL)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      let shouldResetInFinally = true;
      let pendingQueueError: unknown = null;

      try {
        if (apiConfigError) {
          throw apiConfigError;
        }

        const storedRefreshToken = await getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('Token não disponível');
        }

        const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '');
        const refreshUrl = normalizedBaseUrl
          ? `${normalizedBaseUrl}/api/v1/auth/refresh`
          : '/api/v1/auth/refresh';

        const response = await axios.post(
          refreshUrl,
          { refreshToken: storedRefreshToken },
          { timeout: 15000 }
        );

        const newToken: string | undefined = response.data?.token;
        const newRefreshToken: string | undefined = response.data?.refreshToken;
        if (!newToken) {
          throw new Error('Token de renovação ausente');
        }

        await storeToken(newToken);
        if (newRefreshToken) {
          await storeRefreshToken(newRefreshToken);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        if (!originalRequest.headers) {
          originalRequest.headers = {};
        }
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        isRefreshing = false;
        shouldResetInFinally = false;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        pendingQueueError = refreshError;
        delete api.defaults.headers.common['Authorization'];

        try {
          await clearAuthData();
        } catch (clearError) {
          logger.error('Erro ao limpar dados de autenticação:', clearError);
        }

        processQueue(refreshError, null);

        if (unauthorizedHandler && !isHandlingUnauthorized) {
          isHandlingUnauthorized = true;
          try {
            await unauthorizedHandler();
          } catch (handlerError) {
            logger.error('Erro ao executar unauthorizedHandler:', handlerError);
          } finally {
            isHandlingUnauthorized = false;
          }
        }

        ErrorHandler.logError(await ErrorHandler.parseError(refreshError));
        return Promise.reject(refreshError);
      } finally {
        if (shouldResetInFinally) {
          if (failedQueue.length > 0) {
            processQueue(
              pendingQueueError ?? new Error('Falha na renovação do token'),
              null
            );
          }
          isRefreshing = false;
        }
      }
    }

    ErrorHandler.logError(await ErrorHandler.parseError(error));
    return Promise.reject(error);
  }
);

// Função para checar conectividade
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    await api.get('/api/v1/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

export default api;
