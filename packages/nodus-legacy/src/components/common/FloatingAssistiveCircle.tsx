import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { Command, Sparkles, LayoutGrid } from 'lucide-react';
import { DEVICE_COLORS } from '../../utils/constants';

export const FloatingAssistiveCircle: React.FC = () => {
  const { toggleTaskbar, isTaskbarOpen, activeDevice } = useLauncher();

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nodus_assistive_pos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      } catch (_) {}
      return { x: 16, y: window.innerHeight * 0.45 };
    }
    return { x: 16, y: 300 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
    startTime: number;
    hasMoved: boolean;
  } | null>(null);

  const lastTapTimeRef = useRef<number>(0);
  const idleTimerRef = useRef<number | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setIsIdle(true);
    }, 4000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Keep inside screen bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 56;
        const maxY = window.innerHeight - 56;
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(48, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    resetIdleTimer();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elemX: position.x,
      elemY: position.y,
      startTime: Date.now(),
      hasMoved: false,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    resetIdleTimer();

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (!dragStartRef.current.hasMoved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
      dragStartRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragStartRef.current.hasMoved) {
      const maxX = window.innerWidth - 56;
      const maxY = window.innerHeight - 56;
      const nextX = Math.min(Math.max(8, dragStartRef.current.elemX + deltaX), maxX);
      const nextY = Math.min(Math.max(40, dragStartRef.current.elemY + deltaY), maxY);
      setPosition({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    resetIdleTimer();

    const wasDragging = dragStartRef.current.hasMoved;
    dragStartRef.current = null;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (wasDragging) {
      // Magnetically dock to nearest edge (Left, Right, or Bottom)
      snapToNearestEdge();
    } else {
      // Tap / Click detection: Double-tap threshold is 380ms
      const now = Date.now();
      if (now - lastTapTimeRef.current < 380) {
        lastTapTimeRef.current = 0;
        handleDoubleTap();
      } else {
        lastTapTimeRef.current = now;
        handleSingleTap();
      }
    }
  };

  const snapToNearestEdge = () => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const curX = position.x;
    const curY = position.y;

    const distToLeft = curX;
    const distToRight = screenW - (curX + 52);
    const distToBottom = screenH - (curY + 52);

    let targetX = curX;
    let targetY = Math.min(Math.max(48, curY), screenH - 64);

    // If closer to bottom than left/right
    if (distToBottom < 60 && distToBottom < Math.min(distToLeft, distToRight)) {
      targetY = screenH - 64;
    } else if (distToLeft <= distToRight) {
      targetX = 12; // Snap to left edge
    } else {
      targetX = screenW - 60; // Snap to right edge
    }

    const finalPos = { x: targetX, y: targetY };
    setPosition(finalPos);
    try {
      localStorage.setItem('nodus_assistive_pos', JSON.stringify(finalPos));
    } catch (_) {}
  };

  const handleDoubleTap = () => {
    audio.playUnlock();
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 400);
    toggleTaskbar();
  };

  const handleSingleTap = () => {
    audio.playTap();
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 200);
  };

  const devColor = (activeDevice && DEVICE_COLORS[activeDevice.id]) || '#34C759';

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`fixed z-[999] select-none cursor-grab active:cursor-grabbing transition-transform ${
        isDragging ? 'scale-110 shadow-2xl' : 'transition-[left,top] duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 backdrop-blur-xl relative group ${
          isIdle && !isDragging
            ? 'opacity-60 hover:opacity-100 scale-95 shadow-md shadow-black/60 border-white/15 bg-[#141416]/80'
            : 'opacity-100 scale-100 shadow-xl shadow-black/90 border-white/25 bg-[#1C1C1E]/95'
        } ${isTaskbarOpen ? 'ring-2 ring-[#34C759]/60 shadow-[#34C759]/20' : ''} ${
          isPulsing ? 'scale-125 ring-4 ring-[#34C759]' : ''
        }`}
        style={{
          boxShadow: isTaskbarOpen ? `0 0 20px ${devColor}40` : undefined,
        }}
        title="Double-tap to toggle Taskbar (Drag to dock on edge)"
      >
        {/* Glowing Ambient Core */}
        <div
          className="absolute inset-1 rounded-full opacity-25 animate-pulse"
          style={{ backgroundColor: devColor }}
        />

        {/* Center Icon */}
        <div className="relative z-10 flex items-center justify-center text-white">
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#007AFF]" />
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#34C759]" />
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#FF9500]" />
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#BF5AF2]" />
          </div>
        </div>

        {/* Active Indicator Ring */}
        {isTaskbarOpen && (
          <div 
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#141416] bg-[#34C759]"
          />
        )}
      </div>
    </div>
  );
};
