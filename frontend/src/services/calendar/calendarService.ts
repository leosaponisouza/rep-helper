import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { parseISO } from 'date-fns';
import { Event } from '../events/eventsTypes';
import { logger } from '../../utils/logger';

export type CalendarSyncErrorCode =
  | 'permission_denied'
  | 'no_calendar'
  | 'sync_failed';

export interface AddEventToCalendarResult {
  eventId: string | null;
  calendarSource: string | null;
  errorCode?: CalendarSyncErrorCode;
}

export interface SyncEventsWithCalendarResult {
  success: number;
  failed: number;
  calendarSource: string | null;
  errorCode?: CalendarSyncErrorCode;
}

export interface CalendarTargetOptions {
  calendarId?: string;
  calendarSource?: string | null;
}

/**
 * Serviço responsável por gerenciar a sincronização com o calendário do dispositivo
 */
export class CalendarService {
  /**
   * Solicita permissões de acesso ao calendário
   */
  static async requestCalendarPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('Erro ao solicitar permissões de calendário:', error);
      return false;
    }
  }

  /**
   * Obtém o ID do calendário padrão
   * Prioriza o Samsung Calendar, depois Google Calendar
   */
  static async getDefaultCalendarId(): Promise<{ id: string | null; source: string | null }> {
    if (Platform.OS === 'web') {
      return { id: null, source: null };
    }

    try {
      const hasPermission = await this.requestCalendarPermissions();
      if (!hasPermission) {
        return { id: null, source: null };
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableCalendars = calendars.filter((cal) => cal.allowsModifications);

      if (writableCalendars.length === 0) {
        return { id: null, source: null };
      }

      const samsungCalendar = writableCalendars.find(
        (cal) =>
          cal.source?.name?.includes('Samsung') ||
          (cal.name && cal.name.includes('Samsung'))
      );

      if (samsungCalendar) {
        return { id: samsungCalendar.id, source: 'Samsung Calendar' };
      }

      const googleCalendar = writableCalendars.find(
        (cal) =>
          cal.source?.name === 'Google' || cal.source?.name?.includes('Google')
      );

      if (googleCalendar) {
        return { id: googleCalendar.id, source: 'Google Calendar' };
      }

      return {
        id: writableCalendars[0].id,
        source: writableCalendars[0].source?.name ?? null,
      };
    } catch (error) {
      logger.error('Erro ao obter calendário padrão:', error);
      return { id: null, source: null };
    }
  }

  private static async resolveTargetCalendar(
    options?: CalendarTargetOptions
  ): Promise<{ id: string | null; source: string | null }> {
    if (options?.calendarId) {
      return {
        id: options.calendarId,
        source: options.calendarSource ?? null,
      };
    }

    return this.getDefaultCalendarId();
  }

  /**
   * Adiciona um evento ao calendário do dispositivo
   */
  static async addEventToCalendar(
    event: Event,
    options?: CalendarTargetOptions
  ): Promise<AddEventToCalendarResult> {
    try {
      const hasPermission = await this.requestCalendarPermissions();

      if (!hasPermission) {
        return {
          eventId: null,
          calendarSource: null,
          errorCode: 'permission_denied',
        };
      }

      const { id: calendarId, source: calendarSource } =
        await this.resolveTargetCalendar(options);

      if (!calendarId) {
        return {
          eventId: null,
          calendarSource: null,
          errorCode: 'no_calendar',
        };
      }

      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        notes: event.description,
        location: event.location,
        startDate,
        endDate,
        alarms: [{ relativeOffset: -60 }],
      });

      if (!eventId) {
        return {
          eventId: null,
          calendarSource,
          errorCode: 'sync_failed',
        };
      }

      return { eventId, calendarSource };
    } catch (error) {
      logger.error('Erro ao adicionar evento ao calendário:', error);
      return {
        eventId: null,
        calendarSource: null,
        errorCode: 'sync_failed',
      };
    }
  }

  /**
   * Lista todos os calendários disponíveis no dispositivo
   */
  static async listAvailableCalendars(): Promise<Calendar.Calendar[]> {
    if (Platform.OS === 'web') {
      return [];
    }

    try {
      const hasPermission = await this.requestCalendarPermissions();

      if (!hasPermission) {
        return [];
      }

      return await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    } catch (error) {
      logger.error('Erro ao listar calendários:', error);
      return [];
    }
  }

  /**
   * Sincroniza múltiplos eventos com o calendário
   */
  static async syncEventsWithCalendar(
    events: Event[],
    options?: CalendarTargetOptions
  ): Promise<SyncEventsWithCalendarResult> {
    let success = 0;
    let failed = 0;

    try {
      const hasPermission = await this.requestCalendarPermissions();

      if (!hasPermission) {
        return {
          success: 0,
          failed: events.length,
          calendarSource: null,
          errorCode: 'permission_denied',
        };
      }

      const { id: calendarId, source: calendarSource } =
        await this.resolveTargetCalendar(options);

      if (!calendarId) {
        return {
          success: 0,
          failed: events.length,
          calendarSource: null,
          errorCode: 'no_calendar',
        };
      }

      for (const event of events) {
        try {
          const startDate = parseISO(event.startDate);
          const endDate = parseISO(event.endDate);

          const eventId = await Calendar.createEventAsync(calendarId, {
            title: event.title,
            notes: event.description,
            location: event.location,
            startDate,
            endDate,
            alarms: [{ relativeOffset: -60 }],
          });

          if (eventId) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error(`Erro ao sincronizar evento ${event.id}:`, error);
          failed++;
        }
      }

      return {
        success,
        failed,
        calendarSource,
        ...(success === 0 && failed > 0 ? { errorCode: 'sync_failed' as const } : {}),
      };
    } catch (error) {
      logger.error('Erro ao sincronizar eventos com o calendário:', error);
      return {
        success,
        failed: events.length - success,
        calendarSource: null,
        errorCode: 'sync_failed',
      };
    }
  }
}
