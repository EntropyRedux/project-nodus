import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowUpRight, 
  X, 
  Clock, 
  LayoutGrid, 
  Search, 
  Sliders, 
  Lock, 
  Sparkles, 
  Layers, 
  Clipboard as ClipboardIcon, 
  PanelLeftClose, 
  PanelLeft,
  Activity,
  Check
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
    toggleQuickSettings,
    lockDevice,
    setRecentsOpen,
    isClipboardOpen,
    toggleClipboardPanel,
    isSidebarCollapsed,
    toggleSidebar,
    appBadges,
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
  const scale = settings.taskbarIconScale || 'medium';

  // Sizing tiers for taskbar scaling
  const sizeConfig = useMemo(() => {
    switch (scale) {
      case 'small':
        return {
          dockHeight: 'h-11',
          dockPadding: 'px-2 py-1',
          dockGap: 'gap-1.5',
          btnSize: 'w-8 h-8',
          iconSize: 18,
          indicatorH: 'h-[2px]',
          drawerWidth: 'w-[420px] sm:w-[480px]',
          drawerMaxH: 'max-h-[500px]',
          drawerGrid: 'grid-cols-4 sm:grid-cols-5 gap-2.5',
          drawerAppIconSize: 22,
          drawerAppBox: 'w-10 h-10',
        };
      case 'large':
        return {
          dockHeight: 'h-15',
          dockPadding: 'px-3.5 py-1.5',
          dockGap: 'gap-2.5',
          btnSize: 'w-12 h-12',
          iconSize: 26,
          indicatorH: 'h-[3px]',
          drawerWidth: 'w-[520px] sm:w-[620px] md:w-[680px]',
          drawerMaxH: 'max-h-[600px]',
          drawerGrid: 'grid-cols-4 sm:grid-cols-5 gap-3.5',
          drawerAppIconSize: 30,
          drawerAppBox: 'w-14 h-14',
        };
      case 'xlarge':
        return {
          dockHeight: 'h-17',
          dockPadding: 'px-4 py-2',
          dockGap: 'gap-3',
          btnSize: 'w-14 h-14',
          iconSize: 32,
          indicatorH: 'h-[3.5px]',
          drawerWidth: 'w-[560px] sm:w-[660px] md:w-[740px]',
          drawerMaxH: 'max-h-[640px]',
          drawerGrid: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4',
          drawerAppIconSize: 34,
          drawerAppBox: 'w-16 h-16',
        };
      case 'medium':
      default:
        return {
          dockHeight: 'h-13',
          dockPadding: 'px-2.5 py-1',
          dockGap: 'gap-2',
          btnSize: 'w-10 h-10',
          iconSize: 22,
          indicatorH: 'h-[2.5px]',
          drawerWidth: 'w-[480px] sm:w-[560px] md:w-[620px]',
          drawerMaxH: 'max-h-[560px]',
          drawerGrid: 'grid-cols-4 sm:grid-cols-5 gap-3',
          drawerAppIconSize: 26,
          drawerAppBox: 'w-12 h-12',
        };
    }
  }, [scale]);

  // Reset or set auto-hide timer
  const resetAutoHideTimer = (delay = 4500) => {
    if (isStartMenuOpen) return;
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
    resetAutoHideTimer(5000);
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

      if (deltaX > 25 && deltaY < -25 && deltaTime < 600) {
        triggerOpen();
      }
      touchStartRef.current = null;
    };

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

  // Map running apps items
  const openAppItems = useMemo(
    () =>
      runningApps
        .map((id) => apps.find((a) => a.id === id))
        .filter((a): a is AppItem => !!a),
    [runningApps, apps]
  );

  // Map recently used apps items that are not currently running
  const recentAppItems = useMemo(
    () =>
      recentApps
        .filter((id) => !runningApps.includes(id))
        .map((id) => apps.find((a) => a.id === id))
        .filter((a): a is AppItem => !!a)
        .slice(0, 7),
    [recentApps, runningApps, apps]
  );

  // Filter apps for Large Start Menu
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
          className="p-1 rounded-lg border group-hover:scale-110 transition"
          style={{
            backgroundColor: `${devColor}20`,
            borderColor: `${devColor}40`,
            color: devColor,
          }}
        >
          <ArrowUpRight size={12} className="animate-pulse" />
        </div>
        <span className="text-[10px] font-semibold text-[#8E8E93] group-hover:text-[#F0F0F2] pr-0.5 hidden sm:inline">
          {activeDevice?.name} ↗
        </span>
      </div>

      {/* 2. Floating Smart Taskbar */}
      <div
        onMouseEnter={cancelAutoHide}
        onMouseLeave={() => resetAutoHideTimer(3500)}
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-250 ease-out select-none ${
          isOpen || isStartMenuOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
        }`}
      >
        {/* Large Tablet-Optimized App Drawer Flyout */}
        {isStartMenuOpen && (
          <div
            ref={startMenuRef}
            className={`absolute bottom-16 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 ${sizeConfig.drawerWidth} ${sizeConfig.drawerMaxH} p-4 sm:p-5 rounded-3xl backdrop-blur-3xl border border-white/15 shadow-[0_24px_70px_rgba(0,0,0,0.9)] flex flex-col gap-3.5 z-50 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-3 duration-200`}
            style={{
              backgroundColor: `rgba(13, 13, 18, ${taskbarAlpha})`,
            }}
          >
            {/* Header: Title + Search Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
                    <LayoutGrid size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F0F0F2] flex items-center gap-2">
                      <span>App Drawer</span>
                      <span className="text-[10px] text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-full font-mono">
                        {filteredStartApps.length} Apps
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setIsStartMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
                  title="Close Drawer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="Type to search apps..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-[#1C1C22]/90 border border-white/10 rounded-2xl py-2 pl-9 pr-3 text-xs text-[#F0F0F2] placeholder-[#636366] focus:outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759]/40 transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      audio.playTap();
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize shrink-0 transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#34C759] text-[#0A0A0C] shadow-md shadow-[#34C759]/20 font-bold'
                        : 'bg-[#1C1C22]/80 text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Apps Grid */}
            <div className={`flex-1 overflow-y-auto pr-1 grid ${sizeConfig.drawerGrid} content-start min-h-[260px] max-h-[380px] scrollbar-thin`}>
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
                    className="group relative flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/10 active:scale-95 transition-all duration-150 text-center"
                  >
                    <div 
                      className={`${sizeConfig.drawerAppBox} rounded-2xl flex items-center justify-center bg-[#1C1C24] group-hover:scale-105 group-hover:shadow-lg transition shadow-sm relative overflow-hidden border border-white/5`}
                      style={{ color: app.color }}
                    >
                      {app.customIcon ? (
                        <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-lg" />
                      ) : (
                        <DynamicIcon name={app.iconName} size={sizeConfig.drawerAppIconSize} />
                      )}
                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[8px] font-bold flex items-center justify-center shadow-md">
                          {app.badgeCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8E8E93] group-hover:text-[#F0F0F2] font-medium truncate w-full px-1">
                      {app.name}
                    </span>
                    {isRunning && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shadow-sm shadow-[#34C759]/40" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom System Action Bar */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#8E8E93]">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: devColor }}
                />
                <span className="font-semibold text-[#F0F0F2] text-xs truncate max-w-[160px]">
                  {activeDevice?.name || 'Device'}
                </span>
                <span className="text-[10px] text-[#636366]">({activeDevice?.os})</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    toggleQuickSettings();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
                  title="Quick Settings"
                >
                  <Sliders size={14} />
                </button>
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    setRecentsOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition"
                  title="Task Manager / Recents"
                >
                  <Layers size={14} />
                </button>
                <button
                  onClick={() => {
                    audio.playTap();
                    setIsStartMenuOpen(false);
                    lockDevice();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] transition"
                  title="Lock Device"
                >
                  <Lock size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Taskbar Dock Container */}
        <div 
          className={`${sizeConfig.dockPadding} rounded-2xl backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.75)] flex items-center ${sizeConfig.dockGap} max-w-[95vw] overflow-x-auto scrollbar-none ring-1 ring-white/5 ${sizeConfig.dockHeight}`}
          style={{
            backgroundColor: `rgba(13, 13, 18, ${taskbarAlpha})`,
          }}
        >
          {/* 1. Large App Drawer / Windows-style Start Button */}
          <button
            onClick={toggleStartMenu}
            className={`${sizeConfig.btnSize} rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 ${
              isStartMenuOpen
                ? 'shadow-md scale-105 font-bold'
                : 'bg-[#1C1C24] hover:bg-[#2C2C36] text-[#F0F0F2] border border-white/10 hover:border-white/20 hover:scale-105'
            }`}
            style={{
              backgroundColor: isStartMenuOpen ? devColor : undefined,
              color: isStartMenuOpen ? '#0A0A0C' : undefined,
              boxShadow: isStartMenuOpen ? `0 4px 16px ${devColor}50` : undefined,
            }}
            title={`${activeDevice?.name} App Drawer (Start Menu)`}
          >
            <div className="grid grid-cols-2 gap-1 p-0.5">
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#007AFF]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#34C759]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#FF9500]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#BF5AF2]'}`} />
            </div>
          </button>

          {/* Divider between Start button and Running Apps */}
          <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0" />

          {/* 2. Open / Running Apps Section with Active Indicators */}
          <div className="flex items-center gap-1.5 shrink-0">
            {openAppItems.map((app) => {
              const isActive = activeAppId === app.id;
              const badgeNum = (app.packageName && typeof appBadges[app.packageName] === 'number') ? appBadges[app.packageName] : (app.badgeCount ?? 0);
              const hasBadge = badgeNum > 0;

              return (
                <div
                  key={`open-${app.id}`}
                  onClick={() => {
                    audio.playTap();
                    launchApp(app.id);
                  }}
                  className={`group relative ${sizeConfig.btnSize} rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-[#2C2C36] border border-[#34C759] shadow-md shadow-[#34C759]/25 scale-105'
                      : 'bg-[#171720] hover:bg-[#242430] border border-white/5 hover:border-white/20 hover:scale-105'
                  }`}
                  title={`${app.name} (Running)`}
                >
                  {/* App Icon */}
                  <div style={{ color: app.color }} className="flex items-center justify-center">
                    {app.customIcon ? (
                      <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                    ) : (
                      <DynamicIcon name={app.iconName} size={sizeConfig.iconSize} strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Notification Badge */}
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7.5px] font-bold flex items-center justify-center shadow-md">
                      {badgeNum}
                    </span>
                  )}

                  {/* Active Running Indicator Bar */}
                  <span
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${sizeConfig.indicatorH} rounded-full transition-all duration-200 ${
                      isActive ? 'w-4 bg-[#34C759] shadow-sm shadow-[#34C759]/50' : 'w-2 bg-[#34C759]/50 group-hover:w-3.5 group-hover:bg-[#34C759]'
                    }`}
                  />

                  {/* Quick Close / Kill Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      killApp(app.id);
                    }}
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#FF3B30] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-md z-10"
                    title={`Close ${app.name}`}
                  >
                    <X size={9} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Divider between Running Apps and Recent Apps */}
          {openAppItems.length > 0 && recentAppItems.length > 0 && (
            <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0" />
          )}

          {/* 3. Recently Used Apps (Muted & Quick Switch) */}
          {recentAppItems.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {recentAppItems.map((app) => {
                const badgeNum = (app.packageName && typeof appBadges[app.packageName] === 'number') ? appBadges[app.packageName] : (app.badgeCount ?? 0);
                const hasBadge = badgeNum > 0;

                return (
                  <div
                    key={`recent-${app.id}`}
                    onClick={() => {
                      audio.playTap();
                      launchApp(app.id);
                    }}
                    className={`group relative ${sizeConfig.btnSize} rounded-xl bg-[#14141C]/80 hover:bg-[#20202C] border border-white/5 hover:border-white/20 flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105`}
                    title={`${app.name} (Recent)`}
                  >
                    {/* App Icon */}
                    <div style={{ color: app.color }} className="opacity-75 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {app.customIcon ? (
                        <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                      ) : (
                        <DynamicIcon name={app.iconName} size={sizeConfig.iconSize - 2} strokeWidth={2} />
                      )}
                    </div>

                    {/* Notification Badge */}
                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7.5px] font-bold flex items-center justify-center shadow-sm">
                        {badgeNum}
                      </span>
                    )}

                    {/* Subtle Clock Dot on Hover for Recents */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8E8E93]/40 group-hover:bg-[#8E8E93] transition-colors" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Divider before utility buttons */}
          <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0" />

          {/* 4. Clipboard History Toggle Button */}
          <button
            onClick={() => {
              toggleClipboardPanel();
              resetAutoHideTimer(3500);
            }}
            className={`${sizeConfig.btnSize} rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 ${
              isClipboardOpen
                ? 'bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 shadow-sm'
                : 'bg-[#171720] hover:bg-[#242430] text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5 hover:border-white/15'
            }`}
            title={isClipboardOpen ? 'Hide Clipboard History Panel' : 'Show Clipboard History Panel'}
          >
            <ClipboardIcon size={sizeConfig.iconSize - 4} />
          </button>

          {/* 5. Device Sidebar Selector Toggle Button */}
          <button
            onClick={() => {
              audio.playTap();
              toggleSidebar();
              resetAutoHideTimer(3500);
            }}
            className={`${sizeConfig.btnSize} rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 ${
              !isSidebarCollapsed
                ? 'text-[#007AFF] bg-[#007AFF]/20 border border-[#007AFF]/40 shadow-sm'
                : 'bg-[#171720] hover:bg-[#242430] text-[#8E8E93] hover:text-[#F0F0F2] border border-white/5 hover:border-white/15'
            }`}
            title={!isSidebarCollapsed ? 'Collapse Device Sidebar' : 'Expand Device Sidebar'}
          >
            {!isSidebarCollapsed ? <PanelLeftClose size={sizeConfig.iconSize - 4} /> : <PanelLeft size={sizeConfig.iconSize - 4} />}
          </button>

          {/* Close/Hide Taskbar Button */}
          <button
            onClick={() => {
              audio.playTap();
              setIsStartMenuOpen(false);
              setIsOpen(false);
            }}
            className="p-1.5 ml-0.5 rounded-xl text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-white/10 transition shrink-0"
            title="Hide Taskbar"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );
};
