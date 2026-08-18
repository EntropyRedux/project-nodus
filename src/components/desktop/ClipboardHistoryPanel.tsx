import React, { useState, useMemo } from 'react';
import { 
  Clipboard, 
  Copy, 
  Check, 
  Pin, 
  Trash2, 
  Search, 
  ExternalLink, 
  Code, 
  FileText, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Laptop, 
  Send, 
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { ClipboardItem, DeviceType } from '../../types/launcher';
import { DEVICE_COLORS } from '../../utils/constants';

interface ClipboardHistoryPanelProps {
  onClose?: () => void;
}

export const ClipboardHistoryPanel: React.FC<ClipboardHistoryPanelProps> = ({ onClose }) => {
  const { 
    clipboardItems, 
    addClipboardItem, 
    removeClipboardItem, 
    togglePinClipboardItem, 
    clearClipboardHistory,
    devices,
    activeDeviceId,
    settings
  } = useLauncher();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  const clipboardPanelAlpha = (settings.clipboardPanelOpacity ?? 85) / 100;
  
  // Quick Broadcast Input
  const [inputText, setInputText] = useState('');
  const [inputDeviceId, setInputDeviceId] = useState<string>(activeDeviceId);

  const getDeviceIcon = (type: DeviceType, size = 12) => {
    switch (type) {
      case 'tablet': return <Tablet size={size} />;
      case 'desktop': return <Monitor size={size} />;
      case 'laptop': return <Laptop size={size} />;
      default: return <Smartphone size={size} />;
    }
  };

  const handleCopy = (item: ClipboardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audio.playTap();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(item.text).catch(() => {});
    }
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playTap();
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    audio.playTap();
    addClipboardItem({
      text: inputText.trim(),
      deviceId: inputDeviceId,
    });
    setInputText('');
  };

  // Filter items (memoized for instantaneous rendering)
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clipboardItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.text.toLowerCase().includes(q) ||
        item.deviceName.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);

      const matchesDevice = filterDevice === 'all' || item.deviceId === filterDevice;
      const matchesPin = !onlyPinned || item.pinned;

      return matchesSearch && matchesDevice && matchesPin;
    });
  }, [clipboardItems, searchQuery, filterDevice, onlyPinned]);

  return (
    <div className="w-80 lg:w-84 xl:w-88 flex-shrink-0 flex flex-col gap-2.5 p-3 select-none min-h-0 overflow-y-auto scrollbar-thin">
      {/* 1. Compact Header Card */}
      <div 
        className="p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl space-y-2.5"
        style={{
          backgroundColor: `rgba(28, 28, 30, ${clipboardPanelAlpha})`,
        }}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
              <Clipboard size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0F0F2] tracking-wide">Clipboard History</h3>
              <p className="text-[10px] text-[#8E8E93]">Shared across linked nodes</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center gap-1 border border-[#34C759]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              SYNC
            </span>

            {onClose && (
              <button
                onClick={() => {
                  audio.playTap();
                  onClose();
                }}
                className="p-1 rounded-lg text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-white/10 transition"
                title="Hide Clipboard Panel"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-1.5">
          <div className="relative w-full">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0C]/80 border border-white/10 rounded-xl pl-7 pr-7 py-1 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#F0F0F2]"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Device Filter Icons (Color Coded, Icon-first) */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => {
                audio.playTap();
                setFilterDevice('all');
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition shrink-0 ${
                filterDevice === 'all'
                  ? 'bg-white/20 text-[#F0F0F2] font-bold border border-white/20'
                  : 'bg-[#0A0A0C]/60 text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5'
              }`}
            >
              All ({clipboardItems.length})
            </button>

            <button
              onClick={() => {
                audio.playTap();
                setOnlyPinned(!onlyPinned);
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition shrink-0 flex items-center gap-1 ${
                onlyPinned
                  ? 'bg-[#FFD60A]/20 text-[#FFD60A] font-bold border border-[#FFD60A]/40'
                  : 'bg-[#0A0A0C]/60 text-[#8E8E93] hover:text-[#FFD60A] border border-white/5'
              }`}
              title="Pinned only"
            >
              <Pin size={10} className={onlyPinned ? 'fill-[#FFD60A]' : ''} />
            </button>

            {devices.map((d) => {
              const devColor = DEVICE_COLORS[d.id] || '#34C759';
              const isSelected = filterDevice === d.id;
              const count = clipboardItems.filter((i) => i.deviceId === d.id).length;

              return (
                <button
                  key={d.id}
                  onClick={() => {
                    audio.playTap();
                    setFilterDevice(isSelected ? 'all' : d.id);
                  }}
                  className="p-1 rounded-lg text-[10px] transition shrink-0 flex items-center gap-1 border"
                  style={{
                    backgroundColor: isSelected ? `${devColor}30` : '#0A0A0C99',
                    borderColor: isSelected ? `${devColor}80` : 'rgba(255,255,255,0.06)',
                    color: devColor,
                  }}
                  title={`${d.name} (${count} clips)`}
                >
                  {getDeviceIcon(d.type, 11)}
                  <span className="text-[9px] font-mono opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Quick Broadcast Input */}
      <form
        onSubmit={handleBroadcast}
        className="p-2 rounded-xl backdrop-blur-xl border border-white/10 shadow-md flex items-center gap-1.5"
        style={{
          backgroundColor: `rgba(28, 28, 30, ${clipboardPanelAlpha})`,
        }}
      >
        <div 
          className="p-1 rounded-lg border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${DEVICE_COLORS[inputDeviceId] || '#34C759'}20`,
            borderColor: `${DEVICE_COLORS[inputDeviceId] || '#34C759'}40`,
            color: DEVICE_COLORS[inputDeviceId] || '#34C759'
          }}
          title={`Origin node: ${devices.find((d) => d.id === inputDeviceId)?.name}`}
        >
          {getDeviceIcon(devices.find((d) => d.id === inputDeviceId)?.type || 'desktop', 12)}
        </div>

        <select
          value={inputDeviceId}
          onChange={(e) => setInputDeviceId(e.target.value)}
          className="bg-transparent text-[10px] text-[#8E8E93] focus:outline-none max-w-[65px] truncate cursor-pointer"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id} className="bg-[#1C1C1E] text-white">
              {d.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Sync new text..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-[#0A0A0C] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759] min-w-0"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] rounded-lg transition flex items-center justify-center disabled:opacity-30 shrink-0"
          title="Broadcast to cluster"
        >
          <Send size={12} />
        </button>
      </form>

      {/* 3. Compact Clipboard Cards List */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center bg-[#1C1C1E]/50 rounded-2xl border border-white/5 text-[#8E8E93] space-y-1.5">
            <Clipboard size={22} className="mx-auto opacity-30 text-[#34C759]" />
            <p className="text-xs font-semibold text-[#F0F0F2]">No clips found</p>
            <p className="text-[10px]">Copy text on any device to see it here.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const devColor = item.deviceColor || DEVICE_COLORS[item.deviceId] || '#34C759';
            const isJustCopied = copiedId === item.id;
            const isExpanded = Boolean(expandedIds[item.id]);
            const isCode = item.type === 'code';
            const isLink = item.type === 'link';

            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item)}
                className="group relative p-2 rounded-xl bg-[#17171C]/90 hover:bg-[#1C1C22] border border-white/10 hover:border-white/20 transition-all duration-150 shadow-sm flex flex-col gap-1.5 cursor-pointer"
                style={{
                  borderLeftWidth: '3.5px',
                  borderLeftColor: devColor,
                }}
              >
                {/* Main Row: Device Icon Badge + Truncated Text + Action Icon Buttons */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  {/* Left: Device Icon Badge with Tooltip */}
                  <div
                    className="p-1 rounded-md shrink-0 flex items-center justify-center border transition"
                    style={{
                      backgroundColor: `${devColor}20`,
                      borderColor: `${devColor}40`,
                      color: devColor,
                    }}
                    title={`Device: ${item.deviceName} • ${item.timestamp}`}
                  >
                    {getDeviceIcon(item.deviceType, 11)}
                  </div>

                  {/* Center: Truncated 1-Row Text when collapsed, or header title */}
                  <div className="flex-1 min-w-0">
                    {!isExpanded ? (
                      <span className={`text-xs block truncate ${
                        isLink 
                          ? 'text-[#007AFF] font-mono underline decoration-blue-500/30' 
                          : isCode 
                          ? 'text-[#34C759] font-mono text-[11px]' 
                          : 'text-[#F0F0F2]'
                      }`}>
                        {item.text}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93]">
                        <span className="font-semibold text-[#F0F0F2] truncate">{item.deviceName}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Icon-Only Action Buttons */}
                  <div 
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Expand/Collapse Toggle Button */}
                    <button
                      onClick={(e) => toggleExpand(item.id, e)}
                      className={`p-1 rounded-md transition ${
                        isExpanded
                          ? 'bg-white/15 text-white'
                          : 'text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-white/10'
                      }`}
                      title={isExpanded ? 'Collapse to single row' : 'Expand full content'}
                    >
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {/* Pin Button */}
                    <button
                      onClick={() => togglePinClipboardItem(item.id)}
                      className={`p-1 rounded-md transition ${
                        item.pinned
                          ? 'text-[#FFD60A] bg-[#FFD60A]/15'
                          : 'text-[#8E8E93] hover:text-[#FFD60A] hover:bg-white/10'
                      }`}
                      title={item.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={11} className={item.pinned ? 'fill-[#FFD60A]' : ''} />
                    </button>

                    {/* Copy Button (Icon Only with status check) */}
                    <button
                      onClick={(e) => handleCopy(item, e)}
                      className={`p-1 rounded-md transition ${
                        isJustCopied
                          ? 'bg-[#34C759] text-[#0A0A0C] shadow-sm'
                          : 'text-[#8E8E93] hover:text-[#34C759] hover:bg-white/10'
                      }`}
                      title={isJustCopied ? 'Copied!' : 'Copy'}
                    >
                      {isJustCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => removeClipboardItem(item.id)}
                      className="p-1 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-white/10 rounded-md transition"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Expanded Multi-Line Content Container */}
                {isExpanded && (
                  <div className="pt-1 text-xs border-t border-white/5 animate-in fade-in zoom-in-95 duration-150">
                    {isLink ? (
                      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[#0A0A0C] border border-white/5 text-[#007AFF] font-mono break-all leading-relaxed">
                        <ExternalLink size={12} className="shrink-0 mt-0.5" />
                        <span className="underline decoration-blue-500/40">{item.text}</span>
                      </div>
                    ) : isCode ? (
                      <pre className="p-2 rounded-lg bg-[#0A0A0C] border border-white/5 text-[#34C759] font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                        {item.text}
                      </pre>
                    ) : (
                      <div className="p-2 rounded-lg bg-[#0A0A0C]/60 border border-white/5 text-[#F0F0F2] whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                        {item.text}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] text-[#8E8E93] pt-1.5 px-0.5">
                      <span className="uppercase font-mono font-bold tracking-wider opacity-70">
                        {item.type} • {item.text.length} chars
                      </span>
                      <span className="italic text-[#34C759]">Click anywhere on card to copy</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Compact Bottom Status Bar */}
      <div className="p-2 rounded-xl bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 shadow-md flex items-center justify-between text-[10px] text-[#8E8E93] shrink-0">
        <span>
          {clipboardItems.length} items ({clipboardItems.filter((i) => i.pinned).length} pinned)
        </span>

        {clipboardItems.some((i) => !i.pinned) && (
          <button
            onClick={clearClipboardHistory}
            className="p-1 rounded-md text-[#8E8E93] hover:text-[#FF3B30] hover:bg-white/5 transition flex items-center gap-1 font-semibold"
            title="Clear unpinned clips"
          >
            <Trash2 size={11} />
            <span>Clear Unpinned</span>
          </button>
        )}
      </div>
    </div>
  );
};
