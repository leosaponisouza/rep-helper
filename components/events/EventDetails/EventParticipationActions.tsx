import React from 'react';
import { View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { AppText, Button, Surface, useTheme } from '../../../src/design-system';
import { EventInvitation } from '../../../src/services/events';

export interface EventParticipationActionsProps {
  eventHasPassed: boolean;
  userInvitation: EventInvitation | null;
  refreshing: boolean;
  onUpdateStatus: (status: 'CONFIRMED' | 'DECLINED') => void;
}

export const EventParticipationActions: React.FC<
  EventParticipationActionsProps
> = ({ eventHasPassed, userInvitation, refreshing, onUpdateStatus }) => {
  const { theme } = useTheme();

  if (eventHasPassed || !userInvitation) {
    return null;
  }

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.sm }}
    >
      <AppText variant="heading" color="ink">
        Sua participação
      </AppText>

      <View style={{ gap: theme.spacing.xs }}>
        {(userInvitation.status === 'DECLINED' ||
          userInvitation.status === 'INVITED') && (
          <Button
            label="Confirmar participação"
            variant="primary"
            fullWidth
            loading={refreshing}
            leftIcon={
              <Check size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
            }
            onPress={() => onUpdateStatus('CONFIRMED')}
            accessibilityLabel="Confirmar participação"
          />
        )}

        {(userInvitation.status === 'CONFIRMED' ||
          userInvitation.status === 'INVITED') && (
          <Button
            label="Recusar participação"
            variant="danger"
            fullWidth
            loading={refreshing}
            leftIcon={
              <X size={18} strokeWidth={1.75} color={theme.colors.onDanger} />
            }
            onPress={() => onUpdateStatus('DECLINED')}
            accessibilityLabel="Recusar participação"
          />
        )}
      </View>
    </Surface>
  );
};

export default EventParticipationActions;
