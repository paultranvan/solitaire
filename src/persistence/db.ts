import { get, set, del } from 'idb-keyval';

type Envelope<T> = { schemaVersion: number; data: T };

export const KEY_GAME = 'game';
export const KEY_STATS = 'stats';
export const KEY_SETTINGS = 'settings';

export const loadKey = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = (await get(key)) as Envelope<T> | undefined;
    if (!raw || typeof raw !== 'object' || !('data' in raw)) return null;
    return raw.data;
  } catch {
    return null;
  }
};

export const saveKey = async <T>(key: string, schemaVersion: number, data: T): Promise<void> => {
  try {
    await set(key, { schemaVersion, data });
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
};

export const removeKey = async (key: string): Promise<void> => {
  try {
    await del(key);
  } catch {
    /* ignore */
  }
};
