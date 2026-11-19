import { palette } from '../tokens/palette';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { elevation } from '../tokens/elevation';
import { motion } from '../tokens/motion';
import { Theme } from './types';

export const lightTheme: Theme = {
  mode: 'light',
  isDark: false,
  colors: {
    bg: palette.light.bg,
    surface: palette.light.surface,
    subtle: palette.light.subtle,
    ink: palette.light.ink,
    inkSecondary: palette.light.inkSecondary,
    inkMuted: palette.light.inkMuted,
    line: palette.light.line,
    borderStrong: palette.light.borderStrong,
    accent: palette.light.accent,
    onAccent: palette.light.onAccent,
    accentSoft: palette.light.accentSoft,
    success: palette.light.success,
    successSoft: palette.light.successSoft,
    warning: palette.light.warning,
    warningSoft: palette.light.warningSoft,
    danger: palette.light.danger,
    onDanger: palette.light.onDanger,
    dangerSoft: palette.light.dangerSoft,
    overlay: palette.light.overlay,
    chartSeries: palette.light.chartSeries,
  },
  typography,
  spacing,
  radius,
  elevation,
  motion,
};
