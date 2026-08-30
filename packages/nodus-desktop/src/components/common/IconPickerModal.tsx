import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Search, X, Check, RotateCcw, Sparkles } from 'lucide-react';

interface IconPickerModalProps {
  appName: string;
  currentIconName?: string;
  currentIconColor?: string;
  onSelectIcon: (iconName: string, iconColor: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Emerald', hex: '#34C759' },
  { name: 'Rose Red', hex: '#F43F5E' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Amber Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Silver', hex: '#E2E8F0' },
  { name: 'Slate', hex: '#94A3B8' },
];

// Popular quick categories
const CURATED_ICONS = [
  // Development & Code
  'Code', 'Terminal', 'Cpu', 'Database', 'GitBranch', 'FileCode', 'Layers', 'Boxes', 'Braces', 'Command',
  // Browsers & Web
  'Globe', 'Chrome', 'Compass', 'ExternalLink', 'Link', 'Cloud', 'Network', 'Wifi', 'Share2',
  // AI & Smart Tools
  'Sparkles', 'Bot', 'Wand2', 'Brain', 'Zap', 'Lightbulb', 'Eye', 'Flame',
  // Media, Audio & Video
  'Music', 'Film', 'Video', 'Play', 'Volume2', 'Mic', 'Radio', 'Headphones', 'Disc', 'Tv',
  // Creative & Design
  'PenTool', 'Palette', 'Brush', 'Image', 'Camera', 'Scissors', 'Crop', 'Feather', 'Layout',
  // Games & Entertainment
  'Gamepad2', 'Ghost', 'Sword', 'Trophy', 'Dice5', 'Smile', 'Heart',
  // Productivity & Office
  'FileText', 'BookOpen', 'Calendar', 'Clock', 'CheckSquare', 'Bookmark', 'Paperclip', 'Printer', 'Mail',
  // System, Tools & Security
  'Activity', 'Settings', 'Sliders', 'Shield', 'Lock', 'Key', 'Folder', 'HardDrive', 'Server', 'Monitor',
  'Calculator', 'Search', 'Bell', 'Download', 'Upload', 'Power', 'Maximize2', 'Compass', 'Star'
];

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  appName,
  currentIconName = 'AppWindow',
  currentIconColor = '#38BDF8',
  onSelectIcon,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(currentIconName);
  const [selectedColor, setSelectedColor] = useState(currentIconColor);

  // Get all available Lucide icon names
  const allIconNames = useMemo(() => {
    const rawKeys = Object.keys(Icons).filter((k) => {
      if (k === 'createLucideIcon' || k === 'default' || k.startsWith('Lucide') || k.endsWith('Icon')) return false;
      const val = (Icons as any)[k];
      return typeof val === 'object' || typeof val === 'function';
    });
    return Array.from(new Set([...CURATED_ICONS, ...rawKeys]));
  }, []);

  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allIconNames.slice(0, 180);
    return allIconNames.filter((name) => name.toLowerCase().includes(query)).slice(0, 240);
  }, [allIconNames, search]);

  const handleSave = () => {
    onSelectIcon(selectedIcon, selectedColor);
    onClose();
  };

  const PreviewComponent = (Icons as any)[selectedIcon] || Icons.AppWindow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#0F1117] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/15 transition"
              style={{ backgroundColor: `${selectedColor}20`, borderColor: `${selectedColor}60` }}
            >
              <PreviewComponent size={26} style={{ color: selectedColor }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Choose Icon for</span>
                <span className="text-[#38BDF8] truncate max-w-[240px]">"{appName}"</span>
              </h3>
              <p className="text-xs text-[#8E8E93]">
                Select any Lucide icon and accent color to represent this shortcut on your tablet.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-[#8E8E93] uppercase font-mono mr-1 shrink-0">Color:</span>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setSelectedColor(c.hex)}
              title={c.name}
              className={`w-6 h-6 rounded-full shrink-0 transition-transform flex items-center justify-center ${
                selectedColor === c.hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0F1117]' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
            >
              {selectedColor === c.hex && <Check size={11} className="text-black font-black" />}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (e.g., code, terminal, bot, globe, camera, play, game...)"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#64748B] text-xs focus:outline-none focus:border-[#38BDF8]"
              autoFocus
            />
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2.5 scrollbar-thin">
          {filteredIcons.map((iconKey) => {
            const IconComp = (Icons as any)[iconKey];
            if (!IconComp) return null;
            const isSelected = selectedIcon === iconKey;

            return (
              <button
                key={iconKey}
                onClick={() => setSelectedIcon(iconKey)}
                title={iconKey}
                className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition group ${
                  isSelected
                    ? 'bg-[#38BDF8]/20 border border-[#38BDF8] shadow-lg scale-105 ring-1 ring-[#38BDF8]'
                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-white/15'
                }`}
              >
                <IconComp
                  size={22}
                  style={{ color: isSelected ? selectedColor : '#94A3B8' }}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-[9px] font-mono text-[#8E8E93] group-hover:text-white truncate w-full text-center">
                  {iconKey}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-[#8E8E93] font-mono">
            Selected: <span className="text-white font-bold">{selectedIcon}</span> ({selectedColor})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#38BDF8] text-black text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Apply Icon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
