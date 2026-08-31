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
  ListTodo,
  CheckSquare,
  Clock,
  Battery,
  Laptop,
  Zap,
  ToggleLeft,
  ToggleRight,
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
  const isLight = settings.theme === 'material-light';

  // Section & card styling helpers for light and dark modes
  const cardBgClass = isLight 
    ? 'bg-white/95 border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[#0F172A]' 
    : `${currentTheme.classes.itemCard} shadow-sm text-white`;
  const innerCardBg = isLight ? 'bg-[#F8FAFD] border-[#E2E8F0]' : 'bg-black/25 border-white/5';
  const dividerClass = isLight ? 'border-[#E2E8F0]' : 'border-white/5';
  const titleTextClass = isLight ? 'text-[#0F172A]' : 'text-white';
  const subTextClass = isLight ? 'text-[#475569]' : 'text-[#94A3B8]';
  const labelTextClass = isLight ? 'text-[#334155]' : 'text-[#8E8E93]';

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
        showToast('Custom wallpaper applied');
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
      enableClockWidget: true,
      enableDeviceNameWidget: true,
      enableBatteryWidget: true,
      enableNotesWidget: true,
    });
    showToast('Settings restored to default');
  };

  return (
    <div 
      className={`h-full w-full flex flex-col ${isLight ? 'text-[#0F172A]' : currentTheme.classes.textPrimary} font-sans select-none bg-transparent`}
    >
      {/* Scrollable Settings Form */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3.5 sm:px-4 sm:py-4 space-y-3 scrollbar-thin">
        
        {/* SECTION 1: Appearance (Accent Colors Row + Compact Theme Cards) */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2.5`}>
          <div className={`flex items-center justify-between pb-1.5 border-b ${dividerClass}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase`}>
              <Palette size={13} style={{ color: currentAccent.hex }} />
              <span>Theme & Accent</span>
            </div>
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {currentTheme.name} • {currentAccent.name}
            </span>
          </div>

          {/* Accent Color: Compact Single Row */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl ${innerCardBg} border`}>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold ${titleTextClass} uppercase tracking-wider`}>Accent</span>
              <span className={`text-[9px] ${subTextClass}`}>({currentAccent.name})</span>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {ACCENT_COLOR_LIST.map((accent) => {
                const isSelected = (settings.accentColor || 'sapphire') === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    title={`${accent.name} (${accent.hex})`}
                    onClick={() => handleAccentSelect(accent.id)}
                    className={`group relative flex items-center gap-1 px-2 py-0.5 ${currentTheme.buttonRadius} border transition-all duration-150 shrink-0 ${
                      isSelected
                        ? 'border-transparent shadow-sm'
                        : isLight
                        ? 'border-[#CBD5E1] hover:border-[#94A3B8] bg-white hover:bg-[#F1F5F9]'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accent.badgeBg,
                            borderColor: accent.hex,
                            boxShadow: `0 0 8px ${accent.glowRgba}`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-3 h-3 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-sm transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: accent.hex,
                        boxShadow: `0 0 5px ${accent.glowRgba}`,
                      }}
                    >
                      {isSelected && <Check size={7} strokeWidth={3.5} className="text-black" />}
                    </span>
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: isSelected ? accent.hex : isLight ? '#475569' : '#94A3B8' }}
                    >
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Option Cards: Compact 2x2 Grid */}
          <div className="space-y-1">
            <div className={`text-[10px] font-semibold ${labelTextClass}`}>Design Systems</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {THEME_LIST.map((th) => {
                const isSelected = (settings.theme || 'glassmorphism') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleThemeSelect(th.id)}
                    className={`group relative p-2.5 ${currentTheme.cardRadius} border text-left transition-all duration-150 flex items-center justify-between gap-2.5 overflow-hidden ${
                      isSelected
                        ? 'border-transparent shadow-md'
                        : isLight
                        ? 'border-[#CBD5E1] hover:border-[#94A3B8] hover:bg-[#F8FAFD] bg-white'
                        : 'border-white/[0.08] hover:border-white/[0.20] hover:bg-white/[0.02] bg-white/[0.01]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? (isLight ? '#EFF6FF' : 'rgba(255,255,255,0.05)') : undefined,
                      boxShadow: isSelected ? `0 0 0 1.5px ${currentAccent.hex}, 0 3px 10px -2px ${currentAccent.glowRgba}` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Mini Visual Indicator */}
                      <div
                        className="w-7 h-7 rounded-md overflow-hidden shrink-0 border border-black/10 dark:border-white/10 flex items-center justify-center relative p-0.5"
                        style={th.wallpaperStyle}
                      >
                        {th.archetype === 'glass' && (
                          <div className="w-3.5 h-3.5 rounded-sm bg-gradient-to-b from-[#1E293B] to-[#0F1726] border border-white/30 shadow-sm" />
                        )}
                        {th.archetype === 'hud' && (
                          <div className="w-3.5 h-3.5 rounded-none border border-cyan-400 bg-gradient-to-b from-[#0B2535] to-[#031018] font-mono text-[5px] text-cyan-300 flex items-center justify-center shadow-[0_0_6px_rgba(0,240,255,0.3)]">
                            SYS
                          </div>
                        )}
                        {th.archetype === 'brutalist' && (
                          <div className="w-3.5 h-3.5 rounded-xs bg-[#2A3147] text-white font-black text-[5px] border border-black shadow-[1px_1px_0px_#000] flex items-center justify-center">
                            POP
                          </div>
                        )}
                        {th.archetype === 'minimal' && (
                          <div className="w-3.5 h-3.5 rounded-none bg-[#1E2638] border border-white/30 text-white text-[6px] flex items-center justify-center">
                            01
                          </div>
                        )}
                        {th.archetype === 'material' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-white border border-[#CBD5E1] shadow-sm flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0B57D0]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-bold ${titleTextClass} truncate`}>
                            {th.name}
                          </span>
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${isLight ? 'bg-[#E2E8F0] text-[#334155]' : 'bg-white/[0.06] text-[#94A3B8]'} uppercase`}>
                            {th.designSystem}
                          </span>
                        </div>
                        <p className={`text-[9px] ${subTextClass} truncate mt-0.5`}>
                          {th.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center shadow text-black"
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
        </div>

        {/* SECTION 2: Multitasking & Windowing Mode */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2`}>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase pb-1.5 border-b ${dividerClass}`}>
            <AppWindow size={13} style={{ color: currentAccent.hex }} />
            <span>Multitasking & Windowing</span>
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-semibold ${labelTextClass}`}>Default App Launch Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  updateSettings({ appLaunchMode: 'fullscreen' });
                }}
                className={`p-2.5 ${currentTheme.cardRadius} border text-left transition flex flex-col gap-0.5`}
                style={
                  settings.appLaunchMode === 'fullscreen'
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: isLight ? '#0F172A' : '#F1F5F9' }
                    : isLight
                    ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
                    : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                }
              >
                <div className="flex items-center justify-between">
                  <Maximize2 size={12} style={{ color: settings.appLaunchMode === 'fullscreen' ? currentAccent.hex : undefined }} />
                  {settings.appLaunchMode === 'fullscreen' && <Check size={11} style={{ color: currentAccent.hex }} />}
                </div>
                <span className={`text-[11px] font-bold ${settings.appLaunchMode === 'fullscreen' ? titleTextClass : ''}`}>Standard Fullscreen</span>
                <span className={`text-[9px] ${subTextClass}`}>Opens apps in master window</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playTap();
                  updateSettings({ appLaunchMode: 'floating' });
                }}
                className={`p-2.5 ${currentTheme.cardRadius} border text-left transition flex flex-col gap-0.5`}
                style={
                  settings.appLaunchMode === 'floating'
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: isLight ? '#0F172A' : '#F1F5F9' }
                    : isLight
                    ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
                    : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                }
              >
                <div className="flex items-center justify-between">
                  <Minimize2 size={12} style={{ color: settings.appLaunchMode === 'floating' ? currentAccent.hex : undefined }} />
                  {settings.appLaunchMode === 'floating' && <Check size={11} style={{ color: currentAccent.hex }} />}
                </div>
                <span className={`text-[11px] font-bold ${settings.appLaunchMode === 'floating' ? titleTextClass : ''}`}>Floating Window</span>
                <span className={`text-[9px] ${subTextClass}`}>Freeform window on desktop</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Desktop Layout & Grid Density */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2`}>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase pb-1.5 border-b ${dividerClass}`}>
            <LayoutGrid size={13} style={{ color: currentAccent.hex }} />
            <span>Desktop Layout & Grid Density</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Desktop Icon Size */}
            <div className="space-y-1">
              <label className={`text-[10px] font-semibold ${labelTextClass}`}>Desktop Icon Size</label>
              <div className="grid grid-cols-4 gap-1">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ iconSize: size });
                    }}
                    className={`py-1.5 ${currentTheme.buttonRadius} text-[10px] font-bold transition uppercase border`}
                    style={
                      (settings.iconSize || 'medium') === size
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                    }
                  >
                    {size === 'xlarge' ? 'XL' : size.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* App Display Format */}
            <div className="space-y-1">
              <label className={`text-[10px] font-semibold ${labelTextClass}`}>App Display Format</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ drawerLayout: 'continuous' });
                  }}
                  className={`py-1.5 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold transition flex items-center justify-center gap-1 border`}
                  style={
                    (settings.drawerLayout ?? 'continuous') === 'continuous'
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : isLight
                      ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                  }
                >
                  <LayoutGrid size={11} />
                  <span>Continuous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ drawerLayout: 'paginated' });
                  }}
                  className={`py-1.5 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold transition flex items-center justify-center gap-1 border`}
                  style={
                    settings.drawerLayout === 'paginated'
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : isLight
                      ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#8E8E93' }
                  }
                >
                  <AppWindow size={11} />
                  <span>Paginated</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Wallpaper & Atmosphere */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2.5`}>
          <div className={`flex items-center justify-between pb-1.5 border-b ${dividerClass}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase`}>
              <ImageIcon size={13} style={{ color: currentAccent.hex }} />
              <span>Wallpaper & Atmosphere</span>
            </div>

            <div className="flex items-center gap-1.5">
              {settings.wallpaper === 'custom' && settings.customWallpaperUrl && (
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({
                      wallpaper: currentTheme.wallpaperId,
                      customWallpaperUrl: undefined,
                    });
                    showToast('Reverted to theme default wallpaper');
                  }}
                  className={`flex items-center gap-1 px-2 py-1 ${currentTheme.buttonRadius} ${isLight ? 'bg-[#FEE2E2] hover:bg-[#FCD34D]/40 text-[#DC2626] border-[#FECACA]' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'} text-[10px] font-semibold transition border cursor-pointer`}
                  title="Remove custom wallpaper"
                >
                  <RotateCcw size={10} />
                  <span>Reset Default</span>
                </button>
              )}

              <label className={`cursor-pointer flex items-center gap-1 px-2.5 py-1 ${currentTheme.buttonRadius} ${isLight ? 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border-[#CBD5E1]' : 'bg-white/5 hover:bg-white/10 text-[#F0F0F2] border-white/10'} text-[10px] font-semibold transition border`}>
                <Upload size={10} />
                <span>Upload Custom</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* Custom Wallpaper Active Card */}
          {settings.wallpaper === 'custom' && settings.customWallpaperUrl && (
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 ${isLight ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-white/[0.04] border-white/15'}`}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-12 h-8 rounded-lg bg-cover bg-center border border-black/10 shadow-xs shrink-0" 
                  style={{ backgroundImage: `url(${settings.customWallpaperUrl})` }}
                />
                <div>
                  <div className={`text-[11px] font-bold ${titleTextClass} flex items-center gap-1.5`}>
                    <span>Custom Photo Wallpaper</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  </div>
                  <p className={`text-[9px] ${subTextClass}`}>Locally loaded custom background image</p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white/10 text-white'}`}>Active</span>
            </div>
          )}

          {/* System Wallpaper Atmospheres */}
          <div className="space-y-1">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
              System Wallpaper Atmospheres (Obsidian, Synth & Dark Matrix)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((wp) => {
                const isSelected = settings.wallpaper === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ wallpaper: wp.id, customWallpaperUrl: undefined });
                      showToast(`Applied wallpaper: ${wp.name}`);
                    }}
                    className={`group relative h-14 ${currentTheme.cardRadius} overflow-hidden border transition-all text-left flex flex-col justify-end p-2 cursor-pointer ${
                      isSelected 
                        ? 'ring-2 border-transparent shadow-md' 
                        : isLight 
                        ? 'border-[#CBD5E1] hover:border-[#94A3B8] shadow-xs' 
                        : 'border-white/10 hover:border-white/25'
                    }`}
                    style={{
                      ...wp.style,
                      boxShadow: isSelected ? `0 0 0 2px ${currentAccent.hex}` : undefined,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
                    <span className="relative z-10 text-[9px] font-bold text-white truncate drop-shadow">
                      {wp.name}
                    </span>
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 z-10 w-3.5 h-3.5 rounded-full text-black flex items-center justify-center shadow"
                        style={{ backgroundColor: currentAccent.hex }}
                      >
                        <Check size={8} strokeWidth={3.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 4: Custom Icon Packs */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2`}>
          <div className={`flex items-center justify-between pb-1.5 border-b ${dividerClass}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase`}>
              <Sparkles size={13} style={{ color: currentAccent.hex }} />
              <span>Custom Icon Packs</span>
            </div>
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {deviceIconPacks.length > 0 ? `${deviceIconPacks.length} Device Pack(s)` : 'Universal Pack Engine'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className={`text-[10px] font-semibold ${labelTextClass}`}>
                Installed / Active Icon Pack
              </label>
              <span className={`text-[9px] ${subTextClass}`}>
                Icon geometry is styled by current Theme
              </span>
            </div>

            <select
              value={settings.iconPack || 'default'}
              onChange={(e) => {
                audio.playTap();
                updateSettings({ iconPack: e.target.value });
                showToast(e.target.value === 'default' ? 'Default Material icons active' : 'Custom Icon Pack applied');
              }}
              className={`w-full ${isLight ? 'bg-[#F8FAFD] border-[#CBD5E1] text-[#0F172A] rounded-xl' : currentTheme.classes.inputField} px-2.5 py-1.5 text-[11px] transition`}
            >
              <option value="default">Default Dynamic Material Icons (Adaptive)</option>
              {deviceIconPacks.map((pack) => (
                <option key={pack.packageName} value={pack.packageName}>
                  {pack.label} ({pack.packageName})
                </option>
              ))}
            </select>

            <p className={`text-[9px] ${subTextClass} leading-relaxed`}>
              {deviceIconPacks.length > 0
                ? `Detected ${deviceIconPacks.length} installed icon pack(s) on your system. Changes apply instantly across the launcher.`
                : 'Compatible with standard Android icon pack packages (Nova, Lawnchair, ADW, Apex) when running on device.'}
            </p>
          </div>
        </div>

        {/* SECTION 5: Global Surface & UI Opacity */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2.5`}>
          <div className={`flex items-center justify-between pb-1.5 border-b ${dividerClass}`}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase`}>
              <Sliders size={13} style={{ color: currentAccent.hex }} />
              <span>Global Surface & UI Opacity</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              {settings.taskbarOpacity ?? 92}% Opacity
            </span>
          </div>

          <div className="space-y-3">
            {/* Global Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <div>
                  <span className={`font-semibold ${titleTextClass}`}>System Surface Opacity</span>
                  <p className={`text-[9px] ${subTextClass}`}>Modulates transparency across modals, panels, and taskbars</p>
                </div>
                <span className="font-mono text-[11px] font-bold" style={{ color: currentAccent.hex }}>
                  {settings.taskbarOpacity ?? 92}%
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-mono text-[#64748B]">20%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={settings.taskbarOpacity ?? 92}
                  onChange={(e) => updateSettings({ taskbarOpacity: Number(e.target.value) })}
                  className={`flex-1 h-1.5 ${isLight ? 'bg-[#CBD5E1]' : 'bg-white/10'} rounded-lg appearance-none cursor-pointer`}
                  style={{ accentColor: currentAccent.hex }}
                />
                <span className="text-[9px] font-mono text-[#64748B]">100%</span>
              </div>
            </div>

            {/* Taskbar Icon Sizing */}
            <div className={`space-y-1 pt-1.5 border-t ${dividerClass}`}>
              <label className={`text-[10px] font-semibold ${labelTextClass}`}>Taskbar Sizing</label>
              <div className="grid grid-cols-4 gap-1">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      updateSettings({ taskbarIconScale: s });
                    }}
                    className={`py-1.5 ${currentTheme.buttonRadius} text-[10px] font-bold transition uppercase border`}
                    style={
                      (settings.taskbarIconScale || 'medium') === s
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F8FAFD', borderColor: '#E2E8F0', color: '#475569' }
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

        {/* SECTION 6: System Widgets & Status Toggles */}
        {(() => {
          const isClockActive = settings.enableClockWidget !== false;
          const isDeviceNameActive = settings.enableDeviceNameWidget !== false;
          const isBatteryActive = settings.enableBatteryWidget !== false;
          const isNotesActive = settings.enableNotesWidget !== false;
          const activeWidgetCount = [isClockActive, isDeviceNameActive, isBatteryActive, isNotesActive].filter(Boolean).length;

          return (
            <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2.5`}>
              <div className={`flex items-center justify-between pb-1.5 border-b ${dividerClass}`}>
                <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase`}>
                  <Clock size={13} style={{ color: currentAccent.hex }} />
                  <span>Desktop Widgets & Telemetry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const allEnabled = activeWidgetCount === 4;
                      updateSettings({
                        enableClockWidget: !allEnabled,
                        enableDeviceNameWidget: !allEnabled,
                        enableBatteryWidget: !allEnabled,
                        enableNotesWidget: !allEnabled,
                      });
                      showToast(allEnabled ? 'All widgets hidden' : 'All widgets enabled');
                    }}
                    className={`text-[9px] font-semibold px-2 py-0.5 ${currentTheme.buttonRadius} border transition ${
                      isLight
                        ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1] hover:bg-[#E2E8F0]'
                        : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {activeWidgetCount === 4 ? 'Hide All' : 'Show All'}
                  </button>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 ${currentTheme.buttonRadius} border`}
                    style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
                  >
                    {activeWidgetCount}/4 Active
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                {/* 1. Digital Clock & Date Toggle */}
                <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex items-center justify-between gap-2.5 transition-colors`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isClockActive ? currentAccent.badgeBg : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.02)',
                        borderColor: isClockActive ? currentAccent.badgeBorder : isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isClockActive ? currentAccent.hex : isLight ? '#475569' : '#64748B',
                      }}
                    >
                      <Clock size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${titleTextClass}`}>Clock & Calendar Date</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${isLight ? 'bg-[#E2E8F0] text-[#334155]' : 'bg-white/5 text-[#94A3B8]'}`}>
                          HH:MM:SS
                        </span>
                      </div>
                      <p className={`text-[9px] ${subTextClass} truncate mt-0.5`}>
                        Large digital time readout with live seconds tick and formatted weekday / date
                      </p>
                    </div>
                  </div>

                  <button
                    id="toggle-clock-widget-btn"
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isClockActive;
                      updateSettings({ enableClockWidget: next });
                      showToast(next ? 'Clock & Date widget enabled' : 'Clock & Date widget disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0 hover:scale-105 active:scale-95`}
                    style={
                      isClockActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isClockActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 2. Connected Device Name Toggle */}
                <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex items-center justify-between gap-2.5 transition-colors`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isDeviceNameActive ? currentAccent.badgeBg : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.02)',
                        borderColor: isDeviceNameActive ? currentAccent.badgeBorder : isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isDeviceNameActive ? currentAccent.hex : isLight ? '#475569' : '#64748B',
                      }}
                    >
                      <Laptop size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${titleTextClass}`}>Device Name Badge</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${isLight ? 'bg-[#E2E8F0] text-[#334155]' : 'bg-white/5 text-[#94A3B8]'}`}>
                          Node Tag
                        </span>
                      </div>
                      <p className={`text-[9px] ${subTextClass} truncate mt-0.5`}>
                        Shows current workstation name pill with shortcut to settings
                      </p>
                    </div>
                  </div>

                  <button
                    id="toggle-device-name-widget-btn"
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isDeviceNameActive;
                      updateSettings({ enableDeviceNameWidget: next });
                      showToast(next ? 'Device name badge enabled' : 'Device name badge disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0 hover:scale-105 active:scale-95`}
                    style={
                      isDeviceNameActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isDeviceNameActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 3. Battery Stats & Power Icon Toggle */}
                <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex items-center justify-between gap-2.5 transition-colors`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isBatteryActive ? currentAccent.badgeBg : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.02)',
                        borderColor: isBatteryActive ? currentAccent.badgeBorder : isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isBatteryActive ? currentAccent.hex : isLight ? '#475569' : '#64748B',
                      }}
                    >
                      <Battery size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${titleTextClass}`}>Battery Stats & Charging</span>
                        <span className="text-[8px] px-1 py-0.2 rounded font-mono bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                          Telemetry
                        </span>
                      </div>
                      <p className={`text-[9px] ${subTextClass} truncate mt-0.5`}>
                        Real-time battery percentage badge with dynamic health color and charging state indicator
                      </p>
                    </div>
                  </div>

                  <button
                    id="toggle-battery-widget-btn"
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isBatteryActive;
                      updateSettings({ enableBatteryWidget: next });
                      showToast(next ? 'Battery stats widget enabled' : 'Battery stats widget disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0 hover:scale-105 active:scale-95`}
                    style={
                      isBatteryActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isBatteryActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 4. To-Do List & Quick Notes Widget Toggle */}
                <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex items-center justify-between gap-2.5 transition-colors`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isNotesActive ? currentAccent.badgeBg : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.02)',
                        borderColor: isNotesActive ? currentAccent.badgeBorder : isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isNotesActive ? currentAccent.hex : isLight ? '#475569' : '#64748B',
                      }}
                    >
                      <ListTodo size={13} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${titleTextClass}`}>To-Do List & Sticky Notes</span>
                        <span className="text-[8px] px-1 py-0.2 rounded font-semibold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                          Interactive
                        </span>
                      </div>
                      <p className={`text-[9px] ${subTextClass} truncate mt-0.5`}>
                        Color-coded checklist & sticky notes row with 1-click completion and modal view
                      </p>
                    </div>
                  </div>

                  <button
                    id="toggle-notes-widget-btn"
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isNotesActive;
                      updateSettings({ enableNotesWidget: next });
                      showToast(next ? 'To-Do & Notes widget enabled' : 'To-Do & Notes widget disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0 hover:scale-105 active:scale-95`}
                    style={
                      isNotesActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : isLight
                        ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isNotesActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SECTION 7: Nodus Ecosystem Modules */}
        <div className={`p-3 sm:p-3.5 ${currentTheme.cardRadius} ${cardBgClass} border space-y-2`}>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${titleTextClass} tracking-wide uppercase pb-1.5 border-b ${dividerClass}`}>
            <Radio size={13} style={{ color: currentAccent.hex }} />
            <span>Nodus Ecosystem Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex flex-col justify-between gap-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isFleetInstalled && settings.enableMultiDevice ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className={`text-[11px] font-bold ${titleTextClass}`}>Nodus Fleet</div>
                    <div className={`text-[9px] ${subTextClass}`}>Cluster mesh & clipboard history sync</div>
                  </div>
                </div>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${currentTheme.buttonRadius} border`}
                  style={
                    isFleetInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : isLight
                      ? { backgroundColor: '#E2E8F0', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {isFleetInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className={`flex items-center justify-between pt-1.5 border-t ${dividerClass}`}>
                <span className={`text-[9px] font-semibold ${labelTextClass}`}>Fleet & Clipboard Sync</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    const nextValue = !settings.enableMultiDevice;
                    updateSettings({ enableMultiDevice: nextValue });
                    showToast(
                      nextValue
                        ? 'Nodus Fleet enabled (Clipboard History active)'
                        : 'Nodus Fleet disabled (Clipboard History deactivated)'
                    );
                  }}
                  className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border`}
                  style={
                    settings.enableMultiDevice
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : isLight
                      ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableMultiDevice ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className={`p-2 ${currentTheme.cardRadius} ${innerCardBg} border flex flex-col justify-between gap-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isTouchInstalled ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className={`text-[11px] font-bold ${titleTextClass}`}>Nodus Touch</div>
                    <div className={`text-[9px] ${subTextClass}`}>Floating assistive squircle</div>
                  </div>
                </div>
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${currentTheme.buttonRadius} border`}
                  style={
                    isTouchInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : isLight
                      ? { backgroundColor: '#E2E8F0', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {isTouchInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className={`flex items-center justify-between pt-1.5 border-t ${dividerClass}`}>
                <span className={`text-[9px] font-semibold ${labelTextClass}`}>Assistive Overlay</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ enableAssistiveTouch: !settings.enableAssistiveTouch });
                    showToast(settings.enableAssistiveTouch ? 'Assistive Touch disabled' : 'Assistive Touch enabled');
                  }}
                  className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border`}
                  style={
                    settings.enableAssistiveTouch
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : isLight
                      ? { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableAssistiveTouch ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 8: Reset & Defaults */}
        <div className="pt-1.5 flex items-center justify-between">
          <button
            onClick={handleResetToDefaults}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${currentTheme.buttonRadius} bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/25 text-[11px] font-semibold transition hover:scale-105 active:scale-95`}
          >
            <RotateCcw size={11} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => {
              audio.playTap();
              closeActiveApp();
            }}
            className={`px-4 py-1.5 ${currentTheme.buttonRadius} font-bold text-[11px] transition hover:scale-105 active:scale-95 shadow-md`}
            style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
