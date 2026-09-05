import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

export type Theme = 'midnight' | 'light' | 'obsidian' | 'cyberpunk' | 'slate';

interface ThemePickerProps {
  current: Theme;
  onChange: (theme: Theme) => void;
}

const THEMES: { id: Theme; name: string; desc: string; color: string; bg: string }[] = [
  {
    id: 'midnight',
    name: 'Midnight Dark',
    desc: 'Deep slate & navy M3 aesthetic',
    color: '#A8C7FA',
    bg: '#111318',
  },
  {
    id: 'light',
    name: 'Material Light',
    desc: 'Google M3 clean light baseline',
    color: '#0B57D0',
    bg: '#F4F6FB',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Glass',
    desc: 'Frosted purple/violet glassmorphism',
    color: '#A78BFA',
    bg: '#030305',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    desc: 'Vibrant neon cyan & yellow accents',
    color: '#22D3EE',
    bg: '#090D16',
  },
  {
    id: 'slate',
    name: 'Slate Minimal',
    desc: 'Minimalist industrial monochrome',
    color: '#94A3B8',
    bg: '#0F172A',
  },
];

export const ThemePicker: React.FC<ThemePickerProps> = ({ current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeTheme = THEMES.find((t) => t.id === current) || THEMES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Current Theme: ${activeTheme.name}`}
        className="h-8 px-2.5 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-2 transition border border-[var(--border-subtle)] active:scale-95"
      >
        <div
          className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: activeTheme.color }}
        />
        <Palette size={13} className="text-[var(--accent-primary)]" />
        <span className="hidden sm:inline text-[11px] font-medium">{activeTheme.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-56 p-1.5 rounded-xl bg-[var(--surface-modal)] border border-[var(--border-subtle)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            Select Color Scheme
          </div>
          {THEMES.map((theme) => {
            const isSelected = current === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onChange(theme.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition text-xs ${
                  isSelected
                    ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold shadow-sm'
                    : 'text-[var(--text-body)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow-sm"
                    style={{ backgroundColor: theme.color }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{theme.name}</div>
                    <div className="truncate text-[10px] opacity-75 font-mono">{theme.desc}</div>
                  </div>
                </div>
                {isSelected && <Check size={14} className="shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
