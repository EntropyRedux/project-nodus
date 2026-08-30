import React, { useState, useMemo, memo } from 'react';
import {
  Clipboard,
  X,
  Search,
  Pin,
  Trash2,
  Check,
  Copy,
  Plus,
  Filter,
  Layers,
  Laptop,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Link,
  Code,
  FileText
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { ClipboardItem } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface ClipboardHistoryPanelProps {
  onClose: () => void;
}

export const ClipboardHistoryPanel: React.FC<ClipboardHistoryPanelProps> = ({ onClose }) => {
  const {
    clipboardItems,
    addClipboardItem,
    removeClipboardItem,
    togglePinClipboardItem,
    clearClipboardHistory,
    copyClipboardItem,
    devices,
    activeDevice,
    settings,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newClipText, setNewClipText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clipboardItems.filter((item) => {
      const matchesSearch = !q || item.text.toLowerCase().includes(q) || item.deviceName.toLowerCase().includes(q);
      const matchesSource = filterSource === 'all' || item.sourceDevice === filterSource;
      const matchesPin = !showPinnedOnly || item.isPinned;
      return matchesSearch && matchesSource && matchesPin;
    });
  }, [clipboardItems, searchQuery, filterSource, showPinnedOnly]);

  const handleCopy = (item: ClipboardItem) => {
    audio.playTap();
    copyClipboardItem(item);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === item.id ? null : curr));
    }, 2000);
  };

  const handleAddNewClip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClipText.trim()) return;
    audio.playTap();

    let cat: ClipboardItem['category'] = 'text';
    if (newClipText.startsWith('http://') || newClipText.startsWith('https://')) {
      cat = 'link';
    } else if (newClipText.includes('{') || newClipText.includes('function') || newClipText.includes('const ') || newClipText.includes('npm ') || newClipText.includes('ssh ')) {
      cat = 'code';
    }

    addClipboardItem(newClipText, cat);
    setNewClipText('');
    setIsAddingNew(false);
  };

  const getItemIcon = (cat?: string) => {
    switch (cat) {
      case 'link':
        return <Link size={12} style={{ color: currentAccent.hex }} />;
      case 'code':
        return <Code size={12} className="text-[#10B981]" />;
      default:
        return <FileText size={12} className="text-[#F59E0B]" />;
    }
  };

  return (
    <div 
      className={`w-full h-full flex flex-col ${currentTheme.cardRadius} ${currentTheme.classes.cardBorder} overflow-hidden ${currentTheme.classes.textPrimary} select-none ${currentTheme.classes.containerFont} backdrop-blur-3xl transition-colors duration-200`}
      style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
    >
      {/* Header */}
      <div className={`p-3.5 sm:p-4 ${currentTheme.classes.cardHeader} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 ${currentTheme.buttonRadius} border`}
            style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
          >
            <Clipboard size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider uppercase font-mono flex items-center gap-2">
              <span>{currentTheme.archetype === 'hud' ? 'CLUSTER CLIPBOARD // BUFFER' : 'Cluster Clipboard'}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 ${currentTheme.pillRadius}`}
                style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex }}
              >
                {clipboardItems.length}
              </span>
            </h3>
            <p className="text-[10px] text-[#94A3B8]">Synchronized across mesh nodes</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              audio.playTap();
              setIsAddingNew(!isAddingNew);
            }}
            className={`p-1.5 ${currentTheme.buttonRadius} border transition`}
            style={
              isAddingNew
                ? { backgroundColor: currentAccent.hex, color: '#090B10', borderColor: currentAccent.hex }
                : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)' }
            }
            title="Create new clipboard snippet"
          >
            <Plus size={14} />
          </button>

          <button
            onClick={onClose}
            className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-white/10 text-[#94A3B8] hover:text-[#F1F5F9] transition`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* New Clip Input Drawer */}
      {isAddingNew && (
        <form onSubmit={handleAddNewClip} className={`p-3 ${currentTheme.classes.cardHeader} space-y-2`}>
          <textarea
            value={newClipText}
            onChange={(e) => setNewClipText(e.target.value)}
            placeholder="Type or paste payload to broadcast across mesh..."
            rows={3}
            autoFocus
            className={`w-full ${currentTheme.classes.inputField} p-2 text-xs font-mono resize-none`}
          />
          <div className="flex items-center justify-end gap-1.5 font-mono">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-2.5 py-1 text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newClipText.trim()}
              className={`px-3 py-1 ${currentTheme.buttonRadius} font-bold text-xs transition disabled:opacity-40`}
              style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
            >
              Broadcast Snippet
            </button>
          </div>
        </form>
      )}

      {/* Search & Filtering Bar */}
      <div className={`p-2.5 ${currentTheme.classes.cardHeader} space-y-2`}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clipboard payloads..."
            className={`w-full ${currentTheme.classes.inputField} pl-7 pr-3 py-1.5 text-xs`}
          />
        </div>

        {/* Source Device Chips & Pin Filter */}
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setFilterSource('all')}
              className={`px-2 py-0.5 ${currentTheme.buttonRadius} font-semibold transition whitespace-nowrap`}
              style={
                filterSource === 'all'
                  ? { backgroundColor: currentAccent.hex, color: '#090B10', fontWeight: 'bold' }
                  : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8' }
              }
            >
              All Nodes
            </button>
            {devices.map((dev) => (
              <button
                key={dev.id}
                onClick={() => setFilterSource(dev.id)}
                className={`px-2 py-0.5 ${currentTheme.buttonRadius} font-semibold transition whitespace-nowrap truncate max-w-[100px]`}
                style={
                  filterSource === dev.id
                    ? { backgroundColor: currentAccent.hex, color: '#090B10', fontWeight: 'bold' }
                    : { backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8' }
                }
              >
                {dev.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`p-1.5 ${currentTheme.buttonRadius} border transition shrink-0 ${
              showPinnedOnly
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                : 'bg-white/[0.04] text-[#94A3B8] hover:text-white border-white/5'
            }`}
            title="Show Pinned Only"
          >
            <Pin size={11} className={showPinnedOnly ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      {/* Clipboard List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8]">
            <Clipboard size={24} className="mx-auto mb-2 opacity-30" style={{ color: currentAccent.hex }} />
            <p className="text-xs font-semibold">No clipboard snippets found</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Copy payload from any connected mesh node</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item)}
                className={`group p-2.5 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} transition-all cursor-pointer relative ${
                  isCopied ? 'ring-1' : ''
                }`}
                style={isCopied ? { borderColor: currentAccent.hex, boxShadow: `0 0 0 1px ${currentAccent.hex}` } : {}}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8] pb-1 mb-1 border-b border-white/5 font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getItemIcon(item.category)}
                    <span className="font-semibold text-[#E2E8F0] truncate">{item.deviceName}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => togglePinClipboardItem(item.id)}
                      className={`p-1 rounded-md transition hover:bg-white/10 ${
                        item.isPinned ? 'text-[#F59E0B]' : 'text-[#94A3B8] hover:text-white'
                      }`}
                      title={item.isPinned ? 'Unpin' : 'Pin clip'}
                    >
                      <Pin size={11} className={item.isPinned ? 'fill-current' : ''} />
                    </button>
                    <button
                      onClick={() => removeClipboardItem(item.id)}
                      className="p-1 rounded-md text-[#94A3B8] hover:text-[#F43F5E] hover:bg-white/10 transition"
                      title="Delete clip"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Text Payload */}
                <p className="text-xs font-mono text-[#E2E8F0] whitespace-pre-wrap break-words line-clamp-4 select-text leading-relaxed">
                  {item.text}
                </p>

                {/* Bottom Feedback Bar */}
                <div className="flex items-center justify-between text-[9px] text-[#94A3B8] pt-1.5 mt-1 border-t border-white/5 font-mono">
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex items-center gap-1 font-semibold" style={{ color: currentAccent.hex }}>
                    {isCopied ? (
                      <>
                        <Check size={10} /> Copied to Buffer
                      </>
                    ) : (
                      <>
                        <Copy size={9} /> Tap to Copy
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Clear All */}
      <div className={`p-2.5 ${currentTheme.classes.cardHeader} flex items-center justify-between text-[11px] text-[#94A3B8] font-mono`}>
        <span className="text-[10px]">Click any item to copy to local buffer</span>
        <button
          onClick={clearClipboardHistory}
          className="text-[#94A3B8] hover:text-[#F43F5E] transition flex items-center gap-1 font-medium text-[10px]"
        >
          <Trash2 size={12} /> Clear Unpinned
        </button>
      </div>
    </div>
  );
};
