// components/Finances/PendingActions.tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  XCircle,
} from 'lucide-react-native';
import {
  AppText,
  BottomSheetModal,
  Button,
  Skeleton,
  StateView,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../src/design-system';
import { PendingAction } from '../../src/models/finances.model';
import FinanceItem from './FinanceItem';

interface PendingActionsProps {
  actions: PendingAction[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPressAction: (action: PendingAction) => void;
  onPressViewAll: () => void;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number, reason?: string) => Promise<void>;
  maxItems?: number;
}

const PendingActionItem: React.FC<{
  item: PendingAction;
  onPress: (action: PendingAction) => void;
  onApprove?: (id: number) => Promise<void>;
  onRequestReject?: (action: PendingAction) => void;
}> = ({ item, onPress, onApprove, onRequestReject }) => {
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    if (!onApprove) return;

    try {
      setApproving(true);
      await onApprove(item.id);
    } catch {
      toast({
        title: 'Erro',
        message: 'Não foi possível aprovar esta despesa. Tente novamente.',
        tone: 'danger',
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <FinanceItem item={item} type="expense" onPress={() => onPress(item)} />

      {onApprove || onRequestReject ? (
        <View style={[styles.quickActions, { gap: theme.spacing.xs }]}>
          {onApprove ? (
            <Button
              label="Aprovar"
              variant="primary"
              size="sm"
              loading={approving}
              onPress={() => void handleApprove()}
              leftIcon={
                <CheckCircle2
                  size={16}
                  strokeWidth={1.75}
                  color={theme.colors.onAccent}
                />
              }
            />
          ) : null}

          {onRequestReject ? (
            <Button
              label="Rejeitar"
              variant="danger"
              size="sm"
              disabled={approving}
              onPress={() => onRequestReject(item)}
              leftIcon={
                <XCircle
                  size={16}
                  strokeWidth={1.75}
                  color={theme.colors.onDanger}
                />
              }
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const PendingActions: React.FC<PendingActionsProps> = ({
  actions,
  loading,
  error,
  onRetry,
  onPressAction,
  onPressViewAll,
  onApprove,
  onReject,
  maxItems = 3,
}) => {
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const [rejectTarget, setRejectTarget] = useState<PendingAction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | undefined>(undefined);
  const [rejecting, setRejecting] = useState(false);

  const safeActions = Array.isArray(actions) ? actions : [];
  const allPending = safeActions.filter((action) => action.status === 'PENDING');
  const pendingActions = allPending.slice(0, maxItems);

  const openRejectSheet = (action: PendingAction) => {
    setRejectTarget(action);
    setRejectionReason('');
    setRejectionError(undefined);
  };

  const closeRejectSheet = () => {
    if (rejecting) return;
    setRejectTarget(null);
    setRejectionReason('');
    setRejectionError(undefined);
  };

  const handleConfirmReject = async () => {
    if (!onReject || !rejectTarget) return;

    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      setRejectionError('É necessário informar um motivo para rejeitar a despesa.');
      return;
    }

    try {
      setRejecting(true);
      await onReject(rejectTarget.id, trimmed);
      setRejectTarget(null);
      setRejectionReason('');
      setRejectionError(undefined);
    } catch {
      toast({
        title: 'Erro',
        message: 'Não foi possível rejeitar esta despesa. Tente novamente.',
        tone: 'danger',
      });
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <AppText variant="heading" color="ink">
          Ações Pendentes
        </AppText>
        <Skeleton width="100%" height={56} radiusKey="sm" />
        <Skeleton width="100%" height={56} radiusKey="sm" />
      </Surface>
    );
  }

  if (error) {
    return (
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.xs }}
      >
        <AppText variant="heading" color="ink">
          Ações Pendentes
        </AppText>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={onRetry}
        />
      </Surface>
    );
  }

  if (pendingActions.length === 0) {
    return null;
  }

  const remainingCount = allPending.length - pendingActions.length;

  return (
    <>
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <View style={[styles.headerRow, { gap: theme.spacing.xs }]}>
          <AppText variant="heading" color="ink" style={styles.sectionTitle}>
            Ações Pendentes
          </AppText>

          <Button
            label="Ver todas"
            variant="ghost"
            size="sm"
            onPress={onPressViewAll}
            leftIcon={
              <ChevronRight size={16} strokeWidth={1.75} color={theme.colors.accent} />
            }
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          {pendingActions.map((item) => (
            <PendingActionItem
              key={`pending-${item.id}`}
              item={item}
              onPress={onPressAction}
              onApprove={onApprove}
              onRequestReject={onReject ? openRejectSheet : undefined}
            />
          ))}

          {remainingCount > 0 ? (
            <Button
              label={`Ver mais ${remainingCount} ações pendentes`}
              variant="ghost"
              size="sm"
              fullWidth
              onPress={onPressViewAll}
              leftIcon={
                <ChevronDown size={16} strokeWidth={1.75} color={theme.colors.accent} />
              }
            />
          ) : null}
        </View>
      </Surface>

      <BottomSheetModal
        visible={rejectTarget !== null}
        onClose={closeRejectSheet}
        title="Rejeitar Despesa"
        dismissable={!rejecting}
        dismissOnBackdropPress={!rejecting}
        footer={
          <View style={[styles.sheetFooter, { gap: theme.spacing.xs }]}>
            <View style={styles.sheetFooterButton}>
              <Button
                label="Cancelar"
                variant="secondary"
                fullWidth
                disabled={rejecting}
                onPress={closeRejectSheet}
              />
            </View>
            <View style={styles.sheetFooterButton}>
              <Button
                label="Rejeitar"
                variant="danger"
                fullWidth
                loading={rejecting}
                onPress={() => void handleConfirmReject()}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: theme.spacing.sm }}>
          {rejectTarget ? (
            <AppText variant="body" color="inkSecondary">
              Informe o motivo para rejeitar{' '}
              <AppText variant="bodyStrong" color="ink">
                {rejectTarget.description}
              </AppText>
              :
            </AppText>
          ) : null}

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
            editable={!rejecting}
          />
        </View>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sheetFooter: {
    flexDirection: 'row',
  },
  sheetFooterButton: {
    flex: 1,
  },
});

export default PendingActions;
