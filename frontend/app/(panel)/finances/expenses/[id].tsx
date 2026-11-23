// app/(panel)/finances/expenses/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Edit2,
  Eye,
  FileText,
  RotateCcw,
  Share2,
  Tag,
  User,
  XCircle,
} from 'lucide-react-native';
import { ExpenseReceiptModal } from '../../../../components/finances/ExpenseDetails/ExpenseReceiptModal';
import { ExpenseTimeline } from '../../../../components/finances/ExpenseDetails/ExpenseTimeline';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  AppText,
  BottomSheetModal,
  Button,
  ConfirmSection,
  Divider,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  TextField,
  useFeedback,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../../../src/design-system';
import { useFinances } from '../../../../src/hooks/useFinances';
import { Expense } from '../../../../src/models/finances.model';
import { formatCurrencyBRL } from '../../../../src/utils/currencyUtils';
import {
  formatLocalDate,
  getRelativeTime,
} from '../../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

const EXPENSE_STATUS_MAP: Record<
  string,
  { label: string; tone: StatusTone }
> = {
  APPROVED: { label: 'Aprovada', tone: 'success' },
  PENDING: { label: 'Pendente', tone: 'warning' },
  REJECTED: { label: 'Rejeitada', tone: 'danger' },
  REIMBURSED: { label: 'Reembolsada', tone: 'accent' },
};

