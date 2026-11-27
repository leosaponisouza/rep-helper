// app/(house)/new.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Clipboard, Keyboard, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Flag,
  Hash,
  Home,
  Info,
  type LucideIcon,
  Mail,
  Map,
  MapPin,
  PlusCircle,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import * as houseService from '../../src/services/houseService';
import { CreateHouseRequest } from '../../src/models/house.model';
import {
  HOUSE_PRESETS,
  CanonicalHousePresetType,
  HousePresetType,
  HouseRulesConfig,
  applyHousePreset,
  resolvePresetFromRules,
} from '../../src/utils/housePresets';
import { logger } from '../../src/utils/logger';
import {
  AppText,
  Button,
  Divider,
  Screen,
  ScreenHeader,
  StatusText,
  Surface,
  TextField,
  type TextFieldProps,
  useFeedback,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) {
    return numbers;
  }
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

const houseSchema = z.object({
  name: z.string().trim().min(2, { message: 'Informe o nome da casa (mín. 2 caracteres)' }),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || /^[A-Za-z]{2}$/.test(val.trim()), {
      message: 'Estado deve ter 2 letras',
    }),
  zipCode: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || /^\d{5}-\d{3}$/.test(val.trim()), {
      message: 'CEP inválido',
    }),
});

type HouseFormData = z.infer<typeof houseSchema>;

const DEFAULT_VALUES: HouseFormData = {
  name: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
};

interface HouseFieldConfig {
  name: keyof HouseFormData;
  label: string;
  placeholder: string;
  Icon: LucideIcon;
  keyboardType?: TextFieldProps['keyboardType'];
  autoCapitalize?: TextFieldProps['autoCapitalize'];
  maxLength?: number;
  transformValue?: (text: string) => string;
}

const IDENTIFICATION_FIELD: HouseFieldConfig = {
  name: 'name',
  label: 'Nome da Casa *',
  placeholder: 'Ex: Nossa Casa, Apê 42, Casa da Vila',
  Icon: Home,
  autoCapitalize: 'words',
};

const ADDRESS_FIELDS: ReadonlyArray<HouseFieldConfig> = [
  {
    name: 'street',
    label: 'Rua',
    placeholder: 'Nome da rua',
    Icon: MapPin,
    autoCapitalize: 'words',
  },
  {
    name: 'number',
    label: 'Número',
    placeholder: 'Número',
    Icon: Hash,
    keyboardType: 'number-pad',
  },
  {
    name: 'complement',
    label: 'Complemento',
    placeholder: 'Apartamento, bloco, etc.',
    Icon: Info,
    autoCapitalize: 'words',
  },
  {
    name: 'neighborhood',
    label: 'Bairro',
    placeholder: 'Nome do bairro',
    Icon: Map,
    autoCapitalize: 'words',
  },
  {
    name: 'city',
    label: 'Cidade',
    placeholder: 'Nome da cidade',
    Icon: Building2,
    autoCapitalize: 'words',
  },
  {
    name: 'state',
    label: 'Estado (UF)',
    placeholder: 'UF',
    Icon: Flag,
    autoCapitalize: 'characters',
    maxLength: 2,
    transformValue: (text: string) => text.toUpperCase(),
  },
  {
    name: 'zipCode',
    label: 'CEP',
    placeholder: '00000-000',
    Icon: Mail,
    keyboardType: 'number-pad',
    maxLength: 9,
    transformValue: formatCEP,
  },
];

