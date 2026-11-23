// src/services/authService.ts
import api from './api';
import {
  clearAuthData,
  getRefreshToken,
  storeData,
  storeRefreshToken,
  storeToken,
} from '../utils/storage';
import { logger } from '../utils/logger';
import { User } from '../models/user.model';

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface SignupData {
  name: string;
  nickname: string | null;
  phoneNumber: string;
}

export interface GoogleLoginPayload {
  idToken?: string;
  accessToken?: string;
}

const persistAuthSession = async (data: AuthResponse): Promise<void> => {
  await storeToken(data.token);
  if (data.refreshToken) {
    await storeRefreshToken(data.refreshToken);
  }
  if (data.user) {
    await storeData('user', JSON.stringify(data.user));
  }
  api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
};

export const loginWithEmailPassword = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>(
      '/api/v1/auth/login',
      { email: email.trim().toLowerCase(), password },
      { timeout: 15000 }
    );

    if (!response.data?.token) {
      throw new Error('Token de autenticação ausente na resposta');
    }

    await persistAuthSession(response.data);
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('O servidor demorou a responder. Tente novamente mais tarde.');
    }
    if (error.response?.status === 401) {
      throw new Error('Email ou senha incorretos.');
    }
    if (error.response?.status === 403) {
      throw new Error(error.response?.data?.message || 'Esta conta foi desativada.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Erro no servidor. Tente novamente mais tarde.');
    }
    throw error;
  }
};

export const loginWithGoogle = async (
  payload: GoogleLoginPayload
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/v1/auth/google', payload, {
    timeout: 15000,
  });

  if (!response.data?.token) {
    throw new Error('Token de autenticação ausente na resposta do login Google');
  }

  await persistAuthSession(response.data);
  return response.data;
};

export const signUp = async (
  email: string,
  password: string,
  userData: SignupData,
  cancelRef?: React.MutableRefObject<boolean>
): Promise<AuthResponse> => {
  if (cancelRef?.current) {
    throw new Error('Operação cancelada pelo usuário');
  }

  const response = await api.post<AuthResponse>(
    '/api/v1/auth/signup',
    {
      name: userData.name.trim(),
      nickname: userData.nickname?.trim() || null,
      email: email.trim().toLowerCase(),
      phoneNumber: userData.phoneNumber?.trim() || null,
      password,
    },
    { timeout: 20000 }
  );

  if (cancelRef?.current) {
    throw new Error('Operação cancelada pelo usuário');
  }

  if (!response.data?.token) {
    throw new Error('Token de autenticação ausente no cadastro');
  }

  await persistAuthSession(response.data);
  return response.data;
};

export const refreshAuthToken = async (providedRefreshToken?: string): Promise<AuthResponse> => {
  const tokenToUse = providedRefreshToken || (await getRefreshToken());
  if (!tokenToUse) {
    throw new Error('Token de renovação ausente');
  }

  const response = await api.post<AuthResponse>(
    '/api/v1/auth/refresh',
    { refreshToken: tokenToUse },
    { timeout: 15000 }
  );

  if (!response.data?.token) {
    throw new Error('Token de renovação ausente');
  }

  await storeToken(response.data.token);
  if (response.data.refreshToken) {
    await storeRefreshToken(response.data.refreshToken);
  }
  if (response.data.user) {
    await storeData('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.post('/api/v1/auth/change-password', {
    currentPassword,
    newPassword,
  });
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  const response = await api.post<{ message?: string }>('/api/v1/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
  return (
    response.data?.message ||
    'Se existir uma conta associada a este email, enviaremos um código de redefinição.'
  );
};

export const resetPasswordWithCode = async (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  await api.post('/api/v1/auth/reset-password', {
    email: email.trim().toLowerCase(),
    code: code.trim(),
    newPassword,
  });
};

export const logout = async (): Promise<void> => {
  let storedRefresh: string | null = null;
  try {
    storedRefresh = await getRefreshToken();
  } catch (readError) {
    logger.warn('Erro ao ler refresh token durante logout:', readError);
  }

  try {
    try {
      await api.post('/api/v1/auth/logout', storedRefresh ? { refreshToken: storedRefresh } : {});
    } catch (apiError) {
      logger.warn('Erro ao notificar API sobre logout (continuando logout local):', apiError);
    }
  } finally {
    await clearAuthData();
  }
};
