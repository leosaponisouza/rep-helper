jest.mock('@supabase/supabase-js', () => {
  const upload = jest.fn();
  const getPublicUrl = jest.fn();
  const remove = jest.fn();
  const from = jest.fn(() => ({
    upload,
    getPublicUrl,
    remove,
  }));

  return {
    createClient: jest.fn(() => ({
      storage: {
        from,
      },
    })),
    __mockStorage: {
      from,
      upload,
      getPublicUrl,
      remove,
    },
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      },
    },
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import * as ImageManipulator from 'expo-image-manipulator';
import {
  MAX_IMAGE_UPLOAD_BYTES,
  sanitizeStorageUserId,
  validateImageUploadUri,
  extractOwnedStoragePath,
  uploadImageToSupabase,
  deleteImageFromSupabase,
} from '../supabase';

const { __mockStorage } = require('@supabase/supabase-js') as {
  __mockStorage: {
    from: jest.Mock;
    upload: jest.Mock;
    getPublicUrl: jest.Mock;
    remove: jest.Mock;
  };
};

describe('supabase storage security helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///tmp/compressed.jpg',
    });
    __mockStorage.upload.mockResolvedValue({ data: { path: 'public/user_1/123.jpg' }, error: null });
    __mockStorage.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://demo.supabase.co/storage/v1/object/public/receipts/public/user_1/123.jpg',
      },
    });
    __mockStorage.remove.mockResolvedValue({ error: null });
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

  it('extracts path only when host matches Supabase and object belongs to ownerUserId', () => {
    const valid =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/12345.jpg';
    expect(
      extractOwnedStoragePath(valid, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toBe('public/user_1/12345.jpg');

    const otherUser =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(otherUser, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Sem permissão para remover este arquivo');

    const prefixSpoof =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_10/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(prefixSpoof, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Sem permissão para remover este arquivo');

    const traversal =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/../user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(traversal, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Caminho de arquivo inválido');

    const encodedTraversal =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/%2e%2e/user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(encodedTraversal, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Caminho de arquivo inválido');

    const evilOrigin =
      'https://evil.example/storage/v1/object/public/avatars/public/user_1/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(evilOrigin, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Origem de armazenamento inválida');

    const httpDowngrade =
      'http://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(httpDowngrade, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Origem de armazenamento inválida');

    expect(() =>
      extractOwnedStoragePath(valid, '../other', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Bucket de armazenamento inválido');
    expect(() =>
      extractOwnedStoragePath(valid, 'avatars/sub', 'user_1', 'https://demo.supabase.co')
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
    expect(__mockStorage.upload).not.toHaveBeenCalled();
  });

  it('uploads valid image under user namespace and deletes only owned file', async () => {
    const uploadRes = await uploadImageToSupabase(
      'blob:http://localhost:8081/receipt-1',
      'receipts',
      'user_1',
      1024
    );

    expect(uploadRes.error).toBeNull();
    expect(uploadRes.url).toContain('/storage/v1/object/public/');
    expect(__mockStorage.from).toHaveBeenCalledWith('receipts');
    expect(__mockStorage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^public\/user_1\/\d+\.jpg$/),
      expect.anything(),
      expect.objectContaining({ upsert: true })
    );

    const denyRes = await deleteImageFromSupabase(
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_2/123.jpg',
      'avatars',
      'user_1'
    );
    expect(denyRes.success).toBe(false);
    expect(denyRes.error?.message).toBe('Sem permissão para remover este arquivo');
    expect(__mockStorage.remove).not.toHaveBeenCalled();

    const allowRes = await deleteImageFromSupabase(
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/123.jpg',
      'avatars',
      'user_1'
    );
    expect(allowRes.success).toBe(true);
    expect(allowRes.error).toBeNull();
    expect(__mockStorage.remove).toHaveBeenCalledWith(['public/user_1/123.jpg']);
  });

  it('does not crash on module import when Supabase config is missing and rejects upload cleanly', async () => {
    jest.resetModules();
    const prevUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    try {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { expoConfig: { extra: {} } },
      }));
      jest.doMock('@supabase/supabase-js', () =>
        jest.requireActual('@supabase/supabase-js')
      );

      const freshSupabase = require('../supabase');
      expect(freshSupabase.supabase).toBeNull();

      const res = await freshSupabase.uploadImageToSupabase(
        'file:///tmp/photo.jpg',
        'avatars',
        'user_1',
        1024
      );
      expect(res.url).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
    } finally {
      if (prevUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      jest.resetModules();
    }
  });
});
