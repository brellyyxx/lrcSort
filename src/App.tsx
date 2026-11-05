/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SongFile, TabType, LibraryStats, SMBConfig } from './types';
import {
  scanDirectoryWithHandle,
  scanFilesFromInput,
  saveLrcForSong,
  getDemoMusicLibrary,
} from './utils/fileSystemScanner';
import {
  getIgnoredMap,
  setIgnoredSong,
  batchSetIgnoredSongs,
  saveCustomLrc,
  exportLibraryState,
  importLibraryState,
} from './services/storageService';
import { searchLyrics } from './services/lrclibService';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { TabsNavigation } from './components/TabsNavigation';
import { SongTable } from './components/SongTable';
import { LyricsViewerModal } from './components/LyricsViewerModal';
import { LrcSearchModal } from './components/LrcSearchModal';
import { SmbConfigModal } from './components/SmbConfigModal';
import { BatchActionsBar } from './components/BatchActionsBar';
import {
  Search,
  Filter,
  Sparkles,
  FolderOpen,
  Server,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle,
  FileMusic,
} from 'lucide-react';

export default function App() {
  const [songs, setSongs] = useState<SongFile[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [currentSource, setCurrentSource] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ count: number; folder: string } | undefined>();

  // Modals
  const [viewerSong, setViewerSong] = useState<SongFile | null>(null);
  const [searchSong, setSearchSong] = useState<SongFile | null>(null);
  const [isSmbModalOpen, setIsSmbModalOpen] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchSearching, setIsBatchSearching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | undefined>();

  // Directory Handle reference
  const dirHandleRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load demo library on initial mount so the user has immediate data to test
  useEffect(() => {
    loadDemo();
  }, []);

  const loadDemo = () => {
    const demo = getDemoMusicLibrary();
    setSongs(demo);
    setCurrentSource('Demo SMB-Freigabe (192.168.1.100/Musik)');
    setSelectedIds(new Set());
  };

  // Open directory via File System Access API
  const handleOpenDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        setIsScanning(true);
        const handle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        dirHandleRef.current = handle;
        setCurrentSource(`Ordner: ${handle.name}`);

        const scannedSongs = await scanDirectoryWithHandle(handle, (count, folder) => {
          setScanProgress({ count, folder });
        });

        setSongs(scannedSongs);
        setSelectedIds(new Set());
        setIsScanning(false);
        setScanProgress(undefined);
      } else {
        // Fallback for browsers without showDirectoryPicker
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error opening directory:', err);
      }
      setIsScanning(false);
    }
  };

  // Fallback file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsScanning(true);
      const scanned = scanFilesFromInput(e.target.files);
      setSongs(scanned);
      setCurrentSource(`Ausgewählter Ordner (${scanned.length} Titel)`);
      setSelectedIds(new Set());
      setIsScanning(false);
    }
  };

  // Connect SMB configuration
  const handleConnectSMB = (config: SMBConfig) => {
    setCurrentSource(`SMB: \\\\${config.host}\\${config.share}${config.path || ''}`);
  };

  // Toggle "Keine Lyrics" (Remix / Instrumental)
  const handleToggleNoLyrics = (
    song: SongFile,
    reason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other'
  ) => {
    const newIsNoLyrics = !song.isNoLyrics;
    const finalReason = reason || song.noLyricsReason || 'remix';

    setIgnoredSong(song.id, {
      isNoLyrics: newIsNoLyrics,
      reason: finalReason,
    });

    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === song.id) {
          return {
            ...s,
            isNoLyrics: newIsNoLyrics,
            noLyricsReason: newIsNoLyrics ? finalReason : undefined,
          };
        }
        return s;
      })
    );
  };

  // Apply lyrics from LRCLIB or manual editor
  const handleSaveLrc = async (song: SongFile, lrcContent: string) => {
    await saveLrcForSong(song, lrcContent);
    saveCustomLrc(song.id, lrcContent);

    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === song.id) {
          return {
            ...s,
            hasLrc: true,
            lrcContent,
            lrcFileName: s.name.replace(/\.[a-zA-Z0-9]+$/, '.lrc'),
            isNoLyrics: false, // If lyrics are added, it's no longer marked as no lyrics!
          };
        }
        return s;
      })
    );
  };

  // Multi-selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(filteredSongs.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Batch actions
  const handleMarkNoLyricsBatch = (
    reason: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other'
  ) => {
    const entries = Array.from(selectedIds).map((id) => ({
      identifier: id,
      reason,
    }));
    batchSetIgnoredSongs(entries);

    setSongs((prev) =>
      prev.map((s) => {
        if (selectedIds.has(s.id)) {
          return {
            ...s,
            isNoLyrics: true,
            noLyricsReason: reason,
          };
        }
        return s;
      })
    );
    setSelectedIds(new Set());
  };

  const handleClearNoLyricsBatch = () => {
    for (const id of selectedIds) {
      setIgnoredSong(id, { isNoLyrics: false });
    }

    setSongs((prev) =>
      prev.map((s) => {
        if (selectedIds.has(s.id)) {
          return {
            ...s,
            isNoLyrics: false,
          };
        }
        return s;
      })
    );
    setSelectedIds(new Set());
  };

  // Batch auto-search LRCLIB
  const handleAutoSearchBatch = async () => {
    const toSearch = songs.filter((s) => selectedIds.has(s.id) && !s.hasLrc);
    if (toSearch.length === 0) return;

    setIsBatchSearching(true);
    let count = 0;

    for (const song of toSearch) {
      count++;
      setBatchProgress({ current: count, total: toSearch.length });

      try {
        const results = await searchLyrics({
          trackName: song.title,
          artistName: song.artist,
          albumName: song.album,
        });

        const synced = results.find((r) => r.syncedLyrics);
        if (synced && synced.syncedLyrics) {
          await handleSaveLrc(song, synced.syncedLyrics);
        } else if (results.some((r) => r.instrumental)) {
          handleToggleNoLyrics(song, 'instrumental');
        }
      } catch (err) {
        console.warn(`Could not fetch lyrics for ${song.title}`, err);
      }

      // Small throttle to be courteous to the public LRCLIB API
      await new Promise((r) => setTimeout(r, 350));
    }

    setIsBatchSearching(false);
    setBatchProgress(undefined);
    setSelectedIds(new Set());
  };

  // Export / Import state
  const handleExportState = () => {
    const jsonStr = exportLibraryState();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lrc_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importLibraryState(content)) {
          // Re-evaluate songs with new ignored map
          const ignoredMap = getIgnoredMap();
          setSongs((prev) =>
            prev.map((s) => ({
              ...s,
              isNoLyrics: !!ignoredMap[s.id]?.isNoLyrics,
              noLyricsReason: ignoredMap[s.id]?.reason || s.noLyricsReason,
            }))
          );
        }
      };
      reader.readAsText(file);
    }
  };

  // Compute stats
  const stats: LibraryStats = useMemo(() => {
    const total = songs.length;
    const withLrc = songs.filter((s) => s.hasLrc).length;
    const ignoredNoLyrics = songs.filter((s) => !s.hasLrc && s.isNoLyrics).length;
    const missingLrc = songs.filter((s) => !s.hasLrc && !s.isNoLyrics).length;
    const coveragePercentage = total > 0 ? Math.round(((withLrc + ignoredNoLyrics) / total) * 100) : 0;

    return {
      total,
      withLrc,
      missingLrc,
      ignoredNoLyrics,
      coveragePercentage,
    };
  }, [songs]);

  // Tab filtering logic
  const filteredSongs = useMemo(() => {
    let result = songs;

    // Apply Tab filter
    if (activeTab === 'open') {
      // Exactly what the user requested:
      // "so das die die lrc haben weg sortiert werden und die ich manuell als 'keine Lyrics' markiert habe, ebenfalls ausgeblendet werden"
      result = result.filter((s) => !s.hasLrc && !s.isNoLyrics);
    } else if (activeTab === 'completed') {
      result = result.filter((s) => s.hasLrc);
    } else if (activeTab === 'ignored') {
      result = result.filter((s) => s.isNoLyrics);
    }

    // Format filter
    if (formatFilter !== 'all') {
      result = result.filter((s) => s.extension.toLowerCase() === formatFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album && s.album.toLowerCase().includes(q)) ||
          s.name.toLowerCase().includes(q) ||
          s.folder.toLowerCase().includes(q)
      );
    }

    return result;
  }, [songs, activeTab, formatFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Outfit',sans-serif]">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        // @ts-ignore
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={importInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Header */}
      <Header
        onOpenDirectory={handleOpenDirectory}
        onOpenSmbModal={() => setIsSmbModalOpen(true)}
        onLoadDemo={loadDemo}
        onExportState={handleExportState}
        onImportState={() => importInputRef.current?.click()}
        currentSource={currentSource}
        isScanning={isScanning}
        scanProgress={scanProgress}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Grid */}
        <StatsCards
          stats={stats}
          onFilterTab={setActiveTab}
          activeTab={activeTab}
        />

        {/* Tab Navigation */}
        <div className="space-y-4">
          <TabsNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            stats={stats}
          />

          {/* Search & Secondary Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Titel, Künstler, Album oder Ordner..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-300"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                <span>{filteredSongs.length} Titel angezeigt</span>
              </div>

              {/* Format Filter */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 text-xs">
                {['all', '.flac', '.mp3', '.m4a'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormatFilter(fmt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors uppercase ${
                      formatFilter === fmt
                        ? 'bg-neutral-800 text-white font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {fmt === 'all' ? 'Alle' : fmt.replace('.', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Table View */}
          <SongTable
            songs={filteredSongs}
            onToggleNoLyrics={handleToggleNoLyrics}
            onOpenViewer={(song) => setViewerSong(song)}
            onOpenSearch={(song) => setSearchSong(song)}
            onDownloadLrc={(song) => saveLrcForSong(song, song.lrcContent || '')}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
          />
        </div>
      </main>

      {/* Batch Floating Bar */}
      <BatchActionsBar
        selectedCount={selectedIds.size}
        onMarkNoLyricsBatch={handleMarkNoLyricsBatch}
        onClearNoLyricsBatch={handleClearNoLyricsBatch}
        onAutoSearchBatch={handleAutoSearchBatch}
        onClearSelection={() => setSelectedIds(new Set())}
        isBatchSearching={isBatchSearching}
        batchProgress={batchProgress}
      />

      {/* Modals */}
      {viewerSong && (
        <LyricsViewerModal
          song={viewerSong}
          onClose={() => setViewerSong(null)}
          onSaveLrc={handleSaveLrc}
        />
      )}

      {searchSong && (
        <LrcSearchModal
          song={searchSong}
          onClose={() => setSearchSong(null)}
          onApplyLyrics={handleSaveLrc}
          onMarkNoLyrics={handleToggleNoLyrics}
        />
      )}

      {isSmbModalOpen && (
        <SmbConfigModal
          onClose={() => setIsSmbModalOpen(false)}
          onConnectSMB={handleConnectSMB}
          onPickMountedFolder={() => {
            setIsSmbModalOpen(false);
            handleOpenDirectory();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>LRC Hub</span>
            <span>·</span>
            <span>Synced Lyrics Manager für SMB-Shares</span>
            <span>·</span>
            <span>LRCLIB API Anbindung</span>
          </div>
          <div>
            <span>Tipp: Markierungen werden dauerhaft im Browser gespeichert</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
