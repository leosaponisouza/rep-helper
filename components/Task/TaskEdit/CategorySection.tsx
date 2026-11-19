// components/Task/TaskEdit/CategorySection.tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tag, X } from 'lucide-react-native';
import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  AppText,
  BottomSheetModal,
  Button,
  Chip,
  Divider,
  IconButton,
  Surface,
  TextField,
  useTheme,
} from '../../../src/design-system';
import { COMMON_TASK_CATEGORIES } from '../../../src/validation/taskSchemas';

export interface CategorySectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

const CategorySection: React.FC<CategorySectionProps> = ({ setValue, watch }) => {
  const { theme } = useTheme();
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const selectedCategory = (watch('category') as string | undefined) || '';

  const selectCategory = (category: string) => {
    setValue('category', category);
    setCategoryModalVisible(false);
  };

  const handleCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    setValue('category', trimmed);
    setCustomCategory('');
    setCategoryModalVisible(false);
  };

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="bodyStrong" color="ink">
        Categoria (opcional)
      </AppText>

      <Surface tone="surface" bordered radiusKey="md">
        <View
          style={[
            styles.selectContainer,
            {
              paddingRight: selectedCategory ? theme.spacing.xs : theme.spacing.md,
            },
          ]}
        >
          <Pressable
            onPress={() => setCategoryModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={
              selectedCategory
                ? `Categoria selecionada: ${selectedCategory}. Toque para alterar`
                : 'Selecionar categoria'
            }
            style={({ pressed }) => [
              styles.selectRow,
              {
                paddingLeft: theme.spacing.md,
                paddingRight: theme.spacing.xs,
                paddingVertical: theme.spacing.sm,
                gap: theme.spacing.sm,
                opacity: pressed ? theme.motion.pressOpacity : 1,
              },
            ]}
          >
            <View style={styles.selectTextBlock}>
              <AppText variant="caption" color="inkSecondary">
                Categoria
              </AppText>
              <AppText
                variant="body"
                color={selectedCategory ? 'ink' : 'inkMuted'}
                numberOfLines={1}
              >
                {selectedCategory || 'Selecione uma categoria'}
              </AppText>
            </View>
            <Tag size={20} strokeWidth={1.75} color={theme.colors.accent} />
          </Pressable>

          {selectedCategory ? (
            <IconButton
              icon={<X size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
              onPress={() => setValue('category', '')}
              accessibilityLabel="Remover categoria"
              variant="ghost"
            />
          ) : null}
        </View>

        {selectedCategory ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingBottom: theme.spacing.sm,
            }}
          >
            <Chip
              label={selectedCategory}
              selected
              onPress={() => setCategoryModalVisible(true)}
            />
          </View>
        ) : null}
      </Surface>

      <BottomSheetModal
        visible={isCategoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Selecionar Categoria"
        footer={
          <Button
            label="Concluir"
            variant="primary"
            fullWidth
            onPress={() => setCategoryModalVisible(false)}
          />
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="caption" color="inkSecondary">
              Escolha uma categoria para sua tarefa
            </AppText>
            <View style={[styles.categoryGrid, { gap: theme.spacing.xs }]}>
              {COMMON_TASK_CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  selected={selectedCategory === category}
                  onPress={() => selectCategory(category)}
                />
              ))}
            </View>
          </View>

          <Divider />

          <Surface tone="subtle" bordered padded="md" radiusKey="md" style={{ gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong" color="ink">
              Categoria Personalizada
            </AppText>
            <View style={[styles.customRow, { gap: theme.spacing.xs }]}>
              <View style={styles.customInputSlot}>
                <TextField
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Digite uma categoria..."
                  accessibilityLabel="Categoria personalizada"
                  returnKeyType="done"
                  onSubmitEditing={handleCustomCategory}
                />
              </View>
              <Button
                label="Aplicar"
                variant="secondary"
                size="md"
                onPress={handleCustomCategory}
                disabled={!customCategory.trim()}
              />
            </View>
          </Surface>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  selectTextBlock: {
    flex: 1,
    gap: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customInputSlot: {
    flex: 1,
    minWidth: 0,
  },
});

export default CategorySection;
