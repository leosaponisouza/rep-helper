import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Palette,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  Button,
  ListRow,
  Screen,
  ScreenHeader,
  Surface,
  useFeedback,
  useTheme,
} from '../../../src/design-system';

interface SettingItemConfig {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  route: string;
}

interface SettingSectionConfig {
  title: string;
  items: ReadonlyArray<SettingItemConfig>;
}

const SETTINGS_SECTIONS: ReadonlyArray<SettingSectionConfig> = [
  {
    title: 'Conta',
    items: [
      {
        id: 'account',
        title: 'Perfil',
        description: 'Editar informações pessoais',
        Icon: UserCircle,
        route: '/(panel)/settings/account',
      },
    ],
  },
  {
    title: 'República',
    items: [
      {
        id: 'republic',
        title: 'Configurações da República',
        description: 'Gerenciar nome, endereço, código de convite',
        Icon: Home,
        route: '/(panel)/settings/republic',
      },
      {
        id: 'members',
        title: 'Membros',
        description: 'Gerenciar os moradores',
        Icon: Users,
        route: '/(panel)/settings/members',
      },
    ],
  },
  {
    title: 'Aplicativo',
    items: [
      {
        id: 'appearance',
        title: 'Aparência',
        description: 'Tema claro, escuro ou do sistema',
        Icon: Palette,
        route: '/(panel)/settings/appearance',
      },
      {
        id: 'about',
        title: 'Sobre o App',
        description: 'Informações, termos e licenças',
        Icon: Info,
        route: '/(panel)/settings/about',
      },
      {
        id: 'help',
        title: 'Ajuda',
        description: 'Perguntas frequentes e suporte',
        Icon: HelpCircle,
        route: '/(panel)/settings/help',
      },
    ],
  },
];

const SettingsScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { confirm } = useFeedback();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Sair da Conta',
      message: 'Tem certeza que deseja sair da sua conta?',
      confirmLabel: 'Sair',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Configurações"
          subtitle="Personalize sua experiência no app"
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {SETTINGS_SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            {section.title}
          </AppText>
          <Surface tone="surface" bordered style={styles.sectionSurface}>
            {section.items.map((item, index) => {
              const Icon = item.Icon;

              return (
                <ListRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.description}
                  showDivider={index < section.items.length - 1}
                  onPress={() => router.push(item.route as any)}
                  leading={
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: theme.colors.subtle,
                          borderRadius: theme.radius.full,
                        },
                      ]}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.75}
                        color={theme.colors.accent}
                      />
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
      ))}

      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.xs }}>
        <Button
          label="Sair da Conta"
          variant="danger"
          fullWidth
          loading={loggingOut}
          leftIcon={
            <LogOut size={18} strokeWidth={1.75} color={theme.colors.onDanger} />
          }
          onPress={() => void handleLogout()}
        />

        <AppText variant="caption" color="inkMuted" style={styles.versionText}>
          RepHelper v1.0.0
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionSurface: {
    overflow: 'hidden',
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    textAlign: 'center',
  },
});

export default SettingsScreen;
