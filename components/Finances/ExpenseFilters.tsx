// components/Finances/ExpenseFilters.tsx
import React, { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Filter,
  List,
  XCircle,
} from 'lucide-react-native';
import { Chip, useTheme } from '../../src/design-system';
import { ExpenseFilterType } from '../../src/hooks/useFinances';

export interface FilterOption {
  key: ExpenseFilterType;
  label: string;
}

interface ExpenseFiltersProps {
  filters: FilterOption[];
  activeFilter: ExpenseFilterType;
  onFilterChange: (filter: ExpenseFilterType) => void;
}

const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  filters,
  activeFilter,
  onFilterChange,
}) => {
  const { theme } = useTheme();

  const renderFilterIcon = (filterKey: ExpenseFilterType, selected: boolean) => {
    const color = selected ? theme.colors.accent : theme.colors.inkSecondary;

    switch (filterKey) {
      case 'ALL':
        return <List size={15} strokeWidth={1.75} color={color} />;
      case 'PENDING':
        return <Clock size={15} strokeWidth={1.75} color={color} />;
      case 'APPROVED':
        return <CheckCircle2 size={15} strokeWidth={1.75} color={color} />;
      case 'REJECTED':
        return <XCircle size={15} strokeWidth={1.75} color={color} />;
      case 'REIMBURSED':
        return <Banknote size={15} strokeWidth={1.75} color={color} />;
      default:
        return <Filter size={15} strokeWidth={1.75} color={color} />;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      {filters.map((filter) => {
        const isSelected = activeFilter === filter.key;
        return (
          <Chip
            key={filter.key}
            label={filter.label}
            selected={isSelected}
            onPress={() => onFilterChange(filter.key)}
            leftIcon={renderFilterIcon(filter.key, isSelected)}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
});

export default memo(ExpenseFilters);