const CreateHouseScreen: React.FC = () => {
  const { theme } = useTheme();
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const { user, login, updateStoredUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presetType, setPresetType] = useState<HousePresetType>('COUPLE_FAMILY');
  const [rules, setRules] = useState<HouseRulesConfig>(() => applyHousePreset('COUPLE_FAMILY'));
  const [addressExpanded, setAddressExpanded] = useState(false);

  const isMountedRef = useRef(true);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const themedStyles = useThemedStyles((t) => ({
    screenContent: {
      gap: t.spacing.lg,
      paddingBottom: t.spacing.xxl,
    },
    sectionSurface: {
      gap: t.spacing.md,
    },
    presetCard: {
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.surface,
      padding: t.spacing.md,
      gap: t.spacing.xxs,
    },
    presetCardSelected: {
      borderColor: t.colors.accent,
      backgroundColor: t.colors.subtle,
    },
  }));

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseSchema),
    mode: 'onBlur',
    defaultValues: DEFAULT_VALUES,
  });

  useFocusEffect(
    useCallback(() => {
      hasCompletedRef.current = false;
      setIsSubmitting(false);
      setPresetType('COUPLE_FAMILY');
      setRules(applyHousePreset('COUPLE_FAMILY'));
      setAddressExpanded(false);
      reset(DEFAULT_VALUES);
    }, [reset])
  );

  const handleSelectPreset = (nextPreset: CanonicalHousePresetType) => {
    const nextRules = applyHousePreset(nextPreset);
    setRules(nextRules);
    setPresetType(nextPreset);
  };

  const handleToggleRule = (key: keyof HouseRulesConfig, nextValue: boolean) => {
    setRules((prev) => {
      const updated = { ...prev, [key]: nextValue };
      setPresetType(resolvePresetFromRules(updated));
      return updated;
    });
  };

  const triggerHaptic = (action: () => Promise<void>) => {
    if (Platform.OS === 'web') return;
    try {
      Promise.resolve(action()).catch(() => {});
    } catch {
      // Ignore haptics errors on unsupported environments
    }
  };

  const showHouseCodeDialog = async (code: string) => {
    const shouldCopy = await confirm({
      title: 'Casa Criada!',
      message: `Compartilhe este código com os outros moradores:\n\n${code}`,
      confirmLabel: 'Copiar Código',
      cancelLabel: 'Continuar',
    });

    if (shouldCopy) {
      try {
        Clipboard.setString(code);
      } catch {
        // Ignore clipboard errors on unsupported environments
      }
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      toast({
        title: 'Sucesso',
        message: 'Código copiado para a área de transferência!',
        tone: 'success',
      });
    }

    if (isMountedRef.current) {
      router.replace('/(panel)/home');
    }
  };

  const onSubmit = async (data: HouseFormData) => {
    if (isSubmitting || hasCompletedRef.current) {
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const cleanField = (val?: string) => (val && val.trim() ? val.trim() : undefined);

      const houseData: CreateHouseRequest = {
        name: data.name.trim(),
        presetType,
        hasSharedFund: rules.hasSharedFund,
        requireExpenseApproval: rules.requireExpenseApproval,
        allMembersAdmin: rules.allMembersAdmin,
        street: cleanField(data.street),
        number: cleanField(data.number),
        complement: cleanField(data.complement),
        neighborhood: cleanField(data.neighborhood),
        city: cleanField(data.city),
        state: cleanField(data.state),
        zipCode: cleanField(data.zipCode),
      };

      const response = await houseService.createHouse(houseData);
      hasCompletedRef.current = true;

      if (response.token && response.user) {
        await login(response.token, response.user, response.refreshToken);
      } else if (response.user) {
        await updateStoredUser(response.user);
      } else if (response.house?.id) {
        await updateStoredUser({ currentHouseId: response.house.id, isAdmin: true });
      }

      const houseCode = response.house?.code;
      if (houseCode) {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
        await showHouseCodeDialog(houseCode);
      } else {
        toast({
          title: 'Sucesso',
          message: 'Casa criada com sucesso!',
          tone: 'success',
        });
        if (isMountedRef.current) {
          router.replace('/(panel)/home');
        }
      }
    } catch (err: any) {
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );

      const errorMessage = err?.message || 'Erro ao criar casa';
      toast({
        title: 'Erro',
        message: errorMessage,
        tone: 'danger',
      });
    } finally {
      if (isMountedRef.current && !hasCompletedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const renderField = ({
    name,
    label,
    placeholder,
    Icon,
    keyboardType,
    autoCapitalize,
    maxLength,
    transformValue,
  }: HouseFieldConfig) => {
    const fieldError = errors[name]?.message;

    return (
      <Controller
        key={name}
        control={control}
        name={name}
        render={({ field: { onChange, value, onBlur } }) => (
          <TextField
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            onChangeText={(text) =>
              onChange(transformValue ? transformValue(text) : text)
            }
            onBlur={onBlur}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            editable={!isSubmitting}
            leftIcon={
              <Icon
                size={20}
                strokeWidth={1.75}
                color={fieldError ? theme.colors.danger : theme.colors.inkMuted}
              />
            }
            error={fieldError}
          />
        )}
      />
    );
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      width="standard"
      header={
        <ScreenHeader
          title="Criar Nova Casa"
          subtitle="Escolha um perfil inicial e personalize como quiser"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={themedStyles.screenContent}
    >
      <Surface tone="surface" bordered padded="lg" style={themedStyles.sectionSurface}>
        <AppText variant="monoLabel" color="inkSecondary">
          Identificação
        </AppText>
        {renderField(IDENTIFICATION_FIELD)}
      </Surface>

      <Surface tone="surface" bordered padded="lg" style={themedStyles.sectionSurface}>
        <View style={styles.rowBetween}>
          <AppText variant="monoLabel" color="inkSecondary">
            Perfil da casa
          </AppText>
          {presetType === 'CUSTOM' ? (
            <StatusText label="Personalizado" tone="accent" showDot />
          ) : null}
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          {HOUSE_PRESETS.map((preset) => {
            const isSelected = presetType === preset.type;
            return (
              <Pressable
                key={preset.type}
                onPress={() => handleSelectPreset(preset.type)}
                disabled={isSubmitting}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={preset.label}
                style={({ pressed }) => [
                  themedStyles.presetCard,
                  isSelected ? themedStyles.presetCardSelected : null,
                  { opacity: pressed ? theme.motion.pressOpacity : 1 },
                ]}
              >
                <View style={styles.rowBetween}>
                  <AppText variant="bodyStrong" color={isSelected ? 'accent' : 'ink'}>
                    {preset.label}
                  </AppText>
                  {isSelected ? (
                    <StatusText label="Selecionado" tone="accent" showDot />
                  ) : null}
                </View>
                <AppText variant="caption" color="inkSecondary">
                  {preset.subtitle}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Divider />

        <AppText variant="monoLabel" color="inkSecondary">
          Regras da casa
        </AppText>

        <View style={styles.ruleRow}>
          <View style={styles.ruleText}>
            <AppText variant="bodyStrong" color="ink">
              Usar caixinha da casa
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              {rules.hasSharedFund
                ? 'Controla saldo em caixa, receitas e reembolsos'
                : 'Apenas acompanha os gastos da casa no mês'}
            </AppText>
          </View>
          <Switch
            value={rules.hasSharedFund}
            onValueChange={(val) => handleToggleRule('hasSharedFund', val)}
            disabled={isSubmitting}
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
              Novas despesas aguardam aprovação de um administrador
            </AppText>
          </View>
          <Switch
            value={rules.requireExpenseApproval}
            onValueChange={(val) => handleToggleRule('requireExpenseApproval', val)}
            disabled={isSubmitting}
            accessibilityLabel="Exigir aprovação nas despesas"
            trackColor={{
              false: theme.colors.borderStrong,
              true: theme.colors.accentSoft,
            }}
            thumbColor={rules.requireExpenseApproval ? theme.colors.accent : theme.colors.surface}
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
              Quem entra na casa já recebe permissão administrativa
            </AppText>
          </View>
          <Switch
            value={rules.allMembersAdmin}
            onValueChange={(val) => handleToggleRule('allMembersAdmin', val)}
            disabled={isSubmitting}
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

      <Surface tone="surface" bordered padded="lg" style={themedStyles.sectionSurface}>
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
              Preencha apenas se quiser guardar o endereço completo
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
            {ADDRESS_FIELDS.map(renderField)}
          </View>
        ) : null}
      </Surface>

      <View>
        <Button
          label="Criar Casa"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          leftIcon={<PlusCircle size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
});

export default CreateHouseScreen;
