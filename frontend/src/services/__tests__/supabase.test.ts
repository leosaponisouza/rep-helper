jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'https://api.rephelper.com',
      },
    },
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: 'https://api.rephelper.com',
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import api from '../api';
import {
  MAX_IMAGE_UPLOAD_BYTES,
  sanitizeStorageUserId,
  validateImageUploadUri,
  extractOwnedStoragePath,
  uploadImageToSupabase,
  deleteImageFromSupabase,
} from '../supabase';

describe('backend media storage security helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.defaults as any).baseURL = 'https://api.rephelper.com';
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///tmp/compressed.jpg',
    });
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        url: 'https://api.rephelper.com/api/v1/media/public/receipts/user_1/123.jpg',
        bucket: 'receipts',
        filename: '123.jpg',
        contentType: 'image/jpeg',
      },
    });
    (api.delete as jest.Mock).mockResolvedValue({ status: 204 });
  });

  it('rejects anonymous, empty, or traversal userIds', () => {
    expect(sanitizeStorageUserId('user_123-abc')).toBe('user_123-abc');
    expect(() => sanitizeStorageUserId('anon')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('ANON')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('../other')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('u1/u2')).toThrow('Usuário inválido');
  });

  it('allows only safe local, blob, and raster base64 image URIs', () => {
    expect(() => validateImageUploadUri('file:///tmp/photo.jpg')).not.toThrow();
    expect(() => validateImageUploadUri('file:///tmp/my photo.jpg')).not.toThrow();
    expect(() => validateImageUploadUri('content://media/1')).not.toThrow();
    expect(() => validateImageUploadUri('ph://asset-id-1')).not.toThrow();
    expect(() => validateImageUploadUri('assets-library://asset/asset.JPG')).not.toThrow();
    expect(() => validateImageUploadUri('blob:http://localhost:8081/550e8400-e29b')).not.toThrow();
    expect(() => validateImageUploadUri('data:image/png;base64,iVBORw0KGgo=')).not.toThrow();
    expect(() => validateImageUploadUri('data:image/jpeg;base64,/9j/4AAQ')).not.toThrow();
    expect(() => validateImageUploadUri('data:image/webp;base64,UklGRg==')).not.toThrow();
    expect(() => validateImageUploadUri('data:image/gif;base64,R0lGODlh')).not.toThrow();

    expect(() => validateImageUploadUri('https://evil.com/ssrf.jpg')).toThrow('URI de imagem inválida');
    expect(() => validateImageUploadUri('http://evil.com/ssrf.jpg')).toThrow('URI de imagem inválida');
    expect(() => validateImageUploadUri('data:image/svg+xml;base64,PHN2Zz4=')).toThrow(
      'URI de imagem inválida'
    );
    expect(() => validateImageUploadUri('javascript:alert(1)')).toThrow('URI de imagem inválida');
    expect(() => validateImageUploadUri('')).toThrow('URI de imagem inválida');
  });

  it('extracts path only when origin matches backend and object belongs to ownerUserId', () => {
    const valid =
      'https://api.rephelper.com/api/v1/media/public/avatars/user_1/12345.jpg';
    expect(
      extractOwnedStoragePath(valid, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toBe('user_1/12345.jpg');

    const otherUser =
      'https://api.rephelper.com/api/v1/media/public/avatars/user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(otherUser, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Sem permissão para remover este arquivo');

    const prefixSpoof =
      'https://api.rephelper.com/api/v1/media/public/avatars/user_10/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(prefixSpoof, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Sem permissão para remover este arquivo');

    const traversal =
      'https://api.rephelper.com/api/v1/media/public/avatars/user_1/../user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(traversal, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Caminho de arquivo inválido');

    const encodedTraversal =
      'https://api.rephelper.com/api/v1/media/public/avatars/user_1/%2e%2e/user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(encodedTraversal, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Caminho de arquivo inválido');

    const evilOrigin =
      'https://evil.example/api/v1/media/public/avatars/user_1/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(evilOrigin, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Origem de armazenamento inválida');

    const httpDowngrade =
      'http://api.rephelper.com/api/v1/media/public/avatars/user_1/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(httpDowngrade, 'avatars', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Origem de armazenamento inválida');

    expect(() =>
      extractOwnedStoragePath(valid, '../other', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Bucket de armazenamento inválido');
    expect(() =>
      extractOwnedStoragePath(valid, 'avatars/sub', 'user_1', 'https://api.rephelper.com')
    ).toThrow('Bucket de armazenamento inválido');
  });

  it('rejects oversized uploads exceeding MAX_IMAGE_UPLOAD_BYTES', async () => {
    const result = await uploadImageToSupabase(
      'file:///tmp/huge.jpg',
      'receipts',
      'user_1',
      MAX_IMAGE_UPLOAD_BYTES + 1
    );

    expect(result.url).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uploads valid image via /api/v1/media/{bucket} and deletes only owned file', async () => {
    const uploadRes = await uploadImageToSupabase(
      'blob:http://localhost:8081/receipt-1',
      'receipts',
      'user_1',
      1024
    );

    expect(uploadRes.error).toBeNull();
    expect(uploadRes.url).toContain('/api/v1/media/public/');
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/media/receipts',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );

    const denyRes = await deleteImageFromSupabase(
      'https://api.rephelper.com/api/v1/media/public/avatars/user_2/123.jpg',
      'avatars',
      'user_1'
    );
    expect(denyRes.success).toBe(false);
    expect(denyRes.error?.message).toBe('Sem permissão para remover este arquivo');
    expect(api.delete).not.toHaveBeenCalled();

    const allowRes = await deleteImageFromSupabase(
      'https://api.rephelper.com/api/v1/media/public/avatars/user_1/123.jpg',
      'avatars',
      'user_1'
    );
    expect(allowRes.success).toBe(true);
    expect(allowRes.error).toBeNull();
    expect(api.delete).toHaveBeenCalledWith('/api/v1/media/avatars/123.jpg');
  });

  it('rejects untrusted origin and path traversal directly in deleteImageFromSupabase', async () => {
    const evilOriginRes = await deleteImageFromSupabase(
      'https://evil.example/api/v1/media/public/avatars/user_1/123.jpg',
      'avatars',
      'user_1'
    );
    expect(evilOriginRes.success).toBe(false);
    expect(evilOriginRes.error?.message).toBe('Origem de armazenamento inválida');
    expect(api.delete).not.toHaveBeenCalled();

    const traversalRes = await deleteImageFromSupabase(
      'https://api.rephelper.com/api/v1/media/public/avatars/user_1/../user_2/123.jpg',
      'avatars',
      'user_1'
    );
    expect(traversalRes.success).toBe(false);
    expect(traversalRes.error?.message).toBe('Caminho de arquivo inválido');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('converts compressed URI to Blob on web and rejects when fetch response is not ok', async () => {
    const originalOS = Platform.OS;
    const originalFetch = global.fetch;

    try {
      (Platform as any).OS = 'web';
      const mockBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
      const mockBlobFn = jest.fn().mockResolvedValue(mockBlob);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: mockBlobFn,
      } as any);

      const webOkRes = await uploadImageToSupabase(
        'blob:http://localhost:8081/receipt-web',
        'receipts',
        'user_1',
        1024
      );

      expect(webOkRes.error).toBeNull();
      expect(webOkRes.url).toContain('/api/v1/media/public/');
      expect(global.fetch).toHaveBeenCalledWith('file:///tmp/compressed.jpg');
      expect(mockBlobFn).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(
        '/api/v1/media/receipts',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );

      jest.clearAllMocks();
      const failBlobFn = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        blob: failBlobFn,
      } as any);

      const webFailRes = await uploadImageToSupabase(
        'blob:http://localhost:8081/receipt-web-fail',
        'receipts',
        'user_1',
        1024
      );

      expect(webFailRes.url).toBeNull();
      expect(webFailRes.error?.message).toBe('Falha ao ler imagem comprimida');
      expect(failBlobFn).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    } finally {
      (Platform as any).OS = originalOS;
      global.fetch = originalFetch;
    }
  });
});
