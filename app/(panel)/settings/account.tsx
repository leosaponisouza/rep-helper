import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertCircle,
  AtSign,
  Camera,
  ChevronRight,
  Lock,
  Mail,
  Phone,
  Save,
  Trash2,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  Avatar,
  Button,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import api from '../../../src/services/api';
import {
  deleteImageFromSupabase,
  uploadImageToSupabase,
} from '../../../src/services/supabase';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

const triggerHaptic = (callback: () => Promise<void> | void) => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(callback()).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const AccountScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast, confirm } = useFeedback();
  const { user, updateStoredUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profilePictureUrl || null
  );
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setNickname(user.nickname || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
      if (user.profilePictureUrl !== undefined) {
        setProfileImage(user.profilePictureUrl || null);
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    Keyboard.dismiss();
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

    if (!name.trim()) {
      setNameError('O nome é obrigatório');
      toast({
        title: 'Campo obrigatório',
        message: 'Informe seu nome completo para salvar.',
        tone: 'warning',
      });
      return;
    }

    setNameError(undefined);

    try {
      setLoading(true);

      const userData = {
        name,
        nickname: nickname.trim() || null,
        phoneNumber: phone,
        profilePictureUrl: profileImage,
      };

      logger.debug('Enviando dados para atualização:', userData);
      const response = await api.put(`/api/v1/users/${user?.uid}`, userData);

      if (response.data) {
        await updateStoredUser(response.data);
        toast({
          title: 'Perfil atualizado',
          message: 'Suas informações foram salvas com sucesso.',
          tone: 'success',
        });
      }
    } catch (error) {
      logger.error('Erro ao salvar perfil:', error);
      void ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    setUploadError(null);

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        toast({
          title: 'Permissão negada',
          message: 'É necessário permissão para acessar sua galeria de fotos.',
          tone: 'warning',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (!user?.uid) {
          toast({
            title: 'Erro',
            message: 'Usuário não autenticado.',
            tone: 'danger',
          });
          return;
        }

        setUploadingImage(true);

        try {
          logger.debug('Imagem selecionada. Iniciando upload para Supabase...');
          const asset = result.assets[0];
          const imageUri = asset.uri;

          logger.debug('Detalhes da imagem:', {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileSize: asset.fileSize,
            type: asset.type,
          });

          const { url, error } = await uploadImageToSupabase(
            imageUri,
            'avatars',
            user.uid,
            asset.fileSize
          );

          if (error || !url) {
            const errorMsg = error?.message || 'Falha ao fazer upload da imagem';
            setUploadError(errorMsg);
            throw new Error(
              `Falha ao fazer upload da imagem para o Supabase: ${error?.message}`
            );
          }

          logger.debug('Upload concluído. URL recebida:', url);
          setProfileImage(url);

          logger.debug('Atualizando perfil no backend com nova URL...');
          const response = await api.put(`/api/v1/users/${user?.uid}`, {
            profilePictureUrl: url,
          });
          logger.debug('Resposta da API:', response.data);

          if (user) {
            const updatedUser = {
              ...user,
              profilePictureUrl: url,
            };
            logger.debug(
              'Atualizando usuário no contexto com nova imagem:',
              updatedUser
            );
            await updateStoredUser(updatedUser);
            logger.debug('Usuário atualizado no contexto com sucesso');
          }

          triggerHaptic(() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          );
          toast({
            title: 'Foto atualizada',
            message: 'Foto de perfil atualizada com sucesso!',
            tone: 'success',
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro detalhado no upload:', error);
          setUploadError(message);
          toast({
            title: 'Erro ao enviar imagem',
            message: `Não foi possível fazer o upload da imagem: ${message}`,
            tone: 'danger',
          });
          void ErrorHandler.handle(error, { showAlert: false });
          triggerHaptic(() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          );
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao selecionar imagem:', error);
      setUploadError(message);
      toast({
        title: 'Erro',
        message: `Não foi possível selecionar a imagem: ${message}`,
        tone: 'danger',
      });
      setUploadingImage(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user?.uid) {
      toast({
        title: 'Erro',
        message: 'Usuário não autenticado.',
        tone: 'danger',
      });
      return;
    }

    try {
      setUploadingImage(true);
      setUploadError(null);

      if (profileImage) {
        logger.debug('Tentando excluir imagem do Supabase:', profileImage);
        const { error } = await deleteImageFromSupabase(
          profileImage,
          'avatars',
          user.uid
        );

        if (error) {
          logger.warn('Erro ao deletar imagem do Supabase:', error);
        }
      }

      logger.debug('Atualizando perfil no backend para remover a URL da imagem');
      await api.put(`/api/v1/users/${user?.uid}`, {
        profilePictureUrl: null,
      });

      setProfileImage(null);

      if (user) {
        const updatedUser = {
          ...user,
          profilePictureUrl: null,
        };
        await updateStoredUser(updatedUser);
        logger.debug('Usuário atualizado no contexto após remoção de imagem');
      }

      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      toast({
        title: 'Foto removida',
        message: 'Foto de perfil removida com sucesso!',
        tone: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao excluir imagem:', error);
      setUploadError(message);
      toast({
        title: 'Erro',
        message: `Não foi possível remover a foto: ${message}`,
        tone: 'danger',
      });
      void ErrorHandler.handle(error, { showAlert: false });
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmDeleteProfilePicture = async () => {
    if (!profileImage) return;

    const confirmed = await confirm({
      title: 'Remover Foto',
      message: 'Tem certeza que deseja remover sua foto de perfil?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (confirmed) {
      await handleDeleteProfilePicture();
    }
  };

  const displayLabel = nickname.trim() || name.trim() || 'Usuário';

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <ScreenHeader
          title="Perfil"
          subtitle="Editar informações pessoais"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      {/* Cabeçalho do perfil com avatar */}
      <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
        <View style={[styles.profileHeaderRow, { gap: theme.spacing.md }]}>
          <View style={styles.avatarHolder}>
            {uploadingImage ? (
              <View
                style={[
                  styles.uploadingPlaceholder,
                  {
                    backgroundColor: theme.colors.subtle,
                    borderColor: theme.colors.line,
                    borderRadius: theme.radius.full,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : (
              <Avatar uri={profileImage} name={displayLabel} size="lg" />
            )}
          </View>

          <View style={styles.profileIdentity}>
            <AppText variant="heading" color="ink" numberOfLines={1}>
              {displayLabel}
            </AppText>
            <AppText variant="caption" color="inkSecondary" numberOfLines={1}>
              {email}
            </AppText>
          </View>

          <View style={[styles.avatarActions, { gap: theme.spacing.xxs }]}>
            <IconButton
              icon={<Camera size={20} strokeWidth={1.75} color={theme.colors.accent} />}
              onPress={() => void pickImage()}
              disabled={uploadingImage}
              accessibilityLabel="Alterar foto de perfil"
              variant="subtle"
            />
            {profileImage ? (
              <IconButton
                icon={<Trash2 size={20} strokeWidth={1.75} color={theme.colors.danger} />}
                onPress={() => void confirmDeleteProfilePicture()}
                disabled={uploadingImage}
                accessibilityLabel="Remover foto de perfil"
                variant="danger"
              />
            ) : null}
          </View>
        </View>

        {uploadError ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: theme.colors.dangerSoft,
                borderRadius: theme.radius.sm,
                padding: theme.spacing.sm,
                gap: theme.spacing.xs,
              },
            ]}
          >
            <AlertCircle size={16} strokeWidth={1.75} color={theme.colors.danger} />
            <AppText variant="caption" color="danger" style={styles.flexText}>
              {uploadError}
            </AppText>
          </View>
        ) : null}
      </Surface>

      {/* Informações Pessoais */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Informações pessoais
        </AppText>
        <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
          <TextField
            label="Nome Completo"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError && text.trim()) {
                setNameError(undefined);
              }
            }}
            placeholder="Seu nome completo"
            error={nameError}
            leftIcon={
              <UserIcon size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
            }
          />

          <TextField
            label="Apelido (opcional)"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Como você gostaria de ser chamado"
            helperText="Se definido, será usado em vez do seu nome em toda a aplicação"
            leftIcon={
              <AtSign size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
            }
          />

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Seu email"
            editable={false}
            helperText="O email não pode ser alterado"
            leftIcon={
              <Mail size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
            }
          />

          <TextField
            label="Telefone (opcional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="Seu número de telefone"
            keyboardType="phone-pad"
            leftIcon={
              <Phone size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
            }
          />
        </Surface>
      </View>

      {/* Segurança */}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Segurança
        </AppText>
        <Surface tone="surface" bordered style={styles.sectionSurface}>
          <ListRow
            title="Alterar Senha"
            subtitle="Atualize sua senha de acesso"
            onPress={() => router.push('/(panel)/settings/change-password')}
            leading={
              <Lock size={20} strokeWidth={1.75} color={theme.colors.accent} />
            }
            trailing={
              <ChevronRight
                size={18}
                strokeWidth={1.75}
                color={theme.colors.inkMuted}
              />
            }
          />
        </Surface>
      </View>

      <Button
        label="Salvar Alterações"
        variant="primary"
        fullWidth
        loading={loading}
        leftIcon={
          <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
        }
        onPress={() => void handleSaveProfile()}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarHolder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingPlaceholder: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentity: {
    flex: 1,
    gap: 2,
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexText: {
    flex: 1,
  },
  sectionSurface: {
    overflow: 'hidden',
  },
});

export default AccountScreen;
