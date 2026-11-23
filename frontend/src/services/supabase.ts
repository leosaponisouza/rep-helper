// Serviço de upload e remoção de imagens hospedadas no backend RepHelper (/api/v1/media)
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import api from './api';
import { logger } from '../utils/logger';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const SAFE_USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_BUCKET_REGEX = /^[a-zA-Z0-9._-]{1,64}$/;
const SAFE_LOCAL_URI_REGEX = /^(file|content|ph|assets-library):\/\/[^\r\n]+$/i;
const SAFE_BLOB_URI_REGEX = /^blob:(?!.*javascript:)[^\s\r\n]+$/i;
const SAFE_RASTER_DATA_URI_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;

const resolveMediaBaseUrl = (): string => {
  const extra = Constants.expoConfig?.extra || {};
  return (
    api.defaults.baseURL ||
    extra.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ''
  );
};

/**
 * Valida e normaliza o identificador do usuário para uso em caminhos de mídia.
 */
export function sanitizeStorageUserId(userId: string): string {
  if (
    typeof userId !== 'string' ||
    !SAFE_USER_ID_REGEX.test(userId) ||
    userId.toLowerCase() === 'anon'
  ) {
    throw new Error('Usuário inválido');
  }
  return userId;
}

/**
 * Valida o nome do bucket para impedir path traversal ou separadores.
 */
function sanitizeStorageBucket(bucket: string): string {
  if (
    typeof bucket !== 'string' ||
    !SAFE_BUCKET_REGEX.test(bucket) ||
    bucket === '.' ||
    bucket.includes('..')
  ) {
    throw new Error('Bucket de armazenamento inválido');
  }
  return bucket;
}

/**
 * Permite apenas URIs locais do dispositivo, blob URLs (web) e data URIs raster base64 seguros.
 */
export function validateImageUploadUri(uri: string): void {
  if (typeof uri !== 'string') {
    throw new Error('URI de imagem inválida');
  }

  const trimmed = uri.trim();
  if (!trimmed) {
    throw new Error('URI de imagem inválida');
  }

  const isAllowed =
    SAFE_LOCAL_URI_REGEX.test(trimmed) ||
    SAFE_BLOB_URI_REGEX.test(trimmed) ||
    SAFE_RASTER_DATA_URI_REGEX.test(trimmed);

  if (!isAllowed) {
    throw new Error('URI de imagem inválida');
  }
}

/**
 * Valida origem, ausência de path traversal e posse do arquivo antes de exclusão.
 */
