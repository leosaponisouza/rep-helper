// components/Finances/FinancialSummary.tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Pencil,
  Receipt,
  Wallet,
} from 'lucide-react-native';
import {
  AppText,
  AppTextColor,
  Divider,
  IconButton,
  Skeleton,
  StateView,
  StatusText,
  Surface,
  useTheme,
} from '../../src/design-system';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  valueColor?: AppTextColor;
  icon: React.ReactNode;
  onPress?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  subtitle,
  value,
  valueColor = 'ink',
  icon,
  onPress,
}) => {
  const { theme } = useTheme();

  const inner = (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.xs }}
    >
      <View style={styles.metricTopRow}>
        <AppText variant="monoLabel" color="inkSecondary" numberOfLines={1}>
          {title}
        </AppText>
        {icon}
      </View>
      <AppText
        variant="monoValue"
        color={valueColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {value}
      </AppText>
      <AppText variant="caption" color="inkMuted" numberOfLines={1}>
        {subtitle}
      </AppText>
    </Surface>
  );

  if (!onPress) {
    return <View style={styles.metricCell}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      style={({ pressed }) => [
        styles.metricCell,
        { opacity: pressed ? theme.motion.pressOpacity : 1 },
      ]}
    >
      {inner}
    </Pressable>
  );
};

