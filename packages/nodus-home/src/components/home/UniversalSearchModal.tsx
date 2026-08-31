import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Terminal, Server, ArrowRight, ShieldCheck, Clipboard, Play, StickyNote, CheckSquare } from 'lucide-react';
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
    notes,
    openNotesModal,
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

  const filteredNotes = query ? notes.filter((n) =>
    (n.title && n.title.toLowerCase().includes(query.toLowerCase())) ||
    n.text.toLowerCase().includes(query.toLowerCase()) ||
    (n.checklist && n.checklist.some((c) => c.text.toLowerCase().includes(query.toLowerCase())))
  ) : [];

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
    <div 
      className={`absolute inset-0 z-50 backdrop-blur-2xl flex flex-col p-4 select-none animate-in fade-in zoom-in-95 duration-200`}
      style={{
        backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel'),
      }}
    >
      {/* Search Input Header */}
      <div className={`flex items-center gap-2 pb-3 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
        <div className={`flex-1 flex items-center ${currentTheme.classes.inputField} ${currentTheme.cardRadius} px-3.5 py-2.5`}>
          <Search size={16} className={`${currentTheme.classes.textMuted} mr-2 shrink-0`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search local apps, remote executables, devices, clipboard..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full bg-transparent border-none text-sm ${currentTheme.classes.textPrimary} focus:outline-none placeholder-[#94A3B8]`}
          />
          {query && (
            <button onClick={() => setQuery('')} className={`p-1 ${currentTheme.classes.textMuted} hover:opacity-100`}>
              <X size={15} />
            </button>
          )}
        </div>

        <button
          onClick={() => setSearchOpen(false)}
          className={`px-3 py-2 text-xs font-semibold ${currentTheme.classes.textSecondary} hover:opacity-100`}
        >
          Cancel
        </button>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4">
        {/* Local Apps Section */}
        {filteredApps.length > 0 && (
          <div className="space-y-1.5">
            <h4 className={`text-[10px] font-semibold uppercase tracking-widest ${currentTheme.classes.textSecondary} px-1`}>Apps & Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleLaunch(app.id)}
                  className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} hover:shadow-md flex items-center gap-2.5 cursor-pointer transition shadow-xs`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: app.customIcon ? 'transparent' : app.color }}
                  >
                    {app.customIcon ? (
                      <img src={app.customIcon} alt={app.name} className="w-8 h-8 object-contain rounded-lg" />
                    ) : (
                      <DynamicIcon name={app.iconName} size={16} />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${currentTheme.classes.textPrimary} truncate`}>{app.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes & Checklists Section */}
        {query && filteredNotes.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#FF9500] px-1">Notes & Tasks ({filteredNotes.length})</h4>
            <div className="space-y-1.5">
              {filteredNotes.slice(0, 4).map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    audio.playTap();
                    setSearchOpen(false);
                    openNotesModal(note.id);
                  }}
                  className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer transition shadow-xs`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#FF9500]/15 border border-[#FF9500]/30 flex items-center justify-center text-[#FF9500] shrink-0">
                      {note.type === 'checklist' ? <CheckSquare size={16} /> : <StickyNote size={16} />}
                    </div>
                    <div className="truncate">
                      <h5 className={`text-xs font-semibold ${currentTheme.classes.textPrimary} truncate`}>{note.title || note.text}</h5>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>
                        {note.type.toUpperCase()}{note.checklist ? ` • ${note.checklist.length} items` : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className={`${currentTheme.classes.textMuted} shrink-0`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remote Executables Section */}
        {filteredExecutables.length > 0 && (
          <div className="space-y-1.5">
            <h4 className={`text-[10px] font-semibold uppercase tracking-widest text-[#10B981] px-1`}>Remote Device Executables</h4>
            <div className="space-y-1.5">
              {filteredExecutables.map((exec) => (
                <div
                  key={exec.id}
                  onClick={() => handleExecRemote(exec)}
                  className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer transition shadow-xs`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: exec.iconColor }}
                    >
                      <DynamicIcon name={exec.iconName} size={16} />
                    </div>
                    <div className="truncate">
                      <h5 className={`text-xs font-medium ${currentTheme.classes.textPrimary} truncate`}>{exec.name}</h5>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>Target: {exec.deviceName} • {exec.execType.toUpperCase()}</p>
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <Play size={10} /> Exec
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cluster Devices Section */}
        {query && filteredDevices.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#007AFF] px-1">Connected Nodes</h4>
            <div className="space-y-1.5">
              {filteredDevices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => handleSelectDev(dev.id)}
                  className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer transition shadow-xs`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center shrink-0">
                      <Server size={16} />
                    </div>
                    <div>
                      <h5 className={`text-xs font-medium ${currentTheme.classes.textPrimary}`}>{dev.name}</h5>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} font-mono`}>{dev.ipAddress} • {dev.os}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] ${currentTheme.classes.textSecondary} font-mono`}>{dev.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clipboard Snippets Section */}
        {query && filteredClipboard.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#FF9500] px-1">Clipboard Matches</h4>
            <div className="space-y-1.5">
              {filteredClipboard.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    navigator.clipboard.writeText(item.text);
                    audio.playTap();
                    setSearchOpen(false);
                  }}
                  className={`p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} cursor-pointer transition flex items-center justify-between shadow-xs`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clipboard size={14} className="text-[#FF9500] shrink-0" />
                    <span className={`text-xs ${currentTheme.classes.textPrimary} font-mono truncate`}>{item.text}</span>
                  </div>
                  <span className={`text-[10px] ${currentTheme.classes.textSecondary} shrink-0 ml-2 font-mono`}>{item.deviceName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Web / Raw Command Search Option */}
        {query && (
          <div
            onClick={() => handleLaunch('terminal')}
            className={`p-3 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between cursor-pointer text-xs ${currentTheme.classes.textSecondary} hover:opacity-100 transition`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Terminal size={16} style={{ color: currentAccent.hex }} className="shrink-0" />
              <span className={`truncate font-mono ${currentTheme.classes.textPrimary}`}>Run in remote shell: "{query}"</span>
            </div>
            <ArrowRight size={14} className="shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
};
