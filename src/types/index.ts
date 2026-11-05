export interface SongFile {
  id: string;
  name: string;
  title: string;
  artist: string;
  album?: string;
  path: string;
  folder: string;
  extension: string;
  size?: number;
  duration?: number;
  hasLrc: boolean;
  lrcFileName?: string;
  lrcContent?: string;
  isNoLyrics: boolean;
  noLyricsReason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other';
  noLyricsNote?: string;
  fileHandle?: any; // FileSystemFileHandle
  lrcFileHandle?: any;
  folderHandle?: any;
  fileObj?: File;
  updatedAt?: number;
}

export type TabType = 'open' | 'completed' | 'ignored' | 'all';

export interface SMBConfig {
  host: string;
  share: string;
  path: string;
  username: string;
  password?: string;
  domain?: string;
  port: number;
}

export interface LRCLibResult {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export interface LyricsLine {
  time: number; // in seconds
  timestamp: string; // e.g. "01:23.45"
  text: string;
}

export interface LibraryStats {
  total: number;
  withLrc: number;
  missingLrc: number;
  ignoredNoLyrics: number;
  coveragePercentage: number;
}
