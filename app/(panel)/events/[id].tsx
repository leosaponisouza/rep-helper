// app/(panel)/events/[id].tsx - Versão otimizada com melhor UX e performance
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isPast,
  isAfter,
  differenceInMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../../../src/hooks/useEvents';
import { Event } from '../../../src/services/events';
import { useAuth } from '../../../src/context/AuthContext';
import { useCalendarSync } from '../../../src/hooks/useCalendarSync';
import { CalendarPicker } from '../../../components/CalendarPicker';
import { logger } from '../../../src/utils/logger';
import { EventAttendanceGroups } from '../../../components/Event/EventDetails/EventAttendanceGroups';
import { EventParticipationActions } from '../../../components/Event/EventDetails/EventParticipationActions';
import { ConfirmDeleteModal } from '../../../components/common/ConfirmDeleteModal';

const EventDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; source?: string }>();
  const { user } = useAuth();
  const { getEventById, updateInvitationStatus, deleteEvent } = useEvents();
  const {
    syncing,
    syncEventWithCalendar,
    isCalendarPickerVisible,
    setIsCalendarPickerVisible,
    selectCalendar,
  } = useCalendarSync();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const scrollY = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const loadEventDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const eventData = await getEventById(id);
      if (eventData) {
        setEvent(eventData);
      } else {
        setError('Evento não encontrado');
      }
    } catch (err) {
      logger.error('Error loading event details:', err);
      setError('Não foi possível carregar os detalhes do evento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, getEventById]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  const isCreator = useMemo(() => {
    if (!event || !user) return false;
    return event.creatorId === user.uid;
  }, [event, user]);

  const userInvitation = useMemo(() => {
    if (!event || !user || !event.invitations) return null;
    return event.invitations.find((inv) => inv.userId === user.uid) || null;
  }, [event, user]);

  const formatEventDate = useCallback((dateString?: string): string => {
    if (!dateString) return '';

    try {
      const date = parseISO(dateString);

      if (isToday(date)) {
        return `Hoje, ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else if (isTomorrow(date)) {
        return `Amanhã, ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else {
        return format(date, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
      }
    } catch {
      return dateString;
    }
  }, []);

  const formatEventDuration = useCallback(
    (startDate?: string, endDate?: string): string => {
      if (!startDate || !endDate) return '';

      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const durationMinutes = differenceInMinutes(end, start);

        if (durationMinutes < 60) {
          return `${durationMinutes} minutos`;
        } else {
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;

          if (minutes === 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
          } else {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
          }
        }
      } catch {
        return '';
      }
    },
    []
  );

  const handleUpdateStatus = useCallback(
    async (status: 'CONFIRMED' | 'DECLINED') => {
      if (!event || !user) return;

      try {
        setRefreshing(true);
        await updateInvitationStatus(event.id, user.uid, status);
        await loadEventDetails();
      } catch (err) {
        logger.error('Error updating invitation status:', err);
        Alert.alert(
          'Erro',
          'Não foi possível atualizar seu status. Tente novamente.'
        );
      } finally {
        setRefreshing(false);
      }
    },
    [event, user, updateInvitationStatus, loadEventDetails]
  );

  const handleShareEvent = useCallback(async () => {
    if (!event) return;

    try {
      const message =
        `Evento: ${event.title}\n` +
        `Data: ${formatEventDate(event.startDate)}\n` +
        (event.location ? `Local: ${event.location}\n` : '') +
        (event.description ? `\n${event.description}` : '');

      await Share.share({
        message,
        title: event.title,
      });
    } catch (err) {
      logger.error('Error sharing event:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar o evento');
    }
  }, [event, formatEventDate]);

  const handleDeleteEvent = useCallback(async () => {
    if (!event) return;

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setRefreshing(true);
      await deleteEvent(event.id);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Alert.alert('Sucesso', 'Evento excluído com sucesso!', [
          {
            text: 'OK',
            onPress: () => router.push('/(panel)/events'),
          },
        ]);
      });
    } catch (err) {
      logger.error('Error deleting event:', err);
      Alert.alert(
        'Erro',
        'Não foi possível excluir o evento. Tente novamente.'
      );
      setShowConfirmDelete(false);
    } finally {
      setRefreshing(false);
    }
  }, [event, showConfirmDelete, deleteEvent, fadeAnim, scaleAnim, router]);

  const handleCancelDelete = useCallback(() => {
    setShowConfirmDelete(false);
  }, []);

  const eventHasPassed = useMemo(() => {
    if (!event || !event.endDate) return false;

    try {
      const endDate = parseISO(event.endDate);
      return isPast(endDate);
    } catch {
      return false;
    }
  }, [event]);

  const eventIsHappening = useMemo(() => {
    if (!event || !event.startDate || !event.endDate) return false;

    try {
      const now = new Date();
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      return isAfter(now, startDate) && isAfter(endDate, now);
    } catch {
      return false;
    }
  }, [event]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 60],
    extrapolate: 'clamp',
  });

  if (loading && !event) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <ActivityIndicator size="large" color="#7B68EE" />
        <Text style={styles.loadingText}>
          Carregando detalhes do compromisso...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <Ionicons name="alert-circle" size={64} color="#FF6347" />
        <Text style={styles.errorTitle}>Erro</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadEventDetails}
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <Ionicons name="calendar" size={64} color="#7B68EE" />
        <Text style={styles.errorTitle}>Compromisso não encontrado</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(panel)/events')}
        >
          <Text style={styles.backButtonText}>Voltar para Agenda</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#222" />

      {/* Header animado */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            opacity: headerOpacity,
            height: headerHeight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#7B68EE" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.headerRight}>
          {isCreator && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push(`/(panel)/events/edit/${event.id}`)}
            >
              <Ionicons name="create-outline" size={24} color="#7B68EE" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#7B68EE" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionIcon}
              onPress={handleShareEvent}
            >
              <Ionicons name="share-outline" size={24} color="#7B68EE" />
            </TouchableOpacity>

            {isCreator && (
              <TouchableOpacity
                style={styles.headerActionIcon}
                onPress={() => router.push(`/(panel)/events/edit/${event.id}`)}
              >
                <Ionicons name="create-outline" size={24} color="#7B68EE" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Conteúdo principal */}
        <Animated.View
          style={[
            styles.eventContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Status do evento e do usuário */}
          <View style={styles.statusContainer}>
            {eventHasPassed ? (
              <View style={styles.eventStatusBadge}>
                <Text style={styles.eventStatusText}>
                  Compromisso finalizado
                </Text>
              </View>
            ) : eventIsHappening ? (
              <View style={[styles.eventStatusBadge, styles.happeningNowBadge]}>
                <Text
                  style={[styles.eventStatusText, styles.happeningNowText]}
                >
                  Acontecendo agora
                </Text>
              </View>
            ) : null}

            {userInvitation && (
              <View
                style={[
                  styles.userStatusBadge,
                  userInvitation.status === 'CONFIRMED'
                    ? styles.confirmedBadge
                    : userInvitation.status === 'INVITED'
                      ? styles.invitedBadge
                      : styles.declinedBadge,
                ]}
              >
                <Ionicons
                  name={
                    userInvitation.status === 'CONFIRMED'
                      ? 'checkmark-circle'
                      : userInvitation.status === 'INVITED'
                        ? 'help-circle'
                        : 'close-circle'
                  }
                  size={16}
                  color={
                    userInvitation.status === 'CONFIRMED'
                      ? '#4CAF50'
                      : userInvitation.status === 'INVITED'
                        ? '#FFC107'
                        : '#FF6347'
                  }
                />
                <Text
                  style={[
                    styles.userStatusText,
                    userInvitation.status === 'CONFIRMED'
                      ? styles.confirmedText
                      : userInvitation.status === 'INVITED'
                        ? styles.invitedText
                        : styles.declinedText,
                  ]}
                >
                  {userInvitation.status === 'CONFIRMED'
                    ? 'Você está confirmado'
                    : userInvitation.status === 'INVITED'
                      ? 'Você foi convidado'
                      : 'Você recusou o convite'}
                </Text>
              </View>
            )}
          </View>

          {/* Título e botão de sincronização */}
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={() => setIsCalendarPickerVisible(true)}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#fff"
                    style={styles.syncButtonIcon}
                  />
                  <Text style={styles.syncButtonText}>Sincronizar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Data e hora */}
          <View style={styles.eventInfoRow}>
            <Ionicons
              name="calendar"
              size={20}
              color="#7B68EE"
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Data e hora</Text>
              <Text style={styles.infoText}>
                {formatEventDate(event.startDate)}
              </Text>
              {event.endDate && (
                <Text style={styles.infoSecondaryText}>
                  Término: {formatEventDate(event.endDate)}
                </Text>
              )}
              {event.startDate && event.endDate && (
                <Text style={styles.infoDurationText}>
                  Duração: {formatEventDuration(event.startDate, event.endDate)}
                </Text>
              )}
            </View>
          </View>

          {/* Local */}
          {event.location && (
            <View style={styles.eventInfoRow}>
              <Ionicons
                name="location"
                size={20}
                color="#7B68EE"
                style={styles.infoIcon}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={styles.infoText}>{event.location}</Text>
              </View>
            </View>
          )}

          {/* Descrição */}
          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Descrição</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {/* Ações Rápidas do Organizador */}
          {isCreator && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Ações Rápidas</Text>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  router.push(`/(panel)/events/invitations/${event.id}`)
                }
              >
                <Ionicons
                  name="people"
                  size={20}
                  color="#7B68EE"
                  style={styles.quickActionIcon}
                />
                <Text style={styles.quickActionText}>Gerenciar Convidados</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Participantes */}
          <EventAttendanceGroups
            invitations={event.invitations}
            currentUserId={user?.uid}
          />

          {/* Ações de participação do usuário */}
          <EventParticipationActions
            eventHasPassed={eventHasPassed}
            userInvitation={userInvitation}
            refreshing={refreshing}
            onUpdateStatus={handleUpdateStatus}
          />

          {/* Ações do criador */}
          {isCreator && (
            <ConfirmDeleteModal
              title="Ações do organizador"
              deleteLabel="Excluir evento"
              showConfirm={showConfirmDelete}
              loading={refreshing}
              onPressDelete={handleDeleteEvent}
              onCancelConfirm={handleCancelDelete}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* Calendar Picker Modal */}
      <CalendarPicker
        isVisible={isCalendarPickerVisible}
        onClose={() => setIsCalendarPickerVisible(false)}
        onSelect={(calendarId, calendarSource) => {
          selectCalendar(calendarId, calendarSource);
          if (event) {
            syncEventWithCalendar(event);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#222',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(123, 104, 238, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#7B68EE',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 34, 34, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 104, 238, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#222',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 104, 238, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
    marginLeft: 8,
  },
  eventContainer: {
    backgroundColor: '#333',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  eventStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  happeningNowBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  eventStatusText: {
    color: '#9E9E9E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  happeningNowText: {
    color: '#4CAF50',
  },
  userStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  confirmedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  invitedBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  declinedBadge: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
  },
  userStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmedText: {
    color: '#4CAF50',
  },
  invitedText: {
    color: '#FFC107',
  },
  declinedText: {
    color: '#FF6347',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#7B68EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  syncButtonIcon: {
    marginRight: 4,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  infoSecondaryText: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 4,
  },
  infoDurationText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  descriptionLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  quickActionsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  quickActionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(123, 104, 238, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
  },
  quickActionIcon: {
    marginRight: 8,
  },
  quickActionText: {
    color: '#7B68EE',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EventDetailsScreen;
