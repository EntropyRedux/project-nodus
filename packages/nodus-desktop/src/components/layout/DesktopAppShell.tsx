import React from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { FleetPanel } from '../panels/FleetPanel';
import { ConfigPanel } from '../panels/ConfigPanel';
import { ClipboardPanel } from '../panels/ClipboardPanel';
import { ShortcutsPanel } from '../panels/ShortcutsPanel';
import { HotCornerConfigPanel } from '../panels/HotCornerConfigPanel';
import { ProcessManagerPanel } from '../panels/ProcessManagerPanel';
import { 
  Radio, 
  Settings, 
  Clipboard, 
  Zap, 
  Crosshair, 
  Activity, 
  Lock, 
  Layers, 
  Monitor, 
  Tablet,
  CheckCircle2
} from 'lucide-react';
import { ActiveTab } from '../../types/desktop';

export const DesktopAppShell: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    devices, 
    clipboardItems, 
    remoteExecutables, 
    processes, 
    lockWorkstation, 
    serverConfig 
  } = useDesktop();

  const NAV_ITEMS: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: number | string;
    accentColor: string;
  }> = [
    { id: 'fleet', label: 'Fleet Mesh', icon: Radio, badge: devices.length, accentColor: '#34C759' },
    { id: 'config', label: 'Bridge Config', icon: Settings, accentColor: '#34C759' },
    { id: 'clipboard', label: 'Clipboard Hub', icon: Clipboard, badge: clipboardItems.length || undefined, accentColor: '#007AFF' },
    { id: 'shortcuts', label: 'Remote Shortcuts', icon: Zap, badge: remoteExecutables.length || undefined, accentColor: '#BF5AF2' },
    { id: 'hotcorners', label: 'Hot-Corners', icon: Crosshair, accentColor: '#FF9500' },
    { id: 'processes', label: 'Process Manager', icon: Activity, badge: processes.length || undefined, accentColor: '#FF3B30' },
  ];

  return (
    <div className="w-screen h-screen bg-[#0A0A0E] text-[#F0F0F2] flex overflow-hidden select-none font-sans">
      {/* ─── Left Sidebar Navigation ──────────────────────────────── */}
      <aside className="w-64 bg-[#101016] border-r border-white/10 flex flex-col justify-between p-4 shrink-0 shadow-2xl z-20">
        {/* Brand Header */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#007AFF] via-[#34C759] to-[#BF5AF2] p-[1.5px] flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#0A0A0E] rounded-[14px] flex items-center justify-center">
                <Layers size={18} className="text-[#34C759]" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wide">Nodus Companion</h1>
              <p className="text-[10.5px] text-[#8E8E93] font-mono">Workstation Studio</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between transition-all group ${
                    isActive
                      ? 'bg-white/10 text-white shadow-md'
                      : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'shadow-md text-white'
                          : 'text-[#8E8E93] group-hover:text-white'
                      }`}
                      style={{
                        backgroundColor: isActive ? item.accentColor : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-[#8E8E93] group-hover:text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Daemon Status & Lock PC */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
          {/* Bridge Status Card */}
          <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Bridge Daemon
              </span>
              <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_8px_#34C759]" />
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-white">Port {serverConfig.port}</span>
              <span className="text-[#34C759]">Online</span>
            </div>
          </div>

          <button
            onClick={lockWorkstation}
            className="w-full py-2.5 rounded-2xl bg-[#FF9500]/15 hover:bg-[#FF9500]/25 text-[#FF9500] text-xs font-bold flex items-center justify-center gap-2 border border-[#FF9500]/30 shadow-md transition active:scale-98"
          >
            <Lock size={13} />
            <span>Lock Workstation</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Canvas ──────────────────────────────────── */}
      <main className="flex-1 h-full bg-[#0A0A0E] flex flex-col p-6 overflow-hidden">
        {activeTab === 'fleet' && <FleetPanel />}
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'clipboard' && <ClipboardPanel />}
        {activeTab === 'shortcuts' && <ShortcutsPanel />}
        {activeTab === 'hotcorners' && <HotCornerConfigPanel />}
        {activeTab === 'processes' && <ProcessManagerPanel />}
      </main>
    </div>
  );
};
