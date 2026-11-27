// src/utils/authProtection.tsx
import React, { useMemo } from 'react';
import { useSegments, Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Screen, StateView } from '../design-system';

export interface AuthRouteState {
  isAuthenticated: boolean;
  loading: boolean;
  segments: readonly string[];
  currentHouseId?: string | null;
}

export function resolveAuthRedirect(state: AuthRouteState): string | null {
  if (state.loading) return null;

  const segs = state.segments as readonly string[];
  const inAuthGroup = segs[0] === '(auth)';
  const inHouseGroup = segs[0] === '(house)';
  const inPanelGroup = segs[0] === '(panel)';

  if (!state.isAuthenticated) {
    return inAuthGroup ? null : '/(auth)/sign-in';
  }

  if (inAuthGroup) {
    return state.currentHouseId ? '/(panel)/home' : '/(house)/choice';
  }

  if (inPanelGroup && !state.currentHouseId) {
    return '/(house)/choice';
  }

  if (inHouseGroup && state.currentHouseId && segs[1] !== 'new') {
    return '/(panel)/home';
  }

  return null;
}

export function useProtectedRoute(): { redirectTo: string | null; loading: boolean } {
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();

  const redirectTo = useMemo(
    () =>
      resolveAuthRedirect({
        isAuthenticated,
        loading,
        segments: segments as readonly string[],
        currentHouseId: user?.currentHouseId,
      }),
    [isAuthenticated, loading, segments, user?.currentHouseId]
  );

  return { redirectTo, loading };
}

export function AuthProtection({ children }: { children: React.ReactNode }): React.ReactElement {
  const { redirectTo, loading } = useProtectedRoute();
  const segments = useSegments() as readonly string[];
  const firstSegment = segments?.[0];
  const inAuthGroup = firstSegment === '(auth)';

  if (!firstSegment || (loading && !inAuthGroup)) {
    return (
      <Screen padded={false}>
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo as any} />;
  }

  return <>{children}</>;
}
