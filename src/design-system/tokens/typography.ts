import { TextStyle } from 'react-native';

/**
 * Loaded Expo Google Font family names for the Editorial de Convivência scale.
 */
export const fontFamilies = {
  serifSemiBold: 'SourceSerif4_600SemiBold',
  sansRegular: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
  sansBold: 'IBMPlexSans_700Bold',
  monoRegular: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'monoLabel'
  | 'monoValue'
  | 'monoHero';

/**
 * Closed 9-variant semantic typography scale.
 */
export const typography: Record<TypographyVariant, TextStyle> = {
  display: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  monoLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  monoValue: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  monoHero: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
};
