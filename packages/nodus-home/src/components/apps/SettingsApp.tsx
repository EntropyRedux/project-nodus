import React, { useState, useEffect } from 'react';
import {
  AppWindow,
  LayoutGrid,
  Image as ImageIcon,
  Palette,
  Sliders,
  Radio,
  RotateCcw,
  Check,
  Upload,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { WALLPAPER_PRESETS } from '../../utils/constants';
import { useFleetDetection } from '../../hooks/useFleetDetection';

export const SettingsApp: React.FC = () => {
  const {
    settings,
    updateSettings,
    closeActiveApp,
    showToast,
  } = useLauncher();

  const { isFleetInstalled, isTouchInstalled } = useFleetDetection();

  const [customWpInput, setCustomWpInput] = useState('');
  const [deviceIconPacks, setDeviceIconPacks] = useState<Array<{ packageName: string; label: string }>>([]);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Query installed icon packs from native bridge
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).NodusNativeBridge?.getInstalledIconPacks) {
        const raw = (window as any).NodusNativeBridge.getInstalledIconPacks();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDeviceIconPacks(parsed);
        }
      }
    } catch (_) {}
  }, []);

  const handleCustomWallpaper = (url: string) => {
    if (!url.trim()) return;
    updateSettings({
      wallpaper: 'custom',
      customWallpaperUrl: url.trim(),
    });
    showToast('Custom wallpaper applied');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSettings({
          wallpaper: 'custom',
          customWallpaperUrl: reader.result,
        });
        showToast('Wallpaper updated');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefaults = () => {
    audio.playTap();
    updateSettings({
      appLaunchMode: 'fullscreen',
      iconSize: 'medium',
      drawerLayout: 'continuous',
      wallpaper: 'alpine',
      customWallpaperUrl: undefined,
      iconShape: 'modern',
      iconPack: 'default',
      taskbarOpacity: 92,
      taskbarIconScale: 'medium',
      enableMultiDevice: false,
      enableAssistiveTouch: false,
    });
    setResetSuccess(true);
    showToast('Settings restored to default');
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0E] text-[#F0F0F2] font-sans select-none">
      {/* Scrollable Settings Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-4 scrollbar-thin">
        
        {/* SECTION 1: Multitasking & Windowing Mode */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <AppWindow size={15} className="text-[#34C759]" />
            <span>Multitasking & Windowing</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8E8E93]">Default App Launch Mode</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  updateSettings({ appLaunchMode: 'fullscreen' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.appLaunchMode === 'fullscreen'
                    ? 'bg-[#34C759]/15 border-[#34C759] text-white shadow-sm'
                    : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:border-white/15 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Maximize2 size={14} className={settings.appLaunchMode === 'fullscreen' ? 'text-[#34C759]' : ''} />
                  {settings.appLaunchMode === 'fullscreen' && <Check size={13} className="text-[#34C759]" />}
                </div>
                <span className="text-xs font-bold">Standard</span>
                <span className="text-[10px] opacity-75">Opens apps in full screen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  updateSettings({ appLaunchMode: 'floating' });
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  settings.appLaunchMode === 'floating'
                    ? 'bg-[#34C759]/15 border-[#34C759] text-white shadow-sm'
                    : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:border-white/15 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Minimize2 size={14} className={settings.appLaunchMode === 'floating' ? 'text-[#34C759]' : ''} />
                  {settings.appLaunchMode === 'floating' && <Check size={13} className="text-[#34C759]" />}
                </div>
                <span className="text-xs font-bold">Floating Window</span>
                <span className="text-[10px] opacity-75">Freeform window on top of home</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Desktop Layout & Grid Density */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <LayoutGrid size={15} className="text-[#007AFF]" />
            <span>Desktop Layout & Grid Density</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Desktop Icon Size */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">Desktop Icon Size</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ iconSize: size });
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition uppercase border ${
                      (settings.iconSize || 'medium') === size
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                        : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {size === 'xlarge' ? 'XL' : size.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* App Display Format */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">App Display Format</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ drawerLayout: 'continuous' });
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    (settings.drawerLayout ?? 'continuous') === 'continuous'
                      ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                      : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Continuous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ drawerLayout: 'paginated' });
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    settings.drawerLayout === 'paginated'
                      ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                      : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <AppWindow size={13} />
                  <span>Paginated</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Wallpaper & Atmosphere */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
              <ImageIcon size={15} className="text-[#FF9500]" />
              <span>Wallpaper & Atmosphere</span>
            </div>

            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F0F0F2] transition border border-white/10 hover:border-white/20">
              <Upload size={12} />
              <span>Custom Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WALLPAPER_PRESETS.map((wp) => {
              const isSelected = settings.wallpaper === wp.id;
              return (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ wallpaper: wp.id });
                  }}
                  className={`group relative h-16 rounded-xl overflow-hidden border transition-all text-left flex flex-col justify-end p-2 ${
                    isSelected ? 'ring-2 ring-[#FF9500] border-transparent shadow-sm' : 'border-white/10 hover:border-white/25'
                  }`}
                  style={wp.style}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <span className="relative z-10 text-[10px] font-bold text-white truncate drop-shadow">
                    {wp.name}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 z-10 w-3.5 h-3.5 rounded-full bg-[#FF9500] text-black flex items-center justify-center shadow">
                      <Check size={9} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Icon Packs & Styling */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <Palette size={15} className="text-[#AF52DE]" />
            <span>Icon Packs & Styling</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Shape Style */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">Icon Card Shape & Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['modern', 'frosted', 'minimal', 'glass'] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ iconShape: shape });
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize transition border ${
                      (settings.iconShape || 'modern') === shape
                        ? 'bg-[#AF52DE] text-white border-[#AF52DE] shadow-sm'
                        : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Pack Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">Installed Icon Pack</label>
              <select
                value={settings.iconPack || 'default'}
                onChange={(e) => {
                  audio.playTap();
                  updateSettings({ iconPack: e.target.value });
                  showToast(e.target.value === 'default' ? 'Default icons active' : 'Icon pack applied');
                }}
                className="w-full bg-[#181824]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#AF52DE] transition"
              >
                <option value="default">Default Dynamic Material Icons</option>
                {deviceIconPacks.map((pack) => (
                  <option key={pack.packageName} value={pack.packageName}>
                    {pack.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-[#8E8E93] block">
                {deviceIconPacks.length > 0
                  ? `${deviceIconPacks.length} icon pack(s) detected on device.`
                  : 'Supports standard Nova, ADW, and Apex icon packs.'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: Static Taskbar Customization */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <Sliders size={15} className="text-[#64D2FF]" />
            <span>Static Taskbar Customization</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Taskbar Scale */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">Taskbar Sizing</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ taskbarIconScale: s });
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition uppercase border ${
                      (settings.taskbarIconScale || 'medium') === s
                        ? 'bg-[#64D2FF] text-[#0A0A0E] border-[#64D2FF] shadow-sm'
                        : 'bg-[#181824]/60 border-white/5 text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {s === 'xlarge' ? 'XL' : s.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#8E8E93]">Glassmorphism Opacity</span>
                <span className="font-mono text-white font-bold">{settings.taskbarOpacity ?? 92}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="2"
                value={settings.taskbarOpacity ?? 92}
                onChange={(e) => updateSettings({ taskbarOpacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#181824] rounded-lg appearance-none cursor-pointer accent-[#64D2FF]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Nodus Ecosystem Modules */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <Radio size={15} className="text-[#34C759]" />
            <span>Nodus Ecosystem Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nodus Fleet Module */}
            <div className="p-3 rounded-xl bg-[#181824]/60 border border-white/5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isFleetInstalled ? 'bg-[#34C759] shadow-sm shadow-[#34C759]' : 'bg-[#8E8E93]'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">Nodus Fleet</div>
                    <div className="text-[10px] text-[#8E8E93]">Cluster mesh & discovery</div>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  isFleetInstalled
                    ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/40'
                    : 'bg-white/5 text-[#8E8E93] border-white/10'
                }`}>
                  {isFleetInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-semibold text-[#8E8E93]">Multi-Device Features</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ enableMultiDevice: !settings.enableMultiDevice });
                    showToast(settings.enableMultiDevice ? 'Multi-Device features disabled' : 'Multi-Device features enabled');
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition border ${
                    settings.enableMultiDevice
                      ? 'bg-[#34C759] text-[#0A0A0E] border-[#34C759] shadow-sm'
                      : 'bg-[#181824] text-[#8E8E93] border-white/10 hover:text-white'
                  }`}
                >
                  {settings.enableMultiDevice ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Nodus Touch Module */}
            <div className="p-3 rounded-xl bg-[#181824]/60 border border-white/5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isTouchInstalled ? 'bg-[#34C759] shadow-sm shadow-[#34C759]' : 'bg-[#8E8E93]'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">Nodus Touch</div>
                    <div className="text-[10px] text-[#8E8E93]">Floating assistive squircle</div>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  isTouchInstalled
                    ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/40'
                    : 'bg-white/5 text-[#8E8E93] border-white/10'
                }`}>
                  {isTouchInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-semibold text-[#8E8E93]">Assistive Overlay</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ enableAssistiveTouch: !settings.enableAssistiveTouch });
                    showToast(settings.enableAssistiveTouch ? 'Assistive Touch disabled' : 'Assistive Touch enabled');
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition border ${
                    settings.enableAssistiveTouch
                      ? 'bg-[#34C759] text-[#0A0A0E] border-[#34C759] shadow-sm'
                      : 'bg-[#181824] text-[#8E8E93] border-white/10 hover:text-white'
                  }`}
                >
                  {settings.enableAssistiveTouch ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: Reset & Defaults */}
        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/25 text-xs font-semibold transition hover:scale-105 active:scale-95"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => {
              audio.playTap();
              closeActiveApp();
            }}
            className="px-4 py-2 rounded-xl bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0E] font-bold text-xs transition hover:scale-105 active:scale-95 shadow-md shadow-[#34C759]/20"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
