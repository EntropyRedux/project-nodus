import React from 'react';
import { useAssistive } from '../../context/AssistiveContext';
import { Clipboard, Copy, X, Check } from 'lucide-react';

export const ClipboardOverlayStandalone: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { clipboardItems, toggleClipboardPanel, copyToClipboard } = useAssistive();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleClose = () => {
    if (onClose) onClose();
    else toggleClipboardPanel();
  };

  const handleCopy = (id: string, text: string) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 w-80 max-w-full pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Clipboard className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">Universal Clipboard</span>
          <span className="text-xs text-slate-500 font-mono">({clipboardItems.length})</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {clipboardItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Clipboard history is empty.
          </div>
        ) : (
          clipboardItems.map(item => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item.id, item.text)}
                className="p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition text-xs space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-blue-400">{item.deviceName}</span>
                  <div className="flex items-center gap-1.5">
                    <span>{item.timestamp}</span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </div>
                <p className="font-mono text-slate-200 line-clamp-2 select-text">{item.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
