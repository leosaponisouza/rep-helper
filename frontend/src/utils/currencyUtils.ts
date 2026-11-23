// src/utils/currencyUtils.ts

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata um valor numérico como moeda brasileira (R$ 0,00)
 */
export const formatCurrencyBRL = (amount: number | null | undefined): string => {
  const numericValue = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return brlFormatter.format(numericValue);
};

/**
 * Converte uma string de moeda brasileira ("R$ 1.250,50", "45,90", "120.75") ou número para number
 */
export const parseCurrencyInput = (raw: string | number): number => {
  if (typeof raw === 'number') {
    return raw;
  }
  const trimmed = raw.replace(/[R$\s]/g, '').trim();
  if (!trimmed) {
    return Number.NaN;
  }

  let normalized = trimmed;
  if (trimmed.includes(',') && trimmed.includes('.')) {
    // Ex: 1.250,50 -> 1250.50
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes(',')) {
    // Ex: 45,90 -> 45.90
    normalized = trimmed.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};
