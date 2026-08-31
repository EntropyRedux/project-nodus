import React from 'react';
import { ThemeId, AccentColorId } from '../types/launcher';

/* =========================================================
   1. ACCENT COLOR DEFINITIONS
   ========================================================= */

export interface AccentColorConfig {
  id: AccentColorId;
  name: string;
  subtitle: string;
  hex: string;
  lightHex: string;
  darkHex: string;
  glowRgba: string;
  badgeBg: string;
  badgeBorder: string;
  previewPalette: string[];
}

export const ACCENT_COLORS: Record<AccentColorId, AccentColorConfig> = {
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire',
    subtitle: 'Electric Azure & Tech Blue',
    hex: '#38BDF8',
    lightHex: '#0284C7',
    darkHex: '#0369A1',
    glowRgba: 'rgba(56, 189, 248, 0.35)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    previewPalette: ['#38BDF8', '#0284C7', '#0369A1', '#E0F2FE'],
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    subtitle: 'Warm Solar & Phosphor Gold',
    hex: '#F59E0B',
    lightHex: '#D97706',
    darkHex: '#B45309',
    glowRgba: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    previewPalette: ['#F59E0B', '#D97706', '#B45309', '#FEF3C7'],
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    subtitle: 'Vibrant Crimson & Neon Berry',
    hex: '#F43F5E',
    lightHex: '#E11D48',
    darkHex: '#BE123C',
    glowRgba: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeBorder: 'rgba(244, 63, 94, 0.35)',
    previewPalette: ['#F43F5E', '#E11D48', '#BE123C', '#FFE4E6'],
  },
  garnet: {
    id: 'garnet',
    name: 'Garnet',
    subtitle: 'Deep Wine & Imperial Crimson',
    hex: '#DC2626',
    lightHex: '#B91C1C',
    darkHex: '#991B1B',
    glowRgba: 'rgba(220, 38, 38, 0.35)',
    badgeBg: 'rgba(220, 38, 38, 0.15)',
    badgeBorder: 'rgba(220, 38, 38, 0.35)',
    previewPalette: ['#DC2626', '#B91C1C', '#991B1B', '#FEE2E2'],
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    subtitle: 'Matrix Phosphor & Jade Green',
    hex: '#10B981',
    lightHex: '#059669',
    darkHex: '#047857',
    glowRgba: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.35)',
    previewPalette: ['#10B981', '#059669', '#047857', '#D1FAE5'],
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst',
    subtitle: 'Mystic Purple & Royal Violet',
    hex: '#A855F7',
    lightHex: '#9333EA',
    darkHex: '#7E22CE',
    glowRgba: 'rgba(168, 85, 247, 0.35)',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeBorder: 'rgba(168, 85, 247, 0.35)',
    previewPalette: ['#A855F7', '#9333EA', '#7E22CE', '#F3E8FF'],
  },
};

export const ACCENT_COLOR_LIST: AccentColorConfig[] = Object.values(ACCENT_COLORS);

export function getAccentColor(id?: AccentColorId | string): AccentColorConfig {
  if (id && (ACCENT_COLORS as Record<string, AccentColorConfig>)[id]) {
    return (ACCENT_COLORS as Record<string, AccentColorConfig>)[id];
  }
  return ACCENT_COLORS.sapphire;
}

/* =========================================================
   2. SYSTEM UI THEME PACK DEFINITIONS
   ========================================================= */

export interface SystemTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  designSystem: string;
  description: string;
  keyAesthetic: string[];
  wallpaperId: string;
  wallpaperStyle: React.CSSProperties;
  archetype: 'glass' | 'hud' | 'brutalist' | 'minimal' | 'material';
  cardRadius: string;
  buttonRadius: string;
  pillRadius: string;
  borderStyle: string;
  cardShadow: string;
  activeButtonTransform: string;
  classes: {
    containerFont: string;
    bgCanvas: string;
    bgOverlay: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    cardBg: string;
    cardBorder: string;
    cardBorderHover: string;
    cardHeader: string;
    taskbarBg: string;
    taskbarBorder: string;
    sidebarBg: string;
    badgeStyle: string;
    modalContainer: string;
    modalHeader: string;
    drawerFlyout: string;
    inputField: string;
    actionButton: string;
    itemCard: string;
    contextMenu: string;
    iconBg: string;
    iconBorder: string;
    iconHover: string;
    iconShadow: string;
    folderBg: string;
  };
}

