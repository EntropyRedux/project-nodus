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
import { THEME_LIST, getSystemTheme, ACCENT_COLOR_LIST, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { ThemeId, AccentColorId } from '../../types/launcher';

export const SettingsApp: React.FC = () => {
  const {
    settings,
    updateSettings,
    closeActiveApp,
    showToast,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);
  const { isFleetInstalled, isTouchInstalled } = useFleetDetection();
  const [deviceIconPacks, setDeviceIconPacks] = useState<Array<{ packageName: string; label: string }>>([]);

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

  const handleAccentSelect = (accentId: AccentColorId) => {
    audio.playTap();
    const selected = getAccentColor(accentId);
    updateSettings({
      accentColor: accentId,
    });
    showToast(`${selected.name} accent applied`);
  };

  const handleThemeSelect = (themeId: ThemeId) => {
    audio.playTap();
    const selected = getSystemTheme(themeId);
    updateSettings({
      theme: themeId,
      wallpaper: selected.wallpaperId,
    });
    showToast(`${selected.name} design theme applied`);
  };

  const handleResetToDefaults = () => {
    audio.playTap();
    updateSettings({
      theme: 'glassmorphism',
      accentColor: 'sapphire',
      appLaunchMode: 'fullscreen',
      iconSize: 'medium',
      drawerLayout: 'continuous',
      wallpaper: 'alpine',
      customWallpaperUrl: undefined,
      iconShape: 'modern',
      iconPack: 'default',
      taskbarOpacity: 92,
      taskbarIconScale: 'medium',
      enableMultiDevice: true,
      enableAssistiveTouch: false,
    });
    showToast('Settings restored to default');
  };

  return (
    <div 
      className={`h-full w-full flex flex-col ${currentTheme.classes.textPrimary} font-sans select-none bg-transparent`}
    >
      {/* Scrollable Settings Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-4 scrollbar-thin">
        
        {/* SECTION 1: Appearance (Accent Colors Row + Compact Theme Cards) */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3.5`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
              <Palette size={15} style={{ color: currentAccent.hex }} />
              <span>Theme & Accent</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {currentTheme.name} • {currentAccent.name}
            </span>
          </div>

          {/* Accent Color: Compact Single Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-black/25 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Accent</span>
              <span className="text-[10px] text-[#94A3B8]">({currentAccent.name})</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {ACCENT_COLOR_LIST.map((accent) => {
                const isSelected = (settings.accentColor || 'sapphire') === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    title={`${accent.name} (${accent.hex})`}
                    onClick={() => handleAccentSelect(accent.id)}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1 ${currentTheme.buttonRadius} border transition-all duration-150 shrink-0 ${
                      isSelected
                        ? 'border-transparent shadow-sm'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accent.badgeBg,
                            borderColor: accent.hex,
                            boxShadow: `0 0 10px ${accent.glowRgba}`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-sm transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: accent.hex,
                        boxShadow: `0 0 6px ${accent.glowRgba}`,
                      }}
                    >
                      {isSelected && <Check size={8} strokeWidth={3.5} className="text-black" />}
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: isSelected ? accent.hex : '#94A3B8' }}
                    >
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Option Cards: Compact 2x2 Grid */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#8E8E93]">Design Systems</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_LIST.map((th) => {
                const isSelected = (settings.theme || 'glassmorphism') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleThemeSelect(th.id)}
                    className={`group relative p-3 ${currentTheme.cardRadius} border text-left transition-all duration-150 flex items-center justify-between gap-3 overflow-hidden ${
                      isSelected
                        ? 'border-transparent shadow-md'
                        : 'border-white/[0.08] hover:border-white/[0.20] hover:bg-white/[0.02] bg-white/[0.01]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${currentAccent.hex}, 0 4px 14px -2px ${currentAccent.glowRgba}` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mini Visual Indicator */}
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center relative p-1"
                        style={th.wallpaperStyle}
                      >
                        {th.archetype === 'glass' && (
                          <div className="w-5 h-5 rounded-md bg-gradient-to-b from-[#1E293B] to-[#0F1726] border border-white/30 shadow-sm" />
                        )}
                        {th.archetype === 'hud' && (
                          <div className="w-5 h-5 rounded-none border border-cyan-400 bg-gradient-to-b from-[#0B2535] to-[#031018] font-mono text-[6px] text-cyan-300 flex items-center justify-center shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                            SYS
                          </div>
                        )}
                        {th.archetype === 'brutalist' && (
                          <div className="w-5 h-5 rounded-sm bg-[#2A3147] text-white font-black text-[6px] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center">
                            POP
                          </div>
                        )}
                        {th.archetype === 'minimal' && (
                          <div className="w-5 h-5 rounded-none bg-[#1E2638] border border-white/30 text-white text-[7px] flex items-center justify-center">
                            01
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {th.name}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-[#94A3B8] uppercase">
                            {th.designSystem}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                          {th.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center shadow text-black"
                        style={{ backgroundColor: currentAccent.hex }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: Multitasking & Windowing Mode */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <AppWindow size={15} style={{ color: currentAccent.hex }} />
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
                className={`p-3 ${currentTheme.cardRadius} border text-left transition flex flex-col gap-1`}
                style={
                  settings.appLaunchMode === 'fullscreen'
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: '#F1F5F9' }
                    : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                }
              >
                <div className="flex items-center justify-between">
                  <Maximize2 size={14} style={{ color: settings.appLaunchMode === 'fullscreen' ? currentAccent.hex : undefined }} />
                  {settings.appLaunchMode === 'fullscreen' && <Check size={13} style={{ color: currentAccent.hex }} />}
                </div>
                <span className="text-xs font-bold">Standard Fullscreen</span>
                <span className="text-[10px] opacity-75">Opens apps in master window</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  updateSettings({ appLaunchMode: 'floating' });
                }}
                className={`p-3 ${currentTheme.cardRadius} border text-left transition flex flex-col gap-1`}
                style={
                  settings.appLaunchMode === 'floating'
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: '#F1F5F9' }
                    : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                }
              >
                <div className="flex items-center justify-between">
                  <Minimize2 size={14} style={{ color: settings.appLaunchMode === 'floating' ? currentAccent.hex : undefined }} />
                  {settings.appLaunchMode === 'floating' && <Check size={13} style={{ color: currentAccent.hex }} />}
                </div>
                <span className="text-xs font-bold">Floating Window</span>
                <span className="text-[10px] opacity-75">Freeform window on desktop</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Desktop Layout & Grid Density */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <LayoutGrid size={15} style={{ color: currentAccent.hex }} />
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
                    className={`py-2 ${currentTheme.buttonRadius} text-xs font-bold transition uppercase border`}
                    style={
                      (settings.iconSize || 'medium') === size
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                    }
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
                  className={`py-2 px-2.5 ${currentTheme.buttonRadius} text-xs font-bold transition flex items-center justify-center gap-1.5 border`}
                  style={
                    (settings.drawerLayout ?? 'continuous') === 'continuous'
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                  }
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
                  className={`py-2 px-2.5 ${currentTheme.buttonRadius} text-xs font-bold transition flex items-center justify-center gap-1.5 border`}
                  style={
                    settings.drawerLayout === 'paginated'
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                  }
                >
                  <AppWindow size={13} />
                  <span>Paginated</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Wallpaper & Atmosphere */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
              <ImageIcon size={15} style={{ color: currentAccent.hex }} />
              <span>Wallpaper & Atmosphere</span>
            </div>

            <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 ${currentTheme.buttonRadius} bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F0F0F2] transition border border-white/10 hover:border-white/20`}>
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
                  className={`group relative h-16 ${currentTheme.cardRadius} overflow-hidden border transition-all text-left flex flex-col justify-end p-2 ${
                    isSelected ? 'ring-2 border-transparent shadow-sm' : 'border-white/10 hover:border-white/25'
                  }`}
                  style={{
                    ...wp.style,
                    boxShadow: isSelected ? `0 0 0 2px ${currentAccent.hex}` : undefined,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <span className="relative z-10 text-[10px] font-bold text-white truncate drop-shadow">
                    {wp.name}
                  </span>
                  {isSelected && (
                    <div
                      className="absolute top-1.5 right-1.5 z-10 w-3.5 h-3.5 rounded-full text-black flex items-center justify-center shadow"
                      style={{ backgroundColor: currentAccent.hex }}
                    >
                      <Check size={9} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: Custom Icon Packs */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
              <Sparkles size={15} style={{ color: currentAccent.hex }} />
              <span>Custom Icon Packs</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {deviceIconPacks.length > 0 ? `${deviceIconPacks.length} Device Pack(s)` : 'Universal Pack Engine'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-[#8E8E93]">
                Installed / Active Icon Pack
              </label>
              <span className="text-[10px] text-[#94A3B8]">
                Icon geometry is dynamically styled by current Theme
              </span>
            </div>

            <select
              value={settings.iconPack || 'default'}
              onChange={(e) => {
                audio.playTap();
                updateSettings({ iconPack: e.target.value });
                showToast(e.target.value === 'default' ? 'Default Material icons active' : 'Custom Icon Pack applied');
              }}
              className={`w-full ${currentTheme.classes.inputField} px-3.5 py-2.5 text-xs transition`}
            >
              <option value="default">Default Dynamic Material Icons (Adaptive)</option>
              {deviceIconPacks.map((pack) => (
                <option key={pack.packageName} value={pack.packageName}>
                  {pack.label} ({pack.packageName})
                </option>
              ))}
            </select>

            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              {deviceIconPacks.length > 0
                ? `Detected ${deviceIconPacks.length} installed icon pack(s) on your system. Changes apply instantly across the launcher.`
                : 'Compatible with standard Android icon pack packages (Nova, Lawnchair, ADW, Apex) when running on device.'}
            </p>
          </div>
        </div>

        {/* SECTION 5: Global Surface & UI Opacity */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3.5`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase">
              <Sliders size={15} style={{ color: currentAccent.hex }} />
              <span>Global Surface & UI Opacity</span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {settings.taskbarOpacity ?? 92}% Opacity
            </span>
          </div>

          <div className="space-y-4">
            {/* Global Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-semibold text-white">System Surface Opacity</span>
                  <p className="text-[10px] text-[#94A3B8]">Modulates transparency across every modal, panel, taskbar, popup, and window</p>
                </div>
                <span className="font-mono text-xs font-bold" style={{ color: currentAccent.hex }}>
                  {settings.taskbarOpacity ?? 92}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#64748B]">20%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={settings.taskbarOpacity ?? 92}
                  onChange={(e) => updateSettings({ taskbarOpacity: Number(e.target.value) })}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: currentAccent.hex }}
                />
                <span className="text-[10px] font-mono text-[#64748B]">100%</span>
              </div>
            </div>

            {/* Taskbar Icon Sizing */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
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
                    className={`py-2 ${currentTheme.buttonRadius} text-xs font-bold transition uppercase border`}
                    style={
                      (settings.taskbarIconScale || 'medium') === s
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                    }
                  >
                    {s === 'xlarge' ? 'XL' : s.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: Nodus Ecosystem Modules */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className="flex items-center gap-2 text-xs font-bold text-white tracking-wide uppercase pb-2 border-b border-white/5">
            <Radio size={15} style={{ color: currentAccent.hex }} />
            <span>Nodus Ecosystem Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 ${currentTheme.cardRadius} bg-black/20 border border-white/5 flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isFleetInstalled ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className="text-xs font-bold text-white">Nodus Fleet</div>
                    <div className="text-[10px] text-[#8E8E93]">Cluster mesh & discovery</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                  style={
                    isFleetInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
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
                  className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition border`}
                  style={
                    settings.enableMultiDevice
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableMultiDevice ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className={`p-3 ${currentTheme.cardRadius} bg-black/20 border border-white/5 flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isTouchInstalled ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className="text-xs font-bold text-white">Nodus Touch</div>
                    <div className="text-[10px] text-[#8E8E93]">Floating assistive squircle</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                  style={
                    isTouchInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
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
                  className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition border`}
                  style={
                    settings.enableAssistiveTouch
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
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
            className={`flex items-center gap-2 px-3.5 py-2 ${currentTheme.buttonRadius} bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/25 text-xs font-semibold transition hover:scale-105 active:scale-95`}
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => {
              audio.playTap();
              closeActiveApp();
            }}
            className={`px-4 py-2 ${currentTheme.buttonRadius} font-bold text-xs transition hover:scale-105 active:scale-95 shadow-md`}
            style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
