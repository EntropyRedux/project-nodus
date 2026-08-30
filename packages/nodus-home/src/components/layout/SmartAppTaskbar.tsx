import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  LayoutGrid, 
  Search, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  FolderPlus, 
  AppWindow, 
  Bell, 
  Settings as SettingsIcon, 
  Tablet, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Camera, 
  RotateCcw, 
  Wifi, 
  Clipboard as ClipboardIcon 
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';
import { AppItem } from '../../types/launcher';
import { DEVICE_COLORS, getDeviceColor } from '../../utils/constants';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

export const SmartAppTaskbar: React.FC = () => {
  const { 
    apps, 
    runningApps, 
    recentApps, 
    activeAppId, 
    launchApp, 
    killApp,
    activeDevice,
    isClipboardOpen,
    toggleClipboardPanel,
    clipboardItems,
    appBadges,
    toggleAppTask,
    drawerTabs,
    customTabAppMap,
    showToast,
    settings,
    updateSettings,
    isEditing,
    setIsEditing,
    createFolder,
    currentPageIndex,
    totalPages,
    setCurrentPageIndex,
    setSearchOpen,
    isFloatingModeArmed,
    toggleFloatingMode,
    totalUnreadNotifications,
    isNotificationListenerEnabled,
    requestNotificationListenerPermission,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nodus_user_avatar') || null;
    } catch (_) {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startMenuRef = useRef<HTMLDivElement | null>(null);
  const deviceMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('#nodus-avatar-btn')) {
          setIsDeviceMenuOpen(false);
        }
      }
      if (startMenuRef.current && !startMenuRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('#nodus-start-btn')) {
          setIsStartMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setUserAvatar(result);
          try {
            localStorage.setItem('nodus_user_avatar', result);
          } catch (_) {}
          showToast('Profile avatar updated');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAvatar = () => {
    setUserAvatar(null);
    try {
      localStorage.removeItem('nodus_user_avatar');
    } catch (_) {}
    showToast('Reset to default device icon');
  };

  const unreadNotificationCount = totalUnreadNotifications;
  const isContinuous = settings.drawerLayout === 'continuous';
  const iconSize = settings.iconSize || 'medium';

  const taskbarAlpha = (settings.taskbarOpacity ?? 92) / 100;
  const scale = settings.taskbarIconScale || 'medium';

  const sizeConfig = useMemo(() => {
    switch (scale) {
      case 'small':
        return {
          dockHeight: 'h-12',
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
          dockHeight: 'h-16',
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
          dockHeight: 'h-18',
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
          dockHeight: 'h-14',
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

  const openAppItems = useMemo(() => {
    return runningApps
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppItem => a !== undefined);
  }, [runningApps, apps]);

  const recentAppItems = useMemo(() => {
    return recentApps
      .filter((id) => !runningApps.includes(id))
      .slice(0, 5)
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppItem => a !== undefined);
  }, [recentApps, runningApps, apps]);

  const devColor = activeDevice?.id ? getDeviceColor(activeDevice.id, activeDevice.type, activeDevice.os, (activeDevice as any).customColor) : '#34C759';

  const systemTabs = ['all', 'productivity', 'media', 'tools', 'social', 'games'];
  const allTabs = useMemo(() => {
    const customNames = drawerTabs.map(t => t.name);
    return Array.from(new Set([...systemTabs, ...customNames]));
  }, [drawerTabs]);

  const filteredApps = useMemo(() => {
    let result = apps;
    if (selectedCategory !== 'all') {
      const isCustomTab = !systemTabs.includes(selectedCategory);
      if (isCustomTab) {
        const assignedIds = customTabAppMap[selectedCategory] || [];
        result = result.filter(a => assignedIds.includes(a.id));
      } else {
        result = result.filter(a => a.category === selectedCategory);
      }
    }
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }
    return result;
  }, [apps, selectedCategory, menuSearch, customTabAppMap]);

  const toggleStartMenu = () => {
    audio.playTap();
    setIsStartMenuOpen(!isStartMenuOpen);
    if (!isStartMenuOpen) {
      setMenuSearch('');
    }
  };

  const handleCreateFolder = () => {
    audio.playTap();
    createFolder('New Folder', currentPageIndex);
    showToast('Created new folder');
  };

  const renderDeviceIcon = () => {
    const type = activeDevice?.type || 'tablet';
    switch (type) {
      case 'phone':
        return <Smartphone size={18} strokeWidth={2.2} className="text-[#34C759]" />;
      case 'laptop':
        return <Laptop size={18} strokeWidth={2.2} className="text-[#34C759]" />;
      case 'desktop':
        return <Monitor size={18} strokeWidth={2.2} className="text-[#34C759]" />;
      case 'tablet':
      default:
        return <Tablet size={18} strokeWidth={2.2} className="text-[#34C759]" />;
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Device Popover - Seamless Themed */}
      {isDeviceMenuOpen && (
        <div
          ref={deviceMenuRef}
          className={`fixed bottom-16 left-4 z-50 w-76 ${currentTheme.classes.drawerFlyout} ${currentTheme.cardRadius} p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${currentTheme.classes.containerFont} backdrop-blur-2xl`}
          style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'popup') }}
        >
          <div className={`flex items-center gap-3 p-2.5 ${currentTheme.classes.itemCard} ${currentTheme.cardRadius}`}>
            <div className={`relative w-11 h-11 ${currentTheme.archetype === 'hud' ? 'rounded-none' : 'rounded-full'} overflow-hidden bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0`}>
              {userAvatar ? (
                <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                renderDeviceIcon()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs truncate" style={{ color: currentTheme.classes.textPrimary }}>
                  {currentTheme.archetype === 'hud' ? `[NODE//${(activeDevice?.name || 'LOCAL').toUpperCase()}]` : (activeDevice?.name || 'Local Node')}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              </div>
              <p className="text-[10px] text-[#94A3B8] truncate font-mono">
                {activeDevice?.type || 'Workstation'} • {activeDevice?.ipAddress || '192.168.1.108'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                audio.playTap();
                fileInputRef.current?.click();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} text-xs font-semibold`}
            >
              <Camera size={14} style={{ color: currentAccent.hex }} />
              <span>Change Node Avatar</span>
            </button>

            {userAvatar && (
              <button
                onClick={() => {
                  audio.playTap();
                  handleResetAvatar();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 ${currentTheme.buttonRadius} hover:bg-white/5 text-[#94A3B8] hover:text-[#F43F5E] text-xs font-semibold transition`}
              >
                <RotateCcw size={14} />
                <span>Reset to Hardware Icon</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between px-1 mb-2 font-mono">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
                <Wifi size={11} style={{ color: currentAccent.hex }} />
                Cluster Mesh
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold">Active Node</span>
            </div>

            <div className={`p-2 ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 ${currentTheme.buttonRadius} bg-white/[0.06]`} style={{ color: currentAccent.hex }}>
                  {renderDeviceIcon()}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F1F5F9]">{activeDevice?.name || 'Local Controller'}</div>
                  <div className="text-[10px] font-mono" style={{ color: currentAccent.hex }}>Primary Controller</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
        </div>
      )}

      {/* Start Menu Flyout Drawer */}
      {isStartMenuOpen && (
        <div 
          ref={startMenuRef}
          className={`fixed bottom-16 left-3 sm:left-4 z-50 ${sizeConfig.drawerWidth} ${sizeConfig.drawerMaxH} ${currentTheme.classes.drawerFlyout} ${currentTheme.cardRadius} p-4 sm:p-5 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-200 ${currentTheme.classes.containerFont} backdrop-blur-2xl`}
          style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
        >
          <div className={`flex items-center justify-between pb-2.5 ${currentTheme.classes.modalHeader} shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 ${currentTheme.buttonRadius} flex items-center justify-center`}
                style={{ backgroundColor: currentAccent.badgeBg, border: `1px solid ${currentAccent.badgeBorder}` }}
              >
                <LayoutGrid size={16} style={{ color: currentAccent.hex }} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#F1F5F9] tracking-wide flex items-center gap-2">
                  <span>{currentTheme.archetype === 'hud' ? '[SYS//EXECUTABLES]' : 'Workstation Hub'}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${currentTheme.classes.badgeStyle}`}
                    style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
                  >
                    {filteredApps.length} APPS
                  </span>
                </h3>
                <p className="text-[11px] text-[#94A3B8]">Mesh Executables & System Utilities</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  audio.playTap();
                  setIsEditing(!isEditing);
                }}
                className={`p-1.5 ${currentTheme.buttonRadius} border transition ${
                  isEditing 
                    ? 'bg-[#10B981] text-[#090B10] border-[#10B981] font-bold' 
                    : `${currentTheme.classes.actionButton}`
                }`}
                title="Arrange Workstation Grid"
              >
                <Sparkles size={14} />
              </button>

              <button
                onClick={() => setIsStartMenuOpen(false)}
                className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input 
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search executables, scripts, or apps..."
              className={`w-full ${currentTheme.classes.inputField} pl-9 pr-8 py-2 text-xs transition`}
            />
            {menuSearch && (
              <button 
                onClick={() => setMenuSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 shrink-0">
            {allTabs.map((tab) => {
              const isActive = selectedCategory === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    audio.playTap();
                    setSelectedCategory(tab);
                  }}
                  className={`px-3 py-1 ${currentTheme.pillRadius} text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    isActive
                      ? 'font-bold scale-105 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] border border-white/[0.04]'
                  }`}
                  style={isActive ? { backgroundColor: currentAccent.hex, color: '#090B10' } : {}}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className={`grid ${sizeConfig.drawerGrid} overflow-y-auto max-h-[360px] pr-1 scrollbar-thin scrollbar-thumb-white/10 flex-1 py-1`}>
            {filteredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  toggleStartMenu();
                  launchApp(app.id);
                }}
                className={`flex flex-col items-center gap-1.5 p-2 ${currentTheme.cardRadius} hover:bg-white/[0.04] cursor-pointer transition-all duration-150 group hover:scale-105`}
              >
                <div 
                  className={`${sizeConfig.drawerAppBox} ${currentTheme.cardRadius} ${currentTheme.classes.iconBg} ${currentTheme.classes.iconBorder} ${currentTheme.classes.iconHover} ${currentTheme.classes.iconShadow} flex items-center justify-center transition`}
                  style={{ color: app.color || currentAccent.hex }}
                >
                  {app.customIcon ? (
                    <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-lg" />
                  ) : (
                    <DynamicIcon name={app.iconName} size={sizeConfig.drawerAppIconSize} strokeWidth={2.2} />
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#E2E8F0] group-hover:text-white text-center truncate w-full">
                  {app.name}
                </span>
              </div>
            ))}
          </div>

          <div className={`pt-2 ${currentTheme.classes.modalHeader} flex items-center justify-between text-xs text-[#94A3B8] shrink-0 font-mono`}>
            <span className="text-[10px]">NODUS WORKSTATION</span>
            <button
              onClick={() => {
                toggleStartMenu();
                launchApp('settings');
              }}
              className="flex items-center gap-1 transition text-[11px]"
              style={{ color: currentAccent.hex }}
            >
              <SettingsIcon size={12} />
              <span>Config</span>
            </button>
          </div>
        </div>
      )}

      {/* Arrange Mode Floating Bar - Seamless Themed */}
      {isEditing && (
        <div 
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-40 ${currentTheme.classes.drawerFlyout} ${currentTheme.pillRadius} px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${currentTheme.classes.containerFont} backdrop-blur-2xl`}
          style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
        >
          <span className="text-xs font-bold flex items-center gap-1.5 pr-1 border-r border-white/15 font-mono" style={{ color: currentAccent.hex }}>
            <Sparkles size={13} />
            GRID ARRANGE
          </span>

          <button
            onClick={handleCreateFolder}
            className={`px-2.5 py-1 ${currentTheme.pillRadius} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border`}
            style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            title="Create a new folder"
          >
            <FolderPlus size={13} />
            <span>+ Folder</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          <div className={`flex items-center gap-1 text-[10px] font-bold bg-[#141924] px-1.5 py-0.5 ${currentTheme.pillRadius} border border-white/10 font-mono`}>
            {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  audio.playTap();
                  updateSettings({ iconSize: sz });
                }}
                className={`px-2 py-0.5 ${currentTheme.pillRadius} transition uppercase ${
                  iconSize === sz
                    ? 'text-[#090B10] font-extrabold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
                style={iconSize === sz ? { backgroundColor: currentAccent.hex } : {}}
                title={`Icon Size: ${sz}`}
              >
                {sz === 'xlarge' ? 'XL' : sz.charAt(0)}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/15" />

          <button
            onClick={() => {
              audio.playTap();
              updateSettings({ drawerLayout: isContinuous ? 'paginated' : 'continuous' });
            }}
            className={`px-2.5 py-1 bg-[#141924] hover:bg-[#1C2333] text-[#F1F5F9] ${currentTheme.pillRadius} text-xs font-semibold transition border border-white/10`}
            title="Toggle Continuous Drawer vs Paginated View"
          >
            {isContinuous ? 'Pages View' : 'Drawer View'}
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          <button
            onClick={() => {
              audio.playTap();
              setIsEditing(false);
            }}
            className={`px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-[#090B10] ${currentTheme.pillRadius} text-xs font-extrabold flex items-center gap-1 shadow-md shadow-[#10B981]/30 transition active:scale-95`}
            title="Exit Arrange Mode"
          >
            <Check size={13} strokeWidth={3} />
            <span>Done</span>
          </button>
        </div>
      )}

      {/* Static Fixed Full-Width Desktop Taskbar - Seamless Floating Aesthetics */}
      <footer 
        className={`fixed bottom-0 left-0 right-0 ${sizeConfig.dockHeight} ${currentTheme.classes.taskbarBg} ${currentTheme.classes.taskbarBorder} px-3 sm:px-4 flex items-center justify-between z-40 select-none transition-colors duration-200 backdrop-blur-2xl`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'taskbar') }}
      >
        {/* LEFT SECTION: Avatar, Start, Page Dots, Running & Recent Apps */}
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
          <button
            id="nodus-avatar-btn"
            onClick={() => {
              audio.playTap();
              setIsDeviceMenuOpen(!isDeviceMenuOpen);
            }}
            className="relative w-8.5 h-8.5 rounded-full overflow-hidden bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition flex items-center justify-center shrink-0 shadow-none"
            style={{
              borderColor: isDeviceMenuOpen ? currentAccent.hex : undefined,
            }}
            title="Profile & Node Status"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              renderDeviceIcon()
            )}
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-[#10B981] border-2 border-[#090B10]" />
          </button>

          <button
            id="nodus-start-btn"
            onClick={toggleStartMenu}
            className={`${sizeConfig.btnSize} ${currentTheme.buttonRadius} flex items-center justify-center transition-all duration-150 shrink-0 ${
              isStartMenuOpen
                ? 'scale-105 font-bold'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#F1F5F9] border border-white/[0.06] hover:border-white/[0.15] hover:scale-105'
            }`}
            style={{
              backgroundColor: isStartMenuOpen ? currentAccent.hex : undefined,
              color: isStartMenuOpen ? '#090B10' : undefined,
              boxShadow: isStartMenuOpen ? `0 0 14px ${currentAccent.glowRgba}` : undefined,
            }}
            title="Workstation App Drawer"
          >
            <div className="grid grid-cols-2 gap-1 p-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isStartMenuOpen ? '#090B10' : currentAccent.hex }} />
              <span className={`w-1.5 h-1.5 rounded-full ${isStartMenuOpen ? 'bg-[#090B10]' : 'bg-[#10B981]'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isStartMenuOpen ? 'bg-[#090B10]' : 'bg-[#F59E0B]'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isStartMenuOpen ? 'bg-[#090B10]' : 'bg-[#A855F7]'}`} />
            </div>
          </button>

          {!isContinuous && totalPages > 1 && (
            <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/[0.04] shrink-0 font-mono">
              <button
                disabled={currentPageIndex === 0}
                onClick={() => {
                  audio.playTap();
                  setCurrentPageIndex(currentPageIndex - 1);
                }}
                className="p-0.5 rounded text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-20 transition"
                title="Previous Workspace"
              >
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    audio.playTap();
                    setCurrentPageIndex(idx);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    currentPageIndex === idx
                      ? 'w-3.5 h-1.5'
                      : 'w-1.5 h-1.5 bg-[#475569] hover:bg-[#94A3B8]'
                  }`}
                  style={{
                    backgroundColor: currentPageIndex === idx ? currentAccent.hex : undefined,
                  }}
                />
              ))}

              <button
                disabled={currentPageIndex === totalPages - 1}
                onClick={() => {
                  audio.playTap();
                  setCurrentPageIndex(currentPageIndex + 1);
                }}
                className="p-0.5 rounded text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-20 transition"
                title="Next Workspace"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          <div className="h-4 w-[1px] bg-white/[0.06] shrink-0 mx-0.5" />

          {/* Running & Recent App Icons Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0 py-1">
              {openAppItems.map((app) => {
                const isActive = activeAppId === app.id;
                const badgeNum = (app.packageName && typeof appBadges[app.packageName] === 'number') ? appBadges[app.packageName] : (app.badgeCount ?? 0);
                const hasBadge = badgeNum > 0;

                return (
                  <div
                    key={`open-${app.id}`}
                    onClick={() => {
                      toggleAppTask(app.id);
                    }}
                    className={`group relative ${sizeConfig.btnSize} ${currentTheme.buttonRadius} flex items-center justify-center cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.08] ring-1 scale-105'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] hover:border-white/[0.12] hover:scale-105'
                    }`}
                    style={{
                      borderColor: isActive ? currentAccent.hex : undefined,
                      boxShadow: isActive ? `0 0 12px ${currentAccent.glowRgba}` : undefined,
                    }}
                    title={`${app.name} (Running)`}
                  >
                    <div style={{ color: app.color || currentAccent.hex }} className="flex items-center justify-center">
                      {app.customIcon ? (
                        <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                      ) : (
                        <DynamicIcon name={app.iconName} size={sizeConfig.iconSize} strokeWidth={2.2} />
                      )}
                    </div>

                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#F43F5E] text-white text-[7.5px] font-bold flex items-center justify-center shadow-md">
                        {badgeNum}
                      </span>
                    )}

                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${sizeConfig.indicatorH} rounded-full transition-all duration-200 ${
                        isActive ? 'w-4' : 'w-2 opacity-60 group-hover:w-3.5 group-hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: currentAccent.hex,
                        boxShadow: isActive ? `0 0 8px ${currentAccent.hex}` : undefined,
                      }}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        killApp(app.id);
                      }}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#F43F5E] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-md z-10"
                      title={`Terminate ${app.name}`}
                    >
                      <X size={9} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>

            {openAppItems.length > 0 && recentAppItems.length > 0 && (
              <div className="h-4 w-[1px] bg-white/[0.06] mx-0.5 shrink-0" />
            )}

            {recentAppItems.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0 py-1">
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
                      className={`group relative ${sizeConfig.btnSize} ${currentTheme.buttonRadius} bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.03] hover:border-white/[0.08] flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105`}
                      title={`${app.name} (Recent)`}
                    >
                      <div style={{ color: app.color || currentAccent.hex }} className="opacity-75 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {app.customIcon ? (
                          <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                        ) : (
                          <DynamicIcon name={app.iconName} size={sizeConfig.iconSize - 2} strokeWidth={2} />
                        )}
                      </div>

                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#F43F5E] text-white text-[7.5px] font-bold flex items-center justify-center shadow-sm">
                          {badgeNum}
                        </span>
                      )}

                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#94A3B8]/40 group-hover:bg-[#94A3B8] transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SECTION (SYSTEM TRAY): Search, Floating Mode, Notifications, Clipboard */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              audio.playTap();
              setSearchOpen(true);
            }}
            className={`p-2 bg-transparent hover:bg-white/[0.06] text-[#94A3B8] hover:text-[#F1F5F9] ${currentTheme.buttonRadius} transition shadow-none`}
            title="Command Search (Ctrl+Space / ⌘+K)"
          >
            <Search size={15} style={{ color: currentAccent.hex }} />
          </button>

          <button
            onClick={() => {
              toggleFloatingMode();
            }}
            className={`p-2 ${currentTheme.buttonRadius} transition font-bold`}
            style={{
              backgroundColor: isFloatingModeArmed ? currentAccent.hex : 'transparent',
              color: isFloatingModeArmed ? '#090B10' : '#94A3B8',
            }}
            title={isFloatingModeArmed ? 'Floating Window Mode: Active' : 'Enable Floating Window Mode'}
          >
            <AppWindow size={15} style={{ color: isFloatingModeArmed ? '#090B10' : currentAccent.hex }} />
          </button>

          <button
            onClick={() => {
              audio.playTap();
              if (!isNotificationListenerEnabled) {
                requestNotificationListenerPermission();
                showToast('Notification telemetry active');
                return;
              }
              showToast(`${unreadNotificationCount} Active Node Notification${unreadNotificationCount === 1 ? '' : 's'}`);
            }}
            className={`relative p-2 ${currentTheme.buttonRadius} transition flex items-center justify-center select-none ${
              unreadNotificationCount > 0
                ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'bg-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.06]'
            }`}
            title={unreadNotificationCount > 0 ? `${unreadNotificationCount} active notifications` : 'Notifications'}
          >
            <Bell size={15} className={unreadNotificationCount > 0 ? 'animate-pulse' : ''} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#F43F5E] text-white text-[8px] font-extrabold flex items-center justify-center shadow-md border border-[#090B10] leading-none pointer-events-none font-mono">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Universal Cross-Device Clipboard History Button */}
          <button
            onClick={() => {
              toggleClipboardPanel();
            }}
            className={`relative p-2 ${currentTheme.buttonRadius} transition flex items-center justify-center shrink-0`}
            style={{
              backgroundColor: isClipboardOpen ? currentAccent.hex : 'transparent',
              color: isClipboardOpen ? '#090B10' : '#94A3B8',
            }}
            title={isClipboardOpen ? 'Close Clipboard Panel' : 'Open Cross-Device Clipboard'}
          >
            <ClipboardIcon size={15} style={{ color: isClipboardOpen ? '#090B10' : currentAccent.hex }} />
            {clipboardItems.length > 0 && !isClipboardOpen && (
              <span
                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full text-[#090B10] text-[8px] font-extrabold flex items-center justify-center shadow-md leading-none font-mono"
                style={{ backgroundColor: currentAccent.hex }}
              >
                {clipboardItems.length > 9 ? '9+' : clipboardItems.length}
              </span>
            )}
          </button>
        </div>
      </footer>
    </>
  );
};