interface FinancialSummaryProps {
  currentBalance: number;
  pendingExpenses: number;
  approvedExpenses: number;
  totalExpenses?: number;
  totalIncomes: number;
  totalExpensesCurrentMonth?: number;
  totalIncomesCurrentMonth?: number;
  hasSharedFund?: boolean;
  requireExpenseApproval?: boolean;
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  onRetry?: () => void;
  onPressBalance?: () => void;
  onPressExpenses?: () => void;
  onPressIncomes?: () => void;
  onAdjustBalance?: () => void;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  currentBalance,
  pendingExpenses,
  approvedExpenses,
  totalExpenses,
  totalIncomes,
  totalExpensesCurrentMonth,
  totalIncomesCurrentMonth,
  hasSharedFund = true,
  requireExpenseApproval = true,
  loading = false,
  error = null,
  isAdmin = false,
  onRetry,
  onPressBalance,
  onPressExpenses,
  onPressIncomes,
  onAdjustBalance,
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <Skeleton width="40%" height={14} />
        <Skeleton width="65%" height={32} />
        <Divider />
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <Skeleton width="48%" height={84} radiusKey="md" />
          <Skeleton width="48%" height={84} radiusKey="md" />
        </View>
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface tone="surface" bordered padded="md" radiusKey="md">
        <StateView
          kind="error"
          title="Não foi possível carregar o resumo"
          description={error}
          actionLabel={onRetry ? 'Tentar novamente' : undefined}
          onAction={onRetry}
        />
      </Surface>
    );
  }

  if (!hasSharedFund) {
    const monthlyTotal = totalExpensesCurrentMonth ?? approvedExpenses;
    const formattedMonthly = formatCurrencyBRL(monthlyTotal);
    const cumulativeTotal = totalExpenses ?? approvedExpenses;

    return (
      <View style={{ gap: theme.spacing.sm }}>
        <Surface
          tone="surface"
          bordered
          padded="md"
          radiusKey="md"
          style={{ gap: theme.spacing.xs }}
        >
          <View style={[styles.balanceHeader, { gap: theme.spacing.xs }]}>
            <Pressable
              onPress={onPressExpenses}
              disabled={!onPressExpenses}
              accessibilityRole={onPressExpenses ? 'button' : undefined}
              accessibilityLabel={`Gastos no mês: ${formattedMonthly}`}
              style={({ pressed }) => [
                styles.balancePressable,
                { opacity: pressed && onPressExpenses ? theme.motion.pressOpacity : 1 },
              ]}
            >
              <View style={{ gap: theme.spacing.xxs }}>
                <View style={[styles.balanceLabelRow, { gap: theme.spacing.xs }]}>
                  <Receipt size={16} strokeWidth={1.75} color={theme.colors.accent} />
                  <AppText variant="monoLabel" color="inkSecondary">
                    Gastos no Mês
                  </AppText>
                </View>
                <AppText
                  variant="monoHero"
                  color="ink"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {formattedMonthly}
                </AppText>
              </View>
            </Pressable>

            <StatusText label="Acompanhamento" tone="accent" showDot />
          </View>
        </Surface>

        {requireExpenseApproval ? (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <MetricCard
              title="Pendentes"
              subtitle="Aguardando aprovação"
              value={formatCurrencyBRL(pendingExpenses)}
              valueColor="warning"
              icon={<Clock size={18} strokeWidth={1.75} color={theme.colors.warning} />}
              onPress={onPressExpenses}
            />
            <MetricCard
              title="Aprovadas"
              subtitle="Confirmadas"
              value={formatCurrencyBRL(approvedExpenses)}
              valueColor="success"
              icon={
                <CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.success} />
              }
              onPress={onPressExpenses}
            />
          </View>
        ) : (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <MetricCard
              title="Registradas"
              subtitle="Total acumulado"
              value={formatCurrencyBRL(cumulativeTotal)}
              valueColor="ink"
              icon={
                <CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.success} />
              }
              onPress={onPressExpenses}
            />
            <MetricCard
              title="Neste Mês"
              subtitle="Gastos correntes"
              value={formattedMonthly}
              valueColor="accent"
              icon={<ArrowUpRight size={18} strokeWidth={1.75} color={theme.colors.accent} />}
              onPress={onPressExpenses}
            />
          </View>
        )}
      </View>
    );
  }

  const isPositiveBalance = currentBalance >= 0;
  const formattedBalance = formatCurrencyBRL(currentBalance);
  const balanceBody = (
    <View style={{ gap: theme.spacing.xxs }}>
      <View style={[styles.balanceLabelRow, { gap: theme.spacing.xs }]}>
        <Wallet size={16} strokeWidth={1.75} color={theme.colors.accent} />
        <AppText variant="monoLabel" color="inkSecondary">
          Saldo da Caixinha
        </AppText>
      </View>
      <AppText
        variant="monoHero"
        color={isPositiveBalance ? 'success' : 'danger'}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {formattedBalance}
      </AppText>
    </View>
  );

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.xs }}
      >
        <View style={[styles.balanceHeader, { gap: theme.spacing.xs }]}>
          {onPressBalance ? (
            <Pressable
              onPress={onPressBalance}
              accessibilityRole="button"
              accessibilityLabel={`Saldo da caixinha: ${formattedBalance}`}
              style={({ pressed }) => [
                styles.balancePressable,
                { opacity: pressed ? theme.motion.pressOpacity : 1 },
              ]}
            >
              {balanceBody}
            </Pressable>
          ) : (
            <View style={styles.balancePressable}>{balanceBody}</View>
          )}

          <View style={[styles.balanceActions, { gap: theme.spacing.xs }]}>
            <StatusText
              label={isPositiveBalance ? 'Positivo' : 'Negativo'}
              tone={isPositiveBalance ? 'success' : 'danger'}
              showDot
            />
            {isAdmin && onAdjustBalance ? (
              <IconButton
                icon={<Pencil size={18} strokeWidth={1.75} color={theme.colors.accent} />}
                onPress={onAdjustBalance}
                accessibilityLabel="Ajustar saldo"
                variant="subtle"
              />
            ) : null}
          </View>
        </View>
      </Surface>

      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        <MetricCard
          title="Despesas"
          subtitle="Neste mês"
          value={formatCurrencyBRL(
            totalExpensesCurrentMonth ?? approvedExpenses + pendingExpenses
          )}
          valueColor="danger"
          icon={<ArrowUpRight size={18} strokeWidth={1.75} color={theme.colors.danger} />}
          onPress={onPressExpenses}
        />

        <MetricCard
          title="Receitas"
          subtitle="Neste mês"
          value={formatCurrencyBRL(totalIncomesCurrentMonth ?? totalIncomes)}
          valueColor="success"
          icon={<ArrowDownLeft size={18} strokeWidth={1.75} color={theme.colors.success} />}
          onPress={onPressIncomes}
        />
      </View>

      {requireExpenseApproval ? (
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <MetricCard
            title="Pendentes"
            subtitle="Neste mês"
            value={formatCurrencyBRL(pendingExpenses)}
            valueColor="warning"
            icon={<Clock size={18} strokeWidth={1.75} color={theme.colors.warning} />}
            onPress={onPressExpenses}
          />

          <MetricCard
            title="Aprovadas"
            subtitle="Neste mês"
            value={formatCurrencyBRL(approvedExpenses)}
            valueColor="accent"
            icon={<CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.accent} />}
            onPress={onPressExpenses}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balancePressable: {
    flex: 1,
    minWidth: 0,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  metricCell: {
    flex: 1,
    minWidth: 0,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default FinancialSummary;
