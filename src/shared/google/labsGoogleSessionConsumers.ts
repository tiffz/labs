import { useCallback, useEffect, useState } from 'react';

/** Labs micro-apps on this site that read the shared Google identity (`encore_google_*` keys). */
export type LabsGoogleSessionConsumerId =
  | 'encore'
  | 'scales'
  | 'stanza'
  | 'gesture'
  | 'zinebox'
  | 'lyrefly';

export type LabsGoogleSessionConsumerMeta = {
  id: LabsGoogleSessionConsumerId;
  /** Short product name */
  label: string;
  /** Same-origin path */
  href: string;
  /** Tooltip / secondary line */
  blurb: string;
};

export const LABS_GOOGLE_SESSION_CONSUMERS: readonly LabsGoogleSessionConsumerMeta[] = [
  {
    id: 'encore',
    label: 'Encore',
    href: '/encore/',
    blurb: 'Setlists, recordings, Drive library',
  },
  {
    id: 'scales',
    label: 'Learn Your Scales',
    href: '/scales/',
    blurb: 'Practice progress, Drive backup',
  },
  {
    id: 'stanza',
    label: 'Stanza',
    href: '/stanza/',
    blurb: 'Loop practice, Drive backup',
  },
  {
    id: 'gesture',
    label: 'The Gesture Room',
    href: '/gesture/',
    blurb: 'Timed drawing practice, Drive backup',
  },
  {
    id: 'zinebox',
    label: 'Zine Box',
    href: '/zinebox/',
    blurb: 'Indie comic reader, local library',
  },
  {
    id: 'lyrefly',
    label: 'Lyrefly',
    href: '/lyrefly/',
    blurb: 'Comic project workbench and Drive backup',
  },
] as const;

const STORAGE_KEY = 'labs_google_session_apps_v1';
const TOUCH_EVENT = 'labs-google-session-touch';

export type LabsGoogleSessionTouches = Partial<Record<LabsGoogleSessionConsumerId, number>>;

function parseTouches(raw: string | null): LabsGoogleSessionTouches {
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const out: LabsGoogleSessionTouches = {};
    for (const id of ['encore', 'scales', 'stanza', 'gesture', 'zinebox', 'lyrefly'] as const) {
      const v = j[id];
      if (typeof v === 'number' && Number.isFinite(v)) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function readLabsGoogleSessionTouches(): LabsGoogleSessionTouches {
  if (typeof window === 'undefined') return {};
  try {
    return parseTouches(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

/** Record that the user opened this Labs app (same browser profile). */
export function touchLabsGoogleSessionConsumer(id: LabsGoogleSessionConsumerId): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = parseTouches(window.localStorage.getItem(STORAGE_KEY));
    prev[id] = Date.now();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    window.dispatchEvent(new CustomEvent(TOUCH_EVENT));
  } catch {
    /* quota / private mode */
  }
}

export function getLabsGoogleSessionConsumerIdFromPath(pathname: string): LabsGoogleSessionConsumerId | null {
  const p = pathname || '';
  if (p.startsWith('/encore')) return 'encore';
  if (p.startsWith('/scales')) return 'scales';
  if (p.startsWith('/stanza')) return 'stanza';
  if (p.startsWith('/gesture')) return 'gesture';
  if (p.startsWith('/zinebox')) return 'zinebox';
  if (p.startsWith('/lyrefly')) return 'lyrefly';
  return null;
}

/** Epoch ms touch map; refreshes on storage (other tabs), window focus, and same-tab touches. */
export function useLabsGoogleSessionTouches(): LabsGoogleSessionTouches {
  const [touches, setTouches] = useState<LabsGoogleSessionTouches>(() => readLabsGoogleSessionTouches());

  const sync = useCallback(() => {
    setTouches(readLabsGoogleSessionTouches());
  }, []);

  useEffect(() => {
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', sync);
    window.addEventListener(TOUCH_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', sync);
      window.removeEventListener(TOUCH_EVENT, sync);
    };
  }, [sync]);

  return touches;
}
