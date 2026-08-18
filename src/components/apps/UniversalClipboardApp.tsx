import React, { useState } from 'react';
import { 
  Clipboard, 
  Copy, 
  Trash2, 
  Pin, 
  Search, 
  Send, 
  Check, 
  Link, 
  Code, 
  FileText, 
  ShieldCheck, 
  Radio, 
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { ClipboardItem } from '../../types/launcher';
import { audio } from '../../utils/audio';

export const UniversalClipboardApp: React.FC = () => {
  const { 
    clipboardItems, 
    addClipboardItem, 
    removeClipboardItem, 
    togglePinClipboardItem, 
    clearFleetClipboard, 
    activeDeviceId, 
    devices,
    addNotification 
  } = useLauncher();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'link' | 'code' | 'snippet'>('all');
  const [newClipText, setNewClipText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredClips = clipboardItems.filter((item) => {
    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCopy = (item: ClipboardItem) => {
    audio.playTap();
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBroadcastNewClip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClipText.trim()) return;
    audio.playTap();

    let clipType: ClipboardItem['type'] = 'text';
    if (newClipText.startsWith('http://') || newClipText.startsWith('https://')) clipType = 'link';
    else if (newClipText.includes('{') || newClipText.includes('function') || newClipText.includes('const') || newClipText.includes('adb') || newClipText.includes('ps1')) clipType = 'code';

    addClipboardItem({
      text: newClipText.trim(),
      type: clipType,
      deviceId: activeDeviceId,
    });

    setNewClipText('');
    addNotification({
      appId: 'clipboard',
      appName: 'Universal Clipboard',
      title: 'Clipboard Broadcasted',
      message: 'Text synced to all 4 cluster nodes.',
      iconName: 'Clipboard',
      color: '#FF9500',
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF9500] to-[#FF2D55] flex items-center justify-center text-white shadow-lg shadow-[#FF9500]/20">
            <Clipboard size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Universal Fleet Clipboard Hub</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF9500]/15 text-[#FF9500] font-mono font-bold border border-[#FF9500]/30">
                2-WAY MESH SYNC
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Synchronized clipboard history across Android tablets, Windows 11 PC, and cluster nodes
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playTap();
            clearFleetClipboard();
          }}
          className="px-3 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] border border-[#FF3B30]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <Trash2 size={13} /> Clear History
        </button>
      </div>

      {/* Broadcast Bar */}
      <form onSubmit={handleBroadcastNewClip} className="p-4 border-b border-white/5 bg-[#0E0E10] flex gap-2 shrink-0">
        <input
          type="text"
          placeholder="Paste or type text, code, or URL to broadcast to all connected devices..."
          value={newClipText}
          onChange={(e) => setNewClipText(e.target.value)}
          className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#FF9500]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#FF9500] hover:bg-[#E08500] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition shrink-0"
        >
          <Send size={13} /> Broadcast
        </button>
      </form>

      {/* Filter Bar */}
      <div className="px-5 py-2 bg-[#121214] border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          {(['all', 'text', 'link', 'code', 'snippet'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                filterType === type
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Search clipboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#FF9500]"
          />
        </div>
      </div>

      {/* Clipboard Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredClips.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-xs text-[#8E8E93]">
            <Clipboard size={36} className="text-[#8E8E93]/40 mb-2" />
            <p>No clipboard items found.</p>
          </div>
        ) : (
          filteredClips.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition bg-[#161618] ${
                  item.pinned ? 'border-[#FF9500]/50' : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.deviceColor || '#34C759' }}
                    />
                    <span className="text-xs font-bold text-white">{item.deviceName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8E8E93] uppercase font-mono">
                      {item.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-[#8E8E93] font-mono">{item.timestamp}</span>

                    <button
                      onClick={() => togglePinClipboardItem(item.id)}
                      className={`p-1.5 rounded-lg transition ${
                        item.pinned ? 'text-[#FF9500] bg-[#FF9500]/10' : 'text-[#8E8E93] hover:text-white'
                      }`}
                      title={item.pinned ? 'Unpin item' : 'Pin to top'}
                    >
                      <Pin size={13} />
                    </button>

                    <button
                      onClick={() => handleCopy(item)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold flex items-center gap-1 transition"
                    >
                      {isCopied ? <Check size={12} className="text-[#34C759]" /> : <Copy size={12} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      onClick={() => removeClipboardItem(item.id)}
                      className="p-1.5 text-[#8E8E93] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#0A0A0C] p-3 rounded-xl border border-white/5 font-mono text-xs text-slate-200 select-text break-all">
                  {item.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
