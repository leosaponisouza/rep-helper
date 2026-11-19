// Serviço de armazenamento seguro no Supabase Storage
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '../utils/logger';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const SAFE_USER_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_BUCKET_REGEX = /^[a-zA-Z0-9._-]{1,64}$/;
const SAFE_LOCAL_URI_REGEX = /^(file|content|ph|assets-library):\/\/[^\r\n]+$/i;
const SAFE_BLOB_URI_REGEX = /^blob:(?!.*javascript:)[^\s\r\n]+$/i;
const SAFE_RASTER_DATA_URI_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i;

const getSupabaseConfig = (): { supabaseUrl: string; supabaseAnonKey: string } => {
  const extra = Constants.expoConfig?.extra || {};
  const supabaseUrl: string = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey: string = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  return { supabaseUrl, supabaseAnonKey };
};

const initialConfig = getSupabaseConfig();

// Evita crash no import quando variáveis de ambiente não estão configuradas (ex.: testes)
export const supabase: SupabaseClient | null =
  initialConfig.supabaseUrl && initialConfig.supabaseAnonKey
    ? createClient(initialConfig.supabaseUrl, initialConfig.supabaseAnonKey)
    : null;

/**
 * Valida e normaliza o identificador do usuário para uso em caminhos do Storage.
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

  const expectedPrefix = `/storage/v1/object/public/${safeBucket}/`;
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

  const ownerPrefix = `public/${safeOwnerUserId}/`;
  if (!storagePath.startsWith(ownerPrefix) || storagePath.length <= ownerPrefix.length) {
    throw new Error('Sem permissão para remover este arquivo');
  }

  return storagePath;
}

/**
 * Upload autenticado de imagem para o Supabase Storage com validação de URI, tamanho e usuário.
 */
export const uploadImageToSupabase = async (
  uri: string,
  bucket: string = 'avatars',
  userId: string,
  fileSizeBytes?: number
): Promise<{ url: string | null; error: Error | null }> => {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    if (!supabaseUrl || !supabaseAnonKey || !supabase) {
      throw new Error('Configuração do Supabase ausente');
    }

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

    logger.debug('Iniciando upload autenticado para Supabase...');
    logger.debug('Comprimindo imagem...');

    const compressedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileName = `${Date.now()}.jpg`;
    const filePath = `public/${safeUserId}/${fileName}`;

    logger.debug(`Caminho do arquivo: ${filePath}`);

    let uploadBody: unknown = {
      uri: compressedImage.uri,
      type: 'image/jpeg',
      name: fileName,
    };

    if (Platform.OS === 'web' && typeof fetch === 'function') {
      const blobResponse = await fetch(compressedImage.uri);
      if (!blobResponse.ok) {
        throw new Error('Falha ao ler imagem comprimida');
      }
      uploadBody = await blobResponse.blob();
    }

    const { error } = await supabase.storage
      .from(safeBucket)
      .upload(filePath, uploadBody as any, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (error) {
      logger.error('Erro do Supabase:', error);
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(safeBucket)
      .getPublicUrl(filePath);

    logger.debug('URL gerada:', urlData.publicUrl);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    logger.error('Erro ao enviar imagem para Supabase:', error);
    return { url: null, error: error instanceof Error ? error : new Error('Erro ao fazer upload') };
  }
};

/**
 * Exclui imagem do Supabase Storage somente se a origem, o caminho e a posse forem válidos.
 */
export const deleteImageFromSupabase = async (
  url: string,
  bucket: string = 'avatars',
  ownerUserId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    if (!supabaseUrl || !supabaseAnonKey || !supabase) {
      throw new Error('Configuração do Supabase ausente');
    }

    const safeBucket = sanitizeStorageBucket(bucket);
    const urlPath = extractOwnedStoragePath(url, safeBucket, ownerUserId, supabaseUrl);

    logger.debug(`Excluindo arquivo: ${urlPath}`);

    const { error } = await supabase.storage
      .from(safeBucket)
      .remove([urlPath]);

    if (error) {
      logger.error('Erro ao excluir:', error);
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erro ao excluir:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Erro ao excluir arquivo') };
  }
};
