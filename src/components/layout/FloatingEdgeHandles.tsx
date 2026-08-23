import React, { useState, useRef } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { Server, Clipboard, ChevronLeft, ChevronRight } from 'lucide-react';

export const FloatingEdgeHandles: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isClipboardOpen,
    toggleClipboardPanel,
  } = useLauncher();

  // Vertical position percentages for left & right pills (customizable & persistent)
  const [leftYPercent, setLeftYPercent] = useState<number>(() => {
    const saved = localStorage.getItem('nodus_handle_left_y');
    return saved ? Number(saved) : 28;
  });

  const [rightYPercent, setRightYPercent] = useState<number>(() => {
    const saved = localStorage.getItem('nodus_handle_right_y');
    return saved ? Number(saved) : 28;
  });

  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);
  const startYRef = useRef(0);
  const startPercentRef = useRef(0);

  // Left Handle Drag
  const handleLeftPointerDown = (e: React.PointerEvent) => {
    isDraggingLeftRef.current = true;
    startYRef.current = e.clientY;
    startPercentRef.current = leftYPercent;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLeftPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingLeftRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newPercent = Math.min(Math.max(startPercentRef.current + deltaPercent, 12), 80);
    setLeftYPercent(newPercent);
  };

  const handleLeftPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingLeftRef.current) return;
    isDraggingLeftRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    localStorage.setItem('nodus_handle_left_y', leftYPercent.toString());

    // If movement was negligible (< 6px), treat as tap to toggle
    if (Math.abs(e.clientY - startYRef.current) < 6) {
      audio.playTap();
      toggleSidebar();
    }
  };

  // Right Handle Drag
  const handleRightPointerDown = (e: React.PointerEvent) => {
    isDraggingRightRef.current = true;
    startYRef.current = e.clientY;
    startPercentRef.current = rightYPercent;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRightPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRightRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newPercent = Math.min(Math.max(startPercentRef.current + deltaPercent, 12), 80);
    setRightYPercent(newPercent);
  };

  const handleRightPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRightRef.current) return;
    isDraggingRightRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    localStorage.setItem('nodus_handle_right_y', rightYPercent.toString());

    // If movement was negligible (< 6px), treat as tap to toggle
    if (Math.abs(e.clientY - startYRef.current) < 6) {
      audio.playTap();
      toggleClipboardPanel();
    }
  };

  return (
    <>
      {/* 1. LEFT EDGE HANDLE: Device Switcher & Process Hub */}
      {isSidebarCollapsed && (
        <div
          onPointerDown={handleLeftPointerDown}
          onPointerMove={handleLeftPointerMove}
          onPointerUp={handleLeftPointerUp}
          onPointerCancel={handleLeftPointerUp}
          style={{ top: `${leftYPercent}%` }}
          className="fixed left-0 z-40 -translate-y-1/2 touch-none group cursor-pointer select-none"
          title="Drag up/down to reposition • Tap to open Device Switcher"
        >
          <div className="flex items-center">
            <div className="w-2.5 h-12 rounded-r-xl bg-[#1C1C1E]/70 hover:bg-[#2C2C2E] active:bg-[#34C759] border-y border-r border-white/15 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:w-7 group-hover:px-1 shadow-lg shadow-black/40 group-active:scale-95">
              <div className="w-1 h-5 rounded-full bg-white/40 group-hover:hidden transition" />
              <div className="hidden group-hover:flex items-center gap-1 text-[#34C759] animate-in fade-in duration-150">
                <Server size={12} />
                <ChevronRight size={10} className="text-white/60 -ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RIGHT EDGE HANDLE: Universal Clipboard History */}
      {!isClipboardOpen && (
        <div
          onPointerDown={handleRightPointerDown}
          onPointerMove={handleRightPointerMove}
          onPointerUp={handleRightPointerUp}
          onPointerCancel={handleRightPointerUp}
          style={{ top: `${rightYPercent}%` }}
          className="fixed right-0 z-40 -translate-y-1/2 touch-none group cursor-pointer select-none"
          title="Drag up/down to reposition • Tap to open Clipboard History"
        >
          <div className="flex items-center justify-end">
            <div className="w-2.5 h-12 rounded-l-xl bg-[#1C1C1E]/70 hover:bg-[#2C2C2E] active:bg-[#007AFF] border-y border-l border-white/15 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:w-7 group-hover:px-1 shadow-lg shadow-black/40 group-active:scale-95">
              <div className="w-1 h-5 rounded-full bg-white/40 group-hover:hidden transition" />
              <div className="hidden group-hover:flex items-center gap-1 text-[#007AFF] animate-in fade-in duration-150">
                <ChevronLeft size={10} className="text-white/60 -mr-0.5" />
                <Clipboard size={12} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM FLOATING PILL: Smart Taskbar Summoner */}
      <div
        onClick={() => {
          audio.playTap();
          const taskbarElem = document.getElementById('smart-taskbar-container') || document.querySelector('footer');
          if (taskbarElem) {
            taskbarElem.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        className="fixed bottom-0.5 left-1/2 -translate-x-1/2 z-30 group cursor-pointer select-none py-1 px-3"
        title="Tap to focus Smart App Taskbar"
      >
        <div className="w-16 h-1 rounded-full bg-white/20 group-hover:bg-[#34C759] group-active:bg-[#34C759] group-hover:w-24 group-hover:h-1.5 transition-all duration-200 shadow-sm shadow-black/50" />
      </div>
    </>
  );
};
