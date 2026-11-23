import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CheckSquare,
  ChevronRight,
  Code2,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Receipt,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import {
  AppText,
  InstagramIcon,
  ListRow,
  Screen,
  ScreenHeader,
  Surface,
  useFeedback,
  useTheme,
} from '../../../src/design-system';

interface FeatureItem {
  id: string;
  title: string;
  Icon: LucideIcon;
}

interface LegalLinkItem {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  route: string;
}

interface ContactChannelItem {
  id: string;
  title: string;
  value: string;
  url: string;
  renderIcon: (color: string) => React.ReactNode;
}

const FEATURES: ReadonlyArray<FeatureItem> = [
  { id: 'expenses', title: 'Divisão de Despesas', Icon: Receipt },
  { id: 'calendar', title: 'Agenda Compartilhada', Icon: Calendar },
  { id: 'tasks', title: 'Gestão de Tarefas', Icon: CheckSquare },
  { id: 'chat', title: 'Chat Integrado', Icon: MessageSquare },
];

const LEGAL_LINKS: ReadonlyArray<LegalLinkItem> = [
  {
    id: 'terms',
    title: 'Termos de Uso',
    description: 'Condições de uso do aplicativo',
    Icon: FileText,
    route: '/(panel)/settings/terms-of-use',
  },
  {
    id: 'privacy',
    title: 'Política de Privacidade',
    description: 'Como tratamos seus dados e informações',
    Icon: ShieldCheck,
    route: '/(panel)/settings/privacy-policy',
  },
  {
    id: 'licenses',
    title: 'Licenças de Software',
    description: 'Bibliotecas e componentes de código aberto',
    Icon: Code2,
    route: '/(panel)/settings/software-licenses',
  },
];

const CONTACT_CHANNELS: ReadonlyArray<ContactChannelItem> = [
  {
    id: 'email',
    title: 'E-mail',
    value: 'contato@rephelper.com.br',
    url: 'mailto:contato@rephelper.com.br',
    renderIcon: (color) => <Mail size={20} strokeWidth={1.75} color={color} />,
  },
  {
    id: 'website',
    title: 'Website',
    value: 'www.rephelper.com.br',
    url: 'https://www.rephelper.com.br',
    renderIcon: (color) => <Globe size={20} strokeWidth={1.75} color={color} />,
  },
  {
    id: 'instagram',
    title: 'Instagram',
    value: '@rephelper',
    url: 'https://instagram.com/rephelper',
    renderIcon: (color) => <InstagramIcon size={20} color={color} />,
  },
];

const AboutScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const openExternalUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      toast({
        title: 'Não foi possível abrir o link',
        message: 'Verifique se há um aplicativo compatível instalado.',
        tone: 'warning',
      });
    });
  };

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title="Sobre o App"
          subtitle="Identidade, recursos e informações legais"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {/* Cabeçalho com logo sobre Surface */}
      <Surface tone="surface" bordered padded="lg" style={styles.heroCard}>
        <Surface tone="subtle" bordered padded="sm" radiusKey="md">
          <Image
            source={require('../../../assets/images/icon.png')}
            style={[styles.logo, { borderRadius: theme.radius.sm }]}
            resizeMode="contain"
            accessibilityLabel="Logo do RepHelper"
          />
        </Surface>
        <View style={styles.heroTextBlock}>
          <AppText variant="display" color="accent" style={styles.centeredText}>
            RepHelper
          </AppText>
          <AppText variant="monoLabel" color="inkMuted" style={styles.centeredText}>
            Versão 1.0.0
          </AppText>
        </View>
        <AppText variant="body" color="inkSecondary" style={styles.centeredText}>
          O aplicativo essencial para gerenciar repúblicas e moradias compartilhadas.
        </AppText>
      </Surface>

      {/* Sobre Nós */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Sobre nós
        </AppText>
        <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.sm }}>
          <AppText variant="body" color="inkSecondary">
            RepHelper foi criado para simplificar a vida em moradias compartilhadas,
            ajudando a administrar despesas, tarefas e comunicação entre os moradores de
            forma eficiente e transparente.
          </AppText>
          <AppText variant="body" color="inkSecondary">
            Nossa missão é tornar a vida em república mais harmoniosa e organizada,
            reduzindo conflitos e facilitando a gestão financeira coletiva.
          </AppText>
        </Surface>
      </View>

      {/* Principais Recursos */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Principais recursos
        </AppText>
        <View style={[styles.featuresGrid, { gap: theme.spacing.sm }]}>
          {FEATURES.map((feature) => {
            const Icon = feature.Icon;
            return (
              <Surface
                key={feature.id}
                tone="surface"
                bordered
                padded="md"
                style={[styles.featureTile, { gap: theme.spacing.xs }]}
              >
                <View
                  style={[
                    styles.featureIconBadge,
                    {
                      backgroundColor: theme.colors.subtle,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Icon size={20} strokeWidth={1.75} color={theme.colors.accent} />
                </View>
                <AppText
                  variant="bodyStrong"
                  color="ink"
                  style={styles.centeredText}
                >
                  {feature.title}
                </AppText>
              </Surface>
            );
          })}
        </View>
      </View>

      {/* Legal e Políticas */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Legal e políticas
        </AppText>
        <Surface tone="surface" bordered style={styles.listSurface}>
          {LEGAL_LINKS.map((item, index) => {
            const Icon = item.Icon;
            return (
              <ListRow
                key={item.id}
                title={item.title}
                subtitle={item.description}
                showDivider={index < LEGAL_LINKS.length - 1}
                onPress={() => router.push(item.route as any)}
                leading={
                  <View
                    style={[
                      styles.rowIconBadge,
                      {
                        backgroundColor: theme.colors.subtle,
                        borderRadius: theme.radius.full,
                      },
                    ]}
                  >
                    <Icon size={18} strokeWidth={1.75} color={theme.colors.accent} />
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

      {/* Contato */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Contato
        </AppText>
        <Surface tone="surface" bordered style={styles.listSurface}>
          {CONTACT_CHANNELS.map((channel, index) => (
            <ListRow
              key={channel.id}
              title={channel.title}
              subtitle={channel.value}
              showDivider={index < CONTACT_CHANNELS.length - 1}
              onPress={() => openExternalUrl(channel.url)}
              leading={
                <View
                  style={[
                    styles.rowIconBadge,
                    {
                      backgroundColor: theme.colors.subtle,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  {channel.renderIcon(theme.colors.accent)}
                </View>
              }
            />
          ))}
        </Surface>
      </View>

      {/* Créditos */}
      <View style={styles.creditsContainer}>
        <AppText variant="caption" color="inkMuted" style={styles.centeredText}>
          © 2025 RepHelper - Todos os direitos reservados
        </AppText>
        <AppText variant="caption" color="inkMuted" style={styles.centeredText}>
          Desenvolvido com ❤️ no Brasil
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 80,
    height: 80,
  },
  heroTextBlock: {
    alignItems: 'center',
    gap: 2,
  },
  centeredText: {
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTile: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
  },
  featureIconBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSurface: {
    overflow: 'hidden',
  },
  rowIconBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsContainer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
});

export default AboutScreen;
