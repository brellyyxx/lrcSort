import React from 'react';
import { HardDrive, Server, FolderOpen, Music2, Sparkles, Download, Upload } from 'lucide-react';

interface HeaderProps {
  onOpenDirectory: () => void;
  onOpenSmbModal: () => void;
  onLoadDemo: () => void;
  onExportState: () => void;
  onImportState: () => void;
  currentSource: string;
  isScanning: boolean;
  scanProgress?: { count: number; folder: string };
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDirectory,
  onOpenSmbModal,
  onLoadDemo,
  onExportState,
  onImportState,
  currentSource,
  isScanning,
  scanProgress,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              LRC Hub
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs text-neutral-400 font-normal">
              SMB & Synced Lyrics Manager
            </span>
          </div>
        </div>

        {/* Zone 2: Informational / Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-neutral-400" />
            <span className="truncate max-w-xs text-neutral-300 font-mono">
              {currentSource || 'Kein Ordner geladen'}
            </span>
          </div>
          {isScanning && scanProgress && (
            <div className="flex items-center gap-2 text-amber-400 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{scanProgress.count} Lieder gescannt...</span>
            </div>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onExportState}
            title="Markierungen und Status als JSON exportieren"
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onImportState}
            title="Markierungen aus JSON importieren"
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={onLoadDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo laden</span>
          </button>

          <button
            onClick={onOpenSmbModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>SMB Einstellungen</span>
          </button>

          <button
            onClick={onOpenDirectory}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-emerald-950"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Ordner / Freigabe öffnen</span>
          </button>
        </div>
      </div>
    </header>
  );
};
