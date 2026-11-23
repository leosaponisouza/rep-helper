import { fontFamilies } from '../../tokens/typography';
import { Theme } from '../types';

export interface EditorialChartConfig {
  backgroundColor: string;
  backgroundGradientFrom: string;
  backgroundGradientTo: string;
  decimalPlaces: number;
  color: (opacity?: number) => string;
  labelColor: (opacity?: number) => string;
  propsForDots: { r: string; strokeWidth: string; stroke: string };
  propsForBackgroundLines: { stroke: string };
  propsForLabels: { fontSize: number; fontFamily: string };
}

function clampOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) {
    return 1;
  }
  return Math.min(1, Math.max(0, opacity));
}

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(255, Math.max(0, Math.round(value)));
}

function formatRgba(r: number, g: number, b: number, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converts a 3/6/8-digit hex string (or rgb/rgba string) into an `rgba(r, g, b, opacity)` string.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const alpha = clampOpacity(opacity);
  const trimmed = hex.trim();

  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(
    trimmed
  );
  if (rgbMatch) {
    return formatRgba(
      clampChannel(Number(rgbMatch[1])),
      clampChannel(Number(rgbMatch[2])),
      clampChannel(Number(rgbMatch[3])),
      alpha
    );
  }

  const normalized = trimmed.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return formatRgba(r, g, b, alpha);
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized) || /^[0-9a-fA-F]{8}$/.test(normalized)) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return formatRgba(r, g, b, alpha);
  }

  return formatRgba(0, 0, 0, alpha);
}

/**
 * Builds a flat editorial `react-native-chart-kit` config derived strictly from theme tokens.
 */
export function createChartConfig(theme: Theme): EditorialChartConfig {
  return {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => hexToRgba(theme.colors.accent, opacity),
    labelColor: (opacity = 1) => hexToRgba(theme.colors.inkSecondary, opacity),
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.surface,
    },
    propsForBackgroundLines: {
      stroke: theme.colors.line,
    },
    propsForLabels: {
      fontSize: theme.typography.monoLabel.fontSize ?? 12,
      fontFamily:
        theme.typography.monoLabel.fontFamily ?? fontFamilies.monoMedium,
    },
  };
}
