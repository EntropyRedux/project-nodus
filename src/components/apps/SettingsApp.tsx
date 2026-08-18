import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Smartphone, 
  Palette, 
  Grid, 
  Image, 
  Volume2, 
  Bell, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Sliders, 
  PanelLeft, 
  Clipboard, 
  Layers, 
  Server, 
  ShieldCheck, 
  Terminal, 
  Monitor, 
  Plus, 
  Trash2, 
  Play, 
  Power, 
  Wifi, 
  Laptop, 
  Lock, 
  ExternalLink, 
  RefreshCw, 
  Code, 
  Gamepad2, 
  Music, 
  Camera, 
  Eye, 
  ShieldAlert, 
  Key, 
  Radio,
  FileCode,
  HardDrive,
  Cpu
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { WALLPAPER_PRESETS } from '../../utils/constants';
import { IconStyle, WallpaperId, RemoteExecutable, DeviceOS, NodeRole } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { DynamicIcon } from '../common/DynamicIcon';
import { QrCode } from '../common/QrCode';

type SettingsTab = 'appearance' | 'server' | 'executables' | 'bridges' | 'clipboard' | 'security' | 'system';

export const SettingsApp: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    updateNetworkServerConfig,
    updateWindowsBridgeConfig,
    updateAndroidBridgeConfig,
    updateClipboardSyncConfig,
    devices,
    remoteExecutables,
    addRemoteExecutable,
    updateRemoteExecutable,
    deleteRemoteExecutable,
    toggleRemoteExecutable,
    executeRemoteApp,
    trustedDevices,
    toggleTrustDevice,
    removeTrustedDevice,
    updateDevicePermissions,
    clearFleetClipboard,
    launchApp
  } = useLauncher();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [customUrl, setCustomUrl] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [execStatusMessage, setExecStatusMessage] = useState<string | null>(null);
  const [filterDevice, setFilterDevice] = useState<string>('all');

  // HMAC Pairing State
  const [sharedKey, setSharedKey] = useState('c0a3c99f8d7b6e5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a');
  const [copiedKey, setCopiedKey] = useState(false);

  // Add Executable Modal / Form State
  const [showAddExecModal, setShowAddExecModal] = useState(false);
  const [newExecName, setNewExecName] = useState('');
  const [newExecDesc, setNewExecDesc] = useState('');
  const [newExecDeviceId, setNewExecDeviceId] = useState(devices[1]?.id || 'main-pc');
  const [newExecType, setNewExecType] = useState<RemoteExecutable['execType']>('command');
  const [newExecCommand, setNewExecCommand] = useState('');
  const [newExecCategory, setNewExecCategory] = useState<RemoteExecutable['category']>('tools');
  const [newExecIcon, setNewExecIcon] = useState('Terminal');
  const [newExecColor, setNewExecColor] = useState('#007ACC');
  const [newExecRunAsAdmin, setNewExecRunAsAdmin] = useState(false);

  const iconStyles: { id: IconStyle; name: string; desc: string }[] = [
    { id: 'material-you', name: 'Clean Minimal', desc: 'Sleek dark tiles with crisp glyphs' },
    { id: 'monochrome', name: 'Monochrome', desc: 'Pure black & white minimal' },
    { id: 'outline', name: 'Minimal Outline', desc: 'Sleek thin wireframe glyphs' },
    { id: 'minimal-text', name: 'Pure Typography', desc: 'Text-only aesthetic' },
    { id: 'squircle-color', name: 'Vibrant Squircles', desc: 'Classic squircle colors' },
    { id: 'neon', name: 'Cyber Neon', desc: 'Glow accents for dark AMOLED' },
  ];

  const handleTestRun = async (exec: RemoteExecutable) => {
    audio.playTap();
    setExecStatusMessage(`Dispatching "${exec.name}" to ${exec.deviceName}...`);
    const res = await executeRemoteApp(exec);
    setExecStatusMessage(res.message);
    setTimeout(() => setExecStatusMessage(null), 4000);
  };

  const handleCreateExecutable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExecName.trim() || !newExecCommand.trim()) return;

    const targetDev = devices.find((d) => d.id === newExecDeviceId) || devices[0];
    const devOs: DeviceOS = targetDev.os.toLowerCase().includes('windows') ? 'windows' : 'android';

    addRemoteExecutable({
      deviceId: targetDev.id,
      deviceName: targetDev.name,
      deviceType: targetDev.type,
      deviceOs: devOs,
      name: newExecName.trim(),
      description: newExecDesc.trim() || undefined,
      category: newExecCategory,
      iconName: newExecIcon,
      iconColor: newExecColor,
      execType: newExecType,
      commandOrPackage: newExecCommand.trim(),
      runAsAdmin: newExecRunAsAdmin,
      enabled: true,
      pinnedToDrawer: true,
    });

    // Reset form
    setNewExecName('');
    setNewExecDesc('');
    setNewExecCommand('');
    setShowAddExecModal(false);
  };

  const handleResetDefaults = () => {
    audio.playTap();
    localStorage.removeItem('nova_launcher_apps');
    localStorage.removeItem('nova_launcher_v4_apps');
    localStorage.removeItem('nova_launcher_folders');
    localStorage.removeItem('nova_launcher_settings');
    updateSettings({
      deviceFrame: false,
      themeMode: 'dark',
      accentColor: '#34C759',
      iconStyle: 'material-you',
      showLabels: true,
      gridColumns: 5,
      wallpaper: 'alpine-horizon',
      soundEffects: true,
      hapticFeedback: true,
      notificationBadges: true,
      atAGlanceWidget: true,
      clockWidgetStyle: 'digital-bold',
      minimalistMode: false,
      leftPanelOpacity: 85,
      taskbarOpacity: 92,
      clipboardPanelOpacity: 85,
      showRemoteAppsInMainDrawer: true,
      showOnlyLocalInDrawer: false,
    });
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  const filteredExecutables = remoteExecutables.filter((exec) => {
    if (filterDevice === 'all') return true;
    return exec.deviceId === filterDevice;
  });

  return (
    <div className="h-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3.5 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 flex items-center justify-center text-[#34C759] border border-[#34C759]/30">
            <SettingsIcon size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F0F0F2]">Launcher & Controller Settings</h2>
            <p className="text-[10px] text-[#8E8E93]">Fleet Network Node • {settings.networkServer?.role?.toUpperCase() || 'HOST'}</p>
          </div>
        </div>

        {/* Server Status Pill */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34C759]/10 border border-[#34C759]/20 text-[11px] font-mono text-[#34C759]">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            Port {settings.networkServer?.serverPort || 8890}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-[#161618] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0 px-2 pt-1 gap-1">
        {[
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'server', label: 'Server & Network', icon: Server },
          { id: 'executables', label: 'Remote Apps', icon: Terminal },
          { id: 'bridges', label: 'OS Bridges', icon: Monitor },
          { id: 'clipboard', label: 'Clipboard Sync', icon: Clipboard },
          { id: 'security', label: 'Pairing & Fleet', icon: ShieldCheck },
          { id: 'system', label: 'System', icon: Power },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              audio.playTap();
              setActiveTab(id as SettingsTab);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-xl transition whitespace-nowrap border-b-2 ${
              activeTab === id
                ? 'border-[#34C759] text-[#34C759] bg-[#1C1C1E] font-semibold'
                : 'border-transparent text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-[#1C1C1E]/40'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Toast Banner */}
        {execStatusMessage && (
          <div className="p-3 bg-[#34C759]/15 border border-[#34C759]/40 rounded-xl text-xs text-[#34C759] font-mono flex items-center gap-2 animate-fade-in">
            <Check size={16} />
            <span>{execStatusMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: APPEARANCE & DISPLAY */}
        {/* ========================================================================= */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Viewport & Device Frame */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <Smartphone size={14} /> Display Presentation
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ deviceFrame: false });
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    !settings.deviceFrame
                      ? 'bg-[#1C1C1E] border-[#34C759] text-white shadow-lg'
                      : 'bg-[#1C1C1E]/60 border-white/5 text-[#8E8E93] hover:bg-[#1C1C1E]'
                  }`}
                >
                  <Monitor size={18} className={!settings.deviceFrame ? 'text-[#34C759]' : 'text-[#8E8E93]'} />
                  <h4 className="text-xs font-semibold mt-2">Full Desktop Viewport</h4>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">Edge-to-edge controller canvas</p>
                </button>

                <button
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ deviceFrame: true });
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    settings.deviceFrame
                      ? 'bg-[#1C1C1E] border-[#34C759] text-white shadow-lg'
                      : 'bg-[#1C1C1E]/60 border-white/5 text-[#8E8E93] hover:bg-[#1C1C1E]'
                  }`}
                >
                  <Smartphone size={18} className={settings.deviceFrame ? 'text-[#34C759]' : 'text-[#8E8E93]'} />
                  <h4 className="text-xs font-semibold mt-2">Phone Bezel Frame</h4>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">Pixel 9 Pro simulation</p>
                </button>
              </div>
            </div>

            {/* Panel & Interface Glass Opacity Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                  <Sliders size={14} /> Panel Glass & Opacity
                </h3>
                <span className="text-[10px] text-[#34C759] font-mono">Real-time</span>
              </div>

              <div className="bg-[#1C1C1E] rounded-2xl p-3.5 border border-white/5 space-y-4">
                {/* 1. Left Device Sidebar Panel */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <PanelLeft size={14} className="text-[#007AFF]" />
                      <span className="font-medium text-[#F0F0F2]">Left Device Panel</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#007AFF] bg-[#007AFF]/15 px-2 py-0.5 rounded-md font-bold">
                      {settings.leftPanelOpacity ?? 85}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={settings.leftPanelOpacity ?? 85}
                    onChange={(e) => updateSettings({ leftPanelOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
                  />
                </div>

                {/* 2. Taskbar Opacity */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-[#34C759]" />
                      <span className="font-medium text-[#F0F0F2]">Taskbar & App Drawer</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-md font-bold">
                      {settings.taskbarOpacity ?? 92}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={settings.taskbarOpacity ?? 92}
                    onChange={(e) => updateSettings({ taskbarOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#34C759]"
                  />
                </div>

                {/* 3. Clipboard Panel Opacity */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clipboard size={14} className="text-[#FF9500]" />
                      <span className="font-medium text-[#F0F0F2]">Clipboard History Panel</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#FF9500] bg-[#FF9500]/15 px-2 py-0.5 rounded-md font-bold">
                      {settings.clipboardPanelOpacity ?? 85}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={settings.clipboardPanelOpacity ?? 85}
                    onChange={(e) => updateSettings({ clipboardPanelOpacity: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#FF9500]"
                  />
                </div>
              </div>
            </div>

            {/* Icon Styles */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <Palette size={14} /> Icon Pack Theme
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {iconStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ iconStyle: style.id });
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                      settings.iconStyle === style.id
                        ? 'bg-[#1C1C1E] border-[#34C759] text-white shadow-md'
                        : 'bg-[#1C1C1E]/50 border-white/5 text-[#8E8E93] hover:bg-[#1C1C1E]'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-medium text-white">{style.name}</h4>
                      <p className="text-[10px] text-[#8E8E93] mt-0.5">{style.desc}</p>
                    </div>
                    {settings.iconStyle === style.id && <Check size={16} className="text-[#34C759] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper Selection */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <Image size={14} /> Wallpaper Backdrop
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                {WALLPAPER_PRESETS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ wallpaper: wp.id as WallpaperId });
                    }}
                    className={`h-24 rounded-2xl border relative overflow-hidden transition ${
                      settings.wallpaper === wp.id
                        ? 'border-[#34C759] ring-2 ring-[#34C759]/40'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                    style={wp.style}
                  >
                    <div className="absolute inset-0 bg-black/30 flex items-end p-2">
                      <span className="text-[11px] font-semibold text-white truncate drop-shadow-md">
                        {wp.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SERVER & NETWORK HUB */}
        {/* ========================================================================= */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            {/* Node Role Selector */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <Server size={14} /> Node Operating Role
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'host' as NodeRole, label: 'Host Server', desc: 'Central hub broker on this device', color: '#34C759' },
                  { role: 'client' as NodeRole, label: 'Client Controller', desc: 'Connects to remote server on LAN', color: '#007AFF' },
                  { role: 'standalone' as NodeRole, label: 'Standalone', desc: 'Offline / local isolated', color: '#8E8E93' },
                ].map((item) => {
                  const isSelected = (settings.networkServer?.role || 'host') === item.role;
                  return (
                    <button
                      key={item.role}
                      onClick={() => {
                        audio.playTap();
                        updateNetworkServerConfig({ role: item.role });
                      }}
                      className={`p-3 rounded-2xl border text-left transition ${
                        isSelected
                          ? 'bg-[#1C1C1E] border-[#34C759] text-white shadow-lg'
                          : 'bg-[#1C1C1E]/50 border-white/5 text-[#8E8E93] hover:bg-[#1C1C1E]'
                      }`}
                    >
                      <span className="text-xs font-bold block" style={{ color: isSelected ? item.color : undefined }}>
                        {item.label}
                      </span>
                      <p className="text-[10px] text-[#8E8E93] mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Server Configuration Fields */}
            <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Radio size={16} className="text-[#34C759]" /> Network Server Parameters
                </span>
                <span className="text-[10px] bg-[#34C759]/15 text-[#34C759] font-mono px-2 py-0.5 rounded-full font-bold">
                  Status: RUNNING
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Local Host IP / Address</label>
                  <input
                    type="text"
                    value={settings.networkServer?.serverHost || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')}
                    onChange={(e) => updateNetworkServerConfig({ serverHost: e.target.value })}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34C759]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">WebSocket Port</label>
                  <input
                    type="number"
                    value={settings.networkServer?.serverPort || 8890}
                    onChange={(e) => updateNetworkServerConfig({ serverPort: Number(e.target.value) })}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34C759]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Pairing PIN / Shared Secret</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.networkServer?.pairingSecret || 'nodus-sec-key'}
                      onChange={(e) => updateNetworkServerConfig({ pairingSecret: e.target.value })}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#34C759] font-bold focus:outline-none focus:border-[#34C759]"
                    />
                    <button
                      onClick={() => {
                        audio.playTap();
                        const rand = `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
                        updateNetworkServerConfig({ pairingSecret: rand });
                      }}
                      className="p-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#8E8E93] hover:text-white rounded-xl text-xs"
                      title="Regenerate PIN"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Heartbeat Ping Interval</label>
                  <div className="flex items-center justify-between text-xs text-[#8E8E93] mb-1 font-mono">
                    <span>{(settings.networkServer?.heartbeatIntervalMs || 5000) / 1000}s</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="1000"
                    value={settings.networkServer?.heartbeatIntervalMs || 5000}
                    onChange={(e) => updateNetworkServerConfig({ heartbeatIntervalMs: Number(e.target.value) })}
                    className="w-full h-1.5 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#34C759]"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Auto-Discover via mDNS & SSDP</span>
                    <span className="text-[10px] text-[#8E8E93]">Broadcast launcher existence on local subnet</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.networkServer?.autoDiscover ?? true}
                    onChange={(e) => updateNetworkServerConfig({ autoDiscover: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">WSS / TLS Message Encryption</span>
                    <span className="text-[10px] text-[#8E8E93]">Encrypt all commands and clipboard frames</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.networkServer?.encryptionEnabled ?? true}
                    onChange={(e) => updateNetworkServerConfig({ encryptionEnabled: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Auto-start Server on Boot</span>
                    <span className="text-[10px] text-[#8E8E93]">Launch server daemon when device powers on</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.networkServer?.autoStartOnBoot ?? true}
                    onChange={(e) => updateNetworkServerConfig({ autoStartOnBoot: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REMOTE EXECUTABLES ALLOWLIST */}
        {/* ========================================================================= */}
        {activeTab === 'executables' && (
          <div className="space-y-4">
            {/* Explanatory Banner */}
            <div className="p-3.5 bg-[#007AFF]/10 border border-[#007AFF]/25 rounded-2xl flex items-start gap-3">
              <Terminal size={20} className="text-[#007AFF] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-semibold text-white block">Multi-Device App Drawer Rules</span>
                <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                  The device running this launcher displays <span className="text-white font-medium">all local installed apps</span>. 
                  For other connected devices (Windows PC & remote Android nodes), <span className="text-[#34C759] font-medium">only items configured below</span> are exposed and executable via this controller.
                </p>
              </div>
            </div>

            {/* Filter and Add Button Header */}
            <div className="flex items-center justify-between gap-2">
              {/* Target Device Filter */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilterDevice('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filterDevice === 'all'
                      ? 'bg-[#34C759] text-black font-bold'
                      : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white'
                  }`}
                >
                  All ({remoteExecutables.length})
                </button>
                {devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setFilterDevice(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                      filterDevice === d.id
                        ? 'bg-[#34C759] text-black font-bold'
                        : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    <span>{d.name}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  audio.playTap();
                  setShowAddExecModal(true);
                }}
                className="px-3.5 py-1.5 bg-[#34C759] hover:bg-[#30B752] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#34C759]/20 transition shrink-0"
              >
                <Plus size={16} /> Add Executable
              </button>
            </div>

            {/* Global Remote Apps in Drawer Switch */}
            <div className="p-3 bg-[#1C1C1E] rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Merge Remote Executables into App Drawer</span>
                <span className="text-[10px] text-[#8E8E93]">Shows permitted remote apps alongside local apps with device badges</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showRemoteAppsInMainDrawer ?? true}
                onChange={(e) => updateSettings({ showRemoteAppsInMainDrawer: e.target.checked })}
                className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
              />
            </div>

            {/* List of Configured Remote Executables */}
            <div className="space-y-2.5">
              {filteredExecutables.length === 0 ? (
                <div className="p-8 text-center bg-[#1C1C1E]/40 border border-white/5 rounded-2xl">
                  <Terminal size={32} className="mx-auto text-[#8E8E93] mb-2 opacity-50" />
                  <p className="text-xs text-[#8E8E93]">No remote executables configured for this device filter.</p>
                  <button
                    onClick={() => setShowAddExecModal(true)}
                    className="mt-3 px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-xs font-semibold text-white rounded-xl"
                  >
                    Create Shortcut
                  </button>
                </div>
              ) : (
                filteredExecutables.map((exec) => (
                  <div
                    key={exec.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      exec.enabled
                        ? 'bg-[#1C1C1E] border-white/10 hover:border-[#34C759]/40'
                        : 'bg-[#1C1C1E]/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                        style={{ backgroundColor: exec.iconColor }}
                      >
                        <DynamicIcon name={exec.iconName} size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{exec.name}</h4>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-[#8E8E93] font-mono">
                            {exec.execType.replace('_', ' ')}
                          </span>
                          {exec.runAsAdmin && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FF9500]/20 text-[#FF9500] font-bold">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8E8E93] font-mono truncate mt-0.5">
                          {exec.deviceName} • {exec.commandOrPackage}
                        </p>
                        {exec.lastExecuted && (
                          <span className="text-[9px] text-[#34C759] font-mono">Last run: {exec.lastExecuted}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Test Run Button */}
                      <button
                        onClick={() => handleTestRun(exec)}
                        className="px-2.5 py-1.5 bg-[#34C759]/15 hover:bg-[#34C759]/25 text-[#34C759] border border-[#34C759]/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                        title="Execute on remote device"
                      >
                        <Play size={12} /> Test Run
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => toggleRemoteExecutable(exec.id)}
                        className={`w-9 h-5 rounded-full transition p-0.5 flex items-center ${
                          exec.enabled ? 'bg-[#34C759] justify-end' : 'bg-[#2C2C2E] justify-start'
                        }`}
                        title={exec.enabled ? 'Disable' : 'Enable'}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteRemoteExecutable(exec.id)}
                        className="p-1.5 text-[#8E8E93] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ADD EXECUTABLE MODAL */}
            {showAddExecModal && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateExecutable}
                  className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-up"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal size={16} className="text-[#34C759]" /> Configure Remote Executable
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddExecModal(false)}
                      className="p-1 text-[#8E8E93] hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Target Device */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Target Remote Device</label>
                    <select
                      value={newExecDeviceId}
                      onChange={(e) => setNewExecDeviceId(e.target.value)}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34C759]"
                    >
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.os})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name & Execution Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Shortcut Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Visual Studio Code"
                        value={newExecName}
                        onChange={(e) => setNewExecName(e.target.value)}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34C759]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Execution Type</label>
                      <select
                        value={newExecType}
                        onChange={(e) => setNewExecType(e.target.value as any)}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34C759]"
                      >
                        <option value="command">CLI / PowerShell Command</option>
                        <option value="native_app">Native App Package</option>
                        <option value="url_protocol">URL / App Protocol (steam://)</option>
                        <option value="intent">Android Intent Action</option>
                        <option value="script">Batch / Shell Script</option>
                      </select>
                    </div>
                  </div>

                  {/* Command or Package String */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">
                      {newExecType === 'native_app'
                        ? 'Package Name (e.g. com.spotify.music)'
                        : newExecType === 'url_protocol'
                        ? 'Protocol URI (e.g. steam://open/games)'
                        : newExecType === 'intent'
                        ? 'Intent Action (e.g. android.media.action.STILL_IMAGE_CAMERA)'
                        : 'Command Line / Path (e.g. code . or wt.exe)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Enter command or identifier..."
                      value={newExecCommand}
                      onChange={(e) => setNewExecCommand(e.target.value)}
                      className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34C759]"
                      required
                    />
                  </div>

                  {/* Icon & Color */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Icon</label>
                      <select
                        value={newExecIcon}
                        onChange={(e) => setNewExecIcon(e.target.value)}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Terminal">Terminal</option>
                        <option value="Code">Code</option>
                        <option value="Gamepad2">Gamepad</option>
                        <option value="Music">Music</option>
                        <option value="Camera">Camera</option>
                        <option value="Lock">Lock</option>
                        <option value="Wifi">Wifi</option>
                        <option value="PlaySquare">Play</option>
                        <option value="FileCode">Script</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Category</label>
                      <select
                        value={newExecCategory}
                        onChange={(e) => setNewExecCategory(e.target.value as any)}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="tools">Tools</option>
                        <option value="productivity">Productivity</option>
                        <option value="games">Games</option>
                        <option value="media">Media</option>
                        <option value="system">System</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Color</label>
                      <input
                        type="color"
                        value={newExecColor}
                        onChange={(e) => setNewExecColor(e.target.value)}
                        className="w-full h-8 bg-transparent cursor-pointer rounded-lg border-0"
                      />
                    </div>
                  </div>

                  {/* Run with Admin */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#8E8E93]">Require Admin / Elevated Execution</span>
                    <input
                      type="checkbox"
                      checked={newExecRunAsAdmin}
                      onChange={(e) => setNewExecRunAsAdmin(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowAddExecModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#2C2C2E] text-xs font-semibold text-[#8E8E93] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#34C759] hover:bg-[#30B752] text-xs font-bold text-black"
                    >
                      Save Shortcut
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WINDOWS PC & ANDROID BRIDGES */}
        {/* ========================================================================= */}
        {activeTab === 'bridges' && (
          <div className="space-y-6">
            {/* Quick Link to Dual-Platform Architecture Studio */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#007AFF]/15 via-[#5856D6]/15 to-[#34C759]/15 border border-[#007AFF]/30 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-md">
                  <Code size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Phase 2 Dual-Platform Architecture & Code Studio
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#007AFF]/20 text-[#007AFF] font-mono font-bold">ACTIVE</span>
                  </h4>
                  <p className="text-[11px] text-[#8E8E93]">
                    Export Kotlin Accessibility daemons, C# .NET Windows service, PowerShell 7 agent, and test live RPC packets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  audio.playTap();
                  launchApp('studio');
                }}
                className="px-3.5 py-2 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition shrink-0"
              >
                Open Studio <ExternalLink size={13} />
              </button>
            </div>

            {/* Windows PC Bridge Section */}
            <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#007AFF]/15 flex items-center justify-center text-[#007AFF]">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Windows PC Bridge Agent</h4>
                    <p className="text-[10px] text-[#8E8E93]">Desktop tray background service • Port {settings.windowsBridge?.bridgePort || 9120}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#007AFF]/15 text-[#007AFF] font-mono px-2 py-0.5 rounded-full font-bold">
                  CONNECTED
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Allow Remote Power Actions</span>
                    <span className="text-[10px] text-[#8E8E93]">Remote Sleep, Lock Screen, Restart, Shutdown</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.windowsBridge?.allowRemotePower ?? true}
                    onChange={(e) => updateWindowsBridgeConfig({ allowRemotePower: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#007AFF] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Process Termination Access</span>
                    <span className="text-[10px] text-[#8E8E93]">Allow killing Windows tasks from Task Manager</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.windowsBridge?.allowProcessTermination ?? true}
                    onChange={(e) => updateWindowsBridgeConfig({ allowProcessTermination: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#007AFF] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Elevated Administrator Execution</span>
                    <span className="text-[10px] text-[#8E8E93]">Run PowerShell commands with administrator rights</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.windowsBridge?.allowElevatedCommands ?? false}
                    onChange={(e) => updateWindowsBridgeConfig({ allowElevatedCommands: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#007AFF] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Sync Volume & Media Hotkeys</span>
                    <span className="text-[10px] text-[#8E8E93]">Control Windows master volume and media playback</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.windowsBridge?.syncVolumeAndMedia ?? true}
                    onChange={(e) => updateWindowsBridgeConfig({ syncVolumeAndMedia: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#007AFF] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-[10px] text-[#8E8E93] uppercase font-semibold block mb-1">
                  Whitelisted Executable Directories
                </label>
                <input
                  type="text"
                  value={settings.windowsBridge?.allowedExecutablesPath || 'C:\\Program Files;C:\\Tools;C:\\Windows\\System32'}
                  onChange={(e) => updateWindowsBridgeConfig({ allowedExecutablesPath: e.target.value })}
                  className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Android Companion Bridge Section */}
            <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#34C759]/15 flex items-center justify-center text-[#34C759]">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Android Companion Service</h4>
                    <p className="text-[10px] text-[#8E8E93]">Daemon & Accessibility service on target devices</p>
                  </div>
                </div>
                <span className="text-[10px] bg-[#34C759]/15 text-[#34C759] font-mono px-2 py-0.5 rounded-full font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Remote Intent Broadcasts</span>
                    <span className="text-[10px] text-[#8E8E93]">Allow triggering Android Activity and Service intents</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.androidBridge?.allowIntentBroadcasts ?? true}
                    onChange={(e) => updateAndroidBridgeConfig({ allowIntentBroadcasts: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Hardware Actions & Sensors</span>
                    <span className="text-[10px] text-[#8E8E93]">Remote Flashlight, Camera trigger, WiFi Hotspot</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.androidBridge?.allowDeviceActions ?? true}
                    onChange={(e) => updateAndroidBridgeConfig({ allowDeviceActions: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Forward Notifications to Host</span>
                    <span className="text-[10px] text-[#8E8E93]">Sync incoming Android notifications in launcher shade</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.androidBridge?.notificationSync ?? true}
                    onChange={(e) => updateAndroidBridgeConfig({ notificationSync: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CROSS-DEVICE CLIPBOARD SYNC */}
        {/* ========================================================================= */}
        {activeTab === 'clipboard' && (
          <div className="space-y-6">
            {/* Master Toggle & Sync Mode */}
            <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Clipboard size={16} className="text-[#FF9500]" /> Server-Backed Clipboard Synchronization
                  </h4>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">Real-time sync across Android devices & Windows PCs</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.clipboardSync?.enabled ?? true}
                  onChange={(e) => updateClipboardSyncConfig({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#121214] accent-[#FF9500] cursor-pointer"
                />
              </div>

              {/* Sync Mode Selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Synchronization Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'bidirectional', label: '2-Way Auto Sync', desc: 'Full bidirectional real-time sync' },
                    { mode: 'send_only', label: 'Broadcast Only', desc: 'Send this clipboard to others only' },
                    { mode: 'receive_only', label: 'Receive Only', desc: 'Receive remote copies without broadcasting' },
                    { mode: 'manual', label: 'Manual Push', desc: 'Sync only via tray button' },
                  ].map((item) => {
                    const isSelected = (settings.clipboardSync?.syncMode || 'bidirectional') === item.mode;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => {
                          audio.playTap();
                          updateClipboardSyncConfig({ syncMode: item.mode as any });
                        }}
                        className={`p-3 rounded-2xl border text-left transition ${
                          isSelected
                            ? 'bg-[#2C2C2E] border-[#FF9500] text-white shadow-md'
                            : 'bg-[#121214] border-white/5 text-[#8E8E93] hover:bg-[#252528]'
                        }`}
                      >
                        <span className="text-xs font-bold block" style={{ color: isSelected ? '#FF9500' : undefined }}>
                          {item.label}
                        </span>
                        <p className="text-[10px] text-[#8E8E93] mt-0.5">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Privacy & Filtering Rules */}
            <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-3">
              <h4 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert size={14} className="text-[#FF9500]" /> Privacy & Security Guard
              </h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Filter Passwords & Concealed Text</span>
                    <span className="text-[10px] text-[#8E8E93]">Ignore clipboards copied from password managers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.clipboardSync?.filterPasswords ?? true}
                    onChange={(e) => updateClipboardSyncConfig({ filterPasswords: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#FF9500] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Sync Image Data Payloads</span>
                    <span className="text-[10px] text-[#8E8E93]">Allow screenshot and graphic buffers sync (Max 2MB)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.clipboardSync?.syncImages ?? true}
                    onChange={(e) => updateClipboardSyncConfig({ syncImages: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#FF9500] cursor-pointer"
                  />
                </div>
              </div>

              {/* History Capacity */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Max History Items</label>
                  <select
                    value={settings.clipboardSync?.historyLimit || 50}
                    onChange={(e) => updateClipboardSyncConfig({ historyLimit: Number(e.target.value) })}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={10}>10 items</option>
                    <option value={25}>25 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Retention Period</label>
                  <select
                    value={settings.clipboardSync?.retentionHours || 24}
                    onChange={(e) => updateClipboardSyncConfig({ retentionHours: Number(e.target.value) })}
                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={24}>24 Hours</option>
                    <option value={168}>7 Days</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Fleet Purge Button */}
              <div className="pt-2">
                <button
                  onClick={clearFleetClipboard}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Trash2 size={14} /> Clear Clipboard Across All Fleet Nodes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: PAIRING & FLEET SECURITY */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Phase 2.1: Automated QR Code Pairing Generator */}
            <div className="p-4 bg-[#1C1C1E] border border-white/10 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#34C759]/15 text-[#34C759] flex items-center justify-center border border-[#34C759]/30">
                    <Key size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">HMAC-SHA256 Shared Key & QR Pairing</h3>
                    <p className="text-[10px] text-[#8E8E93]">Scan with Nodus Home Android app or pair cluster nodes over Tailnet</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/30 font-bold">
                  AES / WebCrypto
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-5">
                {/* QR Code Graphic */}
                <div className="shrink-0">
                  <QrCode
                    value={`nodus://pair?host=${settings.networkServer?.serverHost || 'nodus-desktop'}&port=${settings.networkServer?.serverPort || 8890}&key=${sharedKey}`}
                    size={160}
                    fgColor="#34C759"
                    bgColor="#121214"
                  />
                </div>

                {/* Key Details & Copy Action */}
                <div className="flex-1 space-y-3 min-w-0 w-full">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#8E8E93] uppercase font-semibold">Active Node Shared Secret (Hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={sharedKey}
                        className="w-full bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#34C759] font-bold select-all focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          audio.playTap();
                          navigator.clipboard.writeText(sharedKey);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="px-3 py-2 bg-[#34C759] hover:bg-[#30B752] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition"
                      >
                        <Check size={14} />
                        {copiedKey ? 'Copied!' : 'Copy Key'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[#8E8E93]">
                    <span>Saved path: <code className="text-white font-mono">~/.nodus/shared.key</code></span>
                    <button
                      onClick={() => {
                        audio.playTap();
                        const hex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                          .map((b) => b.toString(16).padStart(2, '0'))
                          .join('');
                        setSharedKey(hex);
                      }}
                      className="text-xs text-[#007AFF] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Regenerate Key
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} /> Connected Devices Fleet ({trustedDevices.length})
                </h3>
                <p className="text-[10px] text-[#8E8E93]">Manage device trust and granular execution permissions</p>
              </div>
            </div>

            <div className="space-y-3">
              {trustedDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white">
                        {dev.os === 'windows' ? <Monitor size={16} /> : <Smartphone size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{dev.name}</h4>
                        <span className="text-[10px] text-[#8E8E93] font-mono">{dev.ip} • {dev.lastSeen}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTrustDevice(dev.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                          dev.isTrusted
                            ? 'bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {dev.isTrusted ? 'TRUSTED' : 'UNTRUSTED'}
                      </button>

                      <button
                        onClick={() => removeTrustedDevice(dev.id)}
                        className="p-1.5 text-[#8E8E93] hover:text-red-400 rounded-lg hover:bg-red-500/10"
                        title="Remove Device"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Fingerprint */}
                  <p className="text-[9px] text-[#8E8E93] font-mono bg-[#121214] p-1.5 rounded-lg truncate">
                    Fingerprint: {dev.fingerprint}
                  </p>

                  {/* Granular Permissions */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                    <label className="flex items-center gap-2 text-[#8E8E93] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dev.permissions?.remoteExec ?? true}
                        onChange={(e) => updateDevicePermissions(dev.id, { remoteExec: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-[#121214] accent-[#34C759]"
                      />
                      <span>Remote Exec</span>
                    </label>

                    <label className="flex items-center gap-2 text-[#8E8E93] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dev.permissions?.clipboardSync ?? true}
                        onChange={(e) => updateDevicePermissions(dev.id, { clipboardSync: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-[#121214] accent-[#34C759]"
                      />
                      <span>Clipboard Sync</span>
                    </label>

                    <label className="flex items-center gap-2 text-[#8E8E93] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dev.permissions?.processKill ?? true}
                        onChange={(e) => updateDevicePermissions(dev.id, { processKill: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-[#121214] accent-[#34C759]"
                      />
                      <span>Process Kill</span>
                    </label>

                    <label className="flex items-center gap-2 text-[#8E8E93] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dev.permissions?.powerControl ?? true}
                        onChange={(e) => updateDevicePermissions(dev.id, { powerControl: e.target.checked })}
                        className="w-3.5 h-3.5 rounded bg-[#121214] accent-[#34C759]"
                      />
                      <span>Power Control</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: SYSTEM & DEFAULTS */}
        {/* ========================================================================= */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <Volume2 size={14} /> Sound & Haptics
              </h3>
              <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">System Sound Effects</span>
                    <span className="text-[10px] text-[#8E8E93]">Taps, app launches, and notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEffects}
                    onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-2">
                  <div>
                    <span className="text-xs font-medium text-white block">Notification Badges</span>
                    <span className="text-[10px] text-[#8E8E93]">Show count indicators on app icons</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationBadges}
                    onChange={(e) => updateSettings({ notificationBadges: e.target.checked })}
                    className="w-4 h-4 rounded bg-[#121214] accent-[#34C759] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Reset Defaults */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest flex items-center gap-2">
                <RotateCcw size={14} /> Factory Defaults
              </h3>
              <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 space-y-3">
                <p className="text-xs text-[#8E8E93]">
                  Reset desktop wallpaper, panel glass, and launcher arrangement to clean defaults.
                </p>
                <button
                  onClick={handleResetDefaults}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw size={14} />
                  {resetSuccess ? 'Reset Complete!' : 'Reset Launcher Defaults'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
