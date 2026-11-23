import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

const DECORATIVE_SVG_ACCESSIBILITY_PROPS =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as Record<string, unknown>)
    : ({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no' as const,
      } as const);

/* brand-exception: official Google G mark palette authorized strictly inside BrandIcons.tsx */
const GOOGLE_BRAND_COLORS = {
  blue: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC05',
  red: '#EA4335',
} as const;

export interface GoogleIconProps {
  size?: number;
  monochrome?: boolean;
}

export interface InstagramIconProps {
  size?: number;
  color?: string;
}

/**
 * Third-party Google "G" SVG mark with optional monochrome theme ink rendering.
 */
export function GoogleIcon({
  size = 20,
  monochrome = false,
}: GoogleIconProps): React.ReactElement {
  const { theme } = useTheme();
  const monoFill = theme.colors.ink;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...DECORATIVE_SVG_ACCESSIBILITY_PROPS}
    >
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill={monochrome ? monoFill : GOOGLE_BRAND_COLORS.blue}
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill={monochrome ? monoFill : GOOGLE_BRAND_COLORS.green}
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill={monochrome ? monoFill : GOOGLE_BRAND_COLORS.yellow}
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill={monochrome ? monoFill : GOOGLE_BRAND_COLORS.red}
      />
    </Svg>
  );
}

/**
 * Third-party Instagram glyph SVG mark matching Lucide stroke weight (1.75).
 */
export function InstagramIcon({
  size = 20,
  color,
}: InstagramIconProps): React.ReactElement {
  const { theme } = useTheme();
  const resolvedColor = color ?? theme.colors.ink;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...DECORATIVE_SVG_ACCESSIBILITY_PROPS}
    >
      <Rect
        x={2}
        y={2}
        width={20}
        height={20}
        rx={5}
        ry={5}
        stroke={resolvedColor}
        strokeWidth={1.75}
      />
      <Circle
        cx={12}
        cy={12}
        r={4}
        stroke={resolvedColor}
        strokeWidth={1.75}
      />
      <Circle cx={17.5} cy={6.5} r={1} fill={resolvedColor} />
    </Svg>
  );
}
