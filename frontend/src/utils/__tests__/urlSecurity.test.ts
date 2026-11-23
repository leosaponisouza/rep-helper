import { encodePathSegment, validatePositiveIntId } from '../urlSecurity';

describe('urlSecurity', () => {
  it('validates positive integer IDs and rejects traversal or non-numeric strings', () => {
    expect(validatePositiveIntId(42)).toBe(42);
    expect(validatePositiveIntId('42')).toBe(42);
    expect(() => validatePositiveIntId('1/../../admin')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('-5')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('0')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId(0)).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId(-5)).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('1.5')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId(1.5)).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId(Number.NaN)).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId(Number.POSITIVE_INFINITY)).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('12abc')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('')).toThrow('Identificador inválido');
  });

  it('encodes path segments and rejects empty or traversal segments', () => {
    expect(encodePathSegment('rep-123')).toBe('rep-123');
    expect(encodePathSegment('  rep-123  ')).toBe('rep-123');
    expect(encodePathSegment('a/b')).toBe('a%2Fb');
    expect(encodePathSegment(42)).toBe('42');
    expect(() => encodePathSegment('.')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment('..')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment('a/../b')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment('  ')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment('')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment(Number.NaN)).toThrow('Parâmetro de rota inválido');
  });
});