export function extractOwnedStoragePath(
  url: string,
  bucket: string,
  ownerUserId: string,
  expectedBaseUrl: string
): string {
  const safeOwnerUserId = sanitizeStorageUserId(ownerUserId);
  const safeBucket = sanitizeStorageBucket(bucket);

  if (typeof url !== 'string' || typeof expectedBaseUrl !== 'string' || !expectedBaseUrl.trim()) {
    throw new Error('Origem de armazenamento inválida');
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(expectedBaseUrl);
  } catch {
    throw new Error('Origem de armazenamento inválida');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Caminho de arquivo inválido');
  }

  if (parsedUrl.origin !== parsedBaseUrl.origin) {
    throw new Error('Origem de armazenamento inválida');
  }

  // Inspeciona o caminho bruto antes que URL() normalize segmentos '.' ou '..'
  const schemeEnd = url.indexOf('://');
  const afterScheme = schemeEnd >= 0 ? url.slice(schemeEnd + 3) : url;
  const firstSlash = afterScheme.indexOf('/');
  const rawRest = firstSlash >= 0 ? afterScheme.slice(firstSlash) : '';
  const rawPath = rawRest.split(/[?#]/)[0];

  if (
    url.includes('\\') ||
    rawPath.includes('\\') ||
    /%2e%2e|%5c/i.test(rawPath)
  ) {
    throw new Error('Caminho de arquivo inválido');
  }

  for (const segment of rawPath.split('/')) {
    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error('Caminho de arquivo inválido');
    }

    if (
      segment === '.' ||
      segment === '..' ||
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      decodedSegment.includes('\\') ||
      decodedSegment.includes('/') ||
      /%2e%2e|%5c/i.test(decodedSegment)
    ) {
      throw new Error('Caminho de arquivo inválido');
    }
  }

  const basePathPrefix = parsedBaseUrl.pathname.replace(/\/+$/, '');
  const expectedPrefix = `${basePathPrefix}/api/v1/media/public/${safeBucket}/`;
  if (!parsedUrl.pathname.startsWith(expectedPrefix)) {
    throw new Error('Caminho de arquivo inválido');
  }

  let storagePath: string;
  try {
    storagePath = decodeURIComponent(parsedUrl.pathname.slice(expectedPrefix.length));
  } catch {
    throw new Error('Caminho de arquivo inválido');
  }

  if (!storagePath) {
    throw new Error('Caminho de arquivo inválido');
  }

  const ownerPrefix = `${safeOwnerUserId}/`;
  if (!storagePath.startsWith(ownerPrefix) || storagePath.length <= ownerPrefix.length) {
    throw new Error('Sem permissão para remover este arquivo');
  }

  return storagePath;
}

/**
 * Upload autenticado de imagem para o backend RepHelper com validação de URI, tamanho e usuário.
 */
export const uploadImage = async (
  uri: string,
  bucket: string = 'avatars',
  userId: string,
  fileSizeBytes?: number
): Promise<{ url: string | null; error: Error | null }> => {
  try {
    const safeUserId = sanitizeStorageUserId(userId);
    const safeBucket = sanitizeStorageBucket(bucket);
    validateImageUploadUri(uri);

    if (fileSizeBytes !== undefined) {
      if (
        typeof fileSizeBytes !== 'number' ||
        !Number.isFinite(fileSizeBytes) ||
        fileSizeBytes < 0
      ) {
        throw new Error('Tamanho de arquivo inválido');
      }
      if (fileSizeBytes > MAX_IMAGE_UPLOAD_BYTES) {
        throw new Error('Arquivo excede o limite de 5 MB');
      }
    }

    logger.debug(`Iniciando upload autenticado para /api/v1/media/${safeBucket}...`);

    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileName = `${safeUserId}-${Date.now()}.jpg`;
    const formData = new FormData();

    if (Platform.OS === 'web' && typeof fetch === 'function') {
      const blobResponse = await fetch(compressedImage.uri);
      if (!blobResponse.ok) {
        throw new Error('Falha ao ler imagem comprimida');
      }
      const blob = await blobResponse.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', {
        uri: compressedImage.uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
    }

    const response = await api.post<{ url?: string }>(
      `/api/v1/media/${safeBucket}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      }
    );

    const publicUrl = response.data?.url;
    if (!publicUrl) {
      throw new Error('Resposta do servidor sem URL de imagem');
    }

    logger.debug('URL recebida:', publicUrl);
    return { url: publicUrl, error: null };
  } catch (error) {
    logger.error('Erro ao enviar imagem:', error);
    return { url: null, error: error instanceof Error ? error : new Error('Erro ao fazer upload') };
  }
};

/**
 * Exclui imagem hospedada no backend somente se a origem, o caminho e a posse forem válidos.
 */
export const deleteImage = async (
  url: string,
  bucket: string = 'avatars',
  ownerUserId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const baseUrl = resolveMediaBaseUrl();
    if (!baseUrl) {
      throw new Error('URL da API não configurada');
    }

    const safeBucket = sanitizeStorageBucket(bucket);
    const ownedPath = extractOwnedStoragePath(url, safeBucket, ownerUserId, baseUrl);
    const filename = ownedPath.split('/').pop();
    if (!filename) {
      throw new Error('Caminho de arquivo inválido');
    }

    logger.debug(`Excluindo arquivo de mídia: ${ownedPath}`);
    await api.delete(`/api/v1/media/${safeBucket}/${encodeURIComponent(filename)}`);
    return { success: true, error: null };
  } catch (error) {
    logger.error('Erro ao excluir:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Erro ao excluir arquivo') };
  }
};

// Aliases mantidos para compatibilidade com importações existentes
export const uploadImageToSupabase = uploadImage;
export const deleteImageFromSupabase = deleteImage;
