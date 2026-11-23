// app/index.tsx
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Screen, StateView } from '../src/design-system';

export default function Index() {
  const { user, isAuthenticated, loading, error } = useAuth();
  const [canRedirect, setCanRedirect] = useState(false);

  // Em vez de navegar imediatamente, vamos esperar um pouco
  useEffect(() => {
    // Apenas configure redirecionamento quando não estiver carregando
    if (!loading) {
      // Dar tempo para a UI renderizar e o componente montar completamente
      const timer = setTimeout(() => {
        setCanRedirect(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <Screen padded={false}>
        <StateView kind="loading" title="Carregando..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen padded={false}>
        <StateView
          kind="error"
          title={error}
          description="Redirecionando para login..."
        />
        {canRedirect ? <Redirect href="/(auth)/sign-in" /> : null}
      </Screen>
    );
  }

  if (isAuthenticated && canRedirect) {
    if (user?.currentRepublicId) {
      return <Redirect href="/(panel)/home" />;
    }
    return <Redirect href="/(republic)/choice" />;
  }

  if (!isAuthenticated && canRedirect) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Screen padded={false}>
      <StateView kind="loading" />
    </Screen>
  );
}
