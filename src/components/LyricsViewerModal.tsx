import React, { useState, useEffect, useRef } from 'react';
import { SongFile, LyricsLine } from '../types';
import { parseLrc, adjustLrcOffset, stringifyLrc } from '../utils/lrcParser';
import { X, Play, Pause, RotateCcw, Download, Edit3, Check, FastForward, Rewind, Music, Volume2 } from 'lucide-react';

interface LyricsViewerModalProps {
  song: SongFile;
  onClose: () => void;
  onSaveLrc: (song: SongFile, newContent: string) => Promise<void>;
}

export const LyricsViewerModal: React.FC<LyricsViewerModalProps> = ({
  song,
  onClose,
  onSaveLrc,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(song.lrcContent || '');
  const [activeLineIdx, setActiveLineIdx] = useState<number>(-1);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Parse LRC when song or text changes
  useEffect(() => {
    const parsed = parseLrc(song.lrcContent || '');
    setLyricsLines(parsed);
    setEditText(song.lrcContent || '');
    setCurrentTime(0);
    setIsPlaying(false);
  }, [song]);

  // Handle audio simulation or real audio file
  useEffect(() => {
    let objectUrl = '';
    if (song.fileObj) {
      objectUrl = URL.createObjectURL(song.fileObj);
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
      }
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [song]);

  // Playback timer (synced to real audio or timer simulation)
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        if (audioRef.current && song.fileObj) {
          setCurrentTime(audioRef.current.currentTime);
        } else {
          setCurrentTime((prev) => prev + 0.1);
        }
      }, 100);
      timerRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying, song.fileObj]);

  // Determine active lyric line
  useEffect(() => {
    if (lyricsLines.length === 0) {
      setActiveLineIdx(-1);
      return;
    }

    let foundIdx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (lyricsLines[i].time <= currentTime) {
        foundIdx = i;
      } else {
        break;
      }
    }

    setActiveLineIdx(foundIdx);

    // Auto-scroll active line into center
    if (foundIdx !== -1 && activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, lyricsLines]);

  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current && song.fileObj) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current && song.fileObj) {
        audioRef.current.play().catch(console.warn);
      }
      setIsPlaying(true);
    }
  };

  const handleJumpToLine = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current && song.fileObj) {
      audioRef.current.currentTime = time;
    }
  };

  const handleOffsetAdjust = (offsetSec: number) => {
    const updated = adjustLrcOffset(song.lrcContent || editText, offsetSec);
    setEditText(updated);
    setLyricsLines(parseLrc(updated));
  };

  const handleSave = async () => {
    await onSaveLrc(song, editText);
    setLyricsLines(parseLrc(editText));
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const formatDisplayTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <audio ref={audioRef} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{song.title}</h3>
              <p className="text-xs text-neutral-400 truncate">
                {song.artist} {song.album ? `· ${song.album}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Vorschau' : 'Bearbeiten'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-neutral-950/60">
          {isEditing ? (
            <div className="flex-1 p-4 flex flex-col">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>LRC-Format ([mm:ss.xx] Text)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOffsetAdjust(-0.2)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                    title="Alles 200ms früher"
                  >
                    -0.2s Timing
                  </button>
                  <button
                    onClick={() => handleOffsetAdjust(0.2)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px]"
                    title="Alles 200ms später"
                  >
                    +0.2s Timing
                  </button>
                </div>
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 font-mono text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/50 resize-none"
                placeholder="[00:15.20] Songtextzeile hier..."
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 text-center select-none"
            >
              {lyricsLines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-16">
                  <Music className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">Kein LRC-Inhalt verfügbar.</p>
                  <p className="text-xs text-neutral-600 mt-1">
                    Klicke oben auf "Bearbeiten", um Text einzufügen oder nutze die LRCLIB-Suche.
                  </p>
                </div>
              ) : (
                lyricsLines.map((line, idx) => {
                  const isActive = idx === activeLineIdx;
                  return (
                    <div
                      key={idx}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => handleJumpToLine(line.time)}
                      className={`cursor-pointer transition-all duration-200 py-1.5 px-4 rounded-lg inline-block max-w-full ${
                        isActive
                          ? 'text-emerald-400 font-bold text-lg sm:text-xl scale-105 bg-emerald-500/10'
                          : 'text-neutral-400 hover:text-neutral-200 text-sm sm:text-base'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-neutral-600 mr-2 tabular-nums">
                        {line.timestamp}
                      </span>
                      <span>{line.text || '♪'}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Player Controls Footer */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Audio scrubber & controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleJumpToLine(0)}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Zurück zum Anfang"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-emerald-950"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-neutral-300 min-w-[70px]">
              <span>{formatDisplayTime(currentTime)}</span>
              {song.fileObj && <Volume2 className="w-3.5 h-3.5 text-neutral-500 ml-1" />}
            </div>

            {/* Timeline slider */}
            <input
              type="range"
              min="0"
              max={lyricsLines.length > 0 ? lyricsLines[lyricsLines.length - 1].time + 10 : 200}
              step="0.5"
              value={currentTime}
              onChange={(e) => handleJumpToLine(parseFloat(e.target.value))}
              className="w-32 sm:w-48 accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Gespeichert!
              </span>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Änderungen speichern</span>
              </button>
            )}
            <button
              onClick={() => onSaveLrc(song, editText || song.lrcContent || '')}
              className="px-3 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
              title="LRC herunterladen"
            >
              <Download className="w-4 h-4" />
              <span>.lrc Datei sichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
