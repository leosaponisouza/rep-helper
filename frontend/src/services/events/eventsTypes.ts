// src/services/events/eventsTypes.ts

export type InvitationStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED';

export interface EventInvitation {
  userId: string;
  userName: string;
  userEmail: string;
  nickName?: string;
  profilePictureUrl: string | null;
  status: InvitationStatus;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  houseId: string;
  houseName: string;
  requireRsvp?: boolean;
  creatorId: string;
  creatorName: string;
  invitations: EventInvitation[];
  createdAt: string;
  isFinished: boolean;
  isHappening: boolean;
}

export interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  houseId: string;
  requireRsvp?: boolean;
}

export type EventFilterType = 'all' | 'upcoming' | 'invited' | 'confirmed' | 'past' | 'today' | 'mine';

export interface EventStats {
  confirmed: number;
  pending: number;
  declined: number;
}
