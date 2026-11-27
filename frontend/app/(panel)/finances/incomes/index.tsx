// app/(panel)/finances/incomes/index.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';
import IncomeItem from '../../../../components/finances/IncomeItem';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  Button,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  useTheme,
} from '../../../../src/design-system';
import { useFinances } from '../../../../src/hooks/useFinances';
import { Income } from '../../../../src/models/finances.model';

interface IncomesScreenProps {
  hideHeader?: boolean;
}

const IncomesScreen: React.FC<IncomesScreenProps> = ({ hideHeader = false }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { incomes, loadingIncomes, incomesError, fetchIncomes } = useFinances();

  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void fetchIncomes();
    }, [fetchIncomes])
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances');
    }
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchIncomes();
    } finally {
      setRefreshing(false);
    }
  }, [fetchIncomes]);

  const handleIncomePress = useCallback(
    (income: Income) => {
      router.push(`/(panel)/finances/incomes/${income.id}`);
    },
    [router]
  );

  const navigateToCreateIncome = useCallback(() => {
    router.push('/(panel)/finances/incomes/create');
  }, [router]);

  const subtitle = useMemo(() => {
    if (loadingIncomes && incomes.length === 0) return 'Carregando...';
    const count = incomes.length;
    return `${count} ${count === 1 ? 'receita' : 'receitas'}`;
  }, [loadingIncomes, incomes.length]);

  const body = (
    <View style={styles.body}>
      {loadingIncomes && incomes.length === 0 ? (
        <StateView kind="loading" title="Carregando receitas..." />
      ) : incomesError && incomes.length === 0 ? (
        <StateView
          kind="error"
          title="Erro ao carregar receitas"
          description={incomesError}
          actionLabel="Tentar novamente"
          onAction={() => void handleRefresh()}
        />
      ) : (
        <FlatList<Income>
          data={incomes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <IncomeItem
              income={item}
              onPress={handleIncomePress}
              currentUserId={user?.uid}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
          ListHeaderComponent={
            incomesError ? (
              <Surface
                tone="subtle"
                bordered
                padded="sm"
                radiusKey="sm"
                style={{
                  marginBottom: theme.spacing.sm,
                  gap: theme.spacing.xs,
                }}
              >
                <StatusText label={incomesError} tone="danger" showDot />
                <Button
                  label="Tentar novamente"
                  variant="secondary"
                  size="sm"
                  onPress={() => void handleRefresh()}
                />
              </Surface>
            ) : null
          }
          ListEmptyComponent={
            <StateView
              kind="empty"
              icon={
                <Wallet
                  size={32}
                  strokeWidth={1.75}
                  color={theme.colors.inkMuted}
                />
              }
              title="Nenhuma receita cadastrada"
              description="Registre contribuições, reembolsos e entradas financeiras da casa."
              actionLabel="Registrar Receita"
              onAction={navigateToCreateIncome}
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            {
              padding: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          removeClippedSubviews={Platform.OS !== 'web'}
        />
      )}
    </View>
  );

  if (hideHeader) {
    return body;
  }

  return (
    <Screen
      width="wide"
      padded={false}
      header={
        <ScreenHeader
          title="Receitas"
          subtitle={subtitle}
          onBack={handleBack}
          rightActions={
            <Button
              label="Nova"
              variant="primary"
              size="sm"
              leftIcon={
                <Plus size={16} strokeWidth={1.75} color={theme.colors.onAccent} />
              }
              onPress={navigateToCreateIncome}
              accessibilityLabel="Registrar nova receita"
            />
          }
        />
      }
    >
      {body}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
  listContainer: {
    flexGrow: 1,
  },
});

export default IncomesScreen;
