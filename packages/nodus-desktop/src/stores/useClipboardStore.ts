import { create } from 'zustand';
import { ClipboardItem } from '../types/desktop';

export interface AutoExportSettings {
  enabled: boolean;
  threshold: number; // Number of clips (e.g. 25, 50, 100) before auto-saving
  format: 'json' | 'txt' | 'md';
  lastAutoExportedAt: string | null;
  totalAutoExports: number;
}

const DEFAULT_AUTO_EXPORT_SETTINGS: AutoExportSettings = {
  enabled: false,
  threshold: 50,
  format: 'json',
  lastAutoExportedAt: null,
  totalAutoExports: 0,
};

function downloadBlob(content: string, filename: string, mimeType: string) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('[useClipboardStore] Export download error:', e);
  }
}

interface ClipboardState {
  items: ClipboardItem[];
  pinnedIds: Set<string>;
  autoExportSettings: AutoExportSettings;
  pushClip: (text: string, sourceDeviceId?: string, imageData?: string) => void;
  deleteClip: (id: string) => void;
  togglePin: (id: string) => void;
  clearUnpinned: () => void;
  clearAll: () => void;
  exportToFile: (format?: 'json' | 'txt' | 'md') => void;
  updateAutoExportSettings: (partial: Partial<AutoExportSettings>) => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  pinnedIds: new Set<string>(),
  autoExportSettings: (() => {
    try {
      const saved = localStorage.getItem('nodus_clipboard_auto_export');
      if (saved) return { ...DEFAULT_AUTO_EXPORT_SETTINGS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_AUTO_EXPORT_SETTINGS;
  })(),

  pushClip: (text: string, sourceDeviceId = 'this-pc', imageData?: string) => {
    const isUrl = text.startsWith('http://') || text.startsWith('https://');
    const isCode = text.includes('\n') && (text.includes('{') || text.includes('const ') || text.includes('function '));

    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      deviceId: sourceDeviceId,
      deviceName: sourceDeviceId === 'this-pc' ? 'This PC' : 'Remote Device',
      deviceType: 'desktop',
      deviceColor: '#A8C7FA',
      type: imageData ? 'image' : isUrl ? 'link' : isCode ? 'code' : 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false,
      imageData,
    };

    set((state) => {
      const filtered = state.items.filter((i) => {
        if (imageData) {
          return i.imageData !== imageData;
        }
        return i.type === 'image' || i.text !== text;
      });
      const newItems = [newItem, ...filtered].slice(0, 100);

      // Check auto-export threshold
      const autoSettings = state.autoExportSettings;
      if (
        autoSettings.enabled &&
        newItems.length >= autoSettings.threshold &&
        (!autoSettings.lastAutoExportedAt || newItems.length % autoSettings.threshold === 0)
      ) {
        setTimeout(() => {
          get().exportToFile(autoSettings.format);
          set((s) => {
            const updated = {
              ...s.autoExportSettings,
              lastAutoExportedAt: new Date().toLocaleTimeString(),
              totalAutoExports: s.autoExportSettings.totalAutoExports + 1,
            };
            try {
              localStorage.setItem('nodus_clipboard_auto_export', JSON.stringify(updated));
            } catch (_) {}
            return { autoExportSettings: updated };
          });
        }, 100);
      }

      return { items: newItems };
    });
  },

  deleteClip: (id: string) => {
    set((state) => {
      const nextPinned = new Set(state.pinnedIds);
      nextPinned.delete(id);
      return {
        items: state.items.filter((i) => i.id !== id),
        pinnedIds: nextPinned,
      };
    });
  },

  togglePin: (id: string) => {
    set((state) => {
      const nextPinned = new Set(state.pinnedIds);
      if (nextPinned.has(id)) {
        nextPinned.delete(id);
      } else {
        nextPinned.add(id);
      }
      return {
        pinnedIds: nextPinned,
        items: state.items.map((i) => (i.id === id ? { ...i, pinned: nextPinned.has(id) } : i)),
      };
    });
  },

  clearUnpinned: () => {
    set((state) => ({
      items: state.items.filter((i) => state.pinnedIds.has(i.id) || i.pinned),
    }));
  },

  clearAll: () => {
    set({
      items: [],
      pinnedIds: new Set<string>(),
    });
  },

  exportToFile: (format = 'json') => {
    const items = get().items;
    if (items.length === 0) return;

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      const exportPayload = {
        app: 'Nodus Desktop',
        version: '1.1.1',
        exportedAt: new Date().toISOString(),
        totalItems: items.length,
        items: items.map((i) => ({
          id: i.id,
          type: i.type,
          text: i.text,
          deviceName: i.deviceName,
          deviceId: i.deviceId,
          timestamp: i.timestamp,
          pinned: Boolean(i.pinned || get().pinnedIds.has(i.id)),
          imageData: i.imageData || null,
        })),
      };
      downloadBlob(
        JSON.stringify(exportPayload, null, 2),
        `nodus-clipboard-history-${dateStr}.json`,
        'application/json'
      );
    } else if (format === 'md') {
      let md = `# Nodus Universal Clipboard History Export\n`;
      md += `*Exported on ${new Date().toLocaleString()} · Total items: ${items.length}*\n\n---\n\n`;
      for (const item of items) {
        const isPinned = item.pinned || get().pinnedIds.has(item.id);
        md += `### [${item.type.toUpperCase()}] ${item.timestamp} · ${item.deviceName || 'Local'}${isPinned ? ' 📌' : ''}\n\n`;
        if (item.type === 'image' && item.imageData) {
          md += `![Clipboard Image](${item.imageData})\n\n`;
        } else {
          md += `\`\`\`text\n${item.text}\n\`\`\`\n\n`;
        }
        md += `---\n\n`;
      }
      downloadBlob(md, `nodus-clipboard-history-${dateStr}.md`, 'text/markdown');
    } else {
      // Plain text
      let txt = `=======================================================\n`;
      txt += `NODUS UNIVERSAL CLIPBOARD HISTORY EXPORT\n`;
      txt += `Export Date: ${new Date().toLocaleString()}\n`;
      txt += `Total Items: ${items.length}\n`;
      txt += `=======================================================\n\n`;
      for (const item of items) {
        const isPinned = item.pinned || get().pinnedIds.has(item.id);
        txt += `[${item.timestamp}] ${item.deviceName || 'Local'} (${item.type.toUpperCase()})${isPinned ? ' [PINNED]' : ''}\n`;
        if (item.type === 'image') {
          txt += `[Image Payload: ${item.imageData ? Math.round(item.imageData.length * 0.75 / 1024) + ' KB' : 'None'}]\n`;
        } else {
          txt += `${item.text}\n`;
        }
        txt += `-------------------------------------------------------\n`;
      }
      downloadBlob(txt, `nodus-clipboard-history-${dateStr}.txt`, 'text/plain');
    }
  },

  updateAutoExportSettings: (partial) => {
    set((state) => {
      const updated = { ...state.autoExportSettings, ...partial };
      try {
        localStorage.setItem('nodus_clipboard_auto_export', JSON.stringify(updated));
      } catch (_) {}
      return { autoExportSettings: updated };
    });
  },
}));

