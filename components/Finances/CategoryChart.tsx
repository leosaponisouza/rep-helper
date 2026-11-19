// components/Finances/CategoryChart.tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import {
  AppText,
  Button,
  StateView,
  Surface,
  useTheme,
} from '../../src/design-system';
import { CategoryExpense } from '../../src/models/finances.model';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';

interface CategoryChartProps {
  data: CategoryExpense[];
  title?: string;
  onViewDetails?: () => void;
}

const CategoryChart: React.FC<CategoryChartProps> = ({
  data,
  title = 'Despesas por Categoria',
  onViewDetails,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) {
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
          title="Sem dados para exibir"
          description="As categorias aparecerão quando houver despesas aprovadas."
        />
      </Surface>
    );
  }

  const seriesPalette = theme.colors.chartSeries;
  const displayData = expanded ? data : data.slice(0, 3);
  const hasMoreData = data.length > 3;

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.md }}
    >
      <View style={[styles.headerRow, { gap: theme.spacing.xs }]}>
        <AppText variant="heading" color="ink" style={styles.titleText}>
          {title}
        </AppText>

        {onViewDetails ? (
          <Button
            label="Detalhes"
            variant="ghost"
            size="sm"
            onPress={onViewDetails}
            leftIcon={
              <ChevronRight size={16} strokeWidth={1.75} color={theme.colors.accent} />
            }
          />
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {displayData.map((item, index) => {
          const seriesColor =
            item.color || seriesPalette[index % seriesPalette.length];
          const safePercentage = Number.isFinite(item.percentage)
            ? Math.min(100, Math.max(0, item.percentage))
            : 0;

          return (
            <View
              key={`${item.category}-${index}`}
              style={{ gap: theme.spacing.xxs }}
            >
              <View style={[styles.categoryHeader, { gap: theme.spacing.xs }]}>
                <View
                  style={[
                    styles.categoryDot,
                    {
                      backgroundColor: seriesColor,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                />
                <AppText
                  variant="bodyStrong"
                  color="ink"
                  numberOfLines={1}
                  style={styles.categoryName}
                >
                  {item.category}
                </AppText>
                <AppText variant="monoLabel" color="inkSecondary">
                  {safePercentage.toFixed(1)}%
                </AppText>
                <AppText variant="monoValue" color="ink">
                  {formatCurrencyBRL(item.amount)}
                </AppText>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: theme.colors.subtle,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${safePercentage}%`,
                      backgroundColor: seriesColor,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {hasMoreData ? (
        <Button
          label={
            expanded ? 'Ver menos' : `Ver mais ${data.length - 3} categorias`
          }
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((prev) => !prev)}
          leftIcon={
            expanded ? (
              <ChevronUp size={16} strokeWidth={1.75} color={theme.colors.accent} />
            ) : (
              <ChevronDown size={16} strokeWidth={1.75} color={theme.colors.accent} />
            )
          }
        />
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
  },
  categoryName: {
    flex: 1,
    minWidth: 0,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});

export default CategoryChart;
