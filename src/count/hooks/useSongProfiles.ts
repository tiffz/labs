import { useState, useEffect, useCallback } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionVolumes } from '../engine/types';
import {
  saveProfile,
  listProfiles,
  deleteProfile,
  type SongProfile,
} from '../storage/pulseStorage';

const LAST_SESSION_KEY = 'pulse:last-session';

export interface LastSession {
  bpm: number;
  timeSignature: TimeSignature;
  volumes: SubdivisionVolumes;
  beatGrouping?: string;
}

export function loadLastSession(): LastSession | null {
  try {
    const raw = localStorage.getItem(LAST_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastSession;
  } catch {
    return null;
  }
}

export function saveLastSession(session: LastSession): void {
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or unavailable
  }
}

interface SongProfilesHook {
  profiles: SongProfile[];
  save: (name: string, data: Omit<SongProfile, 'id' | 'name' | 'createdAt' | 'updatedAt'>) => void;
  remove: (id: number) => void;
}

export function useSongProfiles(): SongProfilesHook {
  const [profiles, setProfiles] = useState<SongProfile[]>([]);

  const refresh = useCallback(async () => {
    const list = await listProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (
      name: string,
      data: Omit<SongProfile, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
    ) => {
      await saveProfile(name, data);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteProfile(id);
      await refresh();
    },
    [refresh],
  );

  return { profiles, save, remove };
}
