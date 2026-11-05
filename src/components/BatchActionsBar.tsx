import React from 'react';
import { Ban, CheckCircle2, Search, X, Sparkles, Loader2 } from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  onMarkNoLyricsBatch: (reason: 'remix' | 'instrumental' | 'dj_mix' | 'soundtrack' | 'other') => void;
  onClearNoLyricsBatch: () => void;
  onAutoSearchBatch: () => void;
  onClearSelection: () => void;
  isBatchSearching: boolean;
  batchProgress?: { current: number; total: number };
}

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  selectedCount,
  onMarkNoLyricsBatch,
  onClearNoLyricsBatch,
  onAutoSearchBatch,
  onClearSelection,
  isBatchSearching,
  batchProgress,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-2.5 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 border-r border-neutral-800 pr-3">
        <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {selectedCount}
        </span>
        <span className="text-xs text-neutral-300">ausgewählt</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Batch Auto Search */}
        <button
          onClick={onAutoSearchBatch}
          disabled={isBatchSearching}
          className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {isBatchSearching ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                Suche... ({batchProgress?.current}/{batchProgress?.total})
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Suche auf LRCLIB</span>
            </>
          )}
        </button>

        {/* Mark as No Lyrics */}
        <button
          onClick={() => onMarkNoLyricsBatch('remix')}
          className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Ban className="w-3.5 h-3.5 text-amber-400" />
          <span>Als "Keine Lyrics" (Remix)</span>
        </button>

        <button
          onClick={() => onMarkNoLyricsBatch('instrumental')}
          className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Ban className="w-3.5 h-3.5 text-neutral-400" />
          <span>Instrumental</span>
        </button>

        {/* Clear No Lyrics */}
        <button
          onClick={onClearNoLyricsBatch}
          className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          title="Markierung entfernen"
        >
          Zurücksetzen
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg ml-1"
        title="Auswahl aufheben"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
