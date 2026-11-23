import { formatCurrencyBRL, parseCurrencyInput } from '../currencyUtils';

describe('currencyUtils', () => {
  it('formats numbers as BRL currency string', () => {
    expect(formatCurrencyBRL(1250.5)).toMatch(/R\$\s?1\.250,50/);
    expect(formatCurrencyBRL(0)).toMatch(/R\$\s?0,00/);
    expect(formatCurrencyBRL(null)).toMatch(/R\$\s?0,00/);
  });

  it('parses Brazilian currency strings and numbers accurately', () => {
    expect(parseCurrencyInput('R$ 1.250,50')).toBe(1250.5);
    expect(parseCurrencyInput('45,90')).toBe(45.9);
    expect(parseCurrencyInput('120.75')).toBe(120.75);
    expect(parseCurrencyInput(89.9)).toBe(89.9);
    expect(Number.isNaN(parseCurrencyInput(''))).toBe(true);
    expect(Number.isNaN(parseCurrencyInput('abc'))).toBe(true);
  });
});
