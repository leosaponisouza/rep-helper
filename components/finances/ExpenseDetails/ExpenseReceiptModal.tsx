// components/Finances/ExpenseDetails/ExpenseReceiptModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Share2 } from 'lucide-react-native';
import {
  BottomSheetModal,
  Button,
  StateView,
  useFeedback,
  useTheme,
} from '../../../src/design-system';

export interface ExpenseReceiptModalProps {
  visible: boolean;
  receiptUrl?: string;
  description: string;
  onClose: () => void;
}

const isSafeReceiptUri = (uri?: string): uri is string =>
  Boolean(uri && /^(https?:\/\/|blob:|data:image\/)/i.test(uri.trim()));

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  visible,
  receiptUrl,
  description,
  onClose,
}) => {
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { height: viewportHeight } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (visible) {
      setImageError(false);
    }
  }, [visible, receiptUrl]);

  const validUrl = isSafeReceiptUri(receiptUrl) ? receiptUrl.trim() : undefined;
  const previewHeight = Math.min(480, Math.max(240, Math.round(viewportHeight * 0.5)));

  const handleShare = async () => {
    if (!validUrl) return;

    const message = `Comprovante da despesa: ${description}\n${validUrl}`;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        if (navigator.share) {
          await navigator.share({
            title: description,
            text: `Comprovante da despesa: ${description}`,
            url: validUrl,
          });
          return;
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(validUrl);
          toast({
            title: 'Link copiado',
            message: 'O link do comprovante foi copiado para a área de transferência.',
            tone: 'success',
          });
          return;
        }
      }

      await Share.share({
        url: validUrl,
        message,
      });
    } catch {
      toast({
        title: 'Erro',
        message: 'Não foi possível compartilhar o comprovante.',
        tone: 'danger',
      });
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Comprovante"
      footer={
        validUrl ? (
          <Button
            label="Compartilhar comprovante"
            variant="secondary"
            fullWidth
            leftIcon={<Share2 size={18} strokeWidth={1.75} color={theme.colors.ink} />}
            onPress={() => void handleShare()}
          />
        ) : undefined
      }
    >
      {validUrl && !imageError ? (
        <View
          style={[
            styles.imageFrame,
            {
              height: previewHeight,
              backgroundColor: theme.colors.subtle,
              borderColor: theme.colors.line,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Image
            source={{ uri: validUrl }}
            style={styles.receiptImage}
            resizeMode="contain"
            onError={() => setImageError(true)}
            accessibilityLabel={`Comprovante da despesa ${description}`}
          />
        </View>
      ) : (
        <StateView
          kind={imageError ? 'error' : 'empty'}
          title={
            imageError
              ? 'Não foi possível carregar o comprovante'
              : 'Comprovante indisponível'
          }
          description="Verifique sua conexão ou tente abrir o comprovante novamente."
        />
      )}
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  imageFrame: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
});

export default ExpenseReceiptModal;
