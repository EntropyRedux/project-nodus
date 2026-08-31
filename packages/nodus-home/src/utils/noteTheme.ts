import { ThemeId, NoteColor } from '../types/launcher';

export interface NoteColorThemeStyle {
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  textColor: string;
  secondaryTextColor: string;
  dotColor: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  inputBg: string;
}

export const NOTE_COLOR_KEYS: NoteColor[] = ['amber', 'emerald', 'sapphire', 'purple', 'rose'];

export function getNoteColorStyle(
  color: NoteColor = 'amber',
  themeId: ThemeId = 'glassmorphism',
  opacityPercent?: number
): NoteColorThemeStyle {
  const userPct = opacityPercent ?? 92;
  const alpha = Math.max(0.15, Math.min(0.98, userPct / 100));

  switch (themeId) {
    case 'material-light': {
      const bgOpacity = (Math.max(0.88, Math.min(0.98, alpha * 0.96))).toFixed(3);
      switch (color) {
        case 'emerald':
          return {
            cardBg: `rgba(209, 250, 229, ${bgOpacity})`,
            cardBorder: 'border border-[#86EFAC]',
            cardShadow: 'shadow-[0_2px_12px_rgba(16,185,129,0.08),0_1px_3px_rgba(0,0,0,0.03)]',
            textColor: 'text-[#064E3B]',
            secondaryTextColor: 'text-[#047857]',
            dotColor: '#10B981',
            label: 'Pastel Mint',
            badgeBg: 'bg-[#A7F3D0] text-[#065F46] border border-[#6EE7B7]',
            badgeText: 'text-[#065F46]',
            inputBg: 'bg-[#DCFCE7] border border-[#86EFAC] text-[#064E3B]',
          };
        case 'sapphire':
          return {
            cardBg: `rgba(224, 242, 254, ${bgOpacity})`,
            cardBorder: 'border border-[#7DD3FC]',
            cardShadow: 'shadow-[0_2px_12px_rgba(56,189,248,0.08),0_1px_3px_rgba(0,0,0,0.03)]',
            textColor: 'text-[#0C4A6E]',
            secondaryTextColor: 'text-[#0284C7]',
            dotColor: '#0284C7',
            label: 'Pastel Sky',
            badgeBg: 'bg-[#BAE6FD] text-[#0369A1] border border-[#7DD3FC]',
            badgeText: 'text-[#0369A1]',
            inputBg: 'bg-[#E0F2FE] border border-[#7DD3FC] text-[#0C4A6E]',
          };
        case 'purple':
          return {
            cardBg: `rgba(243, 232, 255, ${bgOpacity})`,
            cardBorder: 'border border-[#DDD6FE]',
            cardShadow: 'shadow-[0_2px_12px_rgba(168,85,247,0.08),0_1px_3px_rgba(0,0,0,0.03)]',
            textColor: 'text-[#581C87]',
            secondaryTextColor: 'text-[#7E22CE]',
            dotColor: '#9333EA',
            label: 'Pastel Lavender',
            badgeBg: 'bg-[#E9D5FF] text-[#6B21A8] border border-[#D8B4FE]',
            badgeText: 'text-[#6B21A8]',
            inputBg: 'bg-[#F3E8FF] border border-[#DDD6FE] text-[#581C87]',
          };
        case 'rose':
          return {
            cardBg: `rgba(255, 228, 230, ${bgOpacity})`,
            cardBorder: 'border border-[#FDA4AF]',
            cardShadow: 'shadow-[0_2px_12px_rgba(244,63,94,0.08),0_1px_3px_rgba(0,0,0,0.03)]',
            textColor: 'text-[#881337]',
            secondaryTextColor: 'text-[#BE123C]',
            dotColor: '#E11D48',
            label: 'Pastel Blossom',
            badgeBg: 'bg-[#FECDD3] text-[#9F1239] border border-[#FDA4AF]',
            badgeText: 'text-[#9F1239]',
            inputBg: 'bg-[#FFE4E6] border border-[#FDA4AF] text-[#881337]',
          };
        case 'amber':
        default:
          return {
            cardBg: `rgba(254, 243, 199, ${bgOpacity})`,
            cardBorder: 'border border-[#FDE047]',
            cardShadow: 'shadow-[0_2px_12px_rgba(245,158,11,0.08),0_1px_3px_rgba(0,0,0,0.03)]',
            textColor: 'text-[#78350F]',
            secondaryTextColor: 'text-[#B45309]',
            dotColor: '#D97706',
            label: 'Pastel Butter',
            badgeBg: 'bg-[#FEF08A] text-[#854D0E] border border-[#FACC15]',
            badgeText: 'text-[#854D0E]',
            inputBg: 'bg-[#FEF9C3] border border-[#FDE047] text-[#78350F]',
          };
      }
    }

    case 'neobrutalism': {
      // Dark brutalist surfaces with tinted dark backgrounds
      const bgOpacity = (alpha * 0.95).toFixed(3);
      switch (color) {
        case 'emerald':
          return {
            cardBg: `rgba(6, 40, 28, ${bgOpacity})`,
            cardBorder: 'border-2 border-emerald-500/80',
            cardShadow: 'shadow-[3px_3px_0px_#10B981]',
            textColor: 'text-[#ECFDF5]',
            secondaryTextColor: 'text-[#A7F3D0]',
            dotColor: '#10B981',
            label: 'Mint Green',
            badgeBg: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/60',
            badgeText: 'text-emerald-300',
            inputBg: 'bg-[#041F16] border-2 border-emerald-500/80 text-[#ECFDF5]',
          };
        case 'sapphire':
          return {
            cardBg: `rgba(8, 32, 52, ${bgOpacity})`,
            cardBorder: 'border-2 border-sky-500/80',
            cardShadow: 'shadow-[3px_3px_0px_#38BDF8]',
            textColor: 'text-[#F0F9FF]',
            secondaryTextColor: 'text-[#BAE6FD]',
            dotColor: '#38BDF8',
            label: 'Sky Blue',
            badgeBg: 'bg-sky-950/70 text-sky-300 border border-sky-500/60',
            badgeText: 'text-sky-300',
            inputBg: 'bg-[#071D30] border-2 border-sky-500/80 text-[#F0F9FF]',
          };
        case 'purple':
          return {
            cardBg: `rgba(32, 14, 52, ${bgOpacity})`,
            cardBorder: 'border-2 border-purple-500/80',
            cardShadow: 'shadow-[3px_3px_0px_#A855F7]',
            textColor: 'text-[#FAF5FF]',
            secondaryTextColor: 'text-[#E9D5FF]',
            dotColor: '#A855F7',
            label: 'Lilac Violet',
            badgeBg: 'bg-purple-950/70 text-purple-300 border border-purple-500/60',
            badgeText: 'text-purple-300',
            inputBg: 'bg-[#1C0D2F] border-2 border-purple-500/80 text-[#FAF5FF]',
          };
        case 'rose':
          return {
            cardBg: `rgba(45, 10, 22, ${bgOpacity})`,
            cardBorder: 'border-2 border-rose-500/80',
            cardShadow: 'shadow-[3px_3px_0px_#F43F5E]',
            textColor: 'text-[#FFF1F2]',
            secondaryTextColor: 'text-[#FECDD3]',
            dotColor: '#F43F5E',
            label: 'Coral Pink',
            badgeBg: 'bg-rose-950/70 text-rose-300 border border-rose-500/60',
            badgeText: 'text-rose-300',
            inputBg: 'bg-[#290814] border-2 border-rose-500/80 text-[#FFF1F2]',
          };
        case 'amber':
        default:
          return {
            cardBg: `rgba(42, 26, 4, ${bgOpacity})`,
            cardBorder: 'border-2 border-amber-500/80',
            cardShadow: 'shadow-[3px_3px_0px_#F59E0B]',
            textColor: 'text-[#FFFBEB]',
            secondaryTextColor: 'text-[#FDE68A]',
            dotColor: '#F59E0B',
            label: 'Solar Gold',
            badgeBg: 'bg-amber-950/70 text-amber-300 border border-amber-500/60',
            badgeText: 'text-amber-300',
            inputBg: 'bg-[#241703] border-2 border-amber-500/80 text-[#FFFBEB]',
          };
      }
    }

    case 'cyberpunk-hud': {
      const bgOpacity = (alpha * 0.92).toFixed(3);
      switch (color) {
        case 'emerald':
          return {
            cardBg: `rgba(4, 31, 22, ${bgOpacity})`,
            cardBorder: 'border border-emerald-500/45',
            cardShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
            textColor: 'text-[#D1FAE5]',
            secondaryTextColor: 'text-[#6EE7B7]',
            dotColor: '#10B981',
            label: 'Matrix Emerald',
            badgeBg: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40',
            badgeText: 'text-emerald-300',
            inputBg: 'bg-black/90 border border-emerald-500/40 text-[#D1FAE5]',
          };
        case 'sapphire':
          return {
            cardBg: `rgba(4, 26, 46, ${bgOpacity})`,
            cardBorder: 'border border-cyan-500/45',
            cardShadow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
            textColor: 'text-[#E0F2FE]',
            secondaryTextColor: 'text-[#7DD3FC]',
            dotColor: '#38BDF8',
            label: 'Cyber Cyan',
            badgeBg: 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40',
            badgeText: 'text-cyan-300',
            inputBg: 'bg-black/90 border border-cyan-500/40 text-[#E0F2FE]',
          };
        case 'purple':
          return {
            cardBg: `rgba(24, 10, 42, ${bgOpacity})`,
            cardBorder: 'border border-purple-500/45',
            cardShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
            textColor: 'text-[#F3E8FF]',
            secondaryTextColor: 'text-[#D8B4FE]',
            dotColor: '#A855F7',
            label: 'Neon Violet',
            badgeBg: 'bg-purple-950/70 text-purple-300 border border-purple-500/40',
            badgeText: 'text-purple-300',
            inputBg: 'bg-black/90 border border-purple-500/40 text-[#F3E8FF]',
          };
        case 'rose':
          return {
            cardBg: `rgba(34, 7, 18, ${bgOpacity})`,
            cardBorder: 'border border-rose-500/45',
            cardShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
            textColor: 'text-[#FFE4E6]',
            secondaryTextColor: 'text-[#FDA4AF]',
            dotColor: '#F43F5E',
            label: 'Laser Rose',
            badgeBg: 'bg-rose-950/70 text-rose-300 border border-rose-500/40',
            badgeText: 'text-rose-300',
            inputBg: 'bg-black/90 border border-rose-500/40 text-[#FFE4E6]',
          };
        case 'amber':
        default:
          return {
            cardBg: `rgba(33, 20, 3, ${bgOpacity})`,
            cardBorder: 'border border-amber-500/45',
            cardShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
            textColor: 'text-[#FEF3C7]',
            secondaryTextColor: 'text-[#FCD34D]',
            dotColor: '#F59E0B',
            label: 'Solar Amber',
            badgeBg: 'bg-amber-950/70 text-amber-300 border border-amber-500/40',
            badgeText: 'text-amber-300',
            inputBg: 'bg-black/90 border border-amber-500/40 text-[#FEF3C7]',
          };
      }
    }

    case 'nordic-minimal': {
      const bgOpacity = (alpha * 0.90).toFixed(3);
      switch (color) {
        case 'emerald':
          return {
            cardBg: `rgba(12, 24, 20, ${bgOpacity})`,
            cardBorder: 'border border-emerald-500/30',
            cardShadow: 'shadow-none',
            textColor: 'text-[#ECFDF5]',
            secondaryTextColor: 'text-[#A7F3D0]',
            dotColor: '#10B981',
            label: 'Sage Mint',
            badgeBg: 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20',
            badgeText: 'text-emerald-300',
            inputBg: 'bg-[#101E1A] border border-emerald-500/20 text-[#ECFDF5]',
          };
        case 'sapphire':
          return {
            cardBg: `rgba(12, 22, 34, ${bgOpacity})`,
            cardBorder: 'border border-sky-500/30',
            cardShadow: 'shadow-none',
            textColor: 'text-[#F0F9FF]',
            secondaryTextColor: 'text-[#BAE6FD]',
            dotColor: '#38BDF8',
            label: 'Nordic Frost',
            badgeBg: 'bg-sky-950/40 text-sky-300 border border-sky-500/20',
            badgeText: 'text-sky-300',
            inputBg: 'bg-[#101A26] border border-sky-500/20 text-[#F0F9FF]',
          };
        case 'purple':
          return {
            cardBg: `rgba(20, 14, 34, ${bgOpacity})`,
            cardBorder: 'border border-purple-500/30',
            cardShadow: 'shadow-none',
            textColor: 'text-[#FAF5FF]',
            secondaryTextColor: 'text-[#E9D5FF]',
            dotColor: '#A855F7',
            label: 'Nordic Heather',
            badgeBg: 'bg-purple-950/40 text-purple-300 border border-purple-500/20',
            badgeText: 'text-purple-300',
            inputBg: 'bg-[#181226] border border-purple-500/20 text-[#FAF5FF]',
          };
        case 'rose':
          return {
            cardBg: `rgba(28, 14, 20, ${bgOpacity})`,
            cardBorder: 'border border-rose-500/30',
            cardShadow: 'shadow-none',
            textColor: 'text-[#FFF1F2]',
            secondaryTextColor: 'text-[#FECDD3]',
            dotColor: '#F43F5E',
            label: 'Nordic Berry',
            badgeBg: 'bg-rose-950/40 text-rose-300 border border-rose-500/20',
            badgeText: 'text-rose-300',
            inputBg: 'bg-[#221118] border border-rose-500/20 text-[#FFF1F2]',
          };
        case 'amber':
        default:
          return {
            cardBg: `rgba(24, 18, 8, ${bgOpacity})`,
            cardBorder: 'border border-amber-500/30',
            cardShadow: 'shadow-none',
            textColor: 'text-[#FFFBEB]',
            secondaryTextColor: 'text-[#FDE68A]',
            dotColor: '#F59E0B',
            label: 'Nordic Wheat',
            badgeBg: 'bg-amber-950/40 text-amber-300 border border-amber-500/20',
            badgeText: 'text-amber-300',
            inputBg: 'bg-[#1E170A] border border-amber-500/20 text-[#FFFBEB]',
          };
      }
    }

    case 'glassmorphism':
    default: {
      // Dark frosted glass surfaces with smooth opacity modulation
      const bgOpacity = (alpha * 0.88).toFixed(3);
      switch (color) {
        case 'emerald':
          return {
            cardBg: `rgba(6, 36, 26, ${bgOpacity})`,
            cardBorder: 'border border-emerald-500/30',
            cardShadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            textColor: 'text-[#F1F5F9]',
            secondaryTextColor: 'text-[#6EE7B7]',
            dotColor: '#10B981',
            label: 'Emerald Mint',
            badgeBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
            badgeText: 'text-emerald-300',
            inputBg: 'bg-black/40 border border-emerald-500/20 text-white',
          };
        case 'sapphire':
          return {
            cardBg: `rgba(8, 30, 48, ${bgOpacity})`,
            cardBorder: 'border border-sky-500/30',
            cardShadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            textColor: 'text-[#F1F5F9]',
            secondaryTextColor: 'text-[#7DD3FC]',
            dotColor: '#38BDF8',
            label: 'Azure Blue',
            badgeBg: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
            badgeText: 'text-sky-300',
            inputBg: 'bg-black/40 border border-sky-500/20 text-white',
          };
        case 'purple':
          return {
            cardBg: `rgba(32, 12, 48, ${bgOpacity})`,
            cardBorder: 'border border-purple-500/30',
            cardShadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            textColor: 'text-[#F1F5F9]',
            secondaryTextColor: 'text-[#D8B4FE]',
            dotColor: '#A855F7',
            label: 'Violet Lavender',
            badgeBg: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
            badgeText: 'text-purple-300',
            inputBg: 'bg-black/40 border border-purple-500/20 text-white',
          };
        case 'rose':
          return {
            cardBg: `rgba(46, 8, 20, ${bgOpacity})`,
            cardBorder: 'border border-rose-500/30',
            cardShadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            textColor: 'text-[#F1F5F9]',
            secondaryTextColor: 'text-[#FDA4AF]',
            dotColor: '#F43F5E',
            label: 'Coral Rose',
            badgeBg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
            badgeText: 'text-rose-300',
            inputBg: 'bg-black/40 border border-rose-500/20 text-white',
          };
        case 'amber':
        default:
          return {
            cardBg: `rgba(38, 20, 4, ${bgOpacity})`,
            cardBorder: 'border border-amber-500/30',
            cardShadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
            textColor: 'text-[#F1F5F9]',
            secondaryTextColor: 'text-[#FCD34D]',
            dotColor: '#F59E0B',
            label: 'Amber Gold',
            badgeBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
            badgeText: 'text-amber-300',
            inputBg: 'bg-black/40 border border-amber-500/20 text-white',
          };
      }
    }
  }
}
