import React, { useState, useRef, useCallback } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { TauriService } from '../../services/TauriCommands';
import { 
  MousePointer, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Lock, 
  Monitor, 
  Layers, 
  Scissors, 
  Folder, 
  Terminal, 
  Send, 
  Keyboard,
  Sparkles,
  Move,
  CheckCircle2
} from 'lucide-react';

export const RemoteDeckPanel: React.FC = () => {
  const { controlMedia, lockWorkstation, activeDevice } = useDesktop();
  const [inputText, setInputText] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const notifyAction = (name: string) => {
    setLastAction(name);
    setTimeout(() => setLastAction(null), 2000);
  };

  // ─── Trackpad Pointer Event Handlers ────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !lastPos.current) return;
    const dx = Math.round((e.clientX - lastPos.current.x) * 1.5);
    const dy = Math.round((e.clientY - lastPos.current.y) * 1.5);
    lastPos.current = { x: e.clientX, y: e.clientY };

    if (dx !== 0 || dy !== 0) {
      TauriService.simulateMouseMove(dx, dy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);
    lastPos.current = null;
  };

  const handleLeftClick = () => {
    TauriService.simulateMouseClick('left');
    notifyAction('Left Click');
  };

  const handleRightClick = () => {
    TauriService.simulateMouseClick('right');
    notifyAction('Right Click');
  };

  const handleDoubleClick = () => {
    TauriService.simulateMouseClick('double');
    notifyAction('Double Click');
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const dy = e.deltaY > 0 ? -1 : 1;
    TauriService.simulateMouseScroll(0, dy);
  };

  // ─── Hotkeys & Text Injection ───────────────────────────────────────
  const sendHotkey = async (keys: string[], label: string) => {
    await TauriService.simulateHotkey(keys);
    notifyAction(label);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await TauriService.simulateText(inputText);
    notifyAction(`Typed "${inputText.slice(0, 15)}..."`);
    setInputText('');
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MousePointer size={20} className="text-[#34C759]" />
            <span>Virtual Trackpad & Workstation Command Deck</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Low-latency trackpad gestures, hotkeys, and media mixer for your Windows PC.
          </p>
        </div>

        {lastAction && (
          <div className="px-3 py-1.5 rounded-xl bg-[#34C759]/20 border border-[#34C759]/30 text-[#34C759] text-xs font-bold flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 size={14} />
            <span>{lastAction}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── Left Section: Virtual Trackpad (7 Cols) ──────────────── */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
              <Move size={14} className="text-[#007AFF]" />
              <span>Precision Glass Trackpad</span>
            </span>
            <span className="text-[10px] text-[#8E8E93] font-mono">
              Drag to move • Scroll to navigate
            </span>
          </div>

          {/* Trackpad Surface */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className={`w-full h-64 rounded-3xl bg-[#121218] border-2 transition-all flex flex-col items-center justify-center select-none cursor-crosshair relative overflow-hidden shadow-2xl ${
              isDragging
                ? 'border-[#007AFF] shadow-[#007AFF]/10 ring-4 ring-[#007AFF]/20 bg-[#161622]'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="flex flex-col items-center gap-2 pointer-events-none opacity-40">
              <MousePointer size={32} className="text-white" />
              <span className="text-xs font-semibold text-white">Touch & Drag Surface</span>
            </div>

            {/* Bottom Status bar on Trackpad */}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[10px] text-[#8E8E93] font-mono pointer-events-none">
              <span>Target: {activeDevice?.name || 'This PC'}</span>
              <span>1000 Hz Sub-ms Polling</span>
            </div>
          </div>

          {/* Mouse Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleLeftClick}
              className="py-3 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-[#007AFF] text-white text-xs font-bold border border-white/10 active:scale-95 transition-all shadow-md"
            >
              Left Click
            </button>
            <button
              onClick={handleDoubleClick}
              className="py-3 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-[#BF5AF2] text-white text-xs font-bold border border-white/10 active:scale-95 transition-all shadow-md"
            >
              Double Click
            </button>
            <button
              onClick={handleRightClick}
              className="py-3 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-[#FF9500] text-white text-xs font-bold border border-white/10 active:scale-95 transition-all shadow-md"
            >
              Right Click
            </button>
          </div>

          {/* Quick Text Input Injector */}
          <form onSubmit={handleSendText} className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Keyboard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type text to send to focused Windows app..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#121218] border border-white/10 focus:border-[#34C759] text-white text-xs placeholder-[#8E8E93]/60 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-2xl bg-[#34C759] hover:bg-[#30B74F] disabled:opacity-30 text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-[#34C759]/20"
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* ─── Right Section: Media & System Quick Actions (5 Cols) ─── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Media & Audio Deck */}
          <div className="p-4 rounded-3xl bg-[#121218] border border-white/10 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                <Volume2 size={14} className="text-[#FF9500]" />
                <span>Media & Audio Control</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { controlMedia('volume_down'); notifyAction('Volume -'); }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex flex-col items-center gap-1 text-xs font-semibold active:scale-95 transition"
              >
                <Volume1 size={18} className="text-[#8E8E93]" />
                <span>Vol -</span>
              </button>

              <button
                onClick={() => { controlMedia('volume_mute'); notifyAction('Toggle Mute'); }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex flex-col items-center gap-1 text-xs font-semibold active:scale-95 transition"
              >
                <VolumeX size={18} className="text-[#FF3B30]" />
                <span>Mute</span>
              </button>

              <button
                onClick={() => { controlMedia('volume_up'); notifyAction('Volume +'); }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex flex-col items-center gap-1 text-xs font-semibold active:scale-95 transition"
              >
                <Volume2 size={18} className="text-[#34C759]" />
                <span>Vol +</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { controlMedia('prev'); notifyAction('Previous Track'); }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex flex-col items-center gap-1 text-xs font-semibold active:scale-95 transition"
              >
                <SkipBack size={18} className="text-[#007AFF]" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => { controlMedia('play_pause'); notifyAction('Play / Pause'); }}
                className="p-3 rounded-2xl bg-[#34C759]/20 hover:bg-[#34C759]/30 border border-[#34C759]/30 text-[#34C759] flex flex-col items-center gap-1 text-xs font-bold active:scale-95 transition shadow-lg shadow-[#34C759]/10"
              >
                <Play size={18} />
                <span>Play / Pause</span>
              </button>

              <button
                onClick={() => { controlMedia('next'); notifyAction('Next Track'); }}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex flex-col items-center gap-1 text-xs font-semibold active:scale-95 transition"
              >
                <SkipForward size={18} className="text-[#007AFF]" />
                <span>Next</span>
              </button>
            </div>
          </div>

          {/* Windows System Hotkeys Deck */}
          <div className="p-4 rounded-3xl bg-[#121218] border border-white/10 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#BF5AF2]" />
                <span>Workstation Hotkeys</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendHotkey(['ctrl', 'shift', 'esc'], 'Task Manager')}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center">
                  <Monitor size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Task Manager</div>
                  <div className="text-[10px] text-[#8E8E93] font-mono">Ctrl+Shift+Esc</div>
                </div>
              </button>

              <button
                onClick={() => sendHotkey(['win', 'd'], 'Show Desktop')}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#BF5AF2]/20 text-[#BF5AF2] flex items-center justify-center">
                  <Layers size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Show Desktop</div>
                  <div className="text-[10px] text-[#8E8E93] font-mono">Win + D</div>
                </div>
              </button>

              <button
                onClick={() => sendHotkey(['win', 'shift', 's'], 'Snipping Tool')}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#FF9500]/20 text-[#FF9500] flex items-center justify-center">
                  <Scissors size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Snip Tool</div>
                  <div className="text-[10px] text-[#8E8E93] font-mono">Win+Shift+S</div>
                </div>
              </button>

              <button
                onClick={() => sendHotkey(['win', 'e'], 'File Explorer')}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center">
                  <Folder size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Explorer</div>
                  <div className="text-[10px] text-[#8E8E93] font-mono">Win + E</div>
                </div>
              </button>

              <button
                onClick={() => sendHotkey(['alt', 'tab'], 'Switch App')}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#5E5CE6]/20 text-[#5E5CE6] flex items-center justify-center">
                  <Terminal size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold">Switch App</div>
                  <div className="text-[10px] text-[#8E8E93] font-mono">Alt + Tab</div>
                </div>
              </button>

              <button
                onClick={() => { lockWorkstation(); notifyAction('Locked PC'); }}
                className="p-2.5 rounded-2xl bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 border border-[#FF3B30]/20 text-white flex items-center gap-2.5 text-xs font-semibold active:scale-95 transition"
              >
                <div className="w-7 h-7 rounded-xl bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center">
                  <Lock size={14} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#FF3B30]">Lock PC</div>
                  <div className="text-[10px] text-[#FF3B30]/70 font-mono">Win + L</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
