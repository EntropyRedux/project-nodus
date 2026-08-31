import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { audio } from '../../utils/audio';

export interface ThemedSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  compact?: boolean;
}

export const ThemedSelect: React.FC<ThemedSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  compact = false,
}) => {
  const { settings } = useLauncher();
  const currentTheme = getSystemTheme(settings?.theme || 'aurora-dark');
  const currentAccent = getAccentColor(settings?.accentColor || 'emerald');

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    audio.playTap();
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          audio.playTap();
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 text-left transition-all ${
          compact
            ? `px-2.5 py-1 text-[11px] ${currentTheme.buttonRadius} ${currentTheme.classes.itemCard}`
            : `px-3.5 py-2.5 text-xs ${currentTheme.buttonRadius} ${currentTheme.classes.inputField}`
        } ${buttonClassName} ${isOpen ? 'ring-1' : ''}`}
        style={isOpen ? { borderColor: currentAccent.hex, outline: 'none' } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`truncate font-medium ${selectedOption ? currentTheme.classes.textPrimary : currentTheme.classes.textMuted}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={compact ? 12 : 14}
          className={`shrink-0 ${currentTheme.classes.textMuted} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating Flyout Menu */}
      {isOpen && (
        <div
          style={{
            backgroundColor: getSurfaceRgba(settings?.theme || 'aurora-dark', 98, 'popup'),
          }}
          className={`absolute z-[100] mt-1 min-w-[180px] max-w-[280px] max-h-64 overflow-y-auto p-1.5 shadow-2xl ${
            currentTheme.cardRadius
          } ${currentTheme.classes.drawerFlyout} backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-150 scrollbar-thin ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 ${currentTheme.buttonRadius} text-left text-xs transition-colors ${
                    isSelected
                      ? currentTheme.isLight
                        ? 'bg-white text-[#0F172A] font-bold shadow-xs border border-[#CBD5E1]'
                        : 'bg-white/10 text-white font-bold'
                      : currentTheme.isLight
                      ? 'hover:bg-[#F1F5F9] text-[#334155]'
                      : 'hover:bg-white/5 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {opt.icon && (
                      <span className="shrink-0" style={isSelected ? { color: currentAccent.hex } : undefined}>
                        {opt.icon}
                      </span>
                    )}
                    <div className="min-w-0 truncate">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className={`block text-[9px] truncate ${currentTheme.classes.textMuted}`}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={13} strokeWidth={2.5} style={{ color: currentAccent.hex }} className="shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
