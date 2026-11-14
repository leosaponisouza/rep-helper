// src/utils/dateUtils.ts
import { format, parseISO, formatDistance, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const toSafeDate = (date?: Date | string | null): Date | null => {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? dateObj : null;
};

/**
 * Converte uma data JavaScript para string ISO no formato que o backend Java espera
 * para o tipo LocalDateTime (sem informação de fuso horário).
 */
export const formatToBackendDateTime = (date: Date): string => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
};

/**
 * Parse de uma string ISO para objeto Date mantendo o horário conforme
 * especificado na string (sem conversão automática de fuso)
 */
export const parseISOPreservingTime = (dateString: string): Date => {
  return parseISO(dateString);
};

/**
 * Formata uma data para exibição amigável com base na localização ptBR
 */
export const formatLocalDate = (
  date?: Date | string | null,
  formatString: string = "dd 'de' MMMM 'de' yyyy"
): string => {
  const safeDate = toSafeDate(date);
  if (!safeDate) return '';
  return format(safeDate, formatString, { locale: ptBR });
};

/**
 * Formata uma data no padrão curto dd/MM/yyyy
 */
export const formatShortDate = (date?: Date | string | null): string => {
  const safeDate = toSafeDate(date);
  if (!safeDate) return '';
  return format(safeDate, 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Retorna um texto de tempo relativo (ex: "há 5 minutos", "há 2 horas")
 */
export const getRelativeTime = (date?: Date | string | null): string => {
  const safeDate = toSafeDate(date);
  if (!safeDate) return '';
  return formatDistance(safeDate, new Date(), {
    addSuffix: true,
    locale: ptBR
  });
};

/**
 * Formata um horário para exibição (apenas horas e minutos)
 */
export const formatTime = (date?: Date | string | null): string => {
  const safeDate = toSafeDate(date);
  if (!safeDate) return '';
  return format(safeDate, 'HH:mm', { locale: ptBR });
};

/**
 * Combina parte de data ou hora selecionada em um DateTimePicker preservando a contraparte
 */
export const mergeDateAndTime = (
  baseDate: Date,
  selected: Date,
  mode: 'date' | 'time'
): Date => {
  if (mode === 'date') {
    return new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      baseDate.getHours(),
      baseDate.getMinutes(),
      0,
      0
    );
  }
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    selected.getHours(),
    selected.getMinutes(),
    0,
    0
  );
};
