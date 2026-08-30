import React, { useState } from 'react';
import { 
  Clipboard, 
  Copy, 
  Check, 
  Pin, 
  Trash2, 
  Search, 
  Send, 
  X, 
  Tablet, 
  Monitor,
  Sparkles,
  Link,
  Code,
  FileText
} from 'lucide-react';
import { useDesktop } from '../../context/DesktopContext';
import { ClipboardItem } from '../../types/desktop';

export const ClipboardPanel: React.FC = () => {
  const { 
    clipboardItems, 
    addClipboardItem, 
    removeClipboardItem, 
    togglePinClipboardItem, 
    clearClipboardHistory, 
    closePanel 
  } = useDesktop();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = clipboardItems.filter((item) => {
    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDevice = filterDevice === 'all' || item.deviceId === filterDevice;
    return matchesSearch && matchesDevice;
  });

  const handleCopy = async (item: ClipboardItem) => {
    try {
      await TauriService.setClipboardText(item.text);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(item.text);
      }
    } catch (_) {}
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    try {
      await TauriService.setClipboardText(text);
    } catch (_) {}
    setInputText('');
  };

  const getItemIcon = (type: ClipboardItem['type']) => {
    switch (type) {
      case 'link': return <Link size={12} className="text-[#007AFF]" />;
      case 'code': return <Code size={12} className="text-[#34C759]" />;
      default: return <FileText size={12} className="text-[#8E8E93]" />;
    }
  };

  return (
    <aside
      className="w-full h-full bg-[#121218] border border-white/10 rounded-3xl flex flex-col overflow-hidden select-none shadow-2xl"
    >

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 border border-[#007AFF]/40 flex items-center justify-center text-[#007AFF]">
            <Clipboard size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-[#F0F0F2]">Universal Clipboard</h2>
            <p className="text-[11px] text-[#8E8E93]">Sync Across Windows & Tablet</p>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Quick Input Bar */}
      <form onSubmit={handleBroadcast} className="p-3 border-b border-white/10 flex gap-2">
        <input
          type="text"
          placeholder="Broadcast text or clip..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#F0F0F2] placeholder-[#8E8E93] outline-none focus:border-[#007AFF] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all"
        >
          <Send size={12} />
        </button>
      </form>

      {/* Search & Filters */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
        <div className="flex-1 relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Filter clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 rounded-lg bg-white/5 text-[11px] text-[#F0F0F2] placeholder-[#8E8E93] border border-white/10 outline-none"
          />
        </div>
        <button
          onClick={clearClipboardHistory}
          title="Clear unpinned clips"
          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] text-[10px] flex items-center gap-1 transition-colors"
        >
          <Trash2 size={11} /> Clear
        </button>
      </div>

      {/* Clips List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8E8E93]">
            <Clipboard size={32} className="mb-2 opacity-30" />
            <p className="text-xs font-medium">No clipboard items yet</p>
            <p className="text-[11px] opacity-70 mt-0.5">Copy text on Windows or POCO Pad to see it here</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 flex flex-col gap-2 transition-all ${
                item.pinned ? 'ring-1 ring-[#FF9500]/50' : ''
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getItemIcon(item.type)}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${item.deviceColor}22`,
                      color: item.deviceColor,
                    }}
                  >
                    {item.deviceName}
                  </span>
                </div>
                <span className="text-[10px] text-[#8E8E93] font-mono">{item.timestamp}</span>
              </div>

              {/* Clip Body */}
              <p className="text-xs text-[#F0F0F2] line-clamp-3 font-mono break-all whitespace-pre-wrap select-text">
                {item.text}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-white/5">
                <button
                  onClick={() => togglePinClipboardItem(item.id)}
                  title={item.pinned ? 'Unpin' : 'Pin'}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    item.pinned ? 'bg-[#FF9500]/20 text-[#FF9500]' : 'hover:bg-white/10 text-[#8E8E93]'
                  }`}
                >
                  <Pin size={12} />
                </button>
                <button
                  onClick={() => removeClipboardItem(item.id)}
                  title="Delete"
                  className="w-6 h-6 rounded-lg hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] flex items-center justify-center transition-colors"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  onClick={() => handleCopy(item)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[#007AFF] text-white text-[11px] font-medium flex items-center gap-1 transition-all"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={11} className="text-[#34C759]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8E8E93]">
        <div className="flex items-center gap-1">
          <Sparkles size={11} className="text-[#007AFF]" />
          <span>Hot-Corner: ↗ Top-Right</span>
        </div>
        <span>{clipboardItems.length} items in sync</span>
      </div>
    </aside>
  );
};
