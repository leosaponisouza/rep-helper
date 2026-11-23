import React, { useCallback, useEffect, useState } from 'react';
import {
  Clipboard,
  Keyboard,
  Platform,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Building2,
  Copy,
  Flag,
  Hash,
  Home,
  Mail,
  Map,
  MapPin,
  RefreshCw,
  Save,
  Share2,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  BottomSheetModal,
  Button,
  IconButton,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  StateView,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import api from '../../../src/services/api';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

interface AddressResponse {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

interface Republic {
  id: string;
  name: string;
  code: string;
  address: AddressResponse;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

interface RepublicMemberSummary {
  uid: string;
  isAdmin: boolean;
}

type CodeGenerationMode = 'random' | 'custom';

const triggerHaptic = (callback: () => Promise<void> | void) => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(callback()).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const copyToClipboard = async (text: string) => {
  if (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }
  Clipboard.setString(text);
};

const RepublicSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { user } = useAuth();

  const [republic, setRepublic] = useState<Republic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showRegenerateModal, setShowRegenerateModal] = useState<boolean>(false);
  const [codeMode, setCodeMode] = useState<CodeGenerationMode>('random');
  const [regeneratingCode, setRegeneratingCode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>('');
  const [customCodeError, setCustomCodeError] = useState<string | undefined>(undefined);
  const [codeLength, setCodeLength] = useState<number>(6);
  const [republicMembers, setRepublicMembers] = useState<RepublicMemberSummary[]>([]);

  const [name, setName] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [complement, setComplement] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [submittedValidation, setSubmittedValidation] = useState<boolean>(false);

  const isOwner = Boolean(user?.uid && republic?.ownerId && user.uid === republic.ownerId);
  const isUserAdmin = republicMembers.some((m) => m.uid === user?.uid && m.isAdmin);
  const canRegenerateCode = isOwner || isUserAdmin;

  const fetchRepublicData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.currentRepublicId) {
        throw new Error('Você não está associado a nenhuma república');
      }

      const response = await api.get<Republic>(
        `/api/v1/republics/${user.currentRepublicId}`
      );
      const republicData = response.data;
      logger.debug('Dados da república recebidos:', republicData);

      setRepublic(republicData);
      setName(republicData.name ?? '');

      if (republicData.address) {
        logger.debug('Dados de endereço encontrados:', republicData.address);
        setStreet(republicData.address.street ?? '');
        setNumber(republicData.address.number ?? '');
        setComplement(republicData.address.complement ?? '');
        setNeighborhood(republicData.address.neighborhood ?? '');
        setCity(republicData.address.city ?? '');
        setState(republicData.address.state ?? '');
        setZipCode(republicData.address.zipCode ?? '');
      } else {
        logger.error('Dados de endereço não encontrados na resposta:', republicData);
      }
    } catch (err) {
      logger.error('Erro ao buscar dados da república:', err);
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      void ErrorHandler.handle(err);
    } finally {
      setLoading(false);
    }
  }, [user?.currentRepublicId]);

  useEffect(() => {
    void fetchRepublicData();
  }, [fetchRepublicData]);

  useEffect(() => {
    const fetchRepublicMembers = async () => {
      if (!user?.currentRepublicId) return;

      try {
        const response = await api.get<RepublicMemberSummary[]>(
          `/api/v1/republics/${user.currentRepublicId}/members`
        );
        setRepublicMembers(response.data);
      } catch (err) {
        logger.error('Erro ao buscar membros:', err);
      }
    };

    void fetchRepublicMembers();
  }, [user?.currentRepublicId]);

  useEffect(() => {
    const fetchCodeLength = async () => {
      try {
        const response = await api.get<{ codeLength?: number }>(
          '/api/v1/republics/code-length'
        );
        if (response.data && response.data.codeLength) {
          setCodeLength(response.data.codeLength);
        }
      } catch (err) {
        logger.error('Erro ao obter o tamanho do código:', err);
      }
    };

    void fetchCodeLength();
  }, []);

  const openRegenerateModal = () => {
    if (!canRegenerateCode) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas o dono ou administradores podem gerar novos códigos.',
        tone: 'warning',
      });
      return;
    }

    setCodeMode('random');
    setCustomCode('');
    setCustomCodeError(undefined);
    setShowRegenerateModal(true);
  };

  const closeRegenerateModal = () => {
    if (regeneratingCode) return;
    setShowRegenerateModal(false);
    setCustomCode('');
    setCustomCodeError(undefined);
  };

  const handleConfirmRegenerate = async () => {
    if (!republic?.id) return;

    if (codeMode === 'custom') {
      if (!customCode.trim()) {
        setCustomCodeError('Por favor, digite um código personalizado.');
        return;
      }
      if (customCode.trim().length !== codeLength) {
        setCustomCodeError(`O código deve ter exatamente ${codeLength} caracteres.`);
        return;
      }
    }

    try {
      setRegeneratingCode(true);
      setCustomCodeError(undefined);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

      const payload =
        codeMode === 'custom' ? { customCode: customCode.trim() } : undefined;
      const response = await api.post<{ code: string }>(
        `/api/v1/republics/${republic.id}/regenerate-code`,
        payload
      );

      if (response.data?.code) {
        setRepublic((prev) =>
          prev
            ? {
                ...prev,
                code: response.data.code,
              }
            : null
        );
        setShowRegenerateModal(false);
        setCustomCode('');
        triggerHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        toast({
          title: 'Código atualizado',
          message:
            codeMode === 'custom'
              ? 'Novo código de convite personalizado gerado com sucesso!'
              : 'Novo código de convite gerado com sucesso!',
          tone: 'success',
        });
      }
    } catch (err) {
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setRegeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!republic?.code) return;

    try {
      await copyToClipboard(republic.code);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      toast({
        title: 'Código copiado',
        message: 'O código de convite foi copiado para a área de transferência.',
        tone: 'success',
      });
    } catch {
      toast({
        title: 'Erro',
        message: 'Não foi possível copiar o código.',
        tone: 'danger',
      });
    }
  };

  const handleShareCode = async () => {
    if (!republic?.code) return;

    try {
      await Share.share({
        message: `Entre na minha república no RepHelper usando o código: ${republic.code}`,
      });
    } catch {
      toast({
        title: 'Erro',
        message: 'Houve um erro ao compartilhar o código.',
        tone: 'danger',
      });
    }
  };

  const handleSaveChanges = async () => {
    Keyboard.dismiss();
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

    if (!isOwner) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas o dono da república pode alterar estas informações.',
        tone: 'warning',
      });
      return;
    }

    setSubmittedValidation(true);

    if (
      !name.trim() ||
      !street.trim() ||
      !number.trim() ||
      !neighborhood.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zipCode.trim()
    ) {
      toast({
        title: 'Campos obrigatórios',
        message: 'Preencha todos os campos obrigatórios.',
        tone: 'warning',
      });
      return;
    }

    try {
      setSaving(true);

      const republicData = {
        name,
        address: {
          street,
          number,
          complement: complement || null,
          neighborhood,
          city,
          state,
          zipCode,
        },
      };

      logger.debug('Enviando dados para atualização:', republicData);
      const response = await api.put<Republic>(
        `/api/v1/republics/${republic?.id}`,
        republicData
      );
      logger.debug('Resposta da atualização:', response.data);

      if (response.data) {
        setRepublic(response.data);
        setName(response.data.name);

        if (response.data.address) {
          setStreet(response.data.address.street ?? '');
          setNumber(response.data.address.number ?? '');
          setComplement(response.data.address.complement ?? '');
          setNeighborhood(response.data.address.neighborhood ?? '');
          setCity(response.data.address.city ?? '');
          setState(response.data.address.state ?? '');
          setZipCode(response.data.address.zipCode ?? '');
        }

        setSubmittedValidation(false);
        triggerHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        toast({
          title: 'República atualizada',
          message: 'Informações da república atualizadas com sucesso!',
          tone: 'success',
        });
      }
    } catch (err) {
      logger.error('Erro ao salvar alterações:', err);
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setSaving(false);
    }
  };

  const requiredError = (val: string) =>
    submittedValidation && !val.trim() ? 'Campo obrigatório' : undefined;

  const header = (
    <ScreenHeader
      title="Configurações da República"
      subtitle="Gerencie informações e código de convite"
      onBack={() => router.back()}
    />
  );

  if (loading) {
    return (
      <Screen header={header}>
        <StateView kind="loading" title="Carregando dados da república..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={header}>
        <StateView
          kind="error"
          title="Erro ao carregar república"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void fetchRepublicData()}
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen
        scroll
        keyboardAvoiding
        header={header}
        contentContainerStyle={{ gap: theme.spacing.lg }}
      >
        {/* Código de Convite */}
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Código de convite
          </AppText>
          <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
            <AppText variant="body" color="inkSecondary">
              Compartilhe este código para convidar novos moradores:
            </AppText>

            <Surface tone="subtle" padded="md" radiusKey="sm" style={styles.codeBox}>
              <AppText variant="monoHero" color="accent" style={styles.codeText}>
                {republic?.code || '------'}
              </AppText>
            </Surface>

            <View style={[styles.codeActionsRow, { gap: theme.spacing.xs }]}>
              <IconButton
                icon={<Copy size={20} strokeWidth={1.75} color={theme.colors.accent} />}
                onPress={() => void handleCopyCode()}
                accessibilityLabel="Copiar código de convite"
                variant="subtle"
              />
              <IconButton
                icon={<Share2 size={20} strokeWidth={1.75} color={theme.colors.accent} />}
                onPress={() => void handleShareCode()}
                accessibilityLabel="Compartilhar código de convite"
                variant="subtle"
              />
              {canRegenerateCode ? (
                <Button
                  label="Gerar Novo Código"
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <RefreshCw
                      size={16}
                      strokeWidth={1.75}
                      color={theme.colors.ink}
                    />
                  }
                  onPress={openRegenerateModal}
                />
              ) : null}
            </View>
          </Surface>
        </View>

        {/* Informações da República */}
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Informações da república
          </AppText>
          <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
            {!isOwner ? (
              <AppText variant="caption" color="inkMuted">
                Apenas o proprietário pode editar os dados da república.
              </AppText>
            ) : null}

            <TextField
              label="Nome da República *"
              value={name}
              onChangeText={setName}
              placeholder="Digite o nome da república"
              editable={isOwner}
              error={requiredError(name)}
              leftIcon={<Home size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            />

            <TextField
              label="Rua *"
              value={street}
              onChangeText={setStreet}
              placeholder="Digite o nome da rua"
              editable={isOwner}
              error={requiredError(street)}
              leftIcon={<Map size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            />

            <View style={[styles.rowInputs, { gap: theme.spacing.sm }]}>
              <View style={styles.flexField}>
                <TextField
                  label="Número *"
                  value={number}
                  onChangeText={setNumber}
                  placeholder="Número"
                  editable={isOwner}
                  keyboardType="number-pad"
                  error={requiredError(number)}
                  leftIcon={
                    <Hash size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
                  }
                />
              </View>
              <View style={styles.flexField}>
                <TextField
                  label="Complemento"
                  value={complement}
                  onChangeText={setComplement}
                  placeholder="Complemento"
                  editable={isOwner}
                />
              </View>
            </View>

            <TextField
              label="Bairro *"
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="Digite o bairro"
              editable={isOwner}
              error={requiredError(neighborhood)}
              leftIcon={
                <MapPin size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
              }
            />

            <View style={[styles.rowInputs, { gap: theme.spacing.sm }]}>
              <View style={styles.flexField}>
                <TextField
                  label="Cidade *"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Cidade"
                  editable={isOwner}
                  error={requiredError(city)}
                  leftIcon={
                    <Building2
                      size={18}
                      strokeWidth={1.75}
                      color={theme.colors.inkMuted}
                    />
                  }
                />
              </View>
              <View style={styles.stateField}>
                <TextField
                  label="Estado *"
                  value={state}
                  onChangeText={(text) => setState(text.toUpperCase())}
                  placeholder="UF"
                  editable={isOwner}
                  maxLength={2}
                  autoCapitalize="characters"
                  error={requiredError(state)}
                  leftIcon={
                    <Flag size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
                  }
                />
              </View>
            </View>

            <TextField
              label="CEP *"
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="Digite o CEP"
              editable={isOwner}
              keyboardType="number-pad"
              maxLength={9}
              error={requiredError(zipCode)}
              leftIcon={<Mail size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            />
          </Surface>
        </View>

        {isOwner ? (
          <Button
            label="Salvar Alterações"
            variant="primary"
            fullWidth
            loading={saving}
            leftIcon={
              <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
            }
            onPress={() => void handleSaveChanges()}
          />
        ) : null}
      </Screen>

      <BottomSheetModal
        visible={showRegenerateModal}
        onClose={closeRegenerateModal}
        title="Gerar Novo Código"
        dismissable={!regeneratingCode}
        dismissOnBackdropPress={!regeneratingCode}
        footer={
          <View style={[styles.modalActions, { gap: theme.spacing.sm }]}>
            <View style={styles.flexField}>
              <Button
                label="Cancelar"
                variant="secondary"
                disabled={regeneratingCode}
                fullWidth
                onPress={closeRegenerateModal}
              />
            </View>
            <View style={styles.flexField}>
              <Button
                label={codeMode === 'random' ? 'Gerar Aleatório' : 'Confirmar'}
                variant="primary"
                loading={regeneratingCode}
                disabled={codeMode === 'custom' && customCode.trim().length !== codeLength}
                fullWidth
                onPress={() => void handleConfirmRegenerate()}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <SegmentedTabs<CodeGenerationMode>
            options={[
              { value: 'random', label: 'Aleatório' },
              { value: 'custom', label: 'Personalizado' },
            ]}
            value={codeMode}
            onChange={(nextMode) => {
              setCodeMode(nextMode);
              setCustomCodeError(undefined);
            }}
          />

          {codeMode === 'random' ? (
            <AppText variant="body" color="inkSecondary">
              Um novo código de {codeLength} caracteres será gerado automaticamente. O
              código anterior deixará de funcionar.
            </AppText>
          ) : (
            <TextField
              label="Código personalizado"
              value={customCode}
              onChangeText={(text) => {
                setCustomCode(text.toUpperCase());
                setCustomCodeError(undefined);
              }}
              placeholder={`${codeLength} caracteres`}
              maxLength={codeLength}
              autoCapitalize="characters"
              error={customCodeError}
              helperText={
                customCode.length === codeLength
                  ? 'Código pronto para confirmar'
                  : `Faltam ${Math.max(0, codeLength - customCode.length)} caracteres`
              }
            />
          )}
        </View>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  codeBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    letterSpacing: 3,
    textAlign: 'center',
  },
  codeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flexField: {
    flex: 1,
  },
  stateField: {
    width: 116,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
});

export default RepublicSettingsScreen;
