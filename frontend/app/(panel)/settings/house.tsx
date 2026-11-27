import React, { useCallback, useEffect, useState } from 'react';
import {
  Clipboard,
  Keyboard,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Building2,
  ChevronDown,
  ChevronUp,
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
  Chip,
  Divider,
  IconButton,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  StateView,
  StatusText,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { House, HouseMember } from '../../../src/models/house.model';
import * as houseService from '../../../src/services/houseService';
import {
  HOUSE_PRESETS,
  CanonicalHousePresetType,
  HousePresetType,
  HouseRulesConfig,
  applyHousePreset,
  getPresetLabel,
  resolvePresetFromRules,
} from '../../../src/utils/housePresets';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

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

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

const HouseSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { user } = useAuth();

  const [house, setHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showRegenerateModal, setShowRegenerateModal] = useState<boolean>(false);
  const [codeMode, setCodeMode] = useState<CodeGenerationMode>('random');
  const [regeneratingCode, setRegeneratingCode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>('');
  const [customCodeError, setCustomCodeError] = useState<string | undefined>(undefined);
  const [codeLength, setCodeLength] = useState<number>(6);
  const [houseMembers, setHouseMembers] = useState<HouseMember[]>([]);

  const [name, setName] = useState<string>('');
  const [presetType, setPresetType] = useState<HousePresetType>('COUPLE_FAMILY');
  const [rules, setRules] = useState<HouseRulesConfig>(() => applyHousePreset('COUPLE_FAMILY'));
  const [addressExpanded, setAddressExpanded] = useState<boolean>(false);

  const [street, setStreet] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [complement, setComplement] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [submittedValidation, setSubmittedValidation] = useState<boolean>(false);

  const isOwner = Boolean(user?.uid && house?.ownerId && user.uid === house.ownerId);
  const isUserAdmin = Boolean(
    user?.isAdmin ||
      house?.allMembersAdmin ||
      houseMembers.some((m) => (m.uid || m.id) === user?.uid && m.isAdmin)
  );
  const canEditHouse = isOwner || isUserAdmin;

  const hydrateFromHouse = useCallback((houseData: House) => {
    setHouse(houseData);
    setName(houseData.name ?? '');
    const loadedRules: HouseRulesConfig = {
      hasSharedFund: Boolean(houseData.hasSharedFund),
      requireExpenseApproval: Boolean(houseData.requireExpenseApproval),
      allMembersAdmin: Boolean(houseData.allMembersAdmin),
    };
    setRules(loadedRules);
    setPresetType(
      (houseData.presetType as HousePresetType) || resolvePresetFromRules(loadedRules)
    );

    const addr = houseData.address;
    setStreet(addr?.street ?? '');
    setNumber(addr?.number ?? '');
    setComplement(addr?.complement ?? '');
    setNeighborhood(addr?.neighborhood ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setZipCode(addr?.zipCode ?? '');
    const hasAnyAddress = Boolean(
      addr?.street || addr?.number || addr?.neighborhood || addr?.city || addr?.state || addr?.zipCode
    );
    setAddressExpanded(hasAnyAddress);
  }, []);

  const fetchHouseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.currentHouseId) {
        throw new Error('Você não está vinculado a nenhuma casa');
      }

      const houseData = await houseService.getHouse(user.currentHouseId);
      hydrateFromHouse(houseData);
    } catch (err) {
      logger.error('Erro ao buscar dados da casa:', err);
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      void ErrorHandler.handle(err);
    } finally {
      setLoading(false);
    }
  }, [user?.currentHouseId, hydrateFromHouse]);

  useEffect(() => {
    void fetchHouseData();
  }, [fetchHouseData]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.currentHouseId) return;
      try {
        const members = await houseService.getHouseMembers(user.currentHouseId);
        setHouseMembers(members);
      } catch (err) {
        logger.error('Erro ao buscar moradores:', err);
      }
    };

    void fetchMembers();
  }, [user?.currentHouseId]);

  useEffect(() => {
    houseService
      .getCodeLength()
      .then((len) => {
        if (len) setCodeLength(len);
      })
      .catch((err) => logger.error('Erro ao obter tamanho do código:', err));
  }, []);

  const handleSelectPreset = (nextPreset: CanonicalHousePresetType) => {
    if (!canEditHouse) return;
    const nextRules = applyHousePreset(nextPreset);
    setRules(nextRules);
    setPresetType(nextPreset);
  };

  const handleToggleRule = (key: keyof HouseRulesConfig, nextValue: boolean) => {
    if (!canEditHouse) return;
    setRules((prev) => {
      const updated = { ...prev, [key]: nextValue };
      setPresetType(resolvePresetFromRules(updated));
      return updated;
    });
  };

  const openRegenerateModal = () => {
    if (!canEditHouse) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas administradores podem gerar novos códigos de convite.',
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
    if (!house?.id) return;

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

      const response = await houseService.regenerateInviteCode(
        house.id,
        codeMode === 'custom' ? customCode.trim() : undefined
      );

      if (response?.code) {
        setHouse((prev) => (prev ? { ...prev, code: response.code } : null));
        setShowRegenerateModal(false);
        setCustomCode('');
        triggerHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        toast({
          title: 'Código atualizado',
          message: 'Novo código de convite gerado com sucesso!',
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
    if (!house?.code) return;

    try {
      await copyToClipboard(house.code);
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
    if (!house?.code) return;

    try {
      await Share.share({
        message: `Entre na nossa casa no Alpendre usando o código: ${house.code}`,
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

    if (!canEditHouse || !house?.id) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas administradores da casa podem alterar estas informações.',
        tone: 'warning',
      });
      return;
    }

    setSubmittedValidation(true);

    if (name.trim().length < 2) {
      toast({
        title: 'Nome obrigatório',
        message: 'Informe o nome da casa com pelo menos 2 caracteres.',
        tone: 'warning',
      });
      return;
    }

    if (state.trim() && !/^[A-Za-z]{2}$/.test(state.trim())) {
      toast({
        title: 'Estado inválido',
        message: 'Informe a sigla do estado com 2 letras ou deixe em branco.',
        tone: 'warning',
      });
      return;
    }

    try {
      setSaving(true);

      const updated = await houseService.updateHouse(house.id, {
        name: name.trim(),
        presetType,
        hasSharedFund: rules.hasSharedFund,
        requireExpenseApproval: rules.requireExpenseApproval,
        allMembersAdmin: rules.allMembersAdmin,
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.trim(),
      });

      hydrateFromHouse(updated);
      setSubmittedValidation(false);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      toast({
        title: 'Casa atualizada',
        message: 'Configurações da casa salvas com sucesso!',
        tone: 'success',
      });
    } catch (err) {
      logger.error('Erro ao salvar alterações da casa:', err);
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setSaving(false);
    }
  };

  const nameError =
    submittedValidation && name.trim().length < 2
      ? 'Informe pelo menos 2 caracteres'
      : undefined;

  const stateError =
    submittedValidation && state.trim() && !/^[A-Za-z]{2}$/.test(state.trim())
      ? 'Use 2 letras'
      : undefined;

  const header = (
    <ScreenHeader
      title="Configurações da Casa"
      subtitle="Convite, regras de funcionamento e dados da casa"
      onBack={() => router.back()}
    />
  );

  if (loading) {
    return (
      <Screen header={header}>
        <StateView kind="loading" title="Carregando dados da casa..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={header}>
        <StateView
          kind="error"
          title="Erro ao carregar casa"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void fetchHouseData()}
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
        contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
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
                {house?.code || '------'}
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
              {canEditHouse ? (
                <Button
                  label="Gerar Novo Código"
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <RefreshCw size={16} strokeWidth={1.75} color={theme.colors.ink} />
                  }
                  onPress={openRegenerateModal}
                />
              ) : null}
            </View>
          </Surface>
        </View>

        {/* Identificação & Regras */}
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Identificação e regras
          </AppText>
          <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
            {!canEditHouse ? (
              <AppText variant="caption" color="inkMuted">
                Apenas administradores podem editar as regras e os dados da casa.
              </AppText>
            ) : null}

            <TextField
              label="Nome da Casa *"
              value={name}
              onChangeText={setName}
              placeholder="Digite o nome da casa"
              editable={canEditHouse}
              error={nameError}
              leftIcon={<Home size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            />

            <Divider />

            <View style={styles.rowBetween}>
              <AppText variant="bodyStrong" color="ink">
                Perfil da casa
              </AppText>
              <StatusText label={getPresetLabel(presetType)} tone="accent" showDot />
            </View>

            <View style={[styles.chipWrap, { gap: theme.spacing.xs }]}>
              {HOUSE_PRESETS.map((preset) => (
                <Chip
                  key={preset.type}
                  label={preset.label}
                  selected={presetType === preset.type}
                  disabled={!canEditHouse}
                  onPress={() => handleSelectPreset(preset.type)}
                />
              ))}
            </View>

            <Divider />

            <View style={styles.ruleRow}>
              <View style={styles.ruleText}>
                <AppText variant="bodyStrong" color="ink">
                  Usar caixinha da casa
                </AppText>
                <AppText variant="caption" color="inkSecondary">
                  {rules.hasSharedFund
                    ? 'Controla saldo em caixa, receitas e reembolsos'
                    : 'Acompanha gastos do mês sem saldo nem reembolsos'}
                </AppText>
              </View>
              <Switch
                value={rules.hasSharedFund}
                onValueChange={(val) => handleToggleRule('hasSharedFund', val)}
                disabled={!canEditHouse}
                accessibilityLabel="Usar caixinha da casa"
                trackColor={{
                  false: theme.colors.borderStrong,
                  true: theme.colors.accentSoft,
                }}
                thumbColor={rules.hasSharedFund ? theme.colors.accent : theme.colors.surface}
                ios_backgroundColor={theme.colors.subtle}
              />
            </View>

            <Divider />

            <View style={styles.ruleRow}>
              <View style={styles.ruleText}>
                <AppText variant="bodyStrong" color="ink">
                  Exigir aprovação nas despesas
                </AppText>
                <AppText variant="caption" color="inkSecondary">
                  Despesas criadas aguardam aprovação de um administrador
                </AppText>
              </View>
              <Switch
                value={rules.requireExpenseApproval}
                onValueChange={(val) => handleToggleRule('requireExpenseApproval', val)}
                disabled={!canEditHouse}
                accessibilityLabel="Exigir aprovação nas despesas"
                trackColor={{
                  false: theme.colors.borderStrong,
                  true: theme.colors.accentSoft,
                }}
                thumbColor={
                  rules.requireExpenseApproval ? theme.colors.accent : theme.colors.surface
                }
                ios_backgroundColor={theme.colors.subtle}
              />
            </View>

            <Divider />

            <View style={styles.ruleRow}>
              <View style={styles.ruleText}>
                <AppText variant="bodyStrong" color="ink">
                  Todos os moradores administram
                </AppText>
                <AppText variant="caption" color="inkSecondary">
                  Todos os moradores ativos recebem permissão administrativa
                </AppText>
              </View>
              <Switch
                value={rules.allMembersAdmin}
                onValueChange={(val) => handleToggleRule('allMembersAdmin', val)}
                disabled={!canEditHouse}
                accessibilityLabel="Todos os moradores administram"
                trackColor={{
                  false: theme.colors.borderStrong,
                  true: theme.colors.accentSoft,
                }}
                thumbColor={rules.allMembersAdmin ? theme.colors.accent : theme.colors.surface}
                ios_backgroundColor={theme.colors.subtle}
              />
            </View>
          </Surface>
        </View>

        {/* Endereço Opcional */}
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Localização
          </AppText>
          <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
            <Pressable
              onPress={() => setAddressExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: addressExpanded }}
              accessibilityLabel="Endereço da casa (opcional)"
              style={({ pressed }) => [
                styles.rowBetween,
                { opacity: pressed ? theme.motion.pressOpacity : 1 },
              ]}
            >
              <View style={styles.ruleText}>
                <AppText variant="bodyStrong" color="ink">
                  Endereço da casa (opcional)
                </AppText>
                <AppText variant="caption" color="inkSecondary">
                  {house?.address?.fullAddress || 'Nenhum endereço informado'}
                </AppText>
              </View>
              {addressExpanded ? (
                <ChevronUp size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
              ) : (
                <ChevronDown size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
              )}
            </Pressable>

            {addressExpanded ? (
              <View style={{ gap: theme.spacing.md }}>
                <Divider />
                <TextField
                  label="Rua"
                  value={street}
                  onChangeText={setStreet}
                  placeholder="Nome da rua"
                  editable={canEditHouse}
                  leftIcon={<Map size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                />

                <View style={[styles.rowInputs, { gap: theme.spacing.sm }]}>
                  <View style={styles.flexField}>
                    <TextField
                      label="Número"
                      value={number}
                      onChangeText={setNumber}
                      placeholder="Número"
                      editable={canEditHouse}
                      keyboardType="number-pad"
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
                      editable={canEditHouse}
                    />
                  </View>
                </View>

                <TextField
                  label="Bairro"
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                  placeholder="Bairro"
                  editable={canEditHouse}
                  leftIcon={
                    <MapPin size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
                  }
                />

                <View style={[styles.rowInputs, { gap: theme.spacing.sm }]}>
                  <View style={styles.flexField}>
                    <TextField
                      label="Cidade"
                      value={city}
                      onChangeText={setCity}
                      placeholder="Cidade"
                      editable={canEditHouse}
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
                      label="Estado"
                      value={state}
                      onChangeText={(text) => setState(text.toUpperCase())}
                      placeholder="UF"
                      editable={canEditHouse}
                      maxLength={2}
                      autoCapitalize="characters"
                      error={stateError}
                      leftIcon={
                        <Flag size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
                      }
                    />
                  </View>
                </View>

                <TextField
                  label="CEP"
                  value={zipCode}
                  onChangeText={(text) => setZipCode(formatCEP(text))}
                  placeholder="00000-000"
                  editable={canEditHouse}
                  keyboardType="number-pad"
                  maxLength={9}
                  leftIcon={<Mail size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                />
              </View>
            ) : null}
          </Surface>
        </View>

        {canEditHouse ? (
          <Button
            label="Salvar Alterações"
            variant="primary"
            fullWidth
            loading={saving}
            leftIcon={<Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
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
              Um novo código de {codeLength} caracteres será gerado automaticamente. O código
              anterior deixará de funcionar.
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ruleText: {
    flex: 1,
    gap: 2,
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

export default HouseSettingsScreen;
