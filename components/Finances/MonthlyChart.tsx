// components/Finances/MonthlyChart.tsx
import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  AppText,
  createChartConfig,
  hexToRgba,
  Skeleton,
  StateView,
  Surface,
  useTheme,
} from '../../src/design-system';
import { MonthlyChartData, MonthlyData } from '../../src/models/finances.model';

const WEB_CONTAINER_MAX_WIDTH = 960;
const MIN_CHART_WIDTH = 220;
const CHART_HEIGHT = 220;

interface MonthlyChartProps {
  data?: MonthlyChartData | null;
  title?: string;
  loading?: boolean;
}

const sanitizeAmount = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCompactYLabel = (value: string): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  if (Math.abs(numeric) >= 1000) {
    return `${(numeric / 1000).toFixed(1).replace('.', ',')}k`;
  }
  return String(Math.round(numeric));
};

const MonthlyChart: React.FC<MonthlyChartProps> = ({
  data,
  title = 'Análise Mensal',
  loading = false,
}) => {
  const { theme } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const safeData: MonthlyData[] = Array.isArray(data?.monthlyData)
    ? data.monthlyData
    : [];

  const chartConfig = useMemo(() => createChartConfig(theme), [theme]);

  const fallbackWidth = Math.max(
    MIN_CHART_WIDTH,
    Math.min(viewportWidth, WEB_CONTAINER_MAX_WIDTH) - theme.spacing.md * 4 - 2
  );
  const chartWidth =
    measuredWidth > 0 ? Math.max(MIN_CHART_WIDTH, measuredWidth) : fallbackWidth;

  const handleChartLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== measuredWidth) {
      setMeasuredWidth(nextWidth);
    }
  };

  if (loading && safeData.length === 0) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <AppText variant="heading" color="ink">
          {title}
        </AppText>
        <Skeleton width="100%" height={CHART_HEIGHT} radiusKey="sm" />
      </Surface>
    );
  }

  if (safeData.length === 0) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.xs }}
      >
        <AppText variant="heading" color="ink">
          {title}
        </AppText>
        <StateView
          kind="empty"
          title="Sem dados suficientes"
          description="Não há dados suficientes para exibir o gráfico mensal."
        />
      </Surface>
    );
  }

  const labels = safeData.map((item) => item?.month || '');
  const expensesData = safeData.map((item) => sanitizeAmount(item?.expenses));
  const incomesData = safeData.map((item) => sanitizeAmount(item?.incomes));

  const chartData = {
    labels,
    datasets: [
      {
        data: expensesData,
        color: (opacity = 1) => hexToRgba(theme.colors.danger, opacity),
        strokeWidth: 2,
      },
      {
        data: incomesData,
        color: (opacity = 1) => hexToRgba(theme.colors.success, opacity),
        strokeWidth: 2,
      },
    ],
    legend: ['Despesas', 'Receitas'],
  };

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.md }}
    >
      <AppText variant="heading" color="ink">
        {title}
      </AppText>

      {loading ? (
        <Skeleton width="100%" height={CHART_HEIGHT} radiusKey="sm" />
      ) : (
        <View style={styles.chartContainer} onLayout={handleChartLayout}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={CHART_HEIGHT}
            fromZero
            withHorizontalLines={true}
            withVerticalLines={false}
            withInnerLines={true}
            chartConfig={chartConfig}
            formatYLabel={formatCompactYLabel}
            bezier
            style={{ borderRadius: theme.radius.sm, alignSelf: 'center' }}
            yAxisSuffix=""
            yAxisInterval={1}
          />
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
});

export default MonthlyChart;
