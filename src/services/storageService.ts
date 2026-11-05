import { SMBConfig, SongFile, TabType } from '../types';

const STORAGE_KEYS = {
  IGNORED_SONGS: 'lrchub_ignored_songs_v2',
  SMB_CONFIG: 'lrchub_smb_config_v2',
  CUSTOM_LRC: 'lrchub_custom_lrc_v2',
  LAST_TAB: 'lrchub_last_tab_v2',
  CACHED_LIBRARY: 'lrchub_cached_library_v2',
};

const IDB_NAME = 'lrchub_db_v1';
const IDB_STORE = 'handles';

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

export function getSavedActiveTab(): TabType {
  try {
    const tab = localStorage.getItem(STORAGE_KEYS.LAST_TAB) as TabType;
    if (tab && ['open', 'completed', 'ignored', 'all'].includes(tab)) {
      return tab;
    }
  } catch {}
  return 'open';
}

export function saveActiveTab(tab: TabType): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_TAB, tab);
  } catch {}
}

/**
 * Saves entire serialized song library to localStorage so nothing is lost upon refreshing!
 */
export function saveCachedLibrary(songs: SongFile[], source: string): void {
  try {
    const serializable = songs.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      artist: s.artist,
      album: s.album,
      folder: s.folder,
      path: s.path,
      extension: s.extension,
      hasLrc: s.hasLrc,
      lrcFileName: s.lrcFileName,
      lrcContent: s.lrcContent,
      isNoLyrics: s.isNoLyrics,
      noLyricsReason: s.noLyricsReason,
      duration: s.duration,
      updatedAt: s.updatedAt || Date.now(),
    }));

    localStorage.setItem(
      STORAGE_KEYS.CACHED_LIBRARY,
      JSON.stringify({
        source,
        songs: serializable,
        savedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn('Failed to cache library to localStorage (might exceed quota):', e);
  }
}

/**
 * Retrieves cached song library from localStorage
 */
export function getCachedLibrary(): { songs: SongFile[]; source: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_LIBRARY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.songs) && parsed.songs.length > 0) {
        // Re-apply latest ignoredMap to ensure 100% sync
        const ignoredMap = getIgnoredMap();
        const songs: SongFile[] = parsed.songs.map((s: any) => ({
          ...s,
          isNoLyrics: ignoredMap[s.id]?.isNoLyrics ?? s.isNoLyrics,
          noLyricsReason: ignoredMap[s.id]?.reason || s.noLyricsReason,
        }));
        return {
          source: parsed.source || 'Gespeicherte Sammlung',
          songs,
        };
      }
    }
  } catch (e) {
    console.error('Failed to read cached library', e);
  }
  return null;
}

/**
 * Open IndexedDB for storing DirectoryHandle across page reloads
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves FileSystemDirectoryHandle into IndexedDB
 */
export async function storeDirectoryHandle(handle: any): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, 'last_dir_handle');
  } catch (err) {
    console.warn('Could not store directory handle in IndexedDB:', err);
  }
}

/**
 * Retrieves stored FileSystemDirectoryHandle from IndexedDB
 */
export async function getStoredDirectoryHandle(): Promise<any | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('last_dir_handle');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Verifies or requests permission for a stored directory handle
 */
export async function verifyDirectoryPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  if (!handle || typeof handle.queryPermission !== 'function') return false;
  const options = { mode: readWrite ? 'readwrite' : 'read' };

  try {
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (err) {
    console.warn('Permission query/request failed:', err);
  }
  return false;
}

export function exportLibraryState(): string {
  const ignored = getIgnoredMap();
  const customLrc = getCustomLrcMap();
  const smb = getSavedSMBConfig();
  const cached = getCachedLibrary();

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    ignoredSongs: ignored,
    customLrc,
    cachedSongs: cached?.songs,
    source: cached?.source,
    smbConfig: { ...smb, password: '' },
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
    if (Array.isArray(data.cachedSongs)) {
      saveCachedLibrary(data.cachedSongs, data.source || 'Importierte Sammlung');
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}
