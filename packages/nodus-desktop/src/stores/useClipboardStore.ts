import { create } from 'zustand';
import { ClipboardItem } from '../types/desktop';

interface ClipboardState {
  items: ClipboardItem[];
  pinnedIds: Set<string>;
  pushClip: (text: string, sourceDeviceId?: string, imageData?: string) => void;
  deleteClip: (id: string) => void;
  togglePin: (id: string) => void;
  clearUnpinned: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  pinnedIds: new Set<string>(),

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
      return { items: [newItem, ...filtered].slice(0, 100) };
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
}));
