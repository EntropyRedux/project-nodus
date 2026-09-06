import React, { useState } from 'react';
import {
  Clipboard,
  X,
  Send,
  Copy,
  Check,
  Trash2,
  Pin,
  Download,
  FileJson,
  FileText,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { ClipboardItem } from '../nodus-common';

export interface ClipboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ClipboardItem[];
  onBroadcast: (text: string) => void;
  onCopyItem: (item: ClipboardItem) => void;
  onDeleteItem?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onClearUnpinned?: () => void;
  onClearAll?: () => void;
  onExport?: (format: 'json' | 'txt' | 'md') => void;
}

export const ClipboardDrawer: React.FC<ClipboardDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onBroadcast,
  onCopyItem,
  onDeleteItem,
  onTogglePin,
  onClearUnpinned,
  onClearAll,
  onExport,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

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

  const handleExport = (format: 'json' | 'txt' | 'md') => {
    if (onExport) {
      onExport(format);
      setShowExportMenu(false);
      setExportFeedback(`Exported .${format.toUpperCase()}`);
      setTimeout(() => setExportFeedback(null), 2000);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[var(--surface-modal)] border-l border-[var(--border-subtle)] shadow-2xl z-50 flex flex-col backdrop-blur-md animate-in slide-in-from-right duration-200 text-[var(--text-body)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-elevated)]">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]">
          <Clipboard className="w-4 h-4" />
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">Universal Mesh Clipboard</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Quick Export Button */}
          {onExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={items.length === 0}
                title="Export clipboard history"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-container)] transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download size={15} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 z-50 text-xs flex flex-col">
                  <button
                    onClick={() => handleExport('json')}
                    className="px-3 py-2 text-left hover:bg-[var(--surface-container)] flex items-center gap-2 text-[var(--text-heading)]"
                  >
                    <FileJson size={14} className="text-amber-400" />
                    <span>JSON Backup</span>
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="px-3 py-2 text-left hover:bg-[var(--surface-container)] flex items-center gap-2 text-[var(--text-heading)]"
                  >
                    <FileCode size={14} className="text-blue-400" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => handleExport('txt')}
                    className="px-3 py-2 text-left hover:bg-[var(--surface-container)] flex items-center gap-2 text-[var(--text-heading)]"
                  >
                    <FileText size={14} className="text-emerald-400" />
                    <span>Plain Text (.txt)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-container)] transition"
          >
            <X size={16} />
          </button>
        </div>
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
            disabled={!inputText.trim()}
            className="w-full h-8 px-3 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--m3-on-primary)] text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Send size={13} />
            <span>Broadcast to Mesh</span>
          </button>
        </form>
      </div>

      {/* Controls Bar: Items count, Clear actions, Export status */}
      <div className="px-4 py-2 bg-[var(--surface-base)] border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>{items.length} snippet{items.length === 1 ? '' : 's'}</span>
        {exportFeedback ? (
          <span className="text-emerald-400 font-medium">{exportFeedback}</span>
        ) : (
          <div className="flex items-center gap-2">
            {onClearUnpinned && items.length > 0 && (
              <button
                onClick={onClearUnpinned}
                className="hover:text-[var(--text-heading)] transition hover:underline"
                title="Clear all unpinned clips"
              >
                Clear Unpinned
              </button>
            )}
            {onClearAll && items.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClearAll(false);
                    }}
                    className="text-red-400 font-bold hover:underline"
                  >
                    Confirm All
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[var(--text-muted)] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="text-red-400 hover:text-red-300 transition"
                  title="Clear all clipboard history"
                >
                  Clear All
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="text-center py-10 text-xs text-[var(--text-muted)]">Clipboard history is empty</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg bg-[var(--surface-elevated)] border transition group ${
                item.pinned
                  ? 'border-[var(--accent-primary)]/50 ring-1 ring-[var(--accent-primary)]/20'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                <div className="flex items-center gap-1.5">
                  {item.type === 'image' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                      <ImageIcon size={10} />
                      IMAGE
                    </span>
                  )}
                  {item.type === 'link' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      LINK
                    </span>
                  )}
                  {item.type === 'code' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CODE
                    </span>
                  )}
                  <span>{item.deviceName || 'Local'}</span>
                </div>
                <span>{item.timestamp}</span>
              </div>

              {item.type === 'image' && item.imageData ? (
                <div className="my-1.5 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-black/40 flex items-center justify-center max-h-36">
                  <img
                    src={item.imageData}
                    alt="Clipboard preview"
                    className="max-h-36 w-auto object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-[var(--text-body)] font-mono break-all line-clamp-3 select-all">{item.text}</p>
              )}

              {/* Card Actions: Pin, Delete, Copy */}
              <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)]/50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {onTogglePin && (
                    <button
                      onClick={() => onTogglePin(item.id)}
                      className={`h-6 w-6 rounded flex items-center justify-center transition ${
                        item.pinned
                          ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-container)]'
                      }`}
                      title={item.pinned ? 'Unpin snippet' : 'Pin snippet'}
                    >
                      <Pin size={12} className={item.pinned ? 'fill-current' : ''} />
                    </button>
                  )}
                  {onDeleteItem && (
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleCopy(item)}
                  className="h-6 px-2.5 rounded bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[10px] text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center gap-1 transition"
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
