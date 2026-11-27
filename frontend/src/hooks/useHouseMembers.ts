import { useState, useEffect, useCallback } from 'react';
import { getHouseMembers } from '../services/houseService';
import { ErrorHandler } from '../utils/errorHandling';
import { logger } from '../utils/logger';

export interface SelectableMember {
  uid: string;
  name: string;
  nickname?: string;
  email: string;
  profilePictureUrl?: string;
}

export function normalizeMembers(rawMembers: Array<Record<string, any>>): SelectableMember[] {
  if (!Array.isArray(rawMembers)) return [];
  return rawMembers.map((member) => ({
    uid: String(member.uid || member.id || ''),
    name: String(member.name || ''),
    nickname: member.nickname ? String(member.nickname) : undefined,
    email: String(member.email || ''),
    profilePictureUrl: member.profilePictureUrl ? String(member.profilePictureUrl) : undefined,
  }));
}

export function useHouseMembers(houseId?: string | null) {
  const [members, setMembers] = useState<SelectableMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    if (!houseId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const raw = await getHouseMembers(houseId);
      setMembers(normalizeMembers(raw as Array<Record<string, any>>));
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      logger.error('Erro ao buscar moradores da casa:', err);
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!houseId) {
        if (isMounted) setMembers([]);
        return;
      }
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        const raw = await getHouseMembers(houseId);
        if (isMounted) {
          setMembers(normalizeMembers(raw as Array<Record<string, any>>));
        }
      } catch (err) {
        if (isMounted) {
          const parsedError = await ErrorHandler.parseError(err);
          setError(parsedError.message);
          logger.error('Erro ao buscar moradores da casa:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [houseId]);

  return {
    members,
    loading,
    error,
    refreshMembers,
  };
}
