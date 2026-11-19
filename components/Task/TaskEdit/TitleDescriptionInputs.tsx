// components/Task/TaskEdit/TitleDescriptionInputs.tsx
import React from 'react';
import { View } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { TextField, useTheme } from '../../../src/design-system';

export interface TitleDescriptionInputsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
}

const TitleDescriptionInputs: React.FC<TitleDescriptionInputsProps> = ({
  control,
  errors,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Título da Tarefa"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Digite o título da tarefa"
            error={errors.title?.message ? String(errors.title.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Descrição (opcional)"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Descrição detalhada da tarefa"
            multiline
            numberOfLines={4}
            error={
              errors.description?.message
                ? String(errors.description.message)
                : undefined
            }
          />
        )}
      />
    </View>
  );
};

export default TitleDescriptionInputs;
