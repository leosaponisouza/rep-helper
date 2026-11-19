import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import {
  AppText,
  BottomSheetModal,
  Button,
  Chip,
  Divider,
  IconButton,
  TextField,
  useTheme,
} from '../src/design-system';
import { COMMON_TASK_CATEGORIES } from '../src/validation/taskSchemas';

export interface FilterOption {
  key: string;
  label: string;
}

export type TaskSortOption =
  | 'dueDate_asc'
  | 'dueDate_desc'
  | 'title_asc'
  | 'createdAt_desc';

export interface TaskFilterProps {
  filters: FilterOption[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  categories?: ReadonlyArray<string>;
  sortOption?: TaskSortOption;
  onSortChange?: (sort: TaskSortOption) => void;
  onResetFilters?: () => void;
}

const SORT_OPTIONS: ReadonlyArray<{ key: TaskSortOption; label: string }> = [
  { key: 'dueDate_asc', label: 'Prazo mais próximo' },
  { key: 'dueDate_desc', label: 'Prazo mais distante' },
  { key: 'title_asc', label: 'Título (A–Z)' },
  { key: 'createdAt_desc', label: 'Mais recentes' },
];

/**
 * Editorial task filter bar combining a search TextField, horizontal status/scope Chips,
 * and a BottomSheetModal for category filtering and sorting.
 */
const TaskFilter: React.FC<TaskFilterProps> = ({
  filters,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories = COMMON_TASK_CATEGORIES,
  sortOption = 'dueDate_asc',
  onSortChange,
  onResetFilters,
}) => {
  const { theme } = useTheme();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const [draftFilter, setDraftFilter] = useState(activeFilter);
  const [draftCategory, setDraftCategory] = useState<string | null>(selectedCategory ?? null);
  const [draftSort, setDraftSort] = useState<TaskSortOption>(sortOption);

  const effectiveSearch = searchQuery !== undefined ? searchQuery : internalSearch;
  const handleSearchChange = (text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    } else {
      setInternalSearch(text);
    }
  };

  useEffect(() => {
    if (isSheetVisible) {
      setDraftFilter(activeFilter);
      setDraftCategory(selectedCategory ?? null);
      setDraftSort(sortOption);
    }
  }, [isSheetVisible, activeFilter, selectedCategory, sortOption]);

  const hasAdvancedActive = Boolean(selectedCategory) || sortOption !== 'dueDate_asc';

  const handleApplySheet = () => {
    if (draftFilter !== activeFilter) {
      onFilterChange(draftFilter);
    }
    onCategoryChange?.(draftCategory);
    onSortChange?.(draftSort);
    setIsSheetVisible(false);
  };

  const handleResetSheet = () => {
    const defaultKey = filters[0]?.key ?? 'my-tasks';
    setDraftFilter(defaultKey);
    setDraftCategory(null);
    setDraftSort('dueDate_asc');
    if (onResetFilters) {
      onResetFilters();
    } else {
      onFilterChange(defaultKey);
      onCategoryChange?.(null);
      onSortChange?.('dueDate_asc');
      handleSearchChange('');
    }
    setIsSheetVisible(false);
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View
        style={[
          styles.searchRow,
          {
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.xs,
          },
        ]}
      >
        <View style={styles.searchFieldSlot}>
          <TextField
            value={effectiveSearch}
            onChangeText={handleSearchChange}
            placeholder="Buscar tarefas..."
            accessibilityLabel="Buscar tarefas"
            returnKeyType="search"
            leftIcon={<Search size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            rightAccessory={
              effectiveSearch.length > 0 ? (
                <IconButton
                  icon={<X size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                  onPress={() => handleSearchChange('')}
                  accessibilityLabel="Limpar busca"
                  variant="ghost"
                />
              ) : undefined
            }
          />
        </View>

        <View style={styles.filterButtonWrapper}>
          <IconButton
            icon={
              <SlidersHorizontal
                size={20}
                strokeWidth={1.75}
                color={hasAdvancedActive ? theme.colors.accent : theme.colors.ink}
              />
            }
            onPress={() => setIsSheetVisible(true)}
            accessibilityLabel={
              hasAdvancedActive
                ? 'Filtros e ordenação (filtros ativos)'
                : 'Filtros e ordenação'
            }
            variant="subtle"
          />
          {hasAdvancedActive ? (
            <View
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
              style={[
                styles.activeDot,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.full,
                },
              ]}
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={[
          styles.chipsContainer,
          {
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.xs,
          },
        ]}
      >
        {filters.map((filter) => (
          <Chip
            key={filter.key}
            label={filter.label}
            selected={activeFilter === filter.key}
            onPress={() => onFilterChange(filter.key)}
          />
        ))}
        {selectedCategory ? (
          <Chip
            label={`Categoria: ${selectedCategory}`}
            selected
            onPress={() => onCategoryChange?.(null)}
            accessibilityLabel={`Remover filtro de categoria ${selectedCategory}`}
          />
        ) : null}
      </ScrollView>

      <BottomSheetModal
        visible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        title="Filtrar e ordenar"
        footer={
          <View style={[styles.footerRow, { gap: theme.spacing.sm }]}>
            <View style={styles.footerSlot}>
              <Button
                label="Limpar"
                variant="secondary"
                fullWidth
                onPress={handleResetSheet}
              />
            </View>
            <View style={styles.footerSlot}>
              <Button
                label="Aplicar"
                variant="primary"
                fullWidth
                onPress={handleApplySheet}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="monoLabel" color="inkSecondary">
              Categoria
            </AppText>
            <View style={[styles.chipGrid, { gap: theme.spacing.xs }]}>
              <Chip
                label="Todas"
                selected={!draftCategory}
                onPress={() => setDraftCategory(null)}
              />
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  selected={draftCategory === category}
                  onPress={() =>
                    setDraftCategory(draftCategory === category ? null : category)
                  }
                />
              ))}
            </View>
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="monoLabel" color="inkSecondary">
              Ordenar por
            </AppText>
            <View style={[styles.chipGrid, { gap: theme.spacing.xs }]}>
              {SORT_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={draftSort === option.key}
                  onPress={() => setDraftSort(option.key)}
                />
              ))}
            </View>
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="monoLabel" color="inkSecondary">
              Status e escopo
            </AppText>
            <View style={[styles.chipGrid, { gap: theme.spacing.xs }]}>
              {filters.map((filter) => (
                <Chip
                  key={filter.key}
                  label={filter.label}
                  selected={draftFilter === filter.key}
                  onPress={() => setDraftFilter(filter.key)}
                />
              ))}
            </View>
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchFieldSlot: {
    flex: 1,
    minWidth: 0,
  },
  filterButtonWrapper: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerRow: {
    flexDirection: 'row',
    width: '100%',
  },
  footerSlot: {
    flex: 1,
  },
});

export default TaskFilter;
