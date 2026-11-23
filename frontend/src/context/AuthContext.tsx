import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '../models/user.model';
import { 
  getToken, storeToken, removeToken, 
  getRefreshToken, storeRefreshToken, removeRefreshToken,
  storeData, getData, removeData, clearAuthData 
} from '../utils/storage';
import api, { setUnauthorizedHandler } from '../services/api';
import axios, { AxiosResponse } from 'axios';
import { router } from 'expo-router';
import { ErrorHandler } from '../utils/errorHandling';
import * as authService from '../services/authService';
import { logger } from '../utils/logger';
 
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User, refreshToken?: string) => Promise<void>;
  loginWithCredentials: (email: string, password: string, cancelRef?: React.MutableRefObject<boolean>) => Promise<void>;
  loginWithGoogle: (payload: authService.GoogleLoginPayload, cancelRef?: React.MutableRefObject<boolean>) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  error: string | null;
  updateStoredUser: (userData: Partial<User>) => Promise<User | null>;
  clearError: () => void;
  signUp: (email: string, password: string, userData: {
    name: string;
    nickname: string | null;
    phoneNumber: string;
  }, cancelRef?: React.MutableRefObject<boolean>) => Promise<User | null>;
  setLoading: (loading: boolean) => void;
}

interface GetMeResponse {
  user: User;
}

interface LoginResponse {
  token: string;
  data: {
    user: User
  }
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithCredentials: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  refreshToken: async () => false,
  isAuthenticated: false,
  error: null,
  updateStoredUser: async () => null,
  clearError: () => {},
  signUp: async () => null,
  setLoading: () => {}
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setError('Sessão expirada. Por favor, faça login novamente.');
      router.replace('/(auth)/sign-in');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // Primeiro carregamos do cache para UI instantânea
        try {
          const cachedUserData = await getData('user');
          if (cachedUserData) {
            const cachedUser = JSON.parse(cachedUserData);
            logger.debug('Carregando usuário do cache:', cachedUser);
            setUser(cachedUser);
          }
        } catch (cacheError) {
          logger.error("Erro ao carregar usuário do cache:", cacheError);
        }

        // Configurar token para requisições
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verificar com o servidor
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          const response: AxiosResponse<GetMeResponse> = await api.get('/api/v1/users/me', {
            signal: controller.signal
          });

