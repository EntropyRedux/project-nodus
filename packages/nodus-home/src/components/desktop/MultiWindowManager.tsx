import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Minus, 
  Square, 
  Copy, 
  RotateCw, 
  ExternalLink, 
  Columns, 
  Minimize2
} from 'lucide-react';
import { FloatingWindow } from '../../types/launcher';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { DynamicIcon } from '../common/DynamicIcon';
import { SettingsApp } from '../apps/SettingsApp';
import { NotesApp } from '../apps/NotesApp';
import { audio } from '../../utils/audio';

interface MultiWindowManagerProps {
  bounds?: { width: number; height: number };
}

export const MultiWindowManager: React.FC<MultiWindowManagerProps> = () => {
  const { 
    floatingWindows, 
    focusedWindowId, 
    closeFloatingWindow, 
    minimizeFloatingWindow, 
    maximizeFloatingWindow, 
    focusFloatingWindow, 
    updateFloatingWindowBounds,
    settings 
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  // Active Drag / Resize State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeResizeId, setActiveResizeId] = useState<{ id: string; direction: string } | null>(null);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startBoundsRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const [iframeLoadedMap, setIframeLoadedMap] = useState<Record<string, boolean>>({});

  const handlePointerDownHeader = (e: React.PointerEvent, window: FloatingWindow) => {
    e.stopPropagation();
    focusFloatingWindow(window.id);
    if (window.maximized) return;

    setActiveDragId(window.id);
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startBoundsRef.current = { x: window.x, y: window.y, width: window.width, height: window.height };
  };

  const handlePointerDownResize = (e: React.PointerEvent, window: FloatingWindow, direction: string) => {
    e.stopPropagation();
    focusFloatingWindow(window.id);
    if (window.maximized) return;

    setActiveResizeId({ id: window.id, direction });
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startBoundsRef.current = { x: window.x, y: window.y, width: window.width, height: window.height };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (activeDragId) {
        const dx = e.clientX - startPointerRef.current.x;
        const dy = e.clientY - startPointerRef.current.y;
        const newX = Math.max(0, Math.min(window.innerWidth - 100, startBoundsRef.current.x + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, startBoundsRef.current.y + dy));
        updateFloatingWindowBounds(activeDragId, { x: newX, y: newY });
      } else if (activeResizeId) {
        const dx = e.clientX - startPointerRef.current.x;
        const dy = e.clientY - startPointerRef.current.y;
        const { direction, id } = activeResizeId;
        const { x, y, width, height } = startBoundsRef.current;

        let newX = x;
        let newY = y;
        let newWidth = width;
        let newHeight = height;

        const MIN_WIDTH = 340;
        const MIN_HEIGHT = 240;

        if (direction.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, width + dx);
        }
        if (direction.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, height + dy);
        }
        if (direction.includes('w')) {
          const potentialWidth = width - dx;
          if (potentialWidth >= MIN_WIDTH) {
            newWidth = potentialWidth;
            newX = x + dx;
          }
        }
        if (direction.includes('n')) {
          const potentialHeight = height - dy;
          if (potentialHeight >= MIN_HEIGHT) {
            newHeight = potentialHeight;
            newY = y + dy;
          }
        }

        updateFloatingWindowBounds(id, { x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handlePointerUp = () => {
      if (activeDragId || activeResizeId) {
        setActiveDragId(null);
        setActiveResizeId(null);
      }
    };

    if (activeDragId || activeResizeId) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDragId, activeResizeId, updateFloatingWindowBounds]);

  const snapWindow = (windowId: string, type: 'left' | 'right' | 'center') => {
    audio.playTap();
    const taskbarHeight = 56;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - taskbarHeight;

    if (type === 'left') {
      updateFloatingWindowBounds(windowId, {
        x: 0,
        y: 0,
        width: Math.floor(screenWidth / 2),
        height: screenHeight,
        maximized: false,
      });
    } else if (type === 'right') {
      updateFloatingWindowBounds(windowId, {
        x: Math.floor(screenWidth / 2),
        y: 0,
        width: Math.ceil(screenWidth / 2),
        height: screenHeight,
        maximized: false,
      });
    } else if (type === 'center') {
      const w = Math.min(880, Math.floor(screenWidth * 0.75));
      const h = Math.min(620, Math.floor(screenHeight * 0.8));
      updateFloatingWindowBounds(windowId, {
        x: Math.floor((screenWidth - w) / 2),
        y: Math.floor((screenHeight - h) / 2),
        width: w,
        height: h,
        maximized: false,
      });
    }
  };

  const visibleWindows = floatingWindows.filter((w) => !w.minimized);

  if (visibleWindows.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {visibleWindows.map((win) => {
        const isFocused = focusedWindowId === win.id;
        const isMaximized = win.maximized;

        const windowStyle: React.CSSProperties = isMaximized
          ? {
              top: 0,
              left: 0,
              width: '100vw',
              height: 'calc(100vh - 56px)',
              zIndex: win.zIndex,
            }
          : {
              top: `${win.y}px`,
              left: `${win.x}px`,
              width: `${win.width}px`,
              height: `${win.height}px`,
              zIndex: win.zIndex,
            };

        return (
          <div
            key={win.id}
            onPointerDown={() => focusFloatingWindow(win.id)}
            className={`absolute pointer-events-auto flex flex-col ${
              isMaximized ? 'rounded-none border-b' : `${currentTheme.cardRadius} border shadow-2xl`
            } ${
              isFocused
                ? currentTheme.isLight
                  ? 'border-[#3B82F6]/60 shadow-[0_20px_50px_rgba(0,0,0,0.25)] ring-1 ring-[#3B82F6]/30'
                  : 'border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/20'
                : currentTheme.isLight
                ? 'border-[#CBD5E1] shadow-lg opacity-95'
                : 'border-white/10 shadow-lg opacity-95'
            } backdrop-blur-2xl transition-shadow duration-150 overflow-hidden`}
            style={{
              ...windowStyle,
              backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'window'),
            }}
          >
            {/* Window Titlebar */}
            <div
              onPointerDown={(e) => handlePointerDownHeader(e, win)}
              onDoubleClick={() => maximizeFloatingWindow(win.id)}
              className={`h-10 px-3 flex items-center justify-between shrink-0 cursor-move border-b select-none transition-colors ${
                isFocused
                  ? currentTheme.isLight
                    ? 'bg-slate-200/70 border-slate-300'
                    : 'bg-white/10 border-white/10'
                  : currentTheme.isLight
                  ? 'bg-slate-100/50 border-slate-200'
                  : 'bg-black/20 border-white/5'
              }`}
            >
              {/* App Identity */}
              <div className="flex items-center space-x-2 min-w-0">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: win.color || currentAccent.hex }}
                >
                  <DynamicIcon name={win.iconName || 'AppWindow'} size={12} className="text-white" />
                </div>
                <span className={`text-xs font-bold truncate ${currentTheme.classes.textPrimary}`}>
                  {win.title}
                </span>
                {win.type === 'web_pwa' && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                    PWA
                  </span>
                )}
              </div>

              {/* Window Controls & Snapping Actions */}
              <div className="flex items-center space-x-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                {/* Snap Quick Actions */}
                <div className="hidden sm:flex items-center space-x-0.5 mr-1 border-r border-white/10 pr-1">
                  <button
                    onClick={() => snapWindow(win.id, 'left')}
                    title="Snap to Left Half"
                    className={`p-1 rounded ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                  >
                    <Columns size={11} className="rotate-180" />
                  </button>
                  <button
                    onClick={() => snapWindow(win.id, 'center')}
                    title="Center Float"
                    className={`p-1 rounded ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                  >
                    <Minimize2 size={11} />
                  </button>
                  <button
                    onClick={() => snapWindow(win.id, 'right')}
                    title="Snap to Right Half"
                    className={`p-1 rounded ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                  >
                    <Columns size={11} />
                  </button>
                </div>

                {win.type === 'web_pwa' && win.webUrl && (
                  <>
                    <button
                      onClick={() => {
                        audio.playTap();
                        setIframeLoadedMap((prev) => ({ ...prev, [win.id]: false }));
                      }}
                      title="Reload Page"
                      className={`p-1.5 rounded-md ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                    >
                      <RotateCw size={12} />
                    </button>
                    <a
                      href={win.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Browser"
                      className={`p-1.5 rounded-md ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </>
                )}

                {/* Minimize */}
                <button
                  onClick={() => {
                    audio.playTap();
                    minimizeFloatingWindow(win.id);
                  }}
                  title="Minimize"
                  className={`p-1.5 rounded-md ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>

                {/* Maximize / Restore */}
                <button
                  onClick={() => {
                    audio.playTap();
                    maximizeFloatingWindow(win.id);
                  }}
                  title={isMaximized ? 'Restore' : 'Maximize'}
                  className={`p-1.5 rounded-md ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                >
                  {isMaximized ? <Copy size={12} strokeWidth={2.2} /> : <Square size={12} strokeWidth={2.2} />}
                </button>

                {/* Close */}
                <button
                  onClick={() => {
                    audio.playTap();
                    closeFloatingWindow(win.id);
                  }}
                  title="Close Window"
                  className="p-1.5 rounded-md text-red-400 hover:text-white hover:bg-red-500/80 transition"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Window Content Canvas */}
            <div className="flex-1 relative overflow-hidden bg-transparent">
              {win.appId === 'settings' ? (
                <SettingsApp />
              ) : win.appId === 'notes' ? (
                <NotesApp />
              ) : win.type === 'web_pwa' && win.webUrl ? (
                <div className="w-full h-full relative flex flex-col">
                  {/* Loading / Security Badge */}
                  {!iframeLoadedMap[win.id] && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#38BDF8] animate-spin" />
                      <p className="text-xs font-semibold text-slate-300">Connecting to {new URL(win.webUrl).hostname}...</p>
                    </div>
                  )}

                  {/* Sandboxed PWA Frame */}
                  <iframe
                    src={win.webUrl}
                    title={win.title}
                    onLoad={() => setIframeLoadedMap((prev) => ({ ...prev, [win.id]: true }))}
                    className="w-full h-full border-none flex-1 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
                    allow="camera; microphone; geolocation; clipboard-read; clipboard-write; autoplay; fullscreen"
                  />
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: win.color || currentAccent.hex }}
                  >
                    <DynamicIcon name={win.iconName || 'AppWindow'} size={28} className="text-white" />
                  </div>
                  <h4 className={`text-sm font-bold ${currentTheme.classes.textPrimary}`}>{win.title}</h4>
                  <p className={`text-xs max-w-xs ${currentTheme.classes.textSecondary}`}>
                    Active multitasking process running in high-performance Nodus cluster space.
                  </p>
                </div>
              )}
            </div>

            {/* 8-Direction Resizing Grippers (Only when not maximized) */}
            {!isMaximized && (
              <>
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'n')} className="absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 's')} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'w')} className="absolute top-2 bottom-2 left-0 w-1.5 cursor-ew-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'e')} className="absolute top-2 bottom-2 right-0 w-1.5 cursor-ew-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize" />
                <div onPointerDown={(e) => handlePointerDownResize(e, win, 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
