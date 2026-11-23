import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarPlus,
  CheckSquare,
  ChevronRight,
  Clock,
  PlusCircle,
  Settings,
  UserPlus,
  type LucideIcon,
} from 'lucide-react-native';
import {
  AppText,
  ListRow,
  Screen,
  ScreenHeader,
  Surface,
  useTheme,
  type ThemeColors,
} from '../../src/design-system';

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  colorKey: keyof Pick<ThemeColors, 'accent' | 'danger' | 'success' | 'warning' | 'inkSecondary'>;
  mainRoute: string;
  detailRoute?: string;
}

const COMMON_ACTIONS: ReadonlyArray<QuickActionItem> = [
  {
    id: 'create-task',
    title: 'Criar Tarefa',
    description: 'Adicionar uma nova tarefa para a república',
    Icon: PlusCircle,
    colorKey: 'accent',
    mainRoute: '/(panel)/tasks',
    detailRoute: '/(panel)/tasks/create',
  },
  {
    id: 'create-event',
    title: 'Criar Evento',
    description: 'Agendar um novo evento para a república',
    Icon: CalendarPlus,
    colorKey: 'accent',
    mainRoute: '/(panel)/events',
    detailRoute: '/(panel)/events/create',
  },
  {
    id: 'create-expense',
    title: 'Registrar Despesa',
    description: 'Adicionar uma nova despesa compartilhada',
    Icon: ArrowUpRight,
    colorKey: 'danger',
    mainRoute: '/(panel)/finances',
    detailRoute: '/(panel)/finances/expenses/create',
  },
  {
    id: 'create-income',
    title: 'Registrar Receita',
    description: 'Adicionar uma nova receita ou pagamento',
    Icon: ArrowDownLeft,
    colorKey: 'success',
    mainRoute: '/(panel)/finances',
    detailRoute: '/(panel)/finances/incomes/create',
  },
];

const MANAGE_ACTIONS: ReadonlyArray<QuickActionItem> = [
  {
    id: 'invite-member',
    title: 'Convidar Morador',
    description: 'Adicionar uma nova pessoa à república',
    Icon: UserPlus,
    colorKey: 'accent',
    mainRoute: '/(panel)/settings',
    detailRoute: '/(panel)/settings/members',
  },
  {
    id: 'my-tasks',
    title: 'Minhas Tarefas',
    description: 'Visualizar tarefas atribuídas a você',
    Icon: CheckSquare,
    colorKey: 'inkSecondary',
    mainRoute: '/(panel)/tasks',
  },
  {
    id: 'pending-approvals',
    title: 'Aprovações Pendentes',
    description: 'Verificar despesas aguardando aprovação',
    Icon: Clock,
    colorKey: 'warning',
    mainRoute: '/(panel)/finances',
  },
  {
    id: 'settings',
    title: 'Configurações',
    description: 'Gerenciar preferências e configurações',
    Icon: Settings,
    colorKey: 'inkSecondary',
    mainRoute: '/(panel)/settings',
  },
];

const navigateToAction = (mainRoute: string, detailRoute?: string) => {
  router.push(mainRoute as any);
  if (detailRoute) {
    setTimeout(() => {
      router.push(detailRoute as any);
    }, 100);
  }
};

const QuickActionsScreen = () => {
  const { theme } = useTheme();

  const renderSection = (label: string, items: ReadonlyArray<QuickActionItem>) => (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="monoLabel" color="inkSecondary">
        {label}
      </AppText>
      <Surface tone="surface" bordered style={styles.sectionSurface}>
        {items.map((item, index) => {
          const Icon = item.Icon;
          const iconColor = theme.colors[item.colorKey];

          return (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.description}
              showDivider={index < items.length - 1}
              onPress={() => navigateToAction(item.mainRoute, item.detailRoute)}
              leading={
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: theme.colors.subtle,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Icon size={20} strokeWidth={1.75} color={iconColor} />
                </View>
              }
              trailing={
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.inkMuted}
                />
              }
            />
          );
        })}
      </Surface>
    </View>
  );

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Ações Rápidas"
          subtitle="Atalhos para o dia a dia"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {renderSection('Ações comuns', COMMON_ACTIONS)}
      {renderSection('Gerenciar', MANAGE_ACTIONS)}
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionSurface: {
    overflow: 'hidden',
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuickActionsScreen;
