import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SongFile } from '../types';
import { formatLrcTime, parseLrc } from '../utils/lrcParser';
import { searchLyrics } from '../services/lrclibService';
import { cleanGeniusLyrics, fetchCleanLyrics } from '../services/geniusLyricsService';
import { generateDemoAudioTrack } from '../utils/audioGenerator';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Upload,
  Sparkles,
  Sliders,
  Code2,
  ListMusic,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  FastForward,
  Rewind,
  Music,
  FolderOpen,
  Keyboard,
  Clock,
  Eraser,
  Loader2,
} from 'lucide-react';

interface LrcCreatorModalProps {
  song?: SongFile | null;
  onClose: () => void;
  onSaveLrc: (song: SongFile, lrcContent: string) => Promise<void>;
}

interface StampedLine {
  id: string;
  text: string;
  time: number | null; // in seconds, null if not yet timed
}

export const LrcCreatorModal: React.FC<LrcCreatorModalProps> = ({
  song,
  onClose,
  onSaveLrc,
}) => {
  // Step: 'input' -> 'sync' -> 'finetune'
  const [activeStep, setActiveStep] = useState<'input' | 'sync' | 'finetune' | 'raw'>('input');

  // Metadata
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [album, setAlbum] = useState(song?.album || '');

  // Lyrics text & parsed lines
  const [rawLyricsText, setRawLyricsText] = useState('');
  const [lines, setLines] = useState<StampedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Audio & Playback
  const [audioFile, setAudioFile] = useState<File | null>(song?.fileObj || null);
  const [isUsingDemoAudio, setIsUsingDemoAudio] = useState(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // default 3 min
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // States
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isFetchingGenius, setIsFetchingGenius] = useState(false);
  const [geniusNotification, setGeniusNotification] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [globalOffset, setGlobalOffset] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load song audio or fallback to synthesized demo beat
  useEffect(() => {
    let isCancelled = false;

    if (song?.fileObj) {
      setAudioFile(song.fileObj);
      setIsUsingDemoAudio(false);
    } else if (song?.fileHandle && typeof song.fileHandle.getFile === 'function') {
      song.fileHandle.getFile().then((file: File) => {
        if (!isCancelled) {
          setAudioFile(file);
          setIsUsingDemoAudio(false);
        }
      }).catch((err: any) => {
        console.warn('Could not read file from fileHandle, using demo rhythm beat:', err);
        if (!isCancelled) {
          const demoTrack = generateDemoAudioTrack(180, 115);
          setAudioFile(demoTrack);
          setIsUsingDemoAudio(true);
        }
      });
    } else {
      // Demo song or empty creator: initialize demo rhythm track
      const demoTrack = generateDemoAudioTrack(180, 115);
      setAudioFile(demoTrack);
      setIsUsingDemoAudio(true);
    }

    return () => {
      isCancelled = true;
    };
  }, [song]);

  // Setup initial lyrics if song already has lyrics or content
  useEffect(() => {
    if (song?.lrcContent) {
      const parsed = parseLrc(song.lrcContent);
      if (parsed.length > 0) {
        setLines(
          parsed.map((p, idx) => ({
            id: `line_${idx}`,
            text: p.text,
            time: p.time,
          }))
        );
        setRawLyricsText(parsed.map((p) => p.text).join('\n'));
        setActiveStep('sync');
      }
    }
  }, [song]);

  // Audio object URL management
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.volume = isMuted ? 0 : volume;
      }
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioFile]);

  // Handle volume & mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Timer loop for simulated audio or real audio
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Playback rate handler
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Scroll active line into view during sync
  useEffect(() => {
    if (activeStep === 'sync' && activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex, activeStep]);

  // Convert raw text into StampedLine array
  const handleProcessRawLyrics = () => {
    if (!rawLyricsText.trim()) return;

    // Automatically strip any [Verse], [Chorus] and bracket headers
    const cleanedText = cleanGeniusLyrics(rawLyricsText);
    const rawLines = cleanedText.split(/\r?\n/);
    const cleaned: StampedLine[] = [];

    rawLines.forEach((l, idx) => {
      const trimmed = l.trim();
      // Keep non-empty lines
      if (trimmed) {
        cleaned.push({
          id: `line_${idx}_${Date.now()}`,
          text: trimmed,
          time: null,
        });
      }
    });

    setLines(cleaned);
    setCurrentLineIndex(0);
    setActiveStep('sync');
  };

  // Clean raw lyrics text (strip bracketed section labels like [Chorus], extra whitespace)
  const handleAutoCleanLyrics = () => {
    const lines = rawLyricsText.split(/\r?\n/);
    const cleaned = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^\[(verse|chorus|hook|bridge|intro|outro|strophe|refrain).*?\]\s*/i, ''))
      .filter((l) => l.length > 0)
      .join('\n');
    setRawLyricsText(cleaned);
  };

  // Fetch plain lyrics from LRCLIB
  const handleFetchFromLrclib = async () => {
    if (!title.trim()) return;
    setIsLoadingLyrics(true);
    try {
      const results = await searchLyrics({
        trackName: title,
        artistName: artist || undefined,
        albumName: album || undefined,
      });

      if (results.length > 0) {
        // If there are plain or synced lyrics
        const best = results[0];
        if (best.plainLyrics) {
          setRawLyricsText(best.plainLyrics);
        } else if (best.syncedLyrics) {
          const parsed = parseLrc(best.syncedLyrics);
          setRawLyricsText(parsed.map((p) => p.text).join('\n'));
        }
        if (best.artistName && !artist) setArtist(best.artistName);
        if (best.albumName && !album) setAlbum(best.albumName);
        if (best.duration) setDuration(best.duration);
      }
    } catch (err) {
      console.warn('Could not fetch lyrics:', err);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  // Fetch from Genius (with automatic clean strip of [Verse], [Chorus] etc.)
  const handleFetchFromGenius = async () => {
    if (!title.trim()) return;
    setIsFetchingGenius(true);
    setGeniusNotification(null);
    try {
      const res = await fetchCleanLyrics({ title, artist });
      if (res && res.lyrics && res.lyrics.trim().length > 0) {
        setRawLyricsText(res.lyrics);
        setGeniusNotification({
          text: `Clean Lyrics gefunden & eingefügt (ohne Verse/Chorus-Überschriften)!`,
          type: 'success',
        });
        setTimeout(() => setGeniusNotification(null), 4500);
      } else {
        setGeniusNotification({
          text: `Kein Treffer in der Datenbank. Du kannst den Text von Genius direkt reinkopieren und den Button "Verse & Chorus entfernen" nutzen!`,
          type: 'warn',
        });
        setTimeout(() => setGeniusNotification(null), 6000);
      }
    } catch (err) {
      setGeniusNotification({
        text: `Fehler beim Abrufen von Lyrics.`,
        type: 'warn',
      });
    } finally {
      setIsFetchingGenius(false);
    }
  };

  // Clean existing lyrics in textarea (strips [Verse 1], [Chorus], [Bridge], [Intro] etc.)
  const handleCleanGeniusHeaders = () => {
    if (!rawLyricsText.trim()) return;
    const cleaned = cleanGeniusLyrics(rawLyricsText);
    setRawLyricsText(cleaned);
    setGeniusNotification({
      text: `Alle [Verse], [Chorus], [Bridge] & Überschriften wurden erfolgreich entfernt!`,
      type: 'success',
    });
    setTimeout(() => setGeniusNotification(null), 3500);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn('Audio play error:', err);
        });
      }
      setIsPlaying(true);
    }
  };

  // Stamp current line with currentTime and advance
  const handleStampCurrentLine = () => {
    if (currentLineIndex >= lines.length) return;

    // Start playing automatically on first tap if not already playing!
    if (!isPlaying) {
      togglePlay();
    }

    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx === currentLineIndex) {
          return {
            ...line,
            time: currentTime,
          };
        }
        return line;
      })
    );

    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex((prev) => prev + 1);
    }
  };

  // Rewind audio by seconds
  const seekDelta = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Jump to specific time
  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  };

  // Global Keyboard Shortcuts (Space to stamp, Shift+Space to play/pause, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is typing in a textarea or input!
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) {
          togglePlay();
        } else {
          if (activeStep === 'sync') {
            handleStampCurrentLine();
          } else {
            togglePlay();
          }
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setCurrentLineIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setCurrentLineIndex((prev) => Math.min(lines.length - 1, prev + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekDelta(-3);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekDelta(3);
      } else if (e.code === 'Backspace' || e.code === 'Delete') {
        // Clear timestamp of current line
        e.preventDefault();
        setLines((prev) =>
          prev.map((line, idx) => (idx === currentLineIndex ? { ...line, time: null } : line))
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, currentLineIndex, isPlaying, currentTime, lines.length, audioFile]);

  // Adjust line timestamp
  const adjustLineTime = (index: number, delta: number) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx === index && line.time !== null) {
          const newTime = Math.max(0, line.time + delta);
          return { ...line, time: newTime };
        }
        return line;
      })
    );
  };

  // Apply global offset
  const handleApplyGlobalOffset = (offset: number) => {
    setGlobalOffset((prev) => prev + offset);
    setLines((prev) =>
      prev.map((line) => {
        if (line.time !== null) {
          return { ...line, time: Math.max(0, line.time + offset) };
        }
        return line;
      })
    );
  };

  // 1-to-1 exact matching filename as requested by user
  const exactBaseName = song?.name
    ? song.name.replace(/\.[a-zA-Z0-9]+$/, '')
    : audioFile?.name
    ? audioFile.name.replace(/\.[a-zA-Z0-9]+$/, '')
    : `${artist ? artist + ' - ' : ''}${title || 'song'}`;
  const exactLrcFilename = `${exactBaseName}.lrc`;

  // Generate finalized pure clean LRC string (no created by, no title tags, just clean lines)
  const generatedLrcString = useMemo(() => {
    return lines
      .filter((l) => l.time !== null)
      .sort((a, b) => (a.time || 0) - (b.time || 0))
      .map((l) => `[${formatLrcTime(l.time || 0)}] ${l.text}`)
      .join('\n');
  }, [lines]);

  // Save directly to song folder on SMB / disk
  const handleSave = async () => {
    if (song) {
      await onSaveLrc(song, generatedLrcString);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      // Download with exact filename
      handleDownloadLrc();
    }
  };

  // Download .lrc file with 1-to-1 exact filename
  const handleDownloadLrc = () => {
    const blob = new Blob([generatedLrcString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exactLrcFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedLrcString);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const timedCount = lines.filter((l) => l.time !== null).length;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          setAudioFile(file);
          setIsUsingDemoAudio(false);
        }
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
      />
      <input
        type="file"
        ref={filePickerRef}
        accept="audio/*,.mp3,.flac,.m4a,.ogg,.wav,.opus"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
            setIsUsingDemoAudio(false);
          }
        }}
      />

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  LRC Creator & Sync Studio
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {timedCount} / {lines.length} Zeilen getimt
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate">
                {title || 'Neuer Song'} {artist ? `· ${artist}` : ''}
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveStep('input')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStep === 'input'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>1. Text</span>
            </button>
            <button
              onClick={() => {
                if (lines.length === 0) handleProcessRawLyrics();
                setActiveStep('sync');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStep === 'sync'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Live Tappen</span>
            </button>
            <button
              onClick={() => setActiveStep('finetune')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStep === 'finetune'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. Feintuning</span>
            </button>
            <button
              onClick={() => setActiveStep('raw')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStep === 'raw'
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>LRC Code</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Player Bar (Always Visible Across Steps) */}
        <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {/* Audio Source Info & Loader */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => filePickerRef.current?.click()}
              className={`px-2.5 py-1 text-xs rounded-lg border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isUsingDemoAudio
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700/80'
              }`}
              title="Audiodatei für Playback laden (.mp3, .flac, .wav)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {audioFile ? audioFile.name : 'Audiodatei laden (.mp3 / .flac)'}
              </span>
            </button>

            {/* Playback Speed selector */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
              {[0.75, 1.0, 1.25].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    playbackRate === rate
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber & Controls */}
          <div className="flex items-center gap-3 flex-1 max-w-md justify-center">
            <button
              onClick={() => seekDelta(-3)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="3 Sek. zurück (Pfeil links)"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-emerald-950 cursor-pointer"
              title="Abspielen / Pausieren (Shift+Leertaste)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => seekDelta(3)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="3 Sek. vor (Pfeil rechts)"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Current Time Display */}
            <div className="font-mono text-xs tabular-nums text-neutral-200 min-w-[90px] text-center">
              {formatLrcTime(currentTime)} / {formatLrcTime(duration)}
            </div>

            {/* Audio Seek slider */}
            <input
              type="range"
              min="0"
              max={duration || 180}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>

          {/* Volume & Save CTA */}
          <div className="flex items-center gap-3">
            {/* Volume Control */}
            <div className="flex items-center gap-1.5 text-neutral-400">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Stummschaltung aufheben' : 'Ton stummschalten'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-amber-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-14 sm:w-20 accent-emerald-400 cursor-pointer h-1 bg-neutral-800 rounded"
                title={`Lautstärke: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 shrink-0 cursor-pointer"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{song ? 'In SMB speichern' : 'LRC sichern'}</span>
            </button>
          </div>
        </div>

        {/* Audio Notification Bar */}
        {isUsingDemoAudio ? (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                <strong>Ton ist an (Demo-Rhythmus-Track):</strong> Du hörst einen Beat zum Timen. Ziehe deine eigene MP3/FLAC Datei rein, um deine echte Musik abzuspielen!
              </span>
            </div>
            <button
              type="button"
              onClick={() => filePickerRef.current?.click()}
              className="text-amber-200 underline hover:text-white font-medium ml-2 shrink-0 cursor-pointer"
            >
              Eigene Datei wählen
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border-b border-emerald-500/20 px-4 py-1 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
            <span>✓ Echte Musikdatei geladen: {audioFile?.name}</span>
            <span className="text-[10px] text-neutral-500">Ton aktiv ({Math.round(volume * 100)}%)</span>
          </div>
        )}

        {/* Modal View Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-neutral-950/40">
          {/* STEP 1: Text Input */}
          {activeStep === 'input' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto w-full">
              {/* Song Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Songtitel
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titel..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Künstler / Interpret
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Künstler..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Album (Optional)
                  </label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    placeholder="Album..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Textarea Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-neutral-300">Songtext (Zeile für Zeile):</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Button: Von Genius abrufen (ohne Verse/Chorus) */}
                  <button
                    type="button"
                    onClick={handleFetchFromGenius}
                    disabled={isFetchingGenius || !title.trim()}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Findet den Songtext auf Genius und entfernt automatisch alle [Verse], [Chorus] etc."
                  >
                    {isFetchingGenius ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Suche auf Genius...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-neutral-950 fill-neutral-950" />
                        <span>Von Genius holen (Clean)</span>
                      </>
                    )}
                  </button>

                  {/* Button: Verse & Chorus entfernen (für reinkopierten Text) */}
                  <button
                    type="button"
                    onClick={handleCleanGeniusHeaders}
                    disabled={!rawLyricsText.trim()}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-lg border border-neutral-700 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Entfernt alle [Verse 1], [Chorus], [Bridge], [Intro] Überschriften aus dem aktuellen Text"
                  >
                    <Eraser className="w-3.5 h-3.5 text-amber-400" />
                    <span>Verse & Chorus entfernen</span>
                  </button>

                  {/* Fallback button: LRCLIB */}
                  <button
                    type="button"
                    onClick={handleFetchFromLrclib}
                    disabled={isLoadingLyrics || !title.trim()}
                    className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-neutral-400 hover:text-neutral-200 rounded-lg border border-neutral-800 text-xs inline-flex items-center gap-1 transition-colors"
                    title="Alternative: Aus LRCLIB-Datenbank laden"
                  >
                    <span>LRCLIB</span>
                  </button>
                </div>
              </div>

              {/* Notification Banner */}
              {geniusNotification && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                    geniusNotification.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{geniusNotification.text}</span>
                </div>
              )}

              {/* Plain Lyrics Textarea */}
              <textarea
                value={rawLyricsText}
                onChange={(e) => setRawLyricsText(e.target.value)}
                placeholder={`Hier den Songtext einfach reinkopieren...\n\nBeispiel:\nIs this the real life?\nIs this just fantasy?\nCaught in a landslide, no escape from reality...`}
                className="w-full h-72 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-neutral-200 leading-relaxed focus:outline-none focus:border-emerald-500/60 resize-none shadow-inner"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-500">
                  {rawLyricsText.split(/\r?\n/).filter((l) => l.trim().length > 0).length} Zeilen
                  erkannt
                </span>

                <button
                  onClick={handleProcessRawLyrics}
                  disabled={!rawLyricsText.trim()}
                  className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>Weiter zum Live-Tappen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Live Tapping & Sync Studio ("Spacebar to Sync") */}
          {activeStep === 'sync' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              {/* Left Column: Big Interactive Tapping Pad & Keyboard Controls */}
              <div className="w-full md:w-80 p-5 border-r border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-4 shrink-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                      Tapping Steuerung
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Starte den Song und drücke im Takt die Leertaste, um die aktuelle Zeile
                      abzustempeln.
                    </p>
                  </div>

                  {/* Big Spacebar Button */}
                  <button
                    onClick={handleStampCurrentLine}
                    className="w-full py-6 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border-2 border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all transform active:scale-98 shadow-lg shadow-emerald-950/20"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-400 text-neutral-950 flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                      LEER
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-emerald-300 block">
                        Zeile jetzt timen!
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        oder Taste LEERTASTE drücken
                      </span>
                    </div>
                  </button>

                  {/* Keyboard Shortcuts Card */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2 text-[11px]">
                    <div className="font-semibold text-neutral-300 flex items-center gap-1.5 text-xs">
                      <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tastaturkürzel:</span>
                    </div>
                    <div className="space-y-1.5 text-neutral-400">
                      <div className="flex justify-between items-center">
                        <kbd className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          Leertaste
                        </kbd>
                        <span>Zeile timen & weiter</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          Shift + Leertaste
                        </kbd>
                        <span>Play / Pause</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          ↑ / ↓ Pfeiltasten
                        </kbd>
                        <span>Zeile wechseln</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          ← / → Pfeiltasten
                        </kbd>
                        <span>3s vor / zurück</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          Rücktaste (Del)
                        </kbd>
                        <span>Zeitstempel löschen</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Switch to Finetune */}
                <button
                  onClick={() => setActiveStep('finetune')}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Feinjustierung & Liste</span>
                </button>
              </div>

              {/* Right Column: Teleprompter Scrolling View */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-4 select-none flex flex-col justify-start"
              >
                {lines.map((line, idx) => {
                  const isCurrent = idx === currentLineIndex;
                  const hasTime = line.time !== null;

                  return (
                    <div
                      key={line.id}
                      ref={isCurrent ? activeLineRef : null}
                      onClick={() => {
                        setCurrentLineIndex(idx);
                        if (line.time !== null) seekTo(line.time);
                      }}
                      className={`cursor-pointer transition-all duration-150 py-3 px-5 rounded-xl border flex items-center justify-between gap-4 ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/50 scale-102 ring-2 ring-emerald-500/30 shadow-lg'
                          : hasTime
                          ? 'bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-800/40'
                          : 'bg-neutral-950/40 border-neutral-900 text-neutral-500 hover:bg-neutral-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs tabular-nums px-2 py-0.5 rounded ${
                            hasTime
                              ? 'bg-emerald-950 text-emerald-400 font-bold'
                              : 'bg-neutral-900 text-neutral-600'
                          }`}
                        >
                          {hasTime ? formatLrcTime(line.time!) : '--:--.--'}
                        </span>
                        <span
                          className={`text-sm sm:text-base ${
                            isCurrent
                              ? 'font-bold text-white text-lg sm:text-xl'
                              : hasTime
                              ? 'text-neutral-200'
                              : 'text-neutral-400'
                          }`}
                        >
                          {line.text}
                        </span>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded shrink-0 animate-pulse">
                          Aktiv
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Fine-Tuning List with Micro Nudge Buttons */}
          {activeStep === 'finetune' && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Global Offset Bar */}
              <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Gesamten Song anpassen (Globales Timing):</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApplyGlobalOffset(-0.2)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 font-mono text-[11px]"
                    title="Alles 200ms früher"
                  >
                    -0.2s früher
                  </button>
                  <button
                    onClick={() => handleApplyGlobalOffset(-0.05)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 font-mono text-[11px]"
                  >
                    -0.05s
                  </button>
                  <button
                    onClick={() => handleApplyGlobalOffset(0.05)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 font-mono text-[11px]"
                  >
                    +0.05s
                  </button>
                  <button
                    onClick={() => handleApplyGlobalOffset(0.2)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 font-mono text-[11px]"
                    title="Alles 200ms später"
                  >
                    +0.2s später
                  </button>
                </div>
              </div>

              {/* Micro-Adjustment Table */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className="p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-neutral-700 transition-colors"
                  >
                    {/* Timestamp & Play button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (line.time !== null) {
                            seekTo(line.time);
                            if (!isPlaying) togglePlay();
                          }
                        }}
                        disabled={line.time === null}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-300 disabled:opacity-40 transition-colors"
                        title="Abspielen ab diesem Zeitpunkt"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      <span className="font-mono tabular-nums text-emerald-400 font-semibold min-w-[70px]">
                        {line.time !== null ? formatLrcTime(line.time) : '--:--.--'}
                      </span>
                    </div>

                    {/* Editable Line Text */}
                    <input
                      type="text"
                      value={line.text}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, text: newText } : l))
                        );
                      }}
                      className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded px-2.5 py-1 text-neutral-200 focus:outline-none focus:border-emerald-500 font-medium"
                    />

                    {/* Fine Adjustment Nudge Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustLineTime(idx, -0.1)}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                        title="100ms früher"
                      >
                        -0.1s
                      </button>
                      <button
                        onClick={() => adjustLineTime(idx, 0.1)}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-mono"
                        title="100ms später"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => {
                          setLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, time: currentTime } : l))
                          );
                        }}
                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px]"
                        title="Aktuelle Abspielzeit übernehmen"
                      >
                        Setzen
                      </button>
                      <button
                        onClick={() => {
                          setLines((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors ml-1"
                        title="Zeile entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Raw LRC Code View */}
          {activeStep === 'raw' && (
            <div className="flex-1 p-5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>Generierter .lrc Datei-Inhalt:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Kopiert!' : 'Kopieren'}</span>
                  </button>
                  <button
                    onClick={handleDownloadLrc}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Als Datei downloaden</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={generatedLrcString}
                className="flex-1 w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-emerald-400/90 leading-relaxed focus:outline-none resize-none select-all"
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Getimte Zeilen: {timedCount} / {lines.length}</span>
            <span className="hidden sm:inline text-neutral-500 font-mono">
              · Datei: <span className="text-emerald-400">{exactLrcFilename}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadLrc}
              className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exactLrcFilename} downloaden</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Als {exactLrcFilename} gespeichert!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{song ? `Direkt in Ordner speichern` : 'Fertigstellen'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
