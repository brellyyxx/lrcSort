import React from 'react';
import { TabType, LibraryStats } from '../types';
import { AlertCircle, CheckCircle2, Ban, Layers } from 'lucide-react';

interface TabsNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  stats: LibraryStats;
}

export const TabsNavigation: React.FC<TabsNavigationProps> = ({
  activeTab,
  onTabChange,
  stats,
}) => {
  const tabs = [
    {
      id: 'open' as TabType,
      label: 'Offen / Lyrics fehlen',
      description: 'LRC & Ignorierte ausgeblendet',
      count: stats.missingLrc,
      icon: AlertCircle,
      activeColor: 'text-amber-400 border-amber-400 bg-amber-500/10',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'completed' as TabType,
      label: 'Mit LRC',
      description: 'Bereits synchronisiert',
      count: stats.withLrc,
      icon: CheckCircle2,
      activeColor: 'text-emerald-400 border-emerald-400 bg-emerald-500/10',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'ignored' as TabType,
      label: 'Keine Lyrics (Ignoriert)',
      description: 'Remixe, Beats, Instrumentals',
      count: stats.ignoredNoLyrics,
      icon: Ban,
      activeColor: 'text-neutral-300 border-neutral-300 bg-neutral-800',
      badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    },
    {
      id: 'all' as TabType,
      label: 'Alle Lieder',
      description: 'Gesamte Sammlung',
      count: stats.total,
      icon: Layers,
      activeColor: 'text-blue-400 border-blue-400 bg-blue-500/10',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  ];

  return (
    <div className="border-b border-neutral-800">
      <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? `${tab.activeColor} shadow-sm`
                  : 'text-neutral-400 border-transparent hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`font-mono text-xs tabular-nums px-2 py-0.5 rounded-full border ${
                  isActive ? tab.badgeColor : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
