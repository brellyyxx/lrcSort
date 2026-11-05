import { SMBConfig } from '../types';

const STORAGE_KEYS = {
  IGNORED_SONGS: 'lrchub_ignored_songs_v1',
  SMB_CONFIG: 'lrchub_smb_config_v1',
  CUSTOM_LRC: 'lrchub_custom_lrc_v1',
  LAST_TAB: 'lrchub_last_tab_v1',
};

export interface IgnoredRecord {
  isNoLyrics: boolean;
  reason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other';
  note?: string;
  markedAt: number;
}

export function getIgnoredMap(): Record<string, IgnoredRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IGNORED_SONGS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load ignored songs', e);
    return {};
  }
}

export function setIgnoredSong(
  identifier: string,
  record: { isNoLyrics: boolean; reason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other'; note?: string }
): void {
  try {
    const map = getIgnoredMap();
    if (!record.isNoLyrics) {
      delete map[identifier];
    } else {
      map[identifier] = {
        isNoLyrics: true,
        reason: record.reason || 'other',
        note: record.note,
        markedAt: Date.now(),
      };
    }
    localStorage.setItem(STORAGE_KEYS.IGNORED_SONGS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save ignored song', e);
  }
}

export function batchSetIgnoredSongs(
  entries: Array<{ identifier: string; reason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other'; note?: string }>
): void {
  try {
    const map = getIgnoredMap();
    const now = Date.now();
    for (const item of entries) {
      map[item.identifier] = {
        isNoLyrics: true,
        reason: item.reason || 'other',
        note: item.note,
        markedAt: now,
      };
    }
    localStorage.setItem(STORAGE_KEYS.IGNORED_SONGS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to batch save ignored songs', e);
  }
}

export function getSavedSMBConfig(): SMBConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SMB_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load SMB config', e);
  }
  return {
    host: '192.168.1.100',
    share: 'Musik',
    path: '/',
    username: 'admin',
    port: 445,
  };
}

export function saveSMBConfig(config: SMBConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SMB_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save SMB config', e);
  }
}

export function getCustomLrcMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_LRC);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomLrc(identifier: string, content: string): void {
  try {
    const map = getCustomLrcMap();
    map[identifier] = content;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LRC, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save custom LRC', e);
  }
}

export function exportLibraryState(): string {
  const ignored = getIgnoredMap();
  const customLrc = getCustomLrcMap();
  const smb = getSavedSMBConfig();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ignoredSongs: ignored,
    customLrc,
    smbConfig: { ...smb, password: '' }, // exclude sensitive password
  };
  return JSON.stringify(payload, null, 2);
}

export function importLibraryState(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.ignoredSongs && typeof data.ignoredSongs === 'object') {
      localStorage.setItem(STORAGE_KEYS.IGNORED_SONGS, JSON.stringify(data.ignoredSongs));
    }
    if (data.customLrc && typeof data.customLrc === 'object') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LRC, JSON.stringify(data.customLrc));
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}