export const SYSTEM_THEMES: Record<ThemeId, SystemTheme> = {
  'material-light': {
    id: 'material-light',
    name: 'Material Atmosphere',
    tagline: 'Google Material You & Tonal Light Canvas',
    designSystem: 'Google Material 3',
    description: 'Clean, high-legibility Google-inspired light surfaces with pastel tonal containers, pill geometry, and soft ambient elevation.',
    keyAesthetic: ['Tonal surface containers', 'Pill & squircle geometry', 'High-contrast typography', 'Soft ambient elevation'],
    wallpaperId: 'alpine',
    wallpaperStyle: {
      backgroundColor: '#090B10',
      backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% -15%, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.05), rgba(9, 11, 16, 0.98))',
    },
    archetype: 'material',
    cardRadius: 'rounded-3xl',
    buttonRadius: 'rounded-2xl',
    pillRadius: 'rounded-full',
    borderStyle: 'border border-[#E2E8F0]',
    cardShadow: 'shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
    activeButtonTransform: 'active:scale-95 transition-transform duration-100',
    classes: {
      containerFont: 'font-sans',
      bgCanvas: 'bg-[#F0F4F9]',
      bgOverlay: 'bg-black/[0.02]',
      textPrimary: 'text-[#0F172A]',
      textSecondary: 'text-[#334155]',
      textMuted: 'text-[#64748B]',
      cardBg: 'backdrop-blur-xl',
      cardBorder: 'border-[#E2E8F0]',
      cardBorderHover: 'hover:border-[#CBD5E1]',
      cardHeader: 'bg-[#F8FAFD] border-b border-[#E2E8F0]',
      taskbarBg: 'backdrop-blur-2xl',
      taskbarBorder: 'border-t border-[#E2E8F0]',
      sidebarBg: 'backdrop-blur-2xl border-r border-[#E2E8F0]',
      badgeStyle: 'font-medium rounded-full bg-[#EBF3FE] text-[#0B57D0] border border-[#BFDBFE]',
      modalContainer: 'backdrop-blur-3xl border border-[#E2E8F0] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)]',
      modalHeader: 'bg-[#F8FAFD] border-b border-[#E2E8F0]',
      drawerFlyout: 'backdrop-blur-3xl border border-[#E2E8F0] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.14),0_6px_16px_rgba(0,0,0,0.06)]',
      inputField: 'bg-[#F8FAFD] border border-[#CBD5E1] rounded-2xl text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0B57D0] focus:bg-[#FFFFFF]',
      actionButton: 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0] rounded-2xl active:scale-95 transition-all',
      itemCard: 'bg-[#FFFFFF] hover:bg-[#F8FAFD] border border-[#E2E8F0] rounded-2xl shadow-xs',
      contextMenu: 'backdrop-blur-2xl border border-[#E2E8F0] rounded-2xl shadow-2xl shadow-black/10',
      iconBg: 'bg-[#FFFFFF]',
      iconBorder: 'border border-[#E2E8F0]',
      iconHover: 'hover:bg-[#F8FAFD] hover:border-[#CBD5E1]',
      iconShadow: 'shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
      folderBg: 'bg-[#F8FAFD] border border-[#E2E8F0] shadow-xs hover:bg-[#F1F5F9]',
    },
  },
  'glassmorphism': {
    id: 'glassmorphism',
    name: 'Obsidian Glass',
    tagline: 'Fluent Acrylic & Soft Frosted Glass',
    designSystem: 'Aero Glassmorphism',
    description: 'Ultra-refined translucent dark surfaces, smooth organic squircles, and delicate ambient light reflections.',
    keyAesthetic: ['Frosted backdrop blurs', 'Smooth rounded corners', 'Ambient glow halos', 'Minimal floating dock'],
    wallpaperId: 'alpine',
    wallpaperStyle: {
      backgroundColor: '#090B10',
      backgroundImage: 'radial-gradient(ellipse 75% 65% at 50% -15%, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.05), rgba(9, 11, 16, 0.98))',
    },
    archetype: 'glass',
    cardRadius: 'rounded-2xl',
    buttonRadius: 'rounded-xl',
    pillRadius: 'rounded-full',
    borderStyle: 'border border-white/[0.08]',
    cardShadow: 'shadow-[0_20px_50px_rgba(0,0,0,0.7)]',
    activeButtonTransform: 'active:scale-95 transition-transform duration-100',
    classes: {
      containerFont: 'font-sans',
      bgCanvas: 'bg-[#090B10]',
      bgOverlay: 'bg-[#090B10]/45',
      textPrimary: 'text-[#F1F5F9]',
      textSecondary: 'text-[#94A3B8]',
      textMuted: 'text-[#64748B]',
      cardBg: 'backdrop-blur-3xl',
      cardBorder: 'border-white/[0.08]',
      cardBorderHover: 'hover:border-white/[0.22]',
      cardHeader: 'bg-white/[0.02] border-b border-white/[0.06]',
      taskbarBg: 'backdrop-blur-2xl',
      taskbarBorder: 'border-t border-white/[0.08]',
      sidebarBg: 'backdrop-blur-2xl border-r border-white/[0.05]',
      badgeStyle: 'backdrop-blur-md font-medium rounded-full',
      modalContainer: 'backdrop-blur-3xl border border-white/[0.12] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.9)]',
      modalHeader: 'bg-white/[0.02] border-b border-white/[0.08]',
      drawerFlyout: 'backdrop-blur-3xl border border-white/[0.10] rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)]',
      inputField: 'bg-white/[0.04] border border-white/[0.10] rounded-xl text-[#F1F5F9] placeholder-[#64748B] focus:border-[#38BDF8] focus:bg-white/[0.06]',
      actionButton: 'bg-white/[0.04] hover:bg-white/[0.08] text-[#F1F5F9] border border-white/[0.08] rounded-xl active:scale-95 transition-all',
      itemCard: 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl shadow-none',
      contextMenu: 'backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/90',
      iconBg: 'bg-gradient-to-b from-[#1E293B]/85 via-[#141E30]/90 to-[#0F1726]/95',
      iconBorder: 'border border-white/[0.12]',
      iconHover: 'hover:from-[#2A3852] hover:to-[#162133] hover:border-white/[0.28]',
      iconShadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]',
      folderBg: 'bg-gradient-to-b from-[#1E293B]/80 to-[#0F1726]/90 border border-white/[0.12] shadow-xl hover:from-[#2A3852]/90 hover:to-[#162133]/95',
    },
  },
  'cyberpunk-hud': {
    id: 'cyberpunk-hud',
    name: 'Cyberpunk HUD',
    tagline: 'Tactical Sci-Fi & Segmented Terminal',
    designSystem: 'Tactical Military HUD',
    description: 'Angular chamfered framing, monospace telemetry readouts, scanline matrices, bracketed labels, and high-tech status grids.',
    keyAesthetic: ['[SYS//ONLINE] brackets', 'Sharp chamfered edges', 'Monospace telemetry', 'Segmented tactical grid'],
    wallpaperId: 'deep-nebula',
    wallpaperStyle: {
      backgroundColor: '#05070B',
      backgroundImage: 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(20, 30, 45, 0.4), rgba(5, 7, 11, 0.98)), repeating-linear-gradient(0deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 4px)',
    },
    archetype: 'hud',
    cardRadius: 'rounded-none',
    buttonRadius: 'rounded-none',
    pillRadius: 'rounded-none',
    borderStyle: 'border border-cyan-500/30',
    cardShadow: 'shadow-[0_0_25px_rgba(0,240,255,0.08)]',
    activeButtonTransform: 'active:translate-x-0.5 active:translate-y-0.5 transition-transform duration-75',
    classes: {
      containerFont: 'font-hud',
      bgCanvas: 'bg-[#05070B]',
      bgOverlay: 'bg-[#05070B]/70',
      textPrimary: 'text-[#E2F1F8]',
      textSecondary: 'text-[#7B9EAF]',
      textMuted: 'text-[#415C6B]',
      cardBg: 'backdrop-blur-md',
      cardBorder: 'border-white/[0.14]',
      cardBorderHover: 'hover:border-cyan-400/50',
      cardHeader: 'bg-white/[0.04] border-b border-white/[0.15]',
      taskbarBg: 'backdrop-blur-xl',
      taskbarBorder: 'border-t border-cyan-500/30',
      sidebarBg: 'backdrop-blur-xl border-r border-cyan-500/20',
      badgeStyle: 'font-mono uppercase tracking-widest text-[10px] rounded-none border border-cyan-500/30',
      modalContainer: 'border-2 border-cyan-500/40 rounded-none shadow-[0_0_35px_rgba(0,240,255,0.12)]',
      modalHeader: 'bg-cyan-950/30 border-b border-cyan-500/30',
      drawerFlyout: 'border-2 border-cyan-500/40 rounded-none shadow-[0_0_35px_rgba(0,0,0,0.95)]',
      inputField: 'bg-black/90 border border-cyan-500/40 rounded-none text-[#E2F1F8] placeholder-[#415C6B] focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] font-mono',
      actionButton: 'bg-black/80 hover:bg-cyan-950/40 text-[#E2F1F8] border border-cyan-500/40 rounded-none font-mono uppercase tracking-wider transition-all',
      itemCard: 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-cyan-500/40 rounded-none shadow-none',
      contextMenu: 'border border-cyan-500/40 rounded-none shadow-[0_0_25px_rgba(0,0,0,0.9)]',
      iconBg: 'bg-gradient-to-b from-[#0B2535]/95 via-[#061B27]/95 to-[#031018]/95',
      iconBorder: 'border border-cyan-500/45',
      iconHover: 'hover:border-cyan-400 hover:from-[#11354A] hover:to-[#082231] hover:shadow-[0_0_16px_rgba(0,240,255,0.3)]',
      iconShadow: 'shadow-[0_0_12px_rgba(0,240,255,0.12)]',
      folderBg: 'bg-[#071F2C]/95 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:border-cyan-400/80 hover:bg-[#0C2D3F]',
    },
  },
  'neobrutalism': {
    id: 'neobrutalism',
    name: 'Neobrutalism',
    tagline: 'Bauhaus Graphic & High-Contrast 3D',
    designSystem: 'Retro Pop Neobrutalism',
    description: 'Chunky 2.5px solid high-contrast borders, solid tactile 3D offset drop shadows, sticker badges, and crisp geometric pop.',
    keyAesthetic: ['Solid 4px offset shadow', 'Thick 2.5px dark borders', 'Tactile button press', 'Sticker chip tags'],
    wallpaperId: 'tokyo-synth',
    wallpaperStyle: {
      backgroundColor: '#0F1117',
      backgroundImage: 'radial-gradient(#ffffff0a 2px, transparent 2px)',
      backgroundSize: '24px 24px',
    },
    archetype: 'brutalist',
    cardRadius: 'rounded-xl',
    buttonRadius: 'rounded-lg',
    pillRadius: 'rounded-md',
    borderStyle: 'border-2 border-black/80',
    cardShadow: 'shadow-[6px_6px_0px_#000000]',
    activeButtonTransform: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-75',
    classes: {
      containerFont: 'font-brutalist',
      bgCanvas: 'bg-[#0C0E14]',
      bgOverlay: 'bg-black/40',
      textPrimary: 'text-[#FFFFFF]',
      textSecondary: 'text-[#D1D5DB]',
      textMuted: 'text-[#9CA3AF]',
      cardBg: 'backdrop-blur-md',
      cardBorder: 'border-2 border-black',
      cardBorderHover: 'hover:border-white/80',
      cardHeader: 'bg-[#12151D] border-b-2 border-black',
      taskbarBg: 'backdrop-blur-md',
      taskbarBorder: 'border-t-2 border-black shadow-[0_-4px_0px_#000000]',
      sidebarBg: 'border-r-2 border-black',
      badgeStyle: 'font-black uppercase tracking-wider text-[10px] rounded-md border border-black shadow-[2px_2px_0px_#000000]',
      modalContainer: 'border-2 border-black rounded-xl shadow-[8px_8px_0px_#000000]',
      modalHeader: 'bg-[#12151D] border-b-2 border-black',
      drawerFlyout: 'border-2 border-black rounded-xl shadow-[8px_8px_0px_#000000]',
      inputField: 'bg-[#0E1118] border-2 border-black rounded-lg text-white placeholder-[#6B7280] focus:border-white font-bold',
      actionButton: 'bg-[#202534] hover:bg-[#282F42] text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold transition-all',
      itemCard: 'bg-white/[0.05] hover:bg-white/[0.09] border-2 border-black rounded-lg shadow-[2px_2px_0px_#000000]',
      contextMenu: 'border-2 border-black rounded-lg shadow-[5px_5px_0px_#000000]',
      iconBg: 'bg-[#2A3147]',
      iconBorder: 'border-2 border-black',
      iconHover: 'hover:bg-[#353E59]',
      iconShadow: 'shadow-[3px_3px_0px_#000000]',
      folderBg: 'bg-[#252C40] border-2 border-black shadow-[4px_4px_0px_#000000] hover:bg-[#303850]',
    },
  },
  'nordic-minimal': {
    id: 'nordic-minimal',
    name: 'Nordic Minimal',
    tagline: 'Swiss Editorial & Flat Studio Canvas',
    designSystem: 'Minimalist Swiss Studio',
    description: 'Understated Swiss typographic hierarchy, flat matte slate surfaces, zero decorative drop-shadows, and pure breathability.',
    keyAesthetic: ['Zero drop-shadows', 'Hairline grid dividers', 'Matte charcoal slate', 'Generous whitespace'],
    wallpaperId: 'midnight-slate',
    wallpaperStyle: {
      backgroundColor: '#0D1117',
      backgroundImage: 'linear-gradient(180deg, #111620 0%, #0D1117 100%)',
    },
    archetype: 'minimal',
    cardRadius: 'rounded-none',
    buttonRadius: 'rounded-none',
    pillRadius: 'rounded-none',
    borderStyle: 'border border-white/[0.08]',
    cardShadow: 'shadow-none',
    activeButtonTransform: 'active:opacity-75 transition-opacity duration-100',
    classes: {
      containerFont: 'font-minimal',
      bgCanvas: 'bg-[#0D1117]',
      bgOverlay: 'bg-[#0D1117]/40',
      textPrimary: 'text-[#F8FAFC]',
      textSecondary: 'text-[#94A3B8]',
      textMuted: 'text-[#64748B]',
      cardBg: 'backdrop-blur-md',
      cardBorder: 'border-white/[0.08]',
      cardBorderHover: 'hover:border-white/[0.20]',
      cardHeader: 'bg-transparent border-b border-white/[0.08]',
      taskbarBg: 'backdrop-blur-md',
      taskbarBorder: 'border-t border-white/[0.08]',
      sidebarBg: 'border-r border-white/[0.08]',
      badgeStyle: 'font-normal tracking-normal text-[11px] rounded-none border border-white/[0.08]',
      modalContainer: 'border border-white/[0.12] rounded-none shadow-none',
      modalHeader: 'bg-transparent border-b border-white/[0.08]',
      drawerFlyout: 'border border-white/[0.12] rounded-none shadow-none',
      inputField: 'bg-transparent border border-white/[0.12] rounded-none text-[#F8FAFC] placeholder-[#64748B] focus:border-white/40',
      actionButton: 'bg-white/[0.03] hover:bg-white/[0.06] text-[#F8FAFC] border border-white/[0.08] rounded-none transition-colors',
      itemCard: 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-none shadow-none',
      contextMenu: 'border border-white/[0.12] rounded-none shadow-none',
      iconBg: 'bg-[#1E2638]',
      iconBorder: 'border border-white/[0.12]',
      iconHover: 'hover:bg-[#2A344C] hover:border-white/[0.25]',
      iconShadow: 'shadow-none',
      folderBg: 'bg-[#1A2130] border border-white/[0.12] hover:bg-[#242D40] shadow-none',
    },
  },
};

