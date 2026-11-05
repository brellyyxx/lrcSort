import React from 'react';
import { LibraryStats } from '../types';
import { CheckCircle2, AlertCircle, Ban, Music } from 'lucide-react';

interface StatsCardsProps {
  stats: LibraryStats;
  onFilterTab: (tab: 'open' | 'completed' | 'ignored' | 'all') => void;
  activeTab: 'open' | 'completed' | 'ignored' | 'all';
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onFilterTab, activeTab }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Offen (Lyrics fehlen) */}
      <button
        onClick={() => onFilterTab('open')}
        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
          activeTab === 'open'
            ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium text-neutral-300">Offen (Lyrics fehlen)</span>
          <AlertCircle className={`w-4 h-4 ${activeTab === 'open' ? 'text-amber-400' : 'text-neutral-500'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {stats.missingLrc}
          </span>
          <span className="text-xs text-neutral-500">brauchen .lrc</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400">
          Hauptfokus: Lieder ohne synchronisierte Lyrics
        </div>
      </button>

      {/* 2. Mit LRC (Erledigt) */}
      <button
        onClick={() => onFilterTab('completed')}
        className={`p-4 rounded-xl border text-left transition-all group ${
          activeTab === 'completed'
            ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium text-neutral-300">Mit LRC (Fertig)</span>
          <CheckCircle2 className={`w-4 h-4 ${activeTab === 'completed' ? 'text-emerald-400' : 'text-neutral-500'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {stats.withLrc}
          </span>
          <span className="text-xs text-neutral-500">
            {stats.total > 0 ? `${Math.round((stats.withLrc / stats.total) * 100)}%` : '0%'}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400">
          LRC-Datei vorhanden und synchronisiert
        </div>
      </button>

      {/* 3. Manuell markiert: Keine Lyrics (Remix / Instrumental) */}
      <button
        onClick={() => onFilterTab('ignored')}
        className={`p-4 rounded-xl border text-left transition-all group ${
          activeTab === 'ignored'
            ? 'bg-neutral-800 border-neutral-600 ring-1 ring-neutral-500/30'
            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium text-neutral-300">Keine Lyrics (Ignoriert)</span>
          <Ban className={`w-4 h-4 ${activeTab === 'ignored' ? 'text-neutral-300' : 'text-neutral-500'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-neutral-300">
            {stats.ignoredNoLyrics}
          </span>
          <span className="text-xs text-neutral-500">ausgeblendet</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400">
          Remixe, Beats, Instrumentals ohne Text
        </div>
      </button>

      {/* 4. Gesamte Sammlung & Abdeckung */}
      <button
        onClick={() => onFilterTab('all')}
        className={`p-4 rounded-xl border text-left transition-all group ${
          activeTab === 'all'
            ? 'bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30'
            : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
        }`}
      >
        <div className="flex items-center justify-between text-neutral-400 mb-2">
          <span className="text-xs font-medium text-neutral-300">Gesamte Sammlung</span>
          <Music className={`w-4 h-4 ${activeTab === 'all' ? 'text-blue-400' : 'text-neutral-500'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {stats.total}
          </span>
          <span className="text-xs text-emerald-400 font-semibold font-mono">
            {stats.coveragePercentage}% fertig
          </span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.coveragePercentage}%` }}
            />
          </div>
        </div>
      </button>
    </div>
  );
};
