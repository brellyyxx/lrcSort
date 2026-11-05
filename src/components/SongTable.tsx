import React, { useState } from 'react';
import { SongFile } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Ban,
  Search,
  Eye,
  Download,
  Music,
  ChevronDown,
  Filter,
  Sparkles,
  Check,
  Clock,
} from 'lucide-react';

interface SongTableProps {
  songs: SongFile[];
  onToggleNoLyrics: (
    song: SongFile,
    reason?: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other'
  ) => void;
  onOpenViewer: (song: SongFile) => void;
  onOpenSearch: (song: SongFile) => void;
  onOpenCreator: (song: SongFile) => void;
  onDownloadLrc: (song: SongFile) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
}

export const SongTable: React.FC<SongTableProps> = ({
  songs,
  onToggleNoLyrics,
  onOpenViewer,
  onOpenSearch,
  onOpenCreator,
  onDownloadLrc,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}) => {
  const [reasonDropdownId, setReasonDropdownId] = useState<string | null>(null);

  const allSelected = songs.length > 0 && songs.every((s) => selectedIds.has(s.id));
  const someSelected = songs.some((s) => selectedIds.has(s.id)) && !allSelected;

  const reasonLabels: Record<string, string> = {
    remix: 'Remix / Club Mix',
    instrumental: 'Instrumental / Beat',
    dj_mix: 'DJ Set / Continuous',
    soundtrack: 'Score / Soundtrack',
    other: 'Kein Text (Sonstiges)',
  };

  if (songs.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
        <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-neutral-400 mx-auto mb-3">
          <Music className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">
          Keine Lieder in dieser Ansicht
        </h3>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          Alle Titel in diesem Filter sind entweder bereits mit einer .lrc-Datei versorgt oder wurden als Ausnahmen markiert.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-900/60 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Table Header */}
          <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-medium">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 min-w-[220px]">Titel & Künstler</th>
              <th className="py-3 px-3 hidden md:table-cell min-w-[160px]">Album / Ordner</th>
              <th className="py-3 px-3 w-20">Format</th>
              <th className="py-3 px-3 min-w-[140px]">LRC Status</th>
              <th className="py-3 px-3 min-w-[160px]">Keine Lyrics?</th>
              <th className="py-3 px-4 text-right min-w-[160px]">Aktionen</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-800/60">
            {songs.map((song) => {
              const isSelected = selectedIds.has(song.id);

              return (
                <tr
                  key={song.id}
                  className={`hover:bg-neutral-800/40 transition-colors group ${
                    isSelected ? 'bg-emerald-950/10' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(song.id)}
                      className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Title & Artist */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-white truncate max-w-xs sm:max-w-md">
                      {song.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                      {song.artist}
                    </div>
                  </td>

                  {/* Album / SMB Folder */}
                  <td className="py-3 px-3 hidden md:table-cell">
                    <div className="text-neutral-300 truncate max-w-[200px]">
                      {song.album || '—'}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 truncate max-w-[200px]" title={song.path}>
                      {song.folder}
                    </div>
                  </td>

                  {/* Format Extension */}
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] text-neutral-400 uppercase">
                      {song.extension.replace('.', '')}
                    </span>
                  </td>

                  {/* LRC Status */}
                  <td className="py-3 px-3">
                    {song.hasLrc ? (
                      <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>LRC vorhanden</span>
                      </div>
                    ) : song.isNoLyrics ? (
                      <div className="inline-flex items-center gap-1.5 text-neutral-400">
                        <Ban className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Keine Lyrics</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Fehlt noch</span>
                      </div>
                    )}
                  </td>

                  {/* Ankreuzen: "Keine Lyrics" (Remix / Instrumental) */}
                  <td className="py-3 px-3 relative">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={song.isNoLyrics}
                          onChange={() => onToggleNoLyrics(song)}
                          className="rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span
                          className={`text-xs ${
                            song.isNoLyrics ? 'text-neutral-200 font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {song.isNoLyrics ? 'Ignoriert' : 'Nicht möglich'}
                        </span>
                      </label>

                      {/* Dropdown for reason */}
                      {song.isNoLyrics && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setReasonDropdownId(
                                reasonDropdownId === song.id ? null : song.id
                              )
                            }
                            className="text-[10px] text-neutral-400 hover:text-white bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/60 inline-flex items-center gap-1"
                          >
                            <span>
                              {song.noLyricsReason ? reasonLabels[song.noLyricsReason] : 'Remix/Inst.'}
                            </span>
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>

                          {reasonDropdownId === song.id && (
                            <div className="absolute left-0 mt-1 w-44 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 z-30">
                              <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 border-b border-neutral-800">
                                Grund auswählen:
                              </div>
                              {Object.entries(reasonLabels).map(([key, label]) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    onToggleNoLyrics(song, key as any);
                                    setReasonDropdownId(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1 text-xs hover:bg-neutral-800 flex items-center justify-between ${
                                    song.noLyricsReason === key
                                      ? 'text-emerald-400 font-medium'
                                      : 'text-neutral-300'
                                  }`}
                                >
                                  <span>{label}</span>
                                  {song.noLyricsReason === key && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Search LRCLIB */}
                      <button
                        onClick={() => onOpenSearch(song)}
                        title="Online auf LRCLIB nach Lyrics suchen"
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" />
                        <span>Suchen</span>
                      </button>

                      {/* LRC Creator / Tapping */}
                      <button
                        onClick={() => onOpenCreator(song)}
                        title="Im LRC Creator selber timen (Leertaste-Sync)"
                        className="px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>Timen</span>
                      </button>

                      {/* Karaoke & Preview if has LRC */}
                      {song.hasLrc ? (
                        <button
                          onClick={() => onOpenViewer(song)}
                          title="LRC & Karaoke-Player ansehen / bearbeiten"
                          className="px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Karaoke</span>
                        </button>
                      ) : null}

                      {/* Download .lrc if present */}
                      {song.hasLrc && (
                        <button
                          onClick={() => onDownloadLrc(song)}
                          title=".lrc Datei herunterladen"
                          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
