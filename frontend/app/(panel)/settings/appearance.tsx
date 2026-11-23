import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Moon, Smartphone, Sun } from 'lucide-react-native';
import {
  AppText,
  Divider,
  ListRow,
  Screen,
  ScreenHeader,
  StatusText,
  Surface,
  ThemeMode,
  useTheme,
} from '../../../src/design-system';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  Icon: typeof Sun;
}

const THEME_OPTIONS: ReadonlyArray<ThemeOption> = [
  {
    mode: 'light',
    label: 'Claro',
    description: 'Papel quente com contraste diurno',
    Icon: Sun,
  },
  {
    mode: 'dark',
    label: 'Escuro',
    description: 'Carvão fosco para ambientes com pouca luz',
    Icon: Moon,
  },
  {
    mode: 'system',
    label: 'Seguir padrão do sistema',
    description: 'Alterna automaticamente conforme o aparelho',
    Icon: Smartphone,
  },
];

export default function AppearanceScreen(): React.ReactElement {
  const router = useRouter();
  const { theme, preference, resolvedMode, setPreference } = useTheme();

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Aparência"
          subtitle="Tema e visualização editorial"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Tema do aplicativo
        </AppText>
        <Surface
          tone="surface"
          bordered
          accessibilityRole="radiogroup"
          accessibilityLabel="Tema do aplicativo"
          style={styles.optionsSurface}
        >
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = preference === option.mode;
            const Icon = option.Icon;

            return (
              <ListRow
                key={option.mode}
                testID={`theme-option-${option.mode}`}
                title={option.label}
                subtitle={option.description}
                selected={isSelected}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                showDivider={index < THEME_OPTIONS.length - 1}
                onPress={() => {
                  void setPreference(option.mode);
                }}
                leading={
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    color={isSelected ? theme.colors.accent : theme.colors.inkSecondary}
                  />
                }
                trailing={
                  isSelected ? (
                    <Check size={20} strokeWidth={2} color={theme.colors.accent} />
                  ) : null
                }
              />
            );
          })}
        </Surface>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Prévia ao vivo · {resolvedMode === 'dark' ? 'Modo escuro' : 'Modo claro'}
        </AppText>
        <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.sm }}>
          <View style={styles.previewBalanceHeader}>
            <View style={{ gap: theme.spacing.xxs }}>
              <AppText variant="monoLabel" color="inkMuted">
                Caixa da república
              </AppText>
              <AppText variant="monoHero" color="ink">
                R$ 1.240,00
              </AppText>
            </View>
            <StatusText label="Em dia" tone="success" showDot />
          </View>

          <Divider />

          <ListRow
            title="Comprar café e filtros"
            subtitle="Vence hoje · Cozinha"
            style={styles.previewRow}
            trailing={<StatusText label="Pendente" tone="warning" showDot />}
          />

          <Divider />

          <ListRow
            title="Rateio de energia"
            subtitle="Vence em 3 dias"
            style={styles.previewRow}
            trailing={
              <AppText variant="monoValue" color="ink">
                R$ 186,50
              </AppText>
            }
          />
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  optionsSurface: {
    overflow: 'hidden',
  },
  previewBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  previewRow: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 44,
  },
});
