import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_DIMENSIONS: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

function extractInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return '?';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

/**
 * Circular avatar displaying a remote image with automatic initials fallback over `accentSoft`.
 */
export function Avatar({
  uri,
  name,
  size = 'md',
  style,
}: AvatarProps): React.ReactElement {
  const { theme } = useTheme();
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [uri]);

  const dimension = AVATAR_DIMENSIONS[size];
  const validUri = uri?.trim();
  const showImage = Boolean(validUri && !hasImageError);
  const label = name ? `Avatar de ${name}` : 'Avatar';

  const circleStyle = {
    width: dimension,
    height: dimension,
    borderRadius: theme.radius.full,
  };

  if (showImage && validUri) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={label}
        style={[
          styles.container,
          circleStyle,
          { backgroundColor: theme.colors.subtle, borderColor: theme.colors.line },
          style,
        ]}
      >
        <Image
          source={{ uri: validUri }}
          onError={() => setHasImageError(true)}
          accessibilityIgnoresInvertColors={true}
          style={[circleStyle, styles.image]}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.container,
        circleStyle,
        {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.line,
        },
        style,
      ]}
    >
      <AppText variant={size === 'lg' ? 'heading' : 'caption'} color="accent">
        {extractInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    resizeMode: 'cover',
  },
});
