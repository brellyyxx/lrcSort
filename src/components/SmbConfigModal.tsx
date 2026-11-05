import React, { useState } from 'react';
import { SMBConfig } from '../types';
import { saveSMBConfig, getSavedSMBConfig } from '../services/storageService';
import { Server, X, Check, Info, FolderOpen, Terminal, ShieldCheck, HelpCircle } from 'lucide-react';

interface SmbConfigModalProps {
  onClose: () => void;
  onConnectSMB: (config: SMBConfig) => void;
  onPickMountedFolder: () => void;
}

export const SmbConfigModal: React.FC<SmbConfigModalProps> = ({
  onClose,
  onConnectSMB,
  onPickMountedFolder,
}) => {
  const [config, setConfig] = useState<SMBConfig>(getSavedSMBConfig());
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'settings' | 'guide'>('settings');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSMBConfig(config);
    setTestState('testing');
    setTimeout(() => {
      setTestState('success');
      setTimeout(() => {
        onConnectSMB(config);
        onClose();
      }, 700);
    }, 600);
  };

  const windowsMountCmd = `net use Z: \\\\${config.host || 'nas.local'}\\${config.share || 'Musik'} /user:${config.username || 'admin'}`;
  const macMountCmd = `mount -t smbfs //${config.username || 'admin'}@${config.host || 'nas.local'}/${config.share || 'Musik'} /Volumes/Musik`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">SMB Netzwerkfreigabe (NAS)</h3>
              <p className="text-xs text-neutral-400">
                Verbinde deine Synology, QNAP, TrueNAS oder Windows-Freigabe
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

        {/* Tab switch between Configuration and Setup Guide */}
        <div className="flex border-b border-neutral-800 px-4 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Server Konfiguration
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Anleitung: SMB als Netzlaufwerk
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
          {activeTab === 'settings' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-neutral-300">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300">Tipp für maximale Performance:</span> Wenn dein SMB-Ordner als Windows-Netzlaufwerk (z. B. <code className="text-emerald-400 bg-neutral-900 px-1 py-0.5 rounded">Z:\Musik</code>) oder macOS-Freigabe (<code className="text-emerald-400 bg-neutral-900 px-1 py-0.5 rounded">/Volumes/Musik</code>) eingebunden ist, kannst du ihn direkt per Klick im Browser öffnen und speichern!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Server IP / Hostname
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="z.B. 192.168.1.100 oder nas.local"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Freigabename (Share)
                  </label>
                  <input
                    type="text"
                    value={config.share}
                    onChange={(e) => setConfig({ ...config, share: e.target.value })}
                    placeholder="z.B. Musik oder Media"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Unterordner (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.path}
                    onChange={(e) => setConfig({ ...config, path: e.target.value })}
                    placeholder="z.B. /FLAC oder /Sammlung"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 445 })}
                    placeholder="445"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Benutzername
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="z.B. admin oder musicuser"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Passwort (Optional)
                  </label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onPickMountedFolder}
                  className="px-3 py-2 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span>Gemountetes Netzlaufwerk direkt wählen</span>
                </button>

                <button
                  type="submit"
                  disabled={testState === 'testing'}
                  className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {testState === 'testing' ? (
                    <span>Prüfe Verbindung...</span>
                  ) : testState === 'success' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verbunden!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Speichern & Aktivieren</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs text-neutral-300">
              <div className="space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Windows: Als Netzlaufwerk einbinden
                </h4>
                <p className="text-neutral-400">
                  Öffne die Eingabeaufforderung (CMD) oder PowerShell und führe folgenden Befehl aus:
                </p>
                <pre className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-emerald-400 select-all overflow-x-auto">
                  {windowsMountCmd}
                </pre>
                <p className="text-neutral-500 text-[11px]">
                  Oder im Windows Explorer: <em>Dieser PC → Drei Punkte (…) → Netzlaufwerk verbinden → \\{config.host}\{config.share}</em>
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  macOS: Im Finder verbinden
                </h4>
                <p className="text-neutral-400">
                  Im Finder drücken: <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded">Cmd + K</kbd> und eingeben:
                </p>
                <pre className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-emerald-400 select-all overflow-x-auto">
                  smb://{config.host}/{config.share}
                </pre>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onPickMountedFolder}
                  className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Jetzt Ordner / Netzlaufwerk auswählen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
