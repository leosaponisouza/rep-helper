// app/(panel)/finances/incomes/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Banknote,
  Calendar,
  Check,
  Edit2,
  FileText,
  RefreshCw,
  Share2,
  User,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  AppText,
  ConfirmSection,
  Divider,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  useFeedback,
  useMotion,
  useTheme,
} from '../../../../src/design-system';
import { useFinances } from '../../../../src/hooks/useFinances';
import { Income } from '../../../../src/models/finances.model';
import { formatCurrencyBRL } from '../../../../src/utils/currencyUtils';
import {
  formatLocalDate,
  getRelativeTime,
} from '../../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

interface IncomeTimelineItemProps {
  title: string;
  date?: string | null;
  isCompleted: boolean;
  isLast?: boolean;
}

const IncomeTimelineItem: React.FC<IncomeTimelineItemProps> = ({
  title,
  date,
  isCompleted,
  isLast = false,
}) => {
  const { theme } = useTheme();
  const formattedDate = date
    ? formatLocalDate(date, "dd 'de' MMMM 'de' yyyy") || date
    : null;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDotColumn}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: isCompleted
                ? theme.colors.success
                : theme.colors.subtle,
              borderColor: isCompleted
                ? theme.colors.success
                : theme.colors.borderStrong,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {isCompleted ? (
            <Check size={12} strokeWidth={2.5} color={theme.colors.onAccent} />
          ) : null}
        </View>
        {!isLast ? (
          <View
            style={[
              styles.timelineConnector,
              {
                backgroundColor: isCompleted
                  ? theme.colors.success
                  : theme.colors.line,
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.timelineContent,
          {
            paddingBottom: isLast ? 0 : theme.spacing.lg,
            gap: theme.spacing.xxs,
          },
        ]}
      >
        <AppText
          variant="bodyStrong"
          color={isCompleted ? 'ink' : 'inkSecondary'}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          color={formattedDate ? 'inkSecondary' : 'inkMuted'}
        >
          {formattedDate || 'Pendente'}
        </AppText>
      </View>
    </View>
  );
};

const getSourceDescription = (source: string): string => {
  switch (source) {
    case 'Contribuição':
      return 'Contribuição de membro da república';
    case 'Reembolso':
      return 'Valor reembolsado';
    case 'Evento':
      return 'Receita proveniente de evento';
    case 'Outros':
      return 'Outra fonte de receita';
    default:
      return `Fonte: ${source}`;
  }
};

const IncomeDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const motion = useMotion();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { deleteIncome, getIncomeById } = useFinances();

  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedIncomeId = income?.id;

  useEffect(() => {
    if (!loadedIncomeId) return;
    if (!motion.shouldAnimate) {
      fadeAnim.setValue(1);
      return;
    }

    fadeAnim.setValue(0);
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: motion.duration(theme.motion.duration.normal, {
        allowReducedFade: true,
      }),
      easing: theme.motion.easing.standard,
      useNativeDriver: motion.useNativeDriver,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    loadedIncomeId,
    fadeAnim,
    motion,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
  ]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances/incomes');
    }
  }, [router]);

  const fetchIncomeDetails = useCallback(async () => {
    if (!id) {
      setLoadError('Identificador da receita não informado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const data = await getIncomeById(Number(id));
      setIncome(data);
    } catch (error) {
      logger.error('Erro ao carregar detalhes da receita:', error);
      void ErrorHandler.handle(error);
      setLoadError('Não foi possível carregar os detalhes da receita.');
    } finally {
      setLoading(false);
    }
  }, [id, getIncomeById]);

  useEffect(() => {
    void fetchIncomeDetails();
  }, [fetchIncomeDetails]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return formatLocalDate(dateString, "dd 'de' MMMM 'de' yyyy") || dateString;
  };

  const formatDateWithTime = (dateString?: string) => {
    if (!dateString) return 'Data não disponível';
    return (
      formatLocalDate(dateString, "dd/MM/yyyy 'às' HH:mm") || dateString
    );
  };

  const renderSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'contribuição':
      case 'contribuicao':
        return <Wallet size={18} strokeWidth={1.75} color={theme.colors.success} />;
      case 'evento':
        return <Calendar size={18} strokeWidth={1.75} color={theme.colors.success} />;
      case 'reembolso':
        return <RefreshCw size={18} strokeWidth={1.75} color={theme.colors.success} />;
      default:
        return <Banknote size={18} strokeWidth={1.75} color={theme.colors.success} />;
    }
  };

  const handleShareIncome = async () => {
    if (!income) return;

    const message =
      `Receita: ${income.description}\n` +
      `Valor: ${formatCurrencyBRL(income.amount)}\n` +
      `Data: ${formatDate(income.incomeDate)}\n` +
      `Fonte: ${income.source}`;

    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        !navigator.share &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(message);
        toast({
          title: 'Resumo copiado',
          message: 'Os detalhes da receita foram copiados para a área de transferência.',
          tone: 'success',
        });
        return;
      }

      await Share.share({
        message,
        title: income.description,
      });
    } catch (error) {
      logger.error('Erro ao compartilhar:', error);
      toast({
        title: 'Erro',
        message: 'Não foi possível compartilhar esta receita.',
        tone: 'danger',
      });
    }
  };

  const handleDeleteIncome = async () => {
    if (!income) return;

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteIncome(income.id);
      toast({
        title: 'Receita excluída',
        message: 'Receita excluída com sucesso!',
        tone: 'success',
      });
      handleBack();
    } catch (error) {
      void ErrorHandler.handle(error);
      setDeleteLoading(false);
    }
  };

  const isContributor = income?.contributorId === user?.uid;
  const canEdit = Boolean(isContributor || user?.isAdmin);

  const baseHeader = (
    <ScreenHeader
      title="Detalhes da Receita"
      variant="compact"
      onBack={handleBack}
    />
  );

  if (loading && !income) {
    return (
      <Screen header={baseHeader}>
        <StateView kind="loading" title="Carregando detalhes da receita..." />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={loadError}
          actionLabel="Tentar novamente"
          onAction={() => void fetchIncomeDetails()}
        />
      </Screen>
    );
  }

  if (!income) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="empty"
          title="Receita não encontrada"
          description="A receita solicitada não foi encontrada ou foi excluída."
          actionLabel="Voltar para Receitas"
          onAction={() => router.replace('/(panel)/finances/incomes')}
        />
      </Screen>
    );
  }

  const updatedTimeLabel = getRelativeTime(income.updatedAt);

  const header = (
    <ScreenHeader
      title="Detalhes da Receita"
      variant="compact"
      onBack={handleBack}
      rightActions={
        <>
          <IconButton
            icon={
              <Share2 size={20} strokeWidth={1.75} color={theme.colors.ink} />
            }
            onPress={() => void handleShareIncome()}
            accessibilityLabel="Compartilhar receita"
            variant="ghost"
          />
          {canEdit ? (
            <IconButton
              icon={
                <Edit2
                  size={20}
                  strokeWidth={1.75}
                  color={theme.colors.accent}
                />
              }
              onPress={() =>
                router.push(`/(panel)/finances/incomes/edit?id=${income.id}`)
              }
              accessibilityLabel="Editar receita"
              variant="ghost"
            />
          ) : null}
        </>
      }
    />
  );

  return (
    <Screen
      scroll
      header={header}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
      }}
    >
      <Animated.View style={{ opacity: fadeAnim, gap: theme.spacing.md }}>
        {isContributor ? (
          <Surface
            tone="subtle"
            bordered
            padded="sm"
            radiusKey="md"
            style={[styles.contributorBanner, { gap: theme.spacing.xs }]}
          >
            <User size={16} strokeWidth={1.75} color={theme.colors.success} />
            <AppText variant="caption" color="success">
              Você registrou esta receita
            </AppText>
          </Surface>
        ) : null}

        <Surface
          tone="surface"
          bordered
          padded="md"
          radiusKey="md"
          style={{ gap: theme.spacing.sm }}
        >
          <View style={[styles.statusHeaderRow, { gap: theme.spacing.xs }]}>
            <StatusText label={income.source} tone="success" showDot />
            {updatedTimeLabel ? (
              <AppText variant="caption" color="inkMuted">
                Atualizada {updatedTimeLabel}
              </AppText>
            ) : null}
          </View>

          <AppText variant="title" color="ink">
            {income.description}
          </AppText>

          <AppText variant="monoHero" color="success">
            {formatCurrencyBRL(income.amount)}
          </AppText>
        </Surface>

        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Detalhes
          </AppText>

          <Surface tone="surface" bordered radiusKey="md" style={styles.detailsSurface}>
            <ListRow
              title={income.source}
              subtitle={getSourceDescription(income.source)}
              showDivider
              leading={renderSourceIcon(income.source)}
            />

            <ListRow
              title={formatDateWithTime(income.incomeDate)}
              subtitle="Data da Receita"
              showDivider
              leading={
                <Calendar
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.success}
                />
              }
            />

            <ListRow
              title={formatDateWithTime(income.createdAt)}
              subtitle="Data de Registro"
              showDivider
              leading={
                <Calendar
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.success}
                />
              }
            />

            <ListRow
              title={`${income.contributorName || 'Desconhecido'}${
                isContributor ? ' (Você)' : ''
              }`}
              subtitle="Registrado por"
              showDivider={Boolean(income.notes)}
              leading={
                <User
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.success}
                />
              }
            />

            {income.notes ? (
              <ListRow
                title={income.notes}
                subtitle="Observações"
                leading={
                  <FileText
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.success}
                  />
                }
              />
            ) : null}
          </Surface>
        </View>

        <Surface tone="surface" bordered radiusKey="md" style={styles.detailsSurface}>
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <AppText variant="monoLabel" color="inkSecondary">
              Timeline
            </AppText>
          </View>
          <Divider />
          <View style={{ padding: theme.spacing.md }}>
            <IncomeTimelineItem
              title="Registrada"
              date={income.createdAt}
              isCompleted={true}
              isLast={false}
            />
            <IncomeTimelineItem
              title="Recebida"
              date={income.incomeDate}
              isCompleted={true}
              isLast={true}
            />
          </View>
        </Surface>

        {canEdit ? (
          <ConfirmSection
            title="Ações"
            deleteLabel="Excluir receita"
            showConfirm={showConfirmDelete}
            loading={deleteLoading}
            onPressDelete={() => void handleDeleteIncome()}
            onCancelConfirm={() => setShowConfirmDelete(false)}
          />
        ) : null}
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  contributorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailsSurface: {
    overflow: 'hidden',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineDotColumn: {
    width: 28,
    alignItems: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
});

export default IncomeDetailsScreen;
