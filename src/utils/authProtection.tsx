// src/utils/authProtection.tsx
import React, { useMemo } from 'react';
import { useSegments, Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export interface AuthRouteState {
  isAuthenticated: boolean;
  loading: boolean;
  segments: readonly string[];
  currentRepublicId?: string | null;
}

/**
 * Resolve de forma síncrona a rota de redirecionamento com base no estado de autenticação e segmentos atuais.
 */
export function resolveAuthRedirect(state: AuthRouteState): string | null {
  if (state.loading) return null;

  const segs = state.segments as readonly string[];
  const inAuthGroup = segs[0] === '(auth)';
  const inRepublicGroup = segs[0] === '(republic)';
  const inPanelGroup = segs[0] === '(panel)';

  if (!state.isAuthenticated) {
    if (inPanelGroup || inRepublicGroup) {
      return '/(auth)/sign-in';
    }
    return null;
  }

  if (inAuthGroup) {
    return state.currentRepublicId ? '/(panel)/home' : '/(republic)/choice';
  }

  if (inPanelGroup && !state.currentRepublicId) {
    return '/(republic)/choice';
  }

  if (inRepublicGroup && state.currentRepublicId && segs[1] !== 'new') {
    return '/(panel)/home';
  }

  return null;
}

/**
 * Hook que verifica se o usuário está autenticado e determina a rota de redirecionamento de forma síncrona.
 */
export function useProtectedRoute(): { redirectTo: string | null; loading: boolean } {
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();

  const redirectTo = useMemo(
    () =>
      resolveAuthRedirect({
        isAuthenticated,
        loading,
        segments: segments as readonly string[],
        currentRepublicId: user?.currentRepublicId,
      }),
    [isAuthenticated, loading, segments, user?.currentRepublicId]
  );

  return { redirectTo, loading };
}

/**
 * Componente de proteção de autenticação para ser usado em layouts.
 */
export function AuthProtection({ children }: { children: React.ReactNode }): React.ReactElement {
  const { redirectTo, loading } = useProtectedRoute();
  const segments = useSegments() as readonly string[];
  const inAuthGroup = segments[0] === '(auth)';

  // Em telas de autenticação, não mostramos o loading global;
  // o loading e erros serão tratados por cada tela específica.
  if (loading && !inAuthGroup) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }}>
        <ActivityIndicator size="large" color="#7B68EE" />
      </View>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo as any} />;
  }

  return <>{children}</>;
}
