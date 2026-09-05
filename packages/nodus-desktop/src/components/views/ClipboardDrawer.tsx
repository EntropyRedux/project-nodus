import React, { useState } from 'react';
import { Clipboard, X, Send, Copy, Check } from 'lucide-react';
import { ClipboardItem } from '../../types/desktop';

interface ClipboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ClipboardItem[];
  onBroadcast: (text: string) => void;
  onCopyItem: (item: ClipboardItem) => void;
}

export const ClipboardDrawer: React.FC<ClipboardDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onBroadcast,
  onCopyItem,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onBroadcast(inputText.trim());
    setInputText('');
  };

  const handleCopy = (item: ClipboardItem) => {
    onCopyItem(item);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[var(--surface-modal)] border-l border-[var(--border-subtle)] shadow-2xl z-50 flex flex-col backdrop-blur-md animate-in slide-in-from-right duration-200 text-[var(--text-body)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-elevated)]">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]">
          <Clipboard className="w-4 h-4" />
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">Universal Mesh Clipboard</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-container)] transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Broadcast Form */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-container)]">
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type snippet to broadcast..."
            className="w-full h-9 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
          />
          <button
            type="submit"
            className="w-full h-8 px-3 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Send size={13} />
            <span>Broadcast to Mesh</span>
          </button>
        </form>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="text-center py-10 text-xs text-[var(--text-muted)]">Clipboard history is empty</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition group"
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                <span>{item.deviceName}</span>
                <span>{item.timestamp}</span>
              </div>
              <p className="text-xs text-[var(--text-body)] font-mono break-all line-clamp-3">{item.text}</p>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => handleCopy(item)}
                  className="h-6 px-2 rounded bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[10px] text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center gap-1 transition"
                >
                  {copiedId === item.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
