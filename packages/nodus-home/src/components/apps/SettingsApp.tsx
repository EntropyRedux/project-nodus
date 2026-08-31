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
  Clock,
  Laptop,
  Battery,
  StickyNote,
  Globe,
  FlaskConical,
  Boxes,
  Terminal,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { WALLPAPER_PRESETS } from '../../utils/constants';
import { useFleetDetection } from '../../hooks/useFleetDetection';
import { THEME_LIST, getSystemTheme, ACCENT_COLOR_LIST, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { ThemeId, AccentColorId } from '../../types/launcher';
import { ThemedSelect } from '../common/ThemedSelect';

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
      wallpaper: selected.wallpaperId as any,
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
      wallpaper: 'alpine-horizon',
      customWallpaperUrl: undefined,
      iconShape: 'modern',
      selectedIconPackPackage: undefined,
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
          <div className={`flex items-center justify-between pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase`}>
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
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/25 border border-white/5'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold ${currentTheme.classes.textPrimary} uppercase tracking-wider`}>Accent</span>
              <span className={`text-[10px] ${currentTheme.classes.textSecondary}`}>({currentAccent.name})</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
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
                        : currentTheme.isLight
                        ? 'border-[#CBD5E1] hover:border-[#94A3B8] bg-[#FFFFFF] hover:bg-[#F1F5F9]'
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
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border border-black/10 shadow-sm transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: accent.hex,
                        boxShadow: `0 0 6px ${accent.glowRgba}`,
                      }}
                    >
                      {isSelected && <Check size={8} strokeWidth={3.5} className="text-black" />}
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: isSelected ? accent.hex : currentTheme.isLight ? '#475569' : '#94A3B8' }}
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
            <div className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>Design Systems</div>
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
                        : currentTheme.isLight
                        ? 'border-[#CBD5E1] hover:border-[#94A3B8] bg-[#F8FAFD] hover:bg-[#F1F5F9]'
                        : 'border-white/[0.08] hover:border-white/[0.20] hover:bg-white/[0.02] bg-white/[0.01]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? (currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)') : undefined,
                      boxShadow: isSelected ? `0 0 0 2px ${currentAccent.hex}, 0 4px 14px -2px ${currentAccent.glowRgba}` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mini Visual Indicator */}
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-black/10 flex items-center justify-center relative p-1"
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
                        {th.archetype === 'material' && (
                          <div className="w-5 h-5 rounded-full bg-[#FFFFFF] border border-[#CBD5E1] text-[#0B57D0] font-bold text-[7px] flex items-center justify-center shadow-xs">
                            M3
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} truncate`}>
                            {th.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${currentTheme.isLight ? 'bg-[#E2E8F0] text-[#334155]' : 'bg-white/[0.06] text-[#94A3B8]'} uppercase`}>
                            {th.designSystem}
                          </span>
                        </div>
                        <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate mt-0.5`}>
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
          <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <AppWindow size={15} style={{ color: currentAccent.hex }} />
            <span>Multitasking & Windowing</span>
          </div>

          <div className="space-y-1.5">
            <label className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>Default App Launch Mode</label>
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
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: currentTheme.isLight ? '#0F172A' : '#F1F5F9' }
                    : currentTheme.isLight
                    ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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
                    ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: currentTheme.isLight ? '#0F172A' : '#F1F5F9' }
                    : currentTheme.isLight
                    ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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
          <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <LayoutGrid size={15} style={{ color: currentAccent.hex }} />
            <span>Desktop Layout & Grid Density</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Desktop Icon Size */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>Desktop Icon Size</label>
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
                        : currentTheme.isLight
                        ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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
              <label className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>App Display Format</label>
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
                      : currentTheme.isLight
                      ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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
                      : currentTheme.isLight
                      ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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
          <div className={`flex items-center justify-between pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase`}>
              <ImageIcon size={15} style={{ color: currentAccent.hex }} />
              <span>Wallpaper & Atmosphere</span>
            </div>

            <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 ${currentTheme.buttonRadius} ${currentTheme.isLight ? 'bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] hover:bg-[#E2E8F0]' : 'bg-white/5 hover:bg-white/10 text-[#F0F0F2] border border-white/10 hover:border-white/20'} text-xs font-semibold transition`}>
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
                    updateSettings({ wallpaper: wp.id as any });
                  }}
                  className={`group relative h-16 ${currentTheme.cardRadius} overflow-hidden border transition-all text-left flex flex-col justify-end p-2 ${
                    isSelected ? 'ring-2 border-transparent shadow-sm' : currentTheme.isLight ? 'border-[#CBD5E1] hover:border-[#94A3B8]' : 'border-white/10 hover:border-white/25'
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
          <div className={`flex items-center justify-between pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase`}>
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
              <label className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>
                Installed / Active Icon Pack
              </label>
              <span className={`text-[10px] ${currentTheme.classes.textMuted}`}>
                Icon geometry is dynamically styled by current Theme
              </span>
            </div>

            <ThemedSelect
              value={settings.selectedIconPackPackage || 'default'}
              onChange={(val) => {
                updateSettings({ selectedIconPackPackage: val === 'default' ? undefined : val });
                showToast(val === 'default' ? 'Default Material icons active' : 'Custom Icon Pack applied');
              }}
              options={[
                { value: 'default', label: 'Default Dynamic Material Icons (Adaptive)', sublabel: 'System Adaptive' },
                ...deviceIconPacks.map((pack) => ({
                  value: pack.packageName,
                  label: pack.label,
                  sublabel: pack.packageName,
                })),
              ]}
              className="w-full"
            />

            <p className={`text-[10px] ${currentTheme.classes.textMuted} leading-relaxed`}>
              {deviceIconPacks.length > 0
                ? `Detected ${deviceIconPacks.length} installed icon pack(s) on your system. Changes apply instantly across the launcher.`
                : 'Compatible with standard Android icon pack packages (Nova, Lawnchair, ADW, Apex) when running on device.'}
            </p>
          </div>
        </div>

        {/* SECTION 5: Global Surface & UI Opacity */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3.5`}>
          <div className={`flex items-center justify-between pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase`}>
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
                  <span className={`font-semibold ${currentTheme.classes.textPrimary}`}>System Surface Opacity</span>
                  <p className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Modulates transparency across every modal, panel, taskbar, popup, and window</p>
                </div>
                <span className="font-mono text-xs font-bold" style={{ color: currentAccent.hex }}>
                  {settings.taskbarOpacity ?? 92}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono ${currentTheme.classes.textMuted}`}>20%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={settings.taskbarOpacity ?? 92}
                  onChange={(e) => updateSettings({ taskbarOpacity: Number(e.target.value) })}
                  className="flex-1 h-2 bg-black/10 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: currentAccent.hex }}
                />
                <span className={`text-[10px] font-mono ${currentTheme.classes.textMuted}`}>100%</span>
              </div>
            </div>

            {/* Taskbar Icon Sizing */}
            <div className={`space-y-1.5 pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
              <label className={`text-[11px] font-semibold ${currentTheme.classes.textSecondary}`}>Taskbar Sizing</label>
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
                        : currentTheme.isLight
                        ? { backgroundColor: '#F8FAFD', borderColor: '#CBD5E1', color: '#475569' }
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

        {/* SECTION 6: Desktop Widgets & Telemetry */}
        {(() => {
          const isClockActive = settings.enableClockWidget !== false;
          const isDeviceNameActive = settings.enableDeviceNameWidget !== false;
          const isBatteryActive = settings.enableBatteryWidget !== false;
          const isNotesActive = settings.enableNotesWidget !== false;
          const activeWidgetCount = [isClockActive, isDeviceNameActive, isBatteryActive, isNotesActive].filter(Boolean).length;

          return (
            <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
              <div className={`flex items-center justify-between pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase`}>
                  <Clock size={15} style={{ color: currentAccent.hex }} />
                  <span>Desktop Widgets & Telemetry</span>
                </div>
                <div className="flex items-center gap-2">
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
                    className={`text-[10px] font-semibold px-2 py-0.5 ${currentTheme.buttonRadius} ${currentTheme.isLight ? 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] hover:text-[#0F172A]' : 'bg-white/5 text-[#94A3B8] border border-white/10 hover:text-white'} transition`}
                  >
                    {activeWidgetCount === 4 ? 'Hide All' : 'Show All'}
                  </button>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                    style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
                  >
                    {activeWidgetCount}/4 Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Digital Clock & Date Toggle */}
                <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isClockActive ? currentAccent.badgeBg : currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                        borderColor: isClockActive ? currentAccent.badgeBorder : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isClockActive ? currentAccent.hex : '#64748B',
                      }}
                    >
                      <Clock size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} block`}>Clock & Date</span>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>Digital readout with seconds</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isClockActive;
                      updateSettings({ enableClockWidget: next });
                      showToast(next ? 'Clock & Date enabled' : 'Clock & Date disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0`}
                    style={
                      isClockActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : currentTheme.isLight
                        ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isClockActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 2. Connected Device Name Toggle */}
                <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isDeviceNameActive ? currentAccent.badgeBg : currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                        borderColor: isDeviceNameActive ? currentAccent.badgeBorder : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isDeviceNameActive ? currentAccent.hex : '#64748B',
                      }}
                    >
                      <Laptop size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} block`}>Device Name Pill</span>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>Active mesh node tag</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isDeviceNameActive;
                      updateSettings({ enableDeviceNameWidget: next });
                      showToast(next ? 'Device pill enabled' : 'Device pill disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0`}
                    style={
                      isDeviceNameActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : currentTheme.isLight
                        ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isDeviceNameActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 3. Battery Stats Toggle */}
                <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isBatteryActive ? currentAccent.badgeBg : currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                        borderColor: isBatteryActive ? currentAccent.badgeBorder : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isBatteryActive ? currentAccent.hex : '#64748B',
                      }}
                    >
                      <Battery size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} block`}>Battery Stats</span>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>Percentage & charging state</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isBatteryActive;
                      updateSettings({ enableBatteryWidget: next });
                      showToast(next ? 'Battery widget enabled' : 'Battery widget disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0`}
                    style={
                      isBatteryActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : currentTheme.isLight
                        ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isBatteryActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 4. Notes & Tasks Widget Toggle */}
                <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: isNotesActive ? currentAccent.badgeBg : currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                        borderColor: isNotesActive ? currentAccent.badgeBorder : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: isNotesActive ? currentAccent.hex : '#64748B',
                      }}
                    >
                      <StickyNote size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} block`}>Sticky Notes & To-Dos</span>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>Homescreen quick tasks</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playTap();
                      const next = !isNotesActive;
                      updateSettings({ enableNotesWidget: next });
                      showToast(next ? 'Notes widget enabled' : 'Notes widget disabled');
                    }}
                    className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-[10px] font-bold transition border shrink-0`}
                    style={
                      isNotesActive
                        ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                        : currentTheme.isLight
                        ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                    }
                  >
                    {isNotesActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 5. Dual Clock / Secondary Timezone Selection */}
                <div className={`col-span-1 sm:col-span-2 p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border`}
                      style={{
                        backgroundColor: settings.secondaryTimezone ? currentAccent.badgeBg : currentTheme.isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                        borderColor: settings.secondaryTimezone ? currentAccent.badgeBorder : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.06)',
                        color: settings.secondaryTimezone ? currentAccent.hex : '#64748B',
                      }}
                    >
                      <Globe size={14} />
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} block`}>Dual Clock / Secondary Timezone</span>
                      <p className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Display secondary international timezone badge beside the date</p>
                    </div>
                  </div>

                  <ThemedSelect
                    value={settings.secondaryTimezone || ''}
                    onChange={(tz) => {
                      updateSettings({ secondaryTimezone: tz || undefined });
                      showToast(tz ? `Secondary clock set to ${tz.split('/').pop()?.replace(/_/g, ' ')}` : 'Secondary clock disabled');
                    }}
                    options={[
                      { value: '', label: 'None (Disabled)' },
                      { value: 'UTC', label: 'UTC (Universal Coordinated)', sublabel: 'UTC+0' },
                      { value: 'America/New_York', label: 'New York (EST / EDT)', sublabel: 'UTC-5 / UTC-4' },
                      { value: 'America/Chicago', label: 'Chicago (CST / CDT)', sublabel: 'UTC-6 / UTC-5' },
                      { value: 'America/Denver', label: 'Denver (MST / MDT)', sublabel: 'UTC-7 / UTC-6' },
                      { value: 'America/Los_Angeles', label: 'Los Angeles (PST / PDT)', sublabel: 'UTC-8 / UTC-7' },
                      { value: 'Europe/London', label: 'London (GMT / BST)', sublabel: 'UTC+0 / UTC+1' },
                      { value: 'Europe/Paris', label: 'Paris / Berlin (CET / CEST)', sublabel: 'UTC+1 / UTC+2' },
                      { value: 'Asia/Dubai', label: 'Dubai (GST)', sublabel: 'UTC+4' },
                      { value: 'Asia/Kolkata', label: 'India (IST)', sublabel: 'UTC+5:30' },
                      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', sublabel: 'UTC+7' },
                      { value: 'Asia/Singapore', label: 'Singapore (SGT)', sublabel: 'UTC+8' },
                      { value: 'Asia/Manila', label: 'Manila (PHT)', sublabel: 'UTC+8' },
                      { value: 'Asia/Tokyo', label: 'Tokyo / Seoul (JST / KST)', sublabel: 'UTC+9' },
                      { value: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', sublabel: 'UTC+10 / UTC+11' },
                      { value: 'Pacific/Auckland', label: 'Auckland (NZST / NZDT)', sublabel: 'UTC+12 / UTC+13' },
                    ]}
                    className="w-full sm:w-64 shrink-0"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* SECTION 7: Nodus Ecosystem Modules */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <Radio size={15} style={{ color: currentAccent.hex }} />
            <span>Nodus Ecosystem Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isFleetInstalled ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className={`text-xs font-bold ${currentTheme.classes.textPrimary}`}>Nodus Fleet</div>
                    <div className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Cluster mesh & discovery</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                  style={
                    isFleetInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {isFleetInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <span className={`text-[10px] font-semibold ${currentTheme.classes.textSecondary}`}>Multi-Device Features</span>
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
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableMultiDevice ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isTouchInstalled ? currentAccent.hex : '#8E8E93' }} />
                  <div>
                    <div className={`text-xs font-bold ${currentTheme.classes.textPrimary}`}>Nodus Touch</div>
                    <div className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Floating assistive squircle</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                  style={
                    isTouchInstalled
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {isTouchInstalled ? 'Installed' : 'Standalone'}
                </span>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <span className={`text-[10px] font-semibold ${currentTheme.classes.textSecondary}`}>Assistive Overlay</span>
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
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableAssistiveTouch ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 8: 🧪 Experimental Features (Multi-Window Canvas & PWAs) */}
        <div className={`p-4 sm:p-5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} shadow-sm space-y-3`}>
          <div className={`flex items-center gap-2 text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase pb-2 border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <FlaskConical size={15} style={{ color: currentAccent.hex }} />
            <span>🧪 Experimental Features</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Multi-Window Floating Canvas */}
            <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes size={16} style={{ color: currentAccent.hex }} />
                  <div>
                    <div className={`text-xs font-bold ${currentTheme.classes.textPrimary}`}>Multi-Window Web Canvas</div>
                    <div className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Draggable & resizable floating windows</div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <span className={`text-[10px] font-semibold ${currentTheme.classes.textSecondary}`}>Desktop Window Manager</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ enableExperimentalPwaWindows: !settings.enableExperimentalPwaWindows });
                    showToast(settings.enableExperimentalPwaWindows ? 'Multi-Window Canvas disabled' : 'Multi-Window Canvas enabled');
                  }}
                  className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition border`}
                  style={
                    settings.enableExperimentalPwaWindows
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableExperimentalPwaWindows ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* 2. Prefer Desktop PWA Alternatives */}
            <div className={`p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} style={{ color: currentAccent.hex }} />
                  <div>
                    <div className={`text-xs font-bold ${currentTheme.classes.textPrimary}`}>Prefer Desktop PWAs</div>
                    <div className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Route Discord, Spotify, Notion to Web</div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <span className={`text-[10px] font-semibold ${currentTheme.classes.textSecondary}`}>Desktop Viewport</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ preferPwaAlternatives: !settings.preferPwaAlternatives });
                    showToast(settings.preferPwaAlternatives ? 'Prefer Native Android Apps' : 'Prefer Desktop PWA Alternatives');
                  }}
                  className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition border`}
                  style={
                    settings.preferPwaAlternatives
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.preferPwaAlternatives ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* 3. Shizuku AOSP Freeform Hook */}
            <div className={`col-span-1 sm:col-span-2 p-3 ${currentTheme.cardRadius} ${currentTheme.isLight ? 'bg-[#F8FAFD] border border-[#E2E8F0]' : 'bg-black/20 border border-white/5'} flex flex-col justify-between gap-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={16} style={{ color: currentAccent.hex }} />
                  <div>
                    <div className={`text-xs font-bold ${currentTheme.classes.textPrimary}`}>Shizuku AOSP Freeform Dispatch</div>
                    <div className={`text-[10px] ${currentTheme.classes.textSecondary}`}>Bypass HyperOS 2-window cap via ADB windowingMode 5</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 ${currentTheme.buttonRadius} border`}
                  style={
                    typeof window !== 'undefined' && (window as any).NodusNativeBridge?.isShizukuAvailable?.()
                      ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#64748B', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.08)' }
                  }
                >
                  {typeof window !== 'undefined' && (window as any).NodusNativeBridge?.isShizukuAvailable?.() ? 'Shizuku Active' : 'Shizuku Ready'}
                </span>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
                <span className={`text-[10px] font-semibold ${currentTheme.classes.textSecondary}`}>Privileged Dispatch</span>
                <button
                  type="button"
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ enableExperimentalShizukuFreeform: !settings.enableExperimentalShizukuFreeform });
                    showToast(settings.enableExperimentalShizukuFreeform ? 'Shizuku Freeform disabled' : 'Shizuku Freeform enabled');
                  }}
                  className={`px-3 py-1 ${currentTheme.buttonRadius} text-[11px] font-bold transition border`}
                  style={
                    settings.enableExperimentalShizukuFreeform
                      ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                      : currentTheme.isLight
                      ? { backgroundColor: '#FFFFFF', color: '#475569', borderColor: '#CBD5E1' }
                      : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8E8E93', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {settings.enableExperimentalShizukuFreeform ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 9: Reset & Defaults */}
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
