import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { elevation } from '../tokens/elevation';
import { motion } from '../tokens/motion';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  subtle: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  line: string;
  borderStrong: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  onDanger: string;
  dangerSoft: string;
  overlay: string;
  chartSeries: readonly [string, string, string, string, string, string];
}

export interface Theme {
  mode: ResolvedTheme;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
}