const isSafeReceiptUrl = (uri?: string | null): uri is string =>
  Boolean(uri && /^https?:\/\//i.test(uri.trim()));

const ExpenseDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const motion = useMotion();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    getExpenseById,
    approveExpense,
    rejectExpense,
    reimburseExpense,
    resetExpenseStatus,
    deleteExpense,
  } = useFinances();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | undefined>(
    undefined
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedExpenseId = expense?.id;

  useEffect(() => {
    if (!loadedExpenseId) return;
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
    loadedExpenseId,
    fadeAnim,
    motion,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
  ]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances/expenses');
    }
  }, [router]);

  const fetchExpenseDetails = useCallback(async () => {
    if (!id) {
      setLoadError('Identificador da despesa não informado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const data = await getExpenseById(Number(id));
      setExpense(data);
    } catch (error) {
      logger.error('Erro ao carregar detalhes da despesa:', error);
      void ErrorHandler.handle(error);
      setLoadError('Não foi possível carregar os detalhes da despesa.');
    } finally {
      setLoading(false);
    }
  }, [id, getExpenseById]);

  useEffect(() => {
    void fetchExpenseDetails();
  }, [fetchExpenseDetails]);

  const isCreator = expense?.creatorId === user?.uid;
  const isUserAdmin = user?.isAdmin === true;
  const canApprove = expense?.status === 'PENDING' && isUserAdmin;
  const canReimburse = expense?.status === 'APPROVED' && isUserAdmin;
  const canReset =
    (expense?.status === 'REJECTED' ||
      expense?.status === 'APPROVED' ||
      expense?.status === 'REIMBURSED') &&
    isUserAdmin;
  const canEdit = isCreator && expense?.status === 'PENDING';
  const canDelete =
    (isCreator || isUserAdmin) && expense?.status !== 'REIMBURSED';
  const canModifyExpense = canEdit || isUserAdmin;

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

  const statusMeta = expense
    ? EXPENSE_STATUS_MAP[expense.status] ?? {
        label: expense.status,
        tone: 'neutral' as StatusTone,
      }
    : { label: '', tone: 'neutral' as StatusTone };

  const handleApproveExpense = async () => {
    if (!expense) return;

    try {
      setActionLoading(true);
      await approveExpense(expense.id);
      await fetchExpenseDetails();
      toast({
        title: 'Despesa aprovada',
        message: 'Despesa aprovada com sucesso!',
        tone: 'success',
      });
    } catch (error) {
      void ErrorHandler.handle(error);
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason('');
    setRejectionError(undefined);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    if (actionLoading) return;
    setShowRejectModal(false);
    setRejectionReason('');
    setRejectionError(undefined);
  };

  const handleConfirmRejectExpense = async () => {
    if (!expense) return;

    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setRejectionError('É necessário informar um motivo para rejeição.');
      return;
    }

    try {
      setActionLoading(true);
      await rejectExpense(expense.id, { reason: trimmed });
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectionError(undefined);
      await fetchExpenseDetails();
      toast({
        title: 'Despesa rejeitada',
        message: 'Despesa rejeitada com sucesso.',
        tone: 'info',
      });
    } catch (error) {
      void ErrorHandler.handle(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReimburseExpense = async () => {
    if (!expense) return;

    try {
      setActionLoading(true);
      await reimburseExpense(expense.id);
      await fetchExpenseDetails();
      toast({
        title: 'Reembolso registrado',
        message: 'Despesa marcada como reembolsada!',
        tone: 'success',
      });
    } catch (error) {
      void ErrorHandler.handle(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetExpenseStatus = async () => {
    if (!expense) return;

    try {
      setActionLoading(true);
      await resetExpenseStatus(expense.id);
      await fetchExpenseDetails();
      toast({
        title: 'Status redefinido',
        message: 'Status da despesa redefinido para pendente!',
        tone: 'info',
      });
    } catch (error) {
      void ErrorHandler.handle(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expense) return;

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteExpense(expense.id);
      toast({
        title: 'Despesa excluída',
        message: 'Despesa excluída com sucesso!',
        tone: 'success',
      });
      handleBack();
    } catch (error) {
      void ErrorHandler.handle(error);
      setIsDeleting(false);
    }
  };

  const handleShareExpense = async () => {
    if (!expense) return;

    const message =
      `Despesa: ${expense.description}\n` +
      `Valor: ${formatCurrencyBRL(expense.amount)}\n` +
      `Data: ${formatDate(expense.expenseDate)}\n` +
      `Status: ${statusMeta.label}`;

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
          message: 'Os detalhes da despesa foram copiados para a área de transferência.',
          tone: 'success',
        });
        return;
      }

      await Share.share({
        message,
        title: expense.description,
      });
    } catch (error) {
      logger.error('Erro ao compartilhar:', error);
      toast({
        title: 'Erro',
        message: 'Não foi possível compartilhar esta despesa.',
        tone: 'danger',
      });
    }
  };

  const baseHeader = (
    <ScreenHeader
      title="Detalhes da Despesa"
      variant="compact"
      onBack={handleBack}
    />
  );

  if (loading && !expense) {
    return (
      <Screen header={baseHeader}>
        <StateView kind="loading" title="Carregando detalhes da despesa..." />
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
          onAction={() => void fetchExpenseDetails()}
        />
      </Screen>
    );
  }

  if (!expense) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="empty"
          title="Despesa não encontrada"
          description="A despesa solicitada não foi encontrada ou foi excluída."
          actionLabel="Voltar para Despesas"
          onAction={() => router.replace('/(panel)/finances/expenses')}
        />
      </Screen>
    );
  }

  const validReceiptUrl = isSafeReceiptUrl(expense.receiptUrl)
    ? expense.receiptUrl.trim()
    : undefined;
  const updatedTimeLabel = getRelativeTime(expense.updatedAt);

  const header = (
    <ScreenHeader
      title="Detalhes da Despesa"
      variant="compact"
      onBack={handleBack}
      rightActions={
        <>
          <IconButton
            icon={
              <Share2 size={20} strokeWidth={1.75} color={theme.colors.ink} />
            }
            onPress={() => void handleShareExpense()}
            accessibilityLabel="Compartilhar despesa"
            variant="ghost"
          />
          {canModifyExpense ? (
            <IconButton
              icon={
                <Edit2
                  size={20}
                  strokeWidth={1.75}
                  color={theme.colors.accent}
                />
              }
              onPress={() =>
                router.push(`/(panel)/finances/expenses/edit?id=${expense.id}`)
              }
              accessibilityLabel="Editar despesa"
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
        {isCreator ? (
          <Surface
            tone="subtle"
            bordered
            padded="sm"
            radiusKey="md"
            style={[styles.creatorBanner, { gap: theme.spacing.xs }]}
          >
            <User size={16} strokeWidth={1.75} color={theme.colors.accent} />
            <AppText variant="caption" color="accent">
              Você criou esta despesa
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
            <StatusText
              label={statusMeta.label}
              tone={statusMeta.tone}
              showDot
            />
            {updatedTimeLabel ? (
              <AppText variant="caption" color="inkMuted">
                Atualizada {updatedTimeLabel}
              </AppText>
            ) : null}
          </View>

          <AppText variant="title" color="ink">
            {expense.description}
          </AppText>

          <AppText variant="monoHero" color="danger">
            {formatCurrencyBRL(expense.amount)}
          </AppText>

          {canApprove || canReimburse || canReset ? (
            <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              {canApprove ? (
                <View style={[styles.quickActionsRow, { gap: theme.spacing.xs }]}>
                  <View style={styles.actionSlot}>
                    <Button
                      label="Aprovar"
                      variant="primary"
                      size="sm"
                      fullWidth
                      loading={actionLoading}
                      leftIcon={
                        <CheckCircle2
                          size={16}
                          strokeWidth={1.75}
                          color={theme.colors.onAccent}
                        />
                      }
                      onPress={() => void handleApproveExpense()}
                    />
                  </View>
                  <View style={styles.actionSlot}>
                    <Button
                      label="Rejeitar"
                      variant="danger"
                      size="sm"
                      fullWidth
                      disabled={actionLoading}
                      leftIcon={
                        <XCircle
                          size={16}
                          strokeWidth={1.75}
                          color={theme.colors.onDanger}
                        />
                      }
                      onPress={openRejectModal}
                    />
                  </View>
                </View>
              ) : null}

              {canReimburse ? (
                <Button
                  label="Reembolsar"
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={actionLoading}
                  leftIcon={
                    <Banknote
                      size={16}
                      strokeWidth={1.75}
                      color={theme.colors.onAccent}
                    />
                  }
                  onPress={() => void handleReimburseExpense()}
                />
              ) : null}

              {canReset ? (
                <Button
                  label="Redefinir status"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  loading={actionLoading}
                  leftIcon={
                    <RotateCcw
                      size={16}
                      strokeWidth={1.75}
                      color={theme.colors.ink}
                    />
                  }
                  onPress={() => void handleResetExpenseStatus()}
                />
              ) : null}
            </View>
          ) : null}
        </Surface>

        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Detalhes
          </AppText>

          <Surface tone="surface" bordered radiusKey="md" style={styles.detailsSurface}>
            {expense.category ? (
              <ListRow
                title={expense.category}
                subtitle="Categoria"
                showDivider
                leading={
                  <Tag size={18} strokeWidth={1.75} color={theme.colors.accent} />
                }
              />
            ) : null}

            <ListRow
              title={formatDateWithTime(expense.expenseDate)}
              subtitle="Data da Despesa"
              showDivider
              leading={
                <Calendar
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.accent}
                />
              }
            />

            <ListRow
              title={formatDateWithTime(expense.createdAt)}
              subtitle="Data de Criação"
              showDivider
              leading={
                <Calendar
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.accent}
                />
              }
            />

            <ListRow
              title={`${expense.creatorName || 'Desconhecido'}${
                isCreator ? ' (Você)' : ''
              }`}
              subtitle="Criado por"
              showDivider={Boolean(
                expense.approvalDate || expense.reimbursementDate
              )}
              leading={
                <User size={18} strokeWidth={1.75} color={theme.colors.accent} />
              }
            />

            {expense.approvalDate ? (
              <ListRow
                title={formatDateWithTime(expense.approvalDate)}
                subtitle="Aprovada em"
                showDivider={Boolean(expense.reimbursementDate)}
                leading={
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.success}
                  />
                }
              />
            ) : null}

            {expense.reimbursementDate ? (
              <ListRow
                title={formatDateWithTime(expense.reimbursementDate)}
                subtitle="Reembolsada em"
                leading={
                  <Banknote
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.accent}
                  />
                }
              />
            ) : null}

            {expense.notes ? (
              <>
                <Divider />
                <View
                  style={[
                    styles.notesRow,
                    {
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      gap: theme.spacing.sm,
                    },
                  ]}
                >
                  <FileText
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.accent}
                    style={styles.notesIcon}
                  />
                  <View style={styles.notesContent}>
                    <AppText variant="caption" color="inkSecondary">
                      Observações
                    </AppText>
                    <AppText variant="body" color="ink">
                      {expense.notes}
                    </AppText>
                  </View>
                </View>
              </>
            ) : null}
          </Surface>
        </View>

        {validReceiptUrl ? (
          <Surface
            tone="surface"
            bordered
            padded="md"
            radiusKey="md"
            style={{ gap: theme.spacing.sm }}
          >
            <AppText variant="monoLabel" color="inkSecondary">
              Comprovante
            </AppText>

            <Pressable
              onPress={() => setImageModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Visualizar comprovante em tela cheia"
              style={({ pressed }) => [
                styles.receiptFrame,
                {
                  backgroundColor: theme.colors.subtle,
                  borderColor: theme.colors.line,
                  borderRadius: theme.radius.sm,
                  opacity: pressed ? theme.motion.pressOpacity : 1,
                },
              ]}
            >
              <Image
                source={{ uri: validReceiptUrl }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </Pressable>

            <Button
              label="Visualizar comprovante"
              variant="secondary"
              size="sm"
              fullWidth
              leftIcon={
                <Eye size={16} strokeWidth={1.75} color={theme.colors.ink} />
              }
              onPress={() => setImageModalVisible(true)}
            />
          </Surface>
        ) : null}

        <ExpenseTimeline expense={expense} />

        {canDelete ? (
          <ConfirmSection
            title="Ações do Criador"
            deleteLabel="Excluir despesa"
            showConfirm={showConfirmDelete}
            loading={isDeleting}
            onPressDelete={() => void handleDeleteExpense()}
            onCancelConfirm={() => setShowConfirmDelete(false)}
          />
        ) : null}
      </Animated.View>

      <ExpenseReceiptModal
        visible={imageModalVisible}
        receiptUrl={validReceiptUrl}
        description={expense.description}
        onClose={() => setImageModalVisible(false)}
      />

      <BottomSheetModal
        visible={showRejectModal}
        onClose={closeRejectModal}
        title="Rejeitar Despesa"
        dismissable={!actionLoading}
        dismissOnBackdropPress={!actionLoading}
        footer={
          <View style={[styles.quickActionsRow, { gap: theme.spacing.xs }]}>
            <View style={styles.actionSlot}>
              <Button
                label="Cancelar"
                variant="secondary"
                fullWidth
                disabled={actionLoading}
                onPress={closeRejectModal}
              />
            </View>
            <View style={styles.actionSlot}>
              <Button
                label="Rejeitar"
                variant="danger"
                fullWidth
                loading={actionLoading}
                onPress={() => void handleConfirmRejectExpense()}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="body" color="inkSecondary">
            Por favor, informe o motivo da rejeição para{' '}
            <AppText variant="bodyStrong" color="ink">
              {expense.description}
            </AppText>
            :
          </AppText>
          <TextField
            label="Motivo da rejeição"
            value={rejectionReason}
            onChangeText={(text) => {
              setRejectionReason(text);
              if (rejectionError) setRejectionError(undefined);
            }}
            placeholder="Descreva o motivo..."
            multiline
            numberOfLines={3}
            maxLength={250}
            error={rejectionError}
            editable={!actionLoading}
          />
        </View>
      </BottomSheetModal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  creatorBanner: {
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
  quickActionsRow: {
    flexDirection: 'row',
  },
  actionSlot: {
    flex: 1,
  },
  detailsSurface: {
    overflow: 'hidden',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesIcon: {
    marginTop: 2,
  },
  notesContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  receiptFrame: {
    height: 220,
    borderWidth: 1,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
});

export default ExpenseDetailsScreen;
