import axios from 'axios';
import api from './api';
import {
  House,
  HouseMember,
  CreateHouseRequest,
  CreateHouseResponse,
  UpdateHouseRequest,
  JoinHouseResponse,
  RegenerateCodeResponse,
} from '../models/house.model';
import { ErrorHandler } from '../utils/errorHandling';
import { logger } from '../utils/logger';
import { encodePathSegment } from '../utils/urlSecurity';

export const getHouse = async (houseId: string): Promise<House> => {
  const safeHouseId = encodePathSegment(houseId);
  try {
    const response = await api.get<House>(`/api/v1/houses/${safeHouseId}`);
    return response.data;
  } catch (error) {
    logger.error('Erro ao obter casa:', error);
    const parsedError = await ErrorHandler.parseError(error);
    throw parsedError;
  }
};

export const createHouse = async (houseData: CreateHouseRequest): Promise<CreateHouseResponse> => {
  try {
    if (!houseData.name || !houseData.name.trim()) {
      throw new Error('O nome da casa é obrigatório');
    }

    logger.debug('Enviando dados para criação de casa:', { name: houseData.name });
    const response = await api.post<CreateHouseResponse>('/api/v1/houses', houseData);
    logger.debug('Casa criada com sucesso:', { id: response.data?.house?.id });
    return response.data;
  } catch (error) {
    logger.error('Erro ao criar casa:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível criar a casa';
    throw parsedError;
  }
};

export const updateHouse = async (houseId: string, houseData: UpdateHouseRequest): Promise<House> => {
  const safeHouseId = encodePathSegment(houseId);
  try {
    const response = await api.put<House>(`/api/v1/houses/${safeHouseId}`, houseData);
    return response.data;
  } catch (error) {
    logger.error('Erro ao atualizar casa:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível atualizar a casa';
    throw parsedError;
  }
};

export const joinHouse = async (code: string): Promise<JoinHouseResponse> => {
  try {
    const response = await api.post<JoinHouseResponse>('/api/v1/houses/join', { code });
    return response.data;
  } catch (error) {
    logger.error('Erro ao entrar na casa:', error);

    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 404) {
        throw new Error('Casa não encontrada. Verifique o código e tente novamente.');
      } else if (error.response.status === 400) {
        throw new Error('Você já faz parte desta casa ou o código é inválido.');
      }
    }

    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível entrar na casa';
    throw parsedError;
  }
};

export const getHouseMembers = async (houseId: string): Promise<HouseMember[]> => {
  const safeHouseId = encodePathSegment(houseId);
  try {
    const response = await api.get<HouseMember[]>(`/api/v1/houses/${safeHouseId}/members`);
    return response.data;
  } catch (error) {
    logger.error('Erro ao obter moradores da casa:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível listar os moradores da casa';
    throw parsedError;
  }
};

export const promoteToAdmin = async (houseId: string, memberId: string): Promise<HouseMember> => {
  const safeHouseId = encodePathSegment(houseId);
  const safeMemberId = encodePathSegment(memberId);
  try {
    const response = await api.post<HouseMember>(`/api/v1/houses/${safeHouseId}/members/${safeMemberId}/admin`);
    return response.data;
  } catch (error) {
    logger.error('Erro ao promover morador a administrador:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível promover o morador a administrador';
    throw parsedError;
  }
};

export const demoteFromAdmin = async (houseId: string, memberId: string): Promise<HouseMember> => {
  const safeHouseId = encodePathSegment(houseId);
  const safeMemberId = encodePathSegment(memberId);
  try {
    const response = await api.delete<HouseMember>(`/api/v1/houses/${safeHouseId}/members/${safeMemberId}/admin`);
    return response.data;
  } catch (error) {
    logger.error('Erro ao remover privilégios de administrador:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível remover os privilégios de administrador';
    throw parsedError;
  }
};

export const removeMember = async (houseId: string, memberId: string): Promise<unknown> => {
  const safeHouseId = encodePathSegment(houseId);
  const safeMemberId = encodePathSegment(memberId);
  try {
    const response = await api.delete(`/api/v1/houses/${safeHouseId}/members/${safeMemberId}`);
    return response.data;
  } catch (error) {
    logger.error('Erro ao remover morador da casa:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível remover o morador da casa';
    throw parsedError;
  }
};

export const regenerateInviteCode = async (
  houseId: string,
  customCode?: string
): Promise<RegenerateCodeResponse> => {
  const safeHouseId = encodePathSegment(houseId);
  try {
    const response = await api.post<RegenerateCodeResponse>(
      `/api/v1/houses/${safeHouseId}/regenerate-code`,
      customCode ? { customCode } : {}
    );
    return response.data;
  } catch (error) {
    logger.error('Erro ao regenerar código de convite:', error);
    const parsedError = await ErrorHandler.parseError(error);
    parsedError.message = parsedError.message || 'Não foi possível gerar um novo código de convite';
    throw parsedError;
  }
};

export const getCodeLength = async (): Promise<number> => {
  try {
    const response = await api.get<{ length?: number; codeLength?: number }>('/api/v1/houses/code-length');
    return response.data.codeLength ?? response.data.length ?? 6;
  } catch (error) {
    logger.error('Erro ao obter comprimento do código:', error);
    return 6;
  }
};
