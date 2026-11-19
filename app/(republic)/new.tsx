import React, { useState, useCallback } from 'react';
import { Clipboard, Keyboard, Platform, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import {
  Building2,
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
import * as republicService from '../../src/services/republicService';
import { CreateRepublicRequest } from '../../src/models/republic.model';
import { logger } from '../../src/utils/logger';
import {
  AppText,
  Button,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  type TextFieldProps,
  useFeedback,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

// Função auxiliar para formatar CEP
const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 5) {
    return numbers;
  }
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

// Validation Schema
const republicSchema = z.object({
  name: z.string().min(3, { message: 'Nome da república é obrigatório' }),
  street: z.string().min(1, { message: 'Rua é obrigatória' }),
  number: z.string().min(1, { message: 'Número é obrigatório' }),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, { message: 'Bairro é obrigatório' }),
  city: z.string().min(1, { message: 'Cidade é obrigatória' }),
  state: z.string().length(2, { message: 'Estado deve ter 2 letras' }),
  zip_code: z.string().regex(/^\d{5}-\d{3}$/, { message: 'CEP inválido' }),
});

type RepublicFormData = z.infer<typeof republicSchema>;

const DEFAULT_VALUES: RepublicFormData = {
  name: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip_code: '',
};

interface RepublicFieldConfig {
  name: keyof RepublicFormData;
  label: string;
  placeholder: string;
  Icon: LucideIcon;
  keyboardType?: TextFieldProps['keyboardType'];
  autoCapitalize?: TextFieldProps['autoCapitalize'];
  maxLength?: number;
  transformValue?: (text: string) => string;
}

const IDENTIFICATION_FIELD: RepublicFieldConfig = {
  name: 'name',
  label: 'Nome da República *',
  placeholder: 'Ex: República dos Estudantes',
  Icon: Home,
  autoCapitalize: 'words',
};

const ADDRESS_FIELDS: ReadonlyArray<RepublicFieldConfig> = [
  {
    name: 'street',
    label: 'Rua *',
    placeholder: 'Nome da rua',
    Icon: MapPin,
    autoCapitalize: 'words',
  },
  {
    name: 'number',
    label: 'Número *',
    placeholder: 'Número',
    Icon: Hash,
    keyboardType: 'number-pad',
  },
  {
    name: 'complement',
    label: 'Complemento',
    placeholder: 'Apartamento, bloco, etc. (opcional)',
    Icon: Info,
    autoCapitalize: 'words',
  },
  {
    name: 'neighborhood',
    label: 'Bairro *',
    placeholder: 'Nome do bairro',
    Icon: Map,
    autoCapitalize: 'words',
  },
  {
    name: 'city',
    label: 'Cidade *',
    placeholder: 'Nome da cidade',
    Icon: Building2,
    autoCapitalize: 'words',
  },
  {
    name: 'state',
    label: 'Estado (UF) *',
    placeholder: 'UF',
    Icon: Flag,
    autoCapitalize: 'characters',
    maxLength: 2,
  },
  {
    name: 'zip_code',
    label: 'CEP *',
    placeholder: '00000-000',
    Icon: Mail,
    keyboardType: 'number-pad',
    maxLength: 9,
    transformValue: formatCEP,
  },
];

const CreateRepublicScreen: React.FC = () => {
  const { theme } = useTheme();
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = useThemedStyles((t) => ({
    screenContent: {
      gap: t.spacing.lg,
      paddingBottom: t.spacing.xxl,
    },
    sectionSurface: {
      gap: t.spacing.md,
    },
  }));

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RepublicFormData>({
    resolver: zodResolver(republicSchema),
    mode: 'onBlur',
    defaultValues: DEFAULT_VALUES,
  });

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reset(DEFAULT_VALUES);
    }, [reset])
  );

  const triggerHaptic = (action: () => Promise<void>) => {
    if (Platform.OS === 'web') {
      return;
    }
    try {
      Promise.resolve(action()).catch(() => {});
    } catch {
      // Ignore haptics errors on unsupported environments
    }
  };

  const showRepublicCodeDialog = async (code: string) => {
    const shouldCopy = await confirm({
      title: 'República Criada!',
      message: `Compartilhe este código com seus moradores:\n\n${code}`,
      confirmLabel: 'Copiar Código',
      cancelLabel: 'OK',
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

    router.replace('/(panel)/home');
  };

  const onSubmit = async (data: RepublicFormData) => {
    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      triggerHaptic(() =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      );

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const republicData: CreateRepublicRequest = {
        ...data,
        owner_id: user.uid,
        zipCode: data.zip_code,
      };

      logger.debug('Enviando dados para criar república:', {
        name: republicData.name,
      });

      const response = await republicService.createRepublic(republicData);

      logger.debug('República criada com sucesso:', {
        id: response.republic?.id,
      });
      const republicCode = response.republic?.code;
      setIsSubmitting(false);

      if (republicCode) {
        await showRepublicCodeDialog(republicCode);
      } else {
        toast({
          title: 'Sucesso',
          message: 'República criada com sucesso!',
          tone: 'success',
        });
        router.replace('/(panel)/home');
      }
    } catch (err: any) {
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );

      const errorMessage = err?.message || 'Erro ao criar república';
      toast({
        title: 'Erro',
        message: errorMessage,
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
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
  }: RepublicFieldConfig) => {
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
          title="Criar uma nova república"
          subtitle="Os campos com * são obrigatórios"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={styles.screenContent}
    >
      <Surface tone="surface" bordered padded="lg" style={styles.sectionSurface}>
        <AppText variant="monoLabel" color="inkSecondary">
          Identificação
        </AppText>
        {renderField(IDENTIFICATION_FIELD)}
      </Surface>

      <Surface tone="surface" bordered padded="lg" style={styles.sectionSurface}>
        <AppText variant="monoLabel" color="inkSecondary">
          Endereço
        </AppText>
        {ADDRESS_FIELDS.map(renderField)}
      </Surface>

      <View>
        <Button
          label="Criar República"
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

export default CreateRepublicScreen;
