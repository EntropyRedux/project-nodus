import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Minus, 
  Square, 
  Copy, 
  RotateCw, 
  ExternalLink, 
  Columns, 
  Minimize2,
  Smartphone,
  ShieldAlert,
  Globe
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
    settings,
    apps,
    showToast
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  // Active Drag / Resize tracking using refs to prevent React state thrashing during pointer movements
  const activeOpRef = useRef<{
    type: 'drag' | 'resize';
    id: string;
    direction?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    domEl: HTMLElement | null;
  } | null>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [iframeLoadedMap, setIframeLoadedMap] = useState<Record<string, boolean>>({});
  const [iframeErrorMap, setIframeErrorMap] = useState<Record<string, boolean>>({});

  const handlePointerDownHeader = (e: React.PointerEvent, win: FloatingWindow, domEl: HTMLElement | null) => {
    e.stopPropagation();
    focusFloatingWindow(win.id);
    if (win.maximized) return;

    activeOpRef.current = {
      type: 'drag',
      id: win.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: win.x,
      initialY: win.y,
      initialWidth: win.width,
      initialHeight: win.height,
      domEl,
    };
    setIsInteracting(true);
  };

  const handlePointerDownResize = (e: React.PointerEvent, win: FloatingWindow, direction: string, domEl: HTMLElement | null) => {
    e.stopPropagation();
    focusFloatingWindow(win.id);
    if (win.maximized) return;

    activeOpRef.current = {
      type: 'resize',
      id: win.id,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      initialX: win.x,
      initialY: win.y,
      initialWidth: win.width,
      initialHeight: win.height,
      domEl,
    };
    setIsInteracting(true);
  };

  useEffect(() => {
    let animFrame: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const op = activeOpRef.current;
      if (!op || !op.domEl) return;

      if (animFrame) cancelAnimationFrame(animFrame);

      animFrame = requestAnimationFrame(() => {
        const dx = e.clientX - op.startX;
        const dy = e.clientY - op.startY;

        if (op.type === 'drag') {
          const newX = Math.max(-op.initialWidth + 120, Math.min(window.innerWidth - 80, op.initialX + dx));
          const newY = Math.max(0, Math.min(window.innerHeight - 80, op.initialY + dy));
          op.domEl!.style.left = `${newX}px`;
          op.domEl!.style.top = `${newY}px`;
        } else if (op.type === 'resize' && op.direction) {
          let newX = op.initialX;
          let newY = op.initialY;
          let newWidth = op.initialWidth;
          let newHeight = op.initialHeight;

          const MIN_WIDTH = 340;
          const MIN_HEIGHT = 240;

          if (op.direction.includes('e')) {
            newWidth = Math.max(MIN_WIDTH, op.initialWidth + dx);
          }
          if (op.direction.includes('s')) {
            newHeight = Math.max(MIN_HEIGHT, op.initialHeight + dy);
          }
          if (op.direction.includes('w')) {
            const potentialWidth = op.initialWidth - dx;
            if (potentialWidth >= MIN_WIDTH) {
              newWidth = potentialWidth;
              newX = op.initialX + dx;
            }
          }
          if (op.direction.includes('n')) {
            const potentialHeight = op.initialHeight - dy;
            if (potentialHeight >= MIN_HEIGHT) {
              newHeight = potentialHeight;
              newY = op.initialY + dy;
            }
          }

          op.domEl!.style.left = `${newX}px`;
          op.domEl!.style.top = `${newY}px`;
          op.domEl!.style.width = `${newWidth}px`;
          op.domEl!.style.height = `${newHeight}px`;
        }
      });
    };

    const handlePointerUp = () => {
      const op = activeOpRef.current;
      if (op && op.domEl) {
        const rect = op.domEl.getBoundingClientRect();
        updateFloatingWindowBounds(op.id, {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
      activeOpRef.current = null;
      setIsInteracting(false);
      if (animFrame) cancelAnimationFrame(animFrame);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [updateFloatingWindowBounds]);

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

  const launchNativeFallback = useCallback((appId: string) => {
    const target = apps.find((a) => a.id === appId);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (target?.packageName && bridge?.launchAppFloating) {
      bridge.launchAppFloating(target.packageName);
      showToast(`Opened ${target.name} in Native Android Freeform`);
    } else if (target?.packageName && bridge?.launchApp) {
      bridge.launchApp(target.packageName);
    }
  }, [apps, showToast]);

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
            id={`window-${win.id}`}
            onPointerDown={() => focusFloatingWindow(win.id)}
            className={`absolute pointer-events-auto flex flex-col will-change-transform ${
              isMaximized ? 'rounded-none border-b' : `${currentTheme.cardRadius} border shadow-2xl`
            } ${
              isFocused
                ? currentTheme.isLight
                  ? 'border-[#3B82F6]/60 shadow-[0_20px_50px_rgba(0,0,0,0.25)] ring-1 ring-[#3B82F6]/30'
                  : 'border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/20'
                : currentTheme.isLight
                ? 'border-[#CBD5E1] shadow-lg opacity-95'
                : 'border-white/10 shadow-lg opacity-95'
            } backdrop-blur-xl transition-shadow duration-100 overflow-hidden`}
            style={{
              ...windowStyle,
              backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'window'),
            }}
          >
            {/* Window Titlebar */}
            <div
              onPointerDown={(e) => {
                const el = document.getElementById(`window-${win.id}`);
                handlePointerDownHeader(e, win, el);
              }}
              onDoubleClick={() => maximizeFloatingWindow(win.id)}
              className={`h-10 px-3 flex items-center justify-between shrink-0 cursor-move border-b select-none transition-colors ${
                isFocused
                  ? currentTheme.isLight
                    ? 'bg-slate-200/80 border-slate-300'
                    : 'bg-white/10 border-white/10'
                  : currentTheme.isLight
                  ? 'bg-slate-100/60 border-slate-200'
                  : 'bg-black/30 border-white/5'
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
                        setIframeErrorMap((prev) => ({ ...prev, [win.id]: false }));
                        const ifr = document.getElementById(`iframe-${win.id}`) as HTMLIFrameElement;
                        if (ifr) ifr.src = win.webUrl!;
                      }}
                      title="Reload Web App"
                      className={`p-1.5 rounded-md ${currentTheme.classes.textSecondary} hover:text-white hover:bg-white/10 transition`}
                    >
                      <RotateCw size={12} />
                    </button>
                    <a
                      href={win.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Desktop Browser"
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
                <div className="w-full h-full relative flex flex-col bg-[#0F172A]">
                  {/* Loading Indicator */}
                  {!iframeLoadedMap[win.id] && !iframeErrorMap[win.id] && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#090B10]/80 backdrop-blur-md space-y-3">
                      <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#38BDF8] animate-spin" />
                      <p className="text-xs font-semibold text-slate-300">Connecting to {new URL(win.webUrl).hostname}...</p>
                    </div>
                  )}

                  {/* Sandboxed PWA Frame */}
                  <iframe
                    id={`iframe-${win.id}`}
                    src={win.webUrl}
                    title={win.title}
                    onLoad={() => setIframeLoadedMap((prev) => ({ ...prev, [win.id]: true }))}
                    onError={() => setIframeErrorMap((prev) => ({ ...prev, [win.id]: true }))}
                    className="w-full h-full border-none flex-1 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
                    allow="camera; microphone; geolocation; clipboard-read; clipboard-write; autoplay; fullscreen"
                  />

                  {/* Drag Interactivity Shield to prevent iframes from stealing mouse events */}
                  {isInteracting && (
                    <div className="absolute inset-0 z-20 bg-transparent pointer-events-auto" />
                  )}
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
                    Active workstation process running in high-performance Nodus cluster space.
                  </p>
                  <button
                    onClick={() => launchNativeFallback(win.appId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 hover:bg-[#38BDF8]/30 transition"
                  >
                    <Smartphone size={14} />
                    <span>Launch Native Android APK</span>
                  </button>
                </div>
              )}
            </div>

            {/* 8-Direction Resizing Grippers (Only when not maximized) */}
            {!isMaximized && (
              <>
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'n', el); }} className="absolute top-0 left-2 right-2 h-2 cursor-ns-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 's', el); }} className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'w', el); }} className="absolute top-2 bottom-2 left-0 w-2 cursor-ew-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'e', el); }} className="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'nw', el); }} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'ne', el); }} className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'sw', el); }} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30" />
                <div onPointerDown={(e) => { const el = document.getElementById(`window-${win.id}`); handlePointerDownResize(e, win, 'se', el); }} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
