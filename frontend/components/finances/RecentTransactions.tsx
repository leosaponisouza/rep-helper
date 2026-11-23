// components/Finances/RecentTransactions.tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Wallet,
} from 'lucide-react-native';
import {
  AppText,
  Button,
  ListRow,
  SegmentedTabs,
  Skeleton,
  StateView,
  Surface,
  useTheme,
} from '../../src/design-system';
import { Transaction } from '../../src/models/finances.model';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';
import { formatLocalDate } from '../../src/utils/dateUtils';

type TransactionFilter = 'ALL' | 'EXPENSE' | 'INCOME';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPressTransaction?: (transaction: Transaction) => void;
  onPressViewAll?: () => void;
  maxItems?: number;
}

const FILTER_OPTIONS: ReadonlyArray<{ value: TransactionFilter; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'EXPENSE', label: 'Despesas' },
  { value: 'INCOME', label: 'Receitas' },
];

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  loading = false,
  error = null,
  onRetry,
  onPressTransaction,
  onPressViewAll,
  maxItems = 5,
}) => {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const [expanded, setExpanded] = useState(false);

  const matchingTransactions = useMemo(
    () =>
      transactions.filter((t) => filter === 'ALL' || t.type === filter),
    [transactions, filter]
  );

  const visibleTransactions = useMemo(
    () =>
      expanded
        ? matchingTransactions
        : matchingTransactions.slice(0, maxItems),
    [expanded, matchingTransactions, maxItems]
  );

  if (loading) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <AppText variant="heading" color="ink">
          Transações Recentes
        </AppText>
        <Skeleton width="100%" height={40} radiusKey="sm" />
        <Skeleton width="100%" height={48} radiusKey="sm" />
        <Skeleton width="100%" height={48} radiusKey="sm" />
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.xs }}
      >
        <AppText variant="heading" color="ink">
          Transações Recentes
        </AppText>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={error}
          actionLabel={onRetry ? 'Tentar novamente' : undefined}
          onAction={onRetry}
        />
      </Surface>
    );
  }

  const hasMoreItems = matchingTransactions.length > maxItems;

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.sm }}
    >
      <View style={[styles.headerRow, { gap: theme.spacing.xs }]}>
        <AppText variant="heading" color="ink" style={styles.sectionTitle}>
          Transações Recentes
        </AppText>

        {onPressViewAll ? (
          <Button
            label="Ver todas"
            variant="ghost"
            size="sm"
            onPress={onPressViewAll}
            leftIcon={
              <ChevronRight size={16} strokeWidth={1.75} color={theme.colors.accent} />
            }
          />
        ) : null}
      </View>

      <SegmentedTabs<TransactionFilter>
        options={FILTER_OPTIONS}
        value={filter}
        onChange={(nextFilter) => {
          setFilter(nextFilter);
          setExpanded(false);
        }}
      />

      {visibleTransactions.length === 0 ? (
        <StateView
          kind="empty"
          icon={<Wallet size={28} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title={
            filter === 'ALL'
              ? 'Nenhuma transação recente'
              : filter === 'EXPENSE'
                ? 'Nenhuma despesa recente'
                : 'Nenhuma receita recente'
          }
          description="As movimentações mais recentes da república aparecerão aqui."
        />
      ) : (
        <View>
          <Surface tone="surface" bordered radiusKey="md" style={styles.listFrame}>
            {visibleTransactions.map((item, index) => {
              const isExpense = item.type === 'EXPENSE';
              const formattedDate =
                formatLocalDate(item.date, 'dd MMM') || item.date || '';
              const subtitleParts = [
                formattedDate || null,
                isExpense ? 'Despesa' : 'Receita',
              ].filter(Boolean);

              return (
                <ListRow
                  key={`transaction-${item.type}-${item.id}-${index}`}
                  title={item.description}
                  subtitle={subtitleParts.join(' · ')}
                  showDivider={index < visibleTransactions.length - 1}
                  onPress={
                    onPressTransaction ? () => onPressTransaction(item) : undefined
                  }
                  leading={
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isExpense
                            ? theme.colors.dangerSoft
                            : theme.colors.successSoft,
                          borderRadius: theme.radius.full,
                        },
                      ]}
                    >
                      {isExpense ? (
                        <ArrowUpRight
                          size={18}
                          strokeWidth={1.75}
                          color={theme.colors.danger}
                        />
                      ) : (
                        <ArrowDownLeft
                          size={18}
                          strokeWidth={1.75}
                          color={theme.colors.success}
                        />
                      )}
                    </View>
                  }
                  trailing={
                    <AppText
                      variant="monoValue"
                      color={isExpense ? 'danger' : 'success'}
                      numberOfLines={1}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrencyBRL(item.amount)}
                    </AppText>
                  }
                />
              );
            })}
          </Surface>

          {hasMoreItems ? (
            <View style={{ marginTop: theme.spacing.xs }}>
              <Button
                label={
                  expanded
                    ? 'Ver menos'
                    : `Ver mais ${matchingTransactions.length - maxItems} transações`
                }
                variant="ghost"
                size="sm"
                fullWidth
                onPress={() => setExpanded((prev) => !prev)}
                leftIcon={
                  expanded ? (
                    <ChevronUp size={16} strokeWidth={1.75} color={theme.colors.accent} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={1.75} color={theme.colors.accent} />
                  )
                }
              />
            </View>
          ) : null}
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flex: 1,
  },
  listFrame: {
    overflow: 'hidden',
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecentTransactions;
