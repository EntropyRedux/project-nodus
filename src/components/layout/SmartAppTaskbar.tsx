import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowUpRight, 
  X, 
  Clock, 
  LayoutGrid, 
  Search, 
  Sliders, 
  Lock, 
  RotateCcw,
  Sparkles,
  Layers,
  Clipboard,
  Server,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';
import { AppItem } from '../../types/launcher';
import { DEVICE_COLORS } from '../../utils/constants';

export const SmartAppTaskbar: React.FC = () => {
  const { 
    apps, 
    runningApps, 
    recentApps, 
    activeAppId, 
    launchApp, 
    killApp,
    activeDevice,
    activeDeviceId,
    toggleQuickSettings,
    lockDevice,
    setRecentsOpen,
    isClipboardOpen,
    toggleClipboardPanel,
    isSidebarCollapsed,
    toggleSidebar,
    settings
  } = useLauncher();

  const [isOpen, setIsOpen] = useState(false);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const hideTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const startMenuRef = useRef<HTMLDivElement | null>(null);

  const taskbarAlpha = (settings.taskbarOpacity ?? 92) / 100;

  // Check if current active device is the primary Android host device (sm-t230nu)
  // or a secondary/remote node in the cluster
  const isPrimaryDevice = activeDeviceId === 'sm-t230nu';

  // Reset or set auto-hide timer
  const resetAutoHideTimer = (delay = 4000) => {
    if (isStartMenuOpen) return; // Do not auto-hide while browsing Start Menu
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!isStartMenuOpen) {
        setIsOpen(false);
      }
    }, delay);
  };

  const cancelAutoHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  // Open taskbar manually or via gesture
  const triggerOpen = () => {
    audio.playUnlock();
    setIsOpen(true);
    resetAutoHideTimer(4500);
  };

  // Toggle Windows-style Start Menu
  const toggleStartMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playTap();
    setIsStartMenuOpen((prev) => !prev);
    cancelAutoHide();
  };

  // Close Start Menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target as Node)) {
        setIsStartMenuOpen(false);
        resetAutoHideTimer(2500);
      }
    };

    if (isStartMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStartMenuOpen]);

  // Set up diagonal swipe gesture listener (from bottom-left towards top-right)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const winHeight = window.innerHeight;
      if (touch.clientX < 280 && touch.clientY > winHeight - 240) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      } else {
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Diagonal gesture: moved right (deltaX > 25) AND moved up (deltaY < -25)
      if (deltaX > 25 && deltaY < -25 && deltaTime < 600) {
        triggerOpen();
      }
      touchStartRef.current = null;
    };

    // Mouse drag diagonal swipe support
    let mouseStart: { x: number; y: number; time: number } | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      const winHeight = window.innerHeight;
      if (e.clientX < 280 && e.clientY > winHeight - 240) {
        mouseStart = { x: e.clientX, y: e.clientY, time: Date.now() };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseStart) return;
      const deltaX = e.clientX - mouseStart.x;
      const deltaY = e.clientY - mouseStart.y;
      const deltaTime = Date.now() - mouseStart.time;

      if (deltaX > 25 && deltaY < -25 && deltaTime < 600) {
        triggerOpen();
      }
      mouseStart = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Map running apps items (Left)
  const openAppItems = useMemo(
    () =>
      runningApps
        .map((id) => apps.find((a) => a.id === id))
        .filter((a): a is AppItem => !!a),
    [runningApps, apps]
  );

  // Map recently used apps items that are not currently running (Right)
  const recentAppItems = useMemo(
    () =>
      recentApps
        .filter((id) => !runningApps.includes(id))
        .map((id) => apps.find((a) => a.id === id))
        .filter((a): a is AppItem => !!a)
        .slice(0, 5),
    [recentApps, runningApps, apps]
  );

  // Filter apps for Start Menu
  const categories = useMemo(() => ['all', 'productivity', 'media', 'tools', 'system'], []);
  const filteredStartApps = useMemo(() => {
    const q = menuSearch.toLowerCase().trim();
    return apps.filter((app) => {
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, menuSearch, selectedCategory]);

  const devColor = DEVICE_COLORS[activeDevice?.id] || '#34C759';

  return (
    <>
      {/* 1. Diagonal Swipe Corner Indicator Pill (Bottom-Left Trigger) */}
      <div
        onClick={triggerOpen}
        onMouseEnter={triggerOpen}
        className={`fixed bottom-2.5 left-3.5 z-40 px-2 py-1 rounded-xl bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] backdrop-blur-xl border border-white/10 shadow-lg cursor-pointer transition-all duration-300 flex items-center gap-1.5 group select-none ${
          isOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-85 hover:opacity-100 hover:scale-105'
        }`}
        title="Swipe ↗ diagonally or click to show taskbar"
      >
        <div 
          className="p-0.5 rounded-lg border group-hover:scale-110 transition"
          style={{
            backgroundColor: `${devColor}20`,
            borderColor: `${devColor}40`,
            color: devColor,
          }}
        >
          <ArrowUpRight size={11} className="animate-pulse" />
        </div>
        <span className="text-[9px] font-semibold text-[#8E8E93] group-hover:text-[#F0F0F2] pr-0.5 hidden sm:inline">
          {activeDevice?.name} ↗
        </span>
      </div>

      {/* 2. Floating Compact Smart Taskbar */}
      <div
        onMouseEnter={cancelAutoHide}
        onMouseLeave={() => resetAutoHideTimer(3000)}
        className={`fixed bottom-2.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ease-out select-none ${
          isOpen || isStartMenuOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
        }`}
      >
        {/* Windows-style Start Menu Popup (Placed Above Start Button) */}
        {isStartMenuOpen && (
          <div
            ref={startMenuRef}
            className="absolute bottom-11 left-0 w-80 sm:w-88 max-h-[460px] p-3 rounded-2xl backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col gap-2.5 z-50 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{
              backgroundColor: `rgba(13, 13, 18, ${taskbarAlpha})`,
            }}
          >
            {/* Header: Title + Search Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="p-1 rounded-lg border"
                    style={{
                      backgroundColor: `${devColor}20`,
                      borderColor: `${devColor}40`,
                      color: devColor,
                    }}
                  >
                    <LayoutGrid size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#F0F0F2] flex items-center gap-1.5">
                      <span>{activeDevice?.name || 'Device'} Apps</span>
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-[#8E8E93] bg-white/5 px-1.5 py-0.5 rounded">
                    {apps.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsStartMenuOpen(false)}
                  className="p-1 text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-white/10 rounded-lg transition"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="Search installed apps..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-[#1C1C22] border border-white/10 rounded-xl pl-7 pr-7 py-1 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759]"
                />
                {menuSearch && (
                  <button
                    onClick={() => setMenuSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#F0F0F2]"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      audio.playTap();
                      setSelectedCategory(cat);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-medium capitalize shrink-0 transition ${
                      selectedCategory === cat
                        ? 'bg-white/20 text-[#F0F0F2] font-bold border border-white/20'
                        : 'bg-[#141418] text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Installed Apps Grid */}
            <div className="flex-1 overflow-y-auto max-h-64 grid grid-cols-4 gap-2 p-1 scrollbar-thin">
              {filteredStartApps.map((app) => {
                const isRunning = runningApps.includes(app.id);
                const hasBadge = (app.badgeCount ?? 0) > 0;

                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      audio.playTap();
                      launchApp(app.id);
                      setIsStartMenuOpen(false);
                    }}
                    className="group relative flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-all duration-150 text-center"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1C1C22] group-hover:scale-105 transition shadow-sm relative"
                      style={{ color: app.color }}
                    >
                      <DynamicIcon name={app.iconName} size={16} />
                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7px] font-bold flex items-center justify-center shadow-md">
                          {app.badgeCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#8E8E93] group-hover:text-[#F0F0F2] font-medium truncate w-full">
                      {app.name}
                    </span>
                    {isRunning && (
                      <span className="w-1 h-1 rounded-full bg-[#34C759]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom System Bar */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8E8E93]">
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: devColor }}
                />
                <span className="font-semibold text-[#F0F0F2] text-[10px] truncate max-w-[120px]">
                  {activeDevice?.name || 'Device'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    toggleQuickSettings();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
                  title="Quick Settings"
                >
                  <Sliders size={12} />
                </button>
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    setRecentsOpen(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
                  title="Task Manager / Recents"
                >
                  <Layers size={12} />
                </button>
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    lockDevice();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-[#FF3B30] transition"
                  title="Lock Device"
                >
                  <Lock size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Taskbar Container (Device Specific Layout) */}
        <div 
          className="px-2 py-1 rounded-xl backdrop-blur-2xl border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex items-center gap-1.5 max-w-[94vw] overflow-x-auto scrollbar-none ring-1 ring-white/5 h-9"
          style={{
            backgroundColor: `rgba(13, 13, 18, ${taskbarAlpha})`,
          }}
        >
          
          {/* 1. App Drawer / Windows-style Start Button (Left End) */}
          <button
            onClick={toggleStartMenu}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 ${
              isStartMenuOpen
                ? 'shadow-md scale-105 font-bold'
                : 'bg-[#1C1C22] hover:bg-[#2C2C34] text-[#F0F0F2] border border-white/10 hover:border-white/20'
            }`}
            style={{
              backgroundColor: isStartMenuOpen ? devColor : undefined,
              color: isStartMenuOpen ? '#0A0A0C' : undefined,
              boxShadow: isStartMenuOpen ? `0 4px 14px ${devColor}50` : undefined,
            }}
            title={`${activeDevice?.name} App Drawer`}
          >
            <div className="grid grid-cols-2 gap-0.5 p-0.5">
              <span className={`w-1.5 h-1.5 rounded-[1px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#007AFF]'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#34C759]'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#FF9500]'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#BF5AF2]'}`} />
            </div>
          </button>

          {/* If PRIMARY device (sm-t230nu): Show Current Open Apps + Recently Used Apps */}
          {isPrimaryDevice ? (
            <>
              {/* Divider between Start button and Running Apps */}
              <div className="h-4 w-[1px] bg-white/15 mx-0.5 shrink-0" />

              {/* Left List: Current Open / Running Apps */}
              <div className="flex items-center gap-1 shrink-0">
                {openAppItems.map((app) => {
                  const isActive = activeAppId === app.id;
                  const hasBadge = (app.badgeCount ?? 0) > 0;

                  return (
                    <div
                      key={`open-${app.id}`}
                      onClick={() => {
                        audio.playTap();
                        launchApp(app.id);
                      }}
                      className={`group relative w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'bg-[#2C2C34] border border-[#34C759]/60 shadow-sm shadow-[#34C759]/20'
                          : 'bg-[#17171E] hover:bg-[#22222C] border border-white/5 hover:border-white/15'
                      }`}
                      title={`${app.name} (Running)`}
                    >
                      {/* App Icon */}
                      <div style={{ color: app.color }}>
                        <DynamicIcon name={app.iconName} size={14} strokeWidth={2.2} />
                      </div>

                      {/* Notification Badge */}
                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7px] font-bold flex items-center justify-center shadow-sm">
                          {app.badgeCount}
                        </span>
                      )}

                      {/* Active Running Indicator Bar Underneath */}
                      <span
                        className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-150 ${
                          isActive ? 'w-3.5 bg-[#34C759]' : 'w-1.5 bg-white/30 group-hover:w-2.5 group-hover:bg-white/70'
                        }`}
                      />

                      {/* Quick Close Button on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.playTap();
                          killApp(app.id);
                        }}
                        className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#FF3B30] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition shadow-sm"
                        title={`Close ${app.name}`}
                      >
                        <X size={8} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Glass Divider Between Open and Recent Apps */}
              {openAppItems.length > 0 && recentAppItems.length > 0 && (
                <div className="h-4 w-[1px] bg-white/15 mx-0.5 shrink-0" />
              )}

              {/* Right List: Recently Used Apps */}
              {recentAppItems.length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  {recentAppItems.map((app) => {
                    const hasBadge = (app.badgeCount ?? 0) > 0;

                    return (
                      <div
                        key={`recent-${app.id}`}
                        onClick={() => {
                          audio.playTap();
                          launchApp(app.id);
                        }}
                        className="group relative w-7 h-7 rounded-lg bg-[#14141A]/70 hover:bg-[#1E1E28] border border-white/5 hover:border-white/15 flex items-center justify-center cursor-pointer transition-all duration-150"
                        title={`${app.name} (Recent)`}
                      >
                        {/* App Icon (Muted for Recents) */}
                        <div style={{ color: app.color }} className="opacity-75 group-hover:opacity-100 transition-opacity">
                          <DynamicIcon name={app.iconName} size={13} strokeWidth={2} />
                        </div>

                        {/* Notification Badge */}
                        {hasBadge && (
                          <span className="absolute -top-1 -right-1 min-w-[12px] h-[12px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7px] font-bold flex items-center justify-center shadow-sm">
                            {app.badgeCount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Divider before utility buttons */}
              <div className="h-4 w-[1px] bg-white/15 mx-0.5 shrink-0" />
            </>
          ) : (
            /* For OTHER devices: Divider between App Drawer and the 2 dedicated toggle buttons */
            <div className="h-4 w-[1px] bg-white/15 mx-0.5 shrink-0" />
          )}

          {/* 2. Clipboard Show/Hide Button */}
          <button
            onClick={() => {
              toggleClipboardPanel();
              resetAutoHideTimer(3500);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 ${
              isClipboardOpen
                ? 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 shadow-sm'
                : 'bg-[#17171E] hover:bg-[#22222C] text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5 hover:border-white/15'
            }`}
            title={isClipboardOpen ? 'Hide Clipboard History Panel' : 'Show Clipboard History Panel'}
          >
            <Clipboard size={13} />
          </button>

          {/* 3. Device Selector Panel Show/Hide Button */}
          <button
            onClick={() => {
              audio.playTap();
              toggleSidebar();
              resetAutoHideTimer(3500);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 ${
              !isSidebarCollapsed
                ? 'text-[#007AFF] bg-[#007AFF]/20 border border-[#007AFF]/40 shadow-sm'
                : 'bg-[#17171E] hover:bg-[#22222C] text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5 hover:border-white/15'
            }`}
            title={!isSidebarCollapsed ? 'Collapse Device Sidebar' : 'Expand Device Sidebar'}
          >
            {!isSidebarCollapsed ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
          </button>

          {/* Close/Hide Taskbar Button */}
          <button
            onClick={() => {
              audio.playTap();
              setIsStartMenuOpen(false);
              setIsOpen(false);
            }}
            className="p-1 ml-0.5 rounded-md text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-white/10 transition shrink-0"
            title="Hide Taskbar"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </>
  );
};