          if (response.data.user) {
            logger.debug('Dados do usuário recebidos do servidor:', response.data.user);
            setUser(response.data.user);
            // Atualizar cache
            await storeData('user', JSON.stringify(response.data.user));
            setError(null);
          }
        } catch (error) {
          if (
            axios.isCancel(error) ||
            (error instanceof Error && error.name === 'AbortError') ||
            (axios.isAxiosError(error) && error.code === 'ECONNABORTED')
          ) {
            logger.debug('Requisição cancelada por timeout');
          } else if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Tentar refresh token
            const refreshSuccessful = await refreshToken();
            if (!refreshSuccessful) {
              logger.error("Token expirado e não foi possível renovar");
              await clearAuthData();
              delete api.defaults.headers.common['Authorization'];
              setUser(null);
              setError("Sessão expirada. Por favor, faça login novamente.");
            }
          } else if (
            axios.isAxiosError(error) &&
            (error.response?.status === 403 || error.response?.status === 404)
          ) {
            logger.error("Sessão ou usuário inválido:", error.response.status);
            await clearAuthData();
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
            setError("Sessão expirada. Por favor, faça login novamente.");
          } else if (!(await getToken())) {
            // Interceptor 401 já limpou os dados de autenticação após falha no refresh
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
            setError("Sessão expirada. Por favor, faça login novamente.");
          } else if (axios.isAxiosError(error) && error.response) {
            // Erro transitório do servidor (ex: 5xx): preservar cache local e token
            logger.error("Erro ao carregar usuário:", error);
            setError("Erro ao carregar dados do usuário");
          } else {
            // Erro de rede/offline: preservar cache local e token para resiliência offline
            logger.warn("Erro de rede ao validar usuário; mantendo sessão em cache:", error);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        logger.error("Erro ao recuperar token:", err);
        setError("Erro ao recuperar token de autenticação");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (token: string | any, userData: User, refreshTokenValue?: string): Promise<void> => {
    try {
      // Garantir que o token seja string
      const tokenString = typeof token === 'string' ? token : String(token);
      
      // Armazenar dados de autenticação
      await storeToken(tokenString);
      if (refreshTokenValue) {
        await storeRefreshToken(refreshTokenValue);
      }
      await storeData('user', JSON.stringify(userData));
      
      // Atualizar estado e cabeçalho de API
      setUser(userData);
      setError(null);
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenString}`;
    } catch (error) {
      logger.error('Erro ao salvar dados de login:', error);
      throw error;
    }
  };

  const updateStoredUser = useCallback(async (userData: Partial<User>) => {
    try {
      // Recuperar usuário atual armazenado
      const currentUserString = await getData('user');
      
      if (currentUserString) {
        // Parse do usuário atual
        const currentUser = JSON.parse(currentUserString);
        
        // Tratar o campo nickname como caso especial
        const processedUserData = { ...userData };
        
        // Se nickname for string vazia, converter para null
        if ('nickname' in processedUserData) {
          if (!processedUserData.nickname || processedUserData.nickname.trim() === '') {
            processedUserData.nickname = null;
          } else {
            // Garantir que é uma string limpa
            processedUserData.nickname = processedUserData.nickname.trim();
          }
        }
        
        // Mesclar dados do usuário
        const updatedUser = {
          ...currentUser,
          ...processedUserData
        };
        
        // Armazenar usuário atualizado
        await storeData('user', JSON.stringify(updatedUser));
        
        // Atualizar estado do contexto
        setUser(updatedUser);
        
        logger.debug('Usuário atualizado no contexto e storage:', updatedUser);
        
        return updatedUser;
      }
      
      return null;
    } catch (error) {
      logger.error('Erro ao atualizar usuário armazenado:', error);
      return null;
    }
  }, []);

  // Função para ajustar o estado de loading externamente
  const setLoadingState = (loading: boolean) => {
    setLoading(loading);
  };

  const loginWithCredentials = async (
    email: string, 
    password: string,
    cancelRef?: React.MutableRefObject<boolean>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Configurar timeout para a operação de login
      const loginPromise = authService.loginWithEmailPassword(email, password);
      
      // Timeout de 20 segundos para todo o processo de login
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), 20000);
      });
      
      // Usar Promise.race para aplicar o timeout à requisição de login
      const response = await Promise.race([loginPromise, timeoutPromise]);
      
      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }
      
      await login(response.token, response.user, response.refreshToken);
      
      // Verificar novamente se a operação foi cancelada antes de navegar
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }
      
      // Navegar para tela principal
      if (response.user.currentRepublicId) {
        router.replace('/(panel)/home');
      } else {
        router.replace('/(republic)/choice');
      }
    } catch (error) {
      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }
      
      const parsedError = await ErrorHandler.parseError(error);
      setError(parsedError.message);
      ErrorHandler.logError(parsedError);
    } finally {
      // Se não foi cancelado, definir loading como falso
      if (!cancelRef?.current) {
        setLoading(false);
      }
    }
  };

  const loginWithGoogle = async (
    payload: authService.GoogleLoginPayload,
    cancelRef?: React.MutableRefObject<boolean>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Configurar timeout para a operação de login
      const loginPromise = authService.loginWithGoogle(payload);

      // Timeout de 20 segundos para todo o processo de login
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), 20000);
      });

      // Usar Promise.race para aplicar o timeout à requisição de login
      const response = await Promise.race([loginPromise, timeoutPromise]);

      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }

      await login(response.token, response.user, response.refreshToken);

      // Verificar novamente se a operação foi cancelada antes de navegar
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }

      // Navegar para tela principal
      if (response.user.currentRepublicId) {
        router.replace('/(panel)/home');
      } else {
        router.replace('/(republic)/choice');
      }
    } catch (error) {
      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return;
      }

      const parsedError = await ErrorHandler.parseError(error);
      setError(parsedError.message);
      ErrorHandler.logError(parsedError);
    } finally {
      // Se não foi cancelado, definir loading como falso
      if (!cancelRef?.current) {
        setLoading(false);
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      const parsedError = await ErrorHandler.parseError(error);
      setError(parsedError.message);
      ErrorHandler.logError(parsedError);
    } finally {
      // Limpar estado e redirecionar sempre, mesmo se logout remoto falhar
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
      setLoading(false);
      router.replace('/(auth)/sign-in');
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const currentRefresh = await getRefreshToken();
      if (!currentRefresh) return false;

      const response = await authService.refreshAuthToken(currentRefresh);
      if (!response?.token) return false;

      // Atualizar token e dados do usuário
      if (response.user) {
        setUser(response.user);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

      return true;
    } catch (error) {
      logger.error('Erro ao renovar token:', error);
      return false;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData: {
      name: string;
      nickname: string | null;
      phoneNumber: string;
    },
    cancelRef?: React.MutableRefObject<boolean>
  ): Promise<User | null> => {
    try {
      setLoading(true);
      clearError();

      // Configurar timeout para a operação de cadastro
      const signupPromise = authService.signUp(email, password, userData, cancelRef);
      
      // Timeout de 25 segundos para todo o processo de cadastro (um pouco maior pois envolve 2 requisições)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), 25000);
      });
      
      // Usar Promise.race para aplicar o timeout à requisição de cadastro
      const response = await Promise.race([signupPromise, timeoutPromise]);
      
      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return null;
      }
      
      // Armazenar token
      await storeToken(response.token);
      if (response.refreshToken) {
        await storeRefreshToken(response.refreshToken);
      }
      await storeData('user', JSON.stringify(response.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
      
      // Verificar novamente se a operação foi cancelada antes de finalizar o login
      if (cancelRef?.current) {
        await clearAuthData();
        setLoading(false);
        return null;
      }
      
      setUser(response.user);
      // Não precisamos chamar setIsAuthenticated explicitamente, pois isAuthenticated é calculado com base em !!user
      setLoading(false);
      
      // Navegar para tela de escolha de república
      router.replace('/(republic)/choice');
      
      return response.user;
    } catch (error: any) {
      // Verificar se a operação foi cancelada
      if (cancelRef?.current) {
        setLoading(false);
        return null;
      }
      
      setLoading(false);
      const parsedError = await ErrorHandler.parseError(error);
      setError(parsedError.message);
      ErrorHandler.logError(parsedError);
      return null;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        login,
        loginWithCredentials,
        loginWithGoogle,
        logout, 
        refreshToken,
        isAuthenticated: !!user,
        error,
        updateStoredUser,
        clearError,
        signUp,
        setLoading: setLoadingState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;