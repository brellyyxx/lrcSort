import React, { useState, useEffect } from 'react';
import { SongFile, LRCLibResult } from '../types';
import { searchLyrics } from '../services/lrclibService';
import { Search, X, Check, Loader2, Music, Sparkles, Ban, ExternalLink } from 'lucide-react';

interface LrcSearchModalProps {
  song: SongFile;
  onClose: () => void;
  onApplyLyrics: (song: SongFile, lrcContent: string) => Promise<void>;
  onMarkNoLyrics: (song: SongFile, reason: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other') => void;
}

export const LrcSearchModal: React.FC<LrcSearchModalProps> = ({
  song,
  onClose,
  onApplyLyrics,
  onMarkNoLyrics,
}) => {
  const [trackName, setTrackName] = useState(song.title);
  const [artistName, setArtistName] = useState(song.artist);
  const [results, setResults] = useState<LRCLibResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<LRCLibResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performSearch = async () => {
    if (!trackName.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await searchLyrics({
        trackName,
        artistName: artistName || undefined,
        albumName: song.album || undefined,
      });
      setResults(res);
      if (res.length > 0) {
        // Prefer first result that has syncedLyrics
        const best = res.find((r) => r.syncedLyrics) || res[0];
        setSelectedResult(best);
      } else {
        setSelectedResult(null);
      }
    } catch (err: any) {
      setErrorMsg('Fehler bei der Abfrage von LRCLIB. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, []);

  const handleApply = async () => {
    if (!selectedResult) return;
    if (selectedResult.instrumental) {
      onMarkNoLyrics(song, 'instrumental');
      onClose();
      return;
    }

    const content = selectedResult.syncedLyrics || selectedResult.plainLyrics || '';
    if (!content) return;

    await onApplyLyrics(song, content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white">
                LRCLIB Synced Lyrics Suche
              </h3>
              <p className="text-xs text-neutral-400">
                Suche in der weltweiten Datenbank nach synchronisierten .lrc Texten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performSearch();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2"
          >
            <div className="sm:col-span-6">
              <label className="block text-[11px] text-neutral-400 mb-1">Titel / Songname</label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                placeholder="Songtitel eingeben..."
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] text-neutral-400 mb-1">Künstler / Interpret</label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                placeholder="Künstler (optional)..."
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-8 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Suchen</span>
              </button>
            </div>
          </form>
        </div>

        {/* Content Split: Results List & Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Results List */}
          <div className="md:col-span-5 border-r border-neutral-800 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] font-medium text-neutral-400 px-1 mb-2 flex items-center justify-between">
              <span>Gefundene Treffer ({results.length})</span>
              <a
                href="https://lrclib.net"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-500 hover:text-neutral-300 inline-flex items-center gap-1 text-[10px]"
              >
                Quelle: LRCLIB <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {isLoading && (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-400" />
                <span className="text-xs">Durchsuche Lyric-Datenbank...</span>
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="p-8 text-center text-neutral-500">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Keine passenden Lyrics auf LRCLIB gefunden.</p>
                <div className="mt-4 pt-4 border-t border-neutral-800/80">
                  <p className="text-[11px] text-neutral-400 mb-2">
                    Ist dies ein Remix, Beat oder Instrumental?
                  </p>
                  <button
                    onClick={() => {
                      onMarkNoLyrics(song, 'remix');
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 mx-auto"
                  >
                    <Ban className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Als "Keine Lyrics" markieren</span>
                  </button>
                </div>
              </div>
            )}

            {!isLoading &&
              results.map((res) => {
                const isSelected = selectedResult?.id === res.id;
                const hasSync = !!res.syncedLyrics;

                return (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResult(res)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {res.trackName || res.name}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {res.artistName} {res.albumName ? `· ${res.albumName}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {hasSync ? (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Synced LRC ✓
                          </span>
                        ) : res.instrumental ? (
                          <span className="text-[10px] text-neutral-400">
                            Instrumental
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400">
                            Nur Plain Text
                          </span>
                        )}
                        {res.duration > 0 && (
                          <span className="text-[10px] font-mono tabular-nums text-neutral-500">
                            {Math.floor(res.duration / 60)}:{(Math.round(res.duration % 60)).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Preview Panel */}
          <div className="md:col-span-7 overflow-y-auto p-4 bg-neutral-950/40 flex flex-col">
            {selectedResult ? (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs mb-3">
                  <div>
                    <span className="text-white font-medium">Vorschau:</span>{' '}
                    <span className="text-neutral-400">
                      {selectedResult.syncedLyrics ? 'Synchronisierter LRC-Text' : 'Textversion'}
                    </span>
                  </div>
                  {selectedResult.syncedLyrics && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Mit Zeitstempeln
                    </span>
                  )}
                </div>

                <pre className="flex-1 font-mono text-[11px] text-neutral-300 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[360px] bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/80">
                  {selectedResult.syncedLyrics ||
                    selectedResult.plainLyrics ||
                    (selectedResult.instrumental ? 'Titel ist als reine Instrumentalmusik markiert.' : 'Kein Textinhalt vorhanden.')}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
                Wähle einen Treffer links aus, um die Lyrics in der Vorschau zu sehen.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            {song.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onMarkNoLyrics(song, 'remix');
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Keine Lyrics (Remix/Inst.)
            </button>
            <button
              disabled={!selectedResult}
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>LRC anwenden & speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
