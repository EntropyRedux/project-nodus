import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Terminal, Server, ArrowRight, Clipboard, Play } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

export const UniversalSearchModal: React.FC = () => {
  const { 
    isSearchOpen, 
    setSearchOpen, 
    apps, 
    launchApp, 
    remoteExecutables, 
    executeRemoteApp,
    devices,
    selectDevice,
    clipboardItems,
    settings,
  } = useLauncher();
  
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredExecutables = remoteExecutables.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(query.toLowerCase())) ||
    e.deviceName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.ipAddress.includes(query) ||
    d.os.toLowerCase().includes(query.toLowerCase())
  );

  const filteredClipboard = clipboardItems.filter((c) =>
    c.text.toLowerCase().includes(query.toLowerCase())
  );

  const handleLaunch = (appId: string) => {
    audio.playAppOpen();
    setSearchOpen(false);
    launchApp(appId);
  };

  const handleExecRemote = (exec: typeof remoteExecutables[0]) => {
    audio.playAppOpen();
    setSearchOpen(false);
    executeRemoteApp(exec);
  };

  const handleSelectDev = (devId: string) => {
    audio.playTap();
    setSearchOpen(false);
    selectDevice(devId);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-2xl text-[#F1F5F9] flex flex-col p-4 sm:p-8 select-none animate-in fade-in zoom-in-95 duration-150">
      <div 
        className={`w-full max-w-2xl mx-auto flex-1 flex flex-col min-h-0 ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} overflow-hidden ${currentTheme.classes.containerFont} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'modal') }}
      >
        {/* Search Input Header */}
        <div className={`flex items-center gap-3 p-4 ${currentTheme.classes.modalHeader} shrink-0`}>
          <Search size={18} style={{ color: currentAccent.hex }} className="shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder={currentTheme.archetype === 'hud' ? '[QUERY TELEMETRY // SEARCH EXECUTABLES]...' : 'Search executables, scripts, devices, telemetry...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-[#F1F5F9] focus:outline-none placeholder-[#64748B]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-[#94A3B8] hover:text-[#F1F5F9]">
              <X size={16} />
            </button>
          )}
          <span className={`hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#94A3B8] bg-white/[0.04] border border-white/10 ${currentTheme.buttonRadius}`}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-2 scrollbar-thin">
          {/* Local Apps Section */}
          {filteredApps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] px-1">APPLICATIONS ({filteredApps.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleLaunch(app.id)}
                    className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center gap-3 cursor-pointer transition shadow-sm group`}
                  >
                    <div
                      className={`w-8 h-8 ${currentTheme.buttonRadius} flex items-center justify-center text-white shrink-0 overflow-hidden`}
                      style={{ backgroundColor: app.customIcon ? 'transparent' : app.color || currentAccent.hex }}
                    >
                      {app.customIcon ? (
                        <img src={app.customIcon} alt={app.name} className="w-8 h-8 object-contain rounded-md" />
                      ) : (
                        <DynamicIcon name={app.iconName} size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#E2E8F0] group-hover:text-white truncate block">{app.name}</span>
                      <span className="text-[10px] text-[#64748B] capitalize">{app.category || 'System'}</span>
                    </div>
                    <ArrowRight size={12} className="text-[#64748B] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remote Executables Section */}
          {filteredExecutables.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981] px-1">REMOTE EXECUTABLES</h4>
              <div className="grid grid-cols-1 gap-2">
                {filteredExecutables.map((exec) => (
                  <div
                    key={exec.id}
                    onClick={() => handleExecRemote(exec)}
                    className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer transition shadow-sm group`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 ${currentTheme.buttonRadius} flex items-center justify-center text-white shrink-0`}
                        style={{ backgroundColor: exec.iconColor }}
                      >
                        <DynamicIcon name={exec.iconName} size={16} />
                      </div>
                      <div className="truncate">
                        <h5 className="text-xs font-semibold text-[#F1F5F9] truncate">{exec.name}</h5>
                        <p className="text-[10px] text-[#94A3B8] truncate font-mono">Target: {exec.deviceName}</p>
                      </div>
                    </div>
                    <button className={`px-2.5 py-1 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 ${currentTheme.buttonRadius} text-[10px] font-mono font-bold flex items-center gap-1 shrink-0`}>
                      <Play size={10} /> EXEC
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cluster Devices Section */}
          {query && filteredDevices.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider px-1" style={{ color: currentAccent.hex }}>MESH NODES</h4>
              <div className="space-y-2">
                {filteredDevices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => handleSelectDev(dev.id)}
                    className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer transition shadow-sm font-mono`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0`}
                        style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex }}
                      >
                        <Server size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-[#F1F5F9]">{dev.name}</h5>
                        <p className="text-[10px] text-[#94A3B8]">{dev.ipAddress} • {dev.os}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 ${currentTheme.pillRadius} border border-[#10B981]/30 uppercase font-bold`}>
                      {dev.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clipboard Snippets Section */}
          {query && filteredClipboard.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] px-1">CLIPBOARD BUFFER</h4>
              <div className="space-y-2">
                {filteredClipboard.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (navigator.clipboard) navigator.clipboard.writeText(item.text);
                      audio.playTap();
                      setSearchOpen(false);
                    }}
                    className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} cursor-pointer transition flex items-center justify-between shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Clipboard size={14} className="text-[#F59E0B] shrink-0" />
                      <span className="text-xs text-[#F1F5F9] font-mono truncate">{item.text}</span>
                    </div>
                    <span className="text-[10px] text-[#94A3B8] shrink-0 ml-3 font-mono">{item.deviceName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shell Command Runner */}
          {query && (
            <div
              onClick={() => handleLaunch('terminal')}
              className={`p-3 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition font-mono`}
            >
              <div className="flex items-center gap-3 truncate">
                <Terminal size={14} style={{ color: currentAccent.hex }} className="shrink-0" />
                <span className="truncate">Execute remote shell instruction: &quot;{query}&quot;</span>
              </div>
              <ArrowRight size={14} className="shrink-0" style={{ color: currentAccent.hex }} />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className={`p-3 ${currentTheme.classes.modalHeader} flex items-center justify-between text-[11px] text-[#94A3B8] font-mono`}>
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className={`px-1.5 py-0.5 bg-white/[0.04] border border-white/10 ${currentTheme.buttonRadius} text-[9px]`}>↑</kbd>
            <kbd className={`px-1.5 py-0.5 bg-white/[0.04] border border-white/10 ${currentTheme.buttonRadius} text-[9px]`}>↓</kbd>
            <kbd className={`px-1.5 py-0.5 bg-white/[0.04] border border-white/10 ${currentTheme.buttonRadius} text-[9px]`}>↵ Select</kbd>
          </div>
          <button
            onClick={() => setSearchOpen(false)}
            className="text-[#94A3B8] hover:text-[#F1F5F9] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
