// src/utils/storage.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Constantes para as chaves de armazenamento
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

const isWeb = Platform.OS === 'web';

const DEFAULT_SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const resolveSecureStoreOptions = (
  options?: SecureStore.SecureStoreOptions
): SecureStore.SecureStoreOptions => options ?? DEFAULT_SECURE_STORE_OPTIONS;

/**
 * Armazena um valor de forma segura usando Expo Secure Store (ou sessionStorage na Web).
 */
export const storeData = async (
  key: string,
  value: any,
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);

    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem(key, stringValue);
        try {
          window.localStorage?.removeItem(key);
        } catch {
          // Ignorar falha ao limpar legado do localStorage
        }
      }
      return;
    }

    await SecureStore.setItemAsync(key, stringValue, resolveSecureStoreOptions(options));
  } catch (error) {
    logger.error('Erro ao armazenar dados:', error);
    throw new Error(`Falha ao armazenar dados para chave: ${key}`);
  }
};

/**
 * Recupera um valor de forma segura do Expo Secure Store (ou sessionStorage na Web).
 */
export const getData = async (
  key: string,
  options?: SecureStore.SecureStoreOptions
): Promise<string | null> => {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
      return null;
    }

    const value = await SecureStore.getItemAsync(key, resolveSecureStoreOptions(options));
    return value;
  } catch (error) {
    logger.error('Erro ao obter dados:', error);
    throw new Error(`Falha ao obter dados para chave: ${key}`);
  }
};

/**
 * Remove um valor de forma segura do Expo Secure Store (ou sessionStorage/localStorage na Web).
 */
export const removeData = async (
  key: string,
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.removeItem(key);
        try {
          window.localStorage?.removeItem(key);
        } catch {
          // Ignorar falha ao limpar legado do localStorage
        }
      }
      return;
    }

    await SecureStore.deleteItemAsync(key, resolveSecureStoreOptions(options));
  } catch (error) {
    logger.error('Erro ao remover dados:', error);
    throw new Error(`Falha ao remover dados para chave: ${key}`);
  }
};

// Funções específicas para lidar com tokens (mais convenientes)

/**
 * Armazena um token de autenticação de forma segura.
 */
export const storeToken = async (
  token: string | any,
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  // Garantir que o token seja uma string
  const tokenString = typeof token === 'string' ? token : String(token);
  await storeData(TOKEN_KEY, tokenString, options);
};

/**
 * Recupera o token de autenticação armazenado.
 */
export const getToken = async (
  options?: SecureStore.SecureStoreOptions
): Promise<string | null> => {
  return await getData(TOKEN_KEY, options);
};

/**
 * Remove o token de autenticação armazenado.
 */
export const removeToken = async (
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  await removeData(TOKEN_KEY, options);
};

export const storeRefreshToken = async (
  token: string,
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  await storeData(REFRESH_TOKEN_KEY, token, options);
};

export const getRefreshToken = async (
  options?: SecureStore.SecureStoreOptions
): Promise<string | null> => {
  return await getData(REFRESH_TOKEN_KEY, options);
};

export const removeRefreshToken = async (
  options?: SecureStore.SecureStoreOptions
): Promise<void> => {
  await removeData(REFRESH_TOKEN_KEY, options);
};

export const clearAuthData = async (): Promise<void> => {
  await removeToken();
  await removeRefreshToken();
  await removeData('user');
};