export const THEME_LIST: SystemTheme[] = Object.values(SYSTEM_THEMES);

export function getSystemTheme(themeId?: ThemeId | string): SystemTheme {
  if (themeId && (SYSTEM_THEMES as Record<string, SystemTheme>)[themeId]) {
    return (SYSTEM_THEMES as Record<string, SystemTheme>)[themeId];
  }
  return SYSTEM_THEMES['glassmorphism'];
}

export type SurfaceType = 'modal' | 'panel' | 'taskbar' | 'sidebar' | 'popup' | 'window' | 'card' | 'itemCard';

/**
 * Computes reactive RGBA color for any surface type based on the active theme and global opacity slider value.
 */
export function getSurfaceRgba(themeId?: ThemeId | string, opacityPercent?: number, surface: SurfaceType = 'panel'): string {
  const userPct = opacityPercent ?? 92;
  const alpha = Math.max(0.12, Math.min(0.98, userPct / 100));
  const t = themeId || 'glassmorphism';

  switch (t) {
    case 'material-light':
      switch (surface) {
        case 'modal': return `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;
        case 'panel': return `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;
        case 'taskbar': return `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
        case 'sidebar': return `rgba(248, 250, 253, ${(alpha * 0.95).toFixed(3)})`;
        case 'popup': return `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;
        case 'window': return `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;
        case 'card': return `rgba(255, 255, 255, ${(Math.max(0.85, alpha * 0.95)).toFixed(3)})`;
        case 'itemCard': return `rgba(248, 250, 252, ${(Math.max(0.70, alpha * 0.90)).toFixed(3)})`;
      }
      break;

    case 'cyberpunk-hud':
      switch (surface) {
        case 'modal': return `rgba(7, 12, 18, ${(alpha * 0.96).toFixed(3)})`;
        case 'panel': return `rgba(7, 12, 18, ${(alpha * 0.94).toFixed(3)})`;
        case 'taskbar': return `rgba(7, 11, 16, ${(alpha * 0.90).toFixed(3)})`;
        case 'sidebar': return `rgba(6, 9, 14, ${(alpha * 0.88).toFixed(3)})`;
        case 'popup': return `rgba(8, 13, 20, ${(alpha * 0.96).toFixed(3)})`;
        case 'window': return `rgba(8, 13, 20, ${(alpha * 0.94).toFixed(3)})`;
        case 'card': return `rgba(8, 13, 20, ${(alpha * 0.85).toFixed(3)})`;
        case 'itemCard': return `rgba(255, 255, 255, ${(Math.max(0.02, alpha * 0.06)).toFixed(3)})`;
      }
      break;

    case 'neobrutalism':
      switch (surface) {
        case 'modal': return `rgba(24, 28, 38, ${(alpha * 0.98).toFixed(3)})`;
        case 'panel': return `rgba(24, 28, 38, ${(alpha * 0.96).toFixed(3)})`;
        case 'taskbar': return `rgba(24, 28, 38, ${(alpha * 0.94).toFixed(3)})`;
        case 'sidebar': return `rgba(24, 28, 38, ${(alpha * 0.92).toFixed(3)})`;
        case 'popup': return `rgba(24, 28, 38, ${(alpha * 0.98).toFixed(3)})`;
        case 'window': return `rgba(24, 28, 38, ${(alpha * 0.96).toFixed(3)})`;
        case 'card': return `rgba(24, 28, 38, ${(alpha * 0.88).toFixed(3)})`;
        case 'itemCard': return `rgba(255, 255, 255, ${(Math.max(0.02, alpha * 0.06)).toFixed(3)})`;
      }
      break;

    case 'nordic-minimal':
      switch (surface) {
        case 'modal': return `rgba(19, 24, 34, ${(alpha * 0.96).toFixed(3)})`;
        case 'panel': return `rgba(19, 24, 34, ${(alpha * 0.94).toFixed(3)})`;
        case 'taskbar': return `rgba(19, 24, 34, ${(alpha * 0.90).toFixed(3)})`;
        case 'sidebar': return `rgba(15, 20, 29, ${(alpha * 0.88).toFixed(3)})`;
        case 'popup': return `rgba(19, 24, 34, ${(alpha * 0.96).toFixed(3)})`;
        case 'window': return `rgba(19, 24, 34, ${(alpha * 0.94).toFixed(3)})`;
        case 'card': return `rgba(19, 24, 34, ${(alpha * 0.85).toFixed(3)})`;
        case 'itemCard': return `rgba(255, 255, 255, ${(Math.max(0.015, alpha * 0.04)).toFixed(3)})`;
      }
      break;

    case 'glassmorphism':
    default:
      switch (surface) {
        case 'modal': return `rgba(9, 11, 16, ${(alpha * 0.92).toFixed(3)})`;
        case 'panel': return `rgba(9, 11, 16, ${(alpha * 0.88).toFixed(3)})`;
        case 'taskbar': return `rgba(9, 11, 16, ${(alpha * 0.85).toFixed(3)})`;
        case 'sidebar': return `rgba(9, 11, 16, ${(alpha * 0.80).toFixed(3)})`;
        case 'popup': return `rgba(14, 18, 26, ${(alpha * 0.95).toFixed(3)})`;
        case 'window': return `rgba(9, 11, 16, ${(alpha * 0.86).toFixed(3)})`;
        case 'card': return `rgba(255, 255, 255, ${(Math.max(0.02, alpha * 0.05)).toFixed(3)})`;
        case 'itemCard': return `rgba(255, 255, 255, ${(Math.max(0.015, alpha * 0.045)).toFixed(3)})`;
      }
      break;
  }
}
