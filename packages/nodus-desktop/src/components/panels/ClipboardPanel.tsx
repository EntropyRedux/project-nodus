import React, { useState } from 'react';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { ClipboardItem } from '../../types/desktop';
import { TauriService } from '../../services/TauriCommands';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

export const ClipboardPanel: React.FC = () => {
  const {
    items: clipboardItems,
    deleteClip: removeClipboardItem,
    togglePin: togglePinClipboardItem,
    clearUnpinned: clearClipboardHistory,
  } = useClipboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = clipboardItems.filter((item) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (item: ClipboardItem) => {
    try {
      if (item.type === 'image' && item.imageData) {
        await TauriService.setClipboardImage(item.imageData);
      } else {
        await TauriService.setClipboardText(item.text);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(item.text);
        }
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

  const getItemTypeBadge = (type: ClipboardItem['type']) => {
    switch (type) {
      case 'link':
        return { label: 'LINK', bg: '#0078D4', color: '#FFFFFF' };
      case 'code':
        return { label: 'CODE', bg: '#34A853', color: '#FFFFFF' };
      case 'image':
        return { label: 'IMAGE', bg: '#F57C00', color: '#FFFFFF' };
      default:
        return { label: 'TEXT', bg: 'var(--m3-surface-container-high)', color: 'var(--m3-on-surface-variant)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="content_paste" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
            Universal Clipboard Hub
          </h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
          Real-time bi-directional clipboard sync between Windows host and connected tablet fleet
        </p>
      </div>

      {/* Broadcast Bar */}
      <div
        style={{
          background: 'var(--m3-surface-container-lowest)',
          border: '1px solid var(--m3-surface-container-high)',
          borderRadius: 12,
          padding: '12px',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: 'var(--m3-on-surface-variant)', marginBottom: 8 }}>BROADCAST TO FLEET</div>
        <form onSubmit={handleBroadcast} style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type or paste text to broadcast to tablet..."
            style={{
              flex: 1,
              background: 'var(--m3-surface-container-low)',
              border: '1px solid var(--m3-outline-variant)',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 13,
              fontFamily: 'Roboto, sans-serif',
              color: 'var(--m3-on-surface)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              background: 'var(--m3-primary)',
              color: 'var(--m3-on-primary)',
              border: 'none',
              borderRadius: 10,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Roboto, sans-serif',
              opacity: !inputText.trim() ? 0.5 : 1,
            }}
          >
            <Icon name="send" size={15} />
            Broadcast
          </button>
        </form>
      </div>

      {/* Search & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--m3-on-surface-variant)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter clips..."
            style={{
              width: '100%',
              background: 'var(--m3-surface-container-low)',
              border: '1px solid var(--m3-outline-variant)',
              borderRadius: 10,
              padding: '8px 12px 8px 30px',
              fontSize: 13,
              fontFamily: 'Roboto, sans-serif',
              color: 'var(--m3-on-surface)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={clearClipboardHistory}
          style={{
            background: 'transparent',
            border: '1px solid var(--m3-outline-variant)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--m3-error)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'Roboto, sans-serif',
          }}
        >
          <Icon name="delete" size={15} />
          Clear Unpinned
        </button>
      </div>

      {/* Clip Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--m3-on-surface-variant)' }}>
            <Icon name="content_paste_off" size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
            <span style={{ fontSize: 14 }}>No clipboard items found</span>
          </div>
        ) : (
          filteredItems.map(item => {
            const badge = getItemTypeBadge(item.type);
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--m3-surface-container-lowest)',
                  border: item.pinned
                    ? '1px solid var(--m3-primary)'
                    : '1px solid var(--m3-surface-container-high)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: badge.bg,
                        color: badge.color,
                        fontFamily: 'Space Mono, monospace',
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--m3-on-surface)' }}>
                      {item.deviceName || 'Local PC'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--m3-on-surface-variant)' }}>
                    {item.timestamp} &bull; {item.text.length} chars
                  </span>
                </div>

                {item.type === 'image' && item.imageData ? (
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--m3-surface-container-high)', maxHeight: 180, display: 'flex', justifyContent: 'center', background: 'black' }}>
                    <img src={item.imageData} alt="clip" style={{ maxHeight: 180, objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: item.type === 'code' ? 'Space Mono, monospace' : 'Roboto, sans-serif',
                      fontSize: 13,
                      color: 'var(--m3-on-surface)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      background: 'var(--m3-surface-container-low)',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--m3-outline-variant)',
                    }}
                  >
                    {item.text}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => togglePinClipboardItem(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: item.pinned ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)',
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Icon name={item.pinned ? 'push_pin' : 'keep'} size={18} />
                  </button>
                  <button
                    onClick={() => removeClipboardItem(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--m3-on-surface-variant)',
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Icon name="delete" size={18} />
                  </button>
                  <button
                    onClick={() => handleCopy(item)}
                    style={{
                      background: copiedId === item.id ? 'var(--m3-tertiary-container)' : 'var(--m3-secondary-container)',
                      color: copiedId === item.id ? 'var(--m3-on-tertiary-container)' : 'var(--m3-on-secondary-container)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    <Icon name={copiedId === item.id ? 'check' : 'content_copy'} size={14} />
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

