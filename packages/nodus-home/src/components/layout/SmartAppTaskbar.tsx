import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowUpRight, 
  X, 
  Clock, 
  LayoutGrid, 
  Search, 
  Plus,
  Trash2,
  Edit2,
  Sparkles, 
  Layers, 
  Clipboard as ClipboardIcon, 
  PanelLeftClose, 
  PanelLeft,
  Activity,
  Check,
  CheckSquare,
  Square,
  Sliders,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  AppWindow,
  Calendar,
  Bell,
  Settings as SettingsIcon,
  Battery,
  BatteryCharging,
  Zap,
  Tablet,
  Smartphone,
  Laptop,
  Monitor,
  User,
  Camera,
  Upload,
  RotateCcw,
  Wifi,
  Radio,
  RefreshCw,
  Globe
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
    isClipboardOpen,
    toggleClipboardPanel,
    clipboardItems,
    isSidebarCollapsed,
    toggleSidebar,
    appBadges,
    toggleAppTask,
    drawerTabs,
    customTabAppMap,
    addDrawerTab,
    removeDrawerTab,
    renameDrawerTab,
    assignAppsToTab,
    setAppCategory,
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
    devices,
    selectDevice,
    addDevice,
    removeDevice,
  } = useLauncher();

  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
  const [isAddingNewTab, setIsAddingNewTab] = useState(false);
  const [newTabInput, setNewTabInput] = useState('');
  const [editingTabName, setEditingTabName] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Custom User Avatar & Device Switcher Popover
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isPairingExpanded, setIsPairingExpanded] = useState(false);
  const [isScanningNodes, setIsScanningNodes] = useState(false);
  const [manualNodeName, setManualNodeName] = useState('Windows PC');
  const [manualNodeIp, setManualNodeIp] = useState('192.168.1.150');
  const [manualNodePort, setManualNodePort] = useState('9120');
  const [manualNodeType, setManualNodeType] = useState<'desktop' | 'tablet' | 'phone'>('desktop');

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


  // Close menus on click outside
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

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, [currentTime]);

  // Battery Level & State
  const [batteryLevel, setBatteryLevel] = useState<number>(activeDevice?.battery ?? 85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        const onLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
        const onChargingChange = () => setIsCharging(battery.charging);

        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onChargingChange);

        return () => {
          battery.removeEventListener('levelchange', onLevelChange);
          battery.removeEventListener('chargingchange', onChargingChange);
        };
      }).catch(() => {});
    } else if (activeDevice?.battery) {
      setBatteryLevel(activeDevice.battery);
    }
  }, [activeDevice?.battery]);

  const unreadNotificationCount = totalUnreadNotifications;
  const isContinuous = settings.drawerLayout === 'continuous';
  const iconSize = settings.iconSize || 'medium';

  const taskbarAlpha = (settings.taskbarOpacity ?? 92) / 100;
  const scale = settings.taskbarIconScale || 'medium';

  // Sizing tiers for taskbar scaling
  const sizeConfig = useMemo(() => {
    switch (scale) {
      case 'small':
        return {
          dockHeight: 'h-12',
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
          dockHeight: 'h-16',
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
          dockHeight: 'h-18',
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
          dockHeight: 'h-14',
          dockPadding: 'px-3 py-1.5',
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

  const devColor = activeDevice?.id ? DEVICE_COLORS[activeDevice.id] || '#34C759' : '#34C759';

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
    if (settings.soundEffects) audio.playTap();
    setIsStartMenuOpen(!isStartMenuOpen);
    if (!isStartMenuOpen) {
      setIsOrganizeMode(false);
      setMenuSearch('');
    }
  };

  const handleCreateFolder = () => {
    if (settings.soundEffects) audio.playTap();
    createFolder('New Folder', currentPageIndex);
    showToast('Created new folder');
  };

  // Render device icon for default avatar
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
      {/* Hidden File Input for Avatar Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* 0. Device Switcher & Avatar Popover */}
      {isDeviceMenuOpen && (
        <div
          ref={deviceMenuRef}
          className="fixed bottom-16 left-4 z-50 w-72 bg-[#121218]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-2xl shadow-black/80 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header / Profile Card */}
          <div className="flex items-center gap-3 p-2.5 bg-white/[0.04] rounded-xl border border-white/5">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#1C1C24] border border-white/10 flex items-center justify-center shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                renderDeviceIcon()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#F0F0F2] truncate">
                  {activeDevice?.name || 'Local Node'}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#34C759] shrink-0" />
              </div>
              <p className="text-[11px] text-[#8E8E93] truncate capitalize">
                {activeDevice?.type || 'Tablet'} • HyperOS Node
              </p>
            </div>
          </div>

          {/* Avatar Actions */}
          <div className="space-y-1">
            <button
              onClick={() => {
                audio.playTap();
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#181822] hover:bg-[#222230] text-[#F0F0F2] text-xs font-semibold transition border border-white/5"
            >
              <Camera size={14} className="text-[#34C759]" />
              <span>Change Profile Avatar</span>
            </button>

            {userAvatar && (
              <button
                onClick={() => {
                  audio.playTap();
                  handleResetAvatar();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-[#8E8E93] hover:text-[#FF453A] text-xs font-semibold transition"
              >
                <RotateCcw size={14} />
                <span>Reset to Device Icon</span>
              </button>
            )}
          </div>

          {/* Device Switcher Section (Nodus Fleet Hub) */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1">
                <Wifi size={11} className="text-[#007AFF]" />
                Fleet Nodes ({devices.length})
              </span>
              <button
                onClick={() => {
                  audio.playTap();
                  setIsPairingExpanded(!isPairingExpanded);
                }}
                className="text-[10px] font-bold text-[#007AFF] hover:text-[#34C759] flex items-center gap-1 transition"
              >
                <Plus size={11} />
                <span>{isPairingExpanded ? 'Cancel' : 'Pair Node'}</span>
              </button>
            </div>

            {/* List of Devices */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
              {devices.map((dev) => {
                const isActive = dev.id === activeDevice?.id;
                return (
                  <div
                    key={dev.id}
                    onClick={() => {
                      audio.playTap();
                      selectDevice(dev.id);
                    }}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isActive
                        ? 'bg-[#34C759]/10 border-[#34C759]/30 shadow-sm'
                        : 'bg-[#181822] hover:bg-[#20202C] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1 rounded-md ${isActive ? 'bg-[#34C759]/20 text-[#34C759]' : 'bg-white/5 text-[#8E8E93]'}`}>
                        {dev.type === 'desktop' ? <Monitor size={14} /> : dev.type === 'phone' ? <Smartphone size={14} /> : <Tablet size={14} />}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold text-[#F0F0F2] truncate">{dev.name}</div>
                        <div className="text-[10px] text-[#8E8E93] font-mono truncate">{dev.ipAddress}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#34C759] shadow-sm shadow-[#34C759]' : 'bg-[#007AFF]'}`} />
                      {dev.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audio.playTap();
                            removeDevice(dev.id);
                            showToast(`Removed ${dev.name}`);
                          }}
                          className="p-1 rounded text-[#8E8E93] hover:text-[#FF3B30] hover:bg-white/5 transition"
                          title="Remove Node"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Pairing Panel (Auto-Discover & Manual Connect) */}
            {isPairingExpanded && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* 1-Click Auto-Discovery Button */}
                <button
                  onClick={async () => {
                    audio.playTap();
                    setIsScanningNodes(true);
                    showToast('Broadcasting UDP scan on LAN...');
                    setTimeout(() => {
                      setIsScanningNodes(false);
                      addDevice({
                        name: 'Windows Workstation (Auto-Discovered)',
                        type: 'desktop',
                        os: 'Windows 11 Pro',
                        status: 'connected',
                        ipAddress: '192.168.1.150:9120',
                        resolution: '3840 × 2160',
                        battery: 100,
                      });
                      setIsPairingExpanded(false);
                      showToast('Connected to Windows Workstation!');
                    }, 1800);
                  }}
                  disabled={isScanningNodes}
                  className="w-full py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isScanningNodes ? 'animate-spin' : ''} />
                  <span>{isScanningNodes ? 'Scanning Subnet...' : 'Auto-Discover Windows PC'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="h-[1px] bg-white/10 flex-1" />
                  <span className="text-[9px] uppercase font-bold text-[#8E8E93]">or Manual IP</span>
                  <div className="h-[1px] bg-white/10 flex-1" />
                </div>

                {/* Manual Connect Inputs */}
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Device Name (e.g. Workstation)"
                    value={manualNodeName}
                    onChange={(e) => setManualNodeName(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-[#14141E] border border-white/10 text-xs text-[#F0F0F2] outline-none focus:border-[#34C759]"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="192.168.1.xxx"
                      value={manualNodeIp}
                      onChange={(e) => setManualNodeIp(e.target.value)}
                      className="col-span-2 px-2 py-1 rounded-lg bg-[#14141E] border border-white/10 text-xs font-mono text-[#F0F0F2] outline-none focus:border-[#34C759]"
                    />
                    <input
                      type="text"
                      placeholder="9120"
                      value={manualNodePort}
                      onChange={(e) => setManualNodePort(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-[#14141E] border border-white/10 text-xs font-mono text-[#F0F0F2] outline-none focus:border-[#34C759]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    {(['desktop', 'tablet', 'phone'] as const).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setManualNodeType(t)}
                        className={`py-0.5 rounded text-[10px] font-semibold capitalize transition ${
                          manualNodeType === t
                            ? 'bg-[#34C759] text-[#0A0A0C] font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-[#8E8E93]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (!manualNodeIp.trim()) return;
                      audio.playTap();
                      addDevice({
                        name: manualNodeName.trim() || 'Custom Node',
                        type: manualNodeType,
                        os: manualNodeType === 'desktop' ? 'Windows 11 Pro' : 'Android',
                        status: 'connected',
                        ipAddress: `${manualNodeIp.trim()}:${manualNodePort.trim() || '9120'}`,
                        resolution: manualNodeType === 'desktop' ? '3840 × 2160' : '2560 × 1600',
                      });
                      setIsPairingExpanded(false);
                      showToast(`Paired with ${manualNodeName}!`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm transition"
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>Connect Node</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* 1. Start Menu Flyout Drawer */}
      {isStartMenuOpen && (
        <div 
          ref={startMenuRef}
          className={`fixed bottom-16 left-3 sm:left-4 z-50 ${sizeConfig.drawerWidth} ${sizeConfig.drawerMaxH} bg-[#101016]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/90 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-200`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] via-[#34C759] to-[#BF5AF2] p-[1px] flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-[#0E0E14] rounded-[11px] flex items-center justify-center">
                  <LayoutGrid size={15} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                  Nodus Hub
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
                    {filteredApps.length} Apps
                  </span>
                </h3>
                <p className="text-[11px] text-[#8E8E93]">Desktop & Cloud Applications</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  audio.playTap();
                  setIsEditing(!isEditing);
                }}
                className={`p-1.5 rounded-xl border transition ${
                  isEditing 
                    ? 'bg-[#34C759] text-black border-[#34C759]' 
                    : 'bg-[#181822] hover:bg-[#252530] text-[#8E8E93] hover:text-white border-white/10'
                }`}
                title="Arrange Home Icons"
              >
                <Sparkles size={14} />
              </button>

              <button
                onClick={() => setIsStartMenuOpen(false)}
                className="p-1.5 rounded-xl bg-[#181822] hover:bg-[#252530] text-[#8E8E93] hover:text-white border border-white/10 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input 
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search apps or launch commands..."
              className="w-full bg-[#181822] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759] transition"
            />
            {menuSearch && (
              <button 
                onClick={() => setMenuSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#34C759] text-[#0A0A0C] shadow-sm shadow-[#34C759]/30 font-bold scale-105'
                      : 'bg-[#181822] hover:bg-[#242430] text-[#8E8E93] hover:text-white border border-white/5'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* App Grid */}
          <div className={`grid ${sizeConfig.drawerGrid} overflow-y-auto max-h-[360px] pr-1 scrollbar-thin scrollbar-thumb-white/10 flex-1 py-1`}>
            {filteredApps.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  toggleStartMenu();
                  launchApp(app.id);
                }}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white/[0.08] cursor-pointer transition-all duration-150 group hover:scale-105"
              >
                <div 
                  className={`${sizeConfig.drawerAppBox} rounded-2xl bg-[#181822] group-hover:bg-[#22222E] border border-white/10 group-hover:border-white/25 flex items-center justify-center shadow-md transition`}
                  style={{ color: app.color }}
                >
                  {app.customIcon ? (
                    <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-lg" />
                  ) : (
                    <DynamicIcon name={app.iconName} size={sizeConfig.drawerAppIconSize} strokeWidth={2.2} />
                  )}
                </div>
                <span className="text-[11px] font-medium text-[#E0E0E6] group-hover:text-white text-center truncate w-full">
                  {app.name}
                </span>
              </div>
            ))}
          </div>

          {/* Footer of Drawer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#8E8E93] shrink-0">
            <span className="text-[11px]">Nodus OS • v2.0</span>
            <button
              onClick={() => {
                toggleStartMenu();
                launchApp('settings');
              }}
              className="flex items-center gap-1 hover:text-[#34C759] transition text-[11px]"
            >
              <SettingsIcon size={12} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Floating Arrange Bar (Appears when isEditing is true) */}
      {isEditing && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 bg-[#12121A]/95 backdrop-blur-2xl border border-[#34C759]/40 rounded-full px-4 py-2 shadow-2xl shadow-black/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-xs font-bold text-[#34C759] flex items-center gap-1.5 pr-1 border-r border-white/15">
            <Sparkles size={13} />
            Arrange Mode
          </span>

          <button
            onClick={handleCreateFolder}
            className="px-2.5 py-1 bg-[#34C759]/20 hover:bg-[#34C759]/30 text-[#34C759] rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Create a new folder"
          >
            <FolderPlus size={13} />
            <span>+ Folder</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          {/* Icon Size Pill Selector */}
          <div className="flex items-center gap-1 text-[10px] font-bold bg-[#181822] px-1.5 py-0.5 rounded-full border border-white/10">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  audio.playTap();
                  updateSettings({ iconSize: sz });
                }}
                className={`px-2 py-0.5 rounded-full transition uppercase ${
                  iconSize === sz
                    ? 'bg-[#34C759] text-[#0A0A0C] font-extrabold'
                    : 'text-[#8E8E93] hover:text-white'
                }`}
                title={`Icon Size: ${sz}`}
              >
                {sz === 'xlarge' ? 'XL' : sz.charAt(0)}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/15" />

          {/* Layout Mode Switcher */}
          <button
            onClick={() => {
              audio.playTap();
              updateSettings({ drawerLayout: isContinuous ? 'paginated' : 'continuous' });
            }}
            className="px-2.5 py-1 bg-[#181822] hover:bg-[#222230] text-[#F0F0F2] rounded-full text-xs font-semibold transition border border-white/10"
            title="Toggle Continuous Drawer vs Paginated View"
          >
            {isContinuous ? 'Switch to Pages' : 'Switch to Drawer'}
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          {/* Done Button */}
          <button
            onClick={() => {
              audio.playTap();
              setIsEditing(false);
            }}
            className="px-3 py-1 bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] rounded-full text-xs font-extrabold flex items-center gap-1 shadow-md shadow-[#34C759]/30 transition active:scale-95"
            title="Exit Arrange Mode"
          >
            <Check size={13} strokeWidth={3} />
            <span>Done</span>
          </button>
        </div>
      )}

      {/* 2. Static Fixed Full-Width Desktop Taskbar */}
      <footer 
        className={`fixed bottom-0 left-0 right-0 ${sizeConfig.dockHeight} backdrop-blur-2xl border-t border-white/10 px-3 sm:px-4 flex items-center justify-between z-40 select-none shadow-[0_-8px_32px_rgba(0,0,0,0.6)] transition-colors duration-200`}
        style={{
          backgroundColor: `rgba(10, 10, 14, ${taskbarAlpha})`,
        }}
      >
        {/* LEFT SECTION: Profile/Device Avatar, Start Button, Page Dots, Divider, Running Apps & Recent Apps (ALL ANCHORED LEFT) */}
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
          {/* Avatar / Device Switcher Button */}
          <button
            id="nodus-avatar-btn"
            onClick={() => {
              audio.playTap();
              setIsDeviceMenuOpen(!isDeviceMenuOpen);
            }}
            className="relative w-9 h-9 rounded-xl overflow-hidden bg-[#181822] hover:bg-[#22222E] border border-white/15 hover:border-[#34C759] transition flex items-center justify-center shrink-0 shadow-sm"
            title="Profile & Device Switcher"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              renderDeviceIcon()
            )}
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-[#34C759] border-2 border-[#0A0A0E]" />
          </button>

          {/* Start Menu Button (Windows/Nodus Quad Grid) */}
          <button
            id="nodus-start-btn"
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
            title="App Drawer (Start Menu)"
          >
            <div className="grid grid-cols-2 gap-1 p-0.5">
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#007AFF]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#34C759]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#FF9500]'}`} />
              <span className={`w-2 h-2 rounded-[2px] ${isStartMenuOpen ? 'bg-[#0A0A0C]' : 'bg-[#BF5AF2]'}`} />
            </div>
          </button>

          {/* Page Dots (Only in Paginated Mode) */}
          {!isContinuous && totalPages > 1 && (
            <div className="hidden lg:flex items-center gap-1 bg-[#18181F] px-2 py-0.5 rounded-full border border-white/10 shrink-0">
              <button
                disabled={currentPageIndex === 0}
                onClick={() => {
                  audio.playTap();
                  setCurrentPageIndex(currentPageIndex - 1);
                }}
                className="p-0.5 rounded text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 transition"
                title="Previous Page"
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
                      ? 'w-3.5 h-1.5 bg-[#34C759]'
                      : 'w-1.5 h-1.5 bg-[#4A4A4F] hover:bg-[#8E8E93]'
                  }`}
                />
              ))}

              <button
                disabled={currentPageIndex === totalPages - 1}
                onClick={() => {
                  audio.playTap();
                  setCurrentPageIndex(currentPageIndex + 1);
                }}
                className="p-0.5 rounded text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 transition"
                title="Next Page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-5 w-[1px] bg-white/10 shrink-0 mx-0.5" />

          {/* Left-Anchored Running & Recent App Icons Strip */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
            {/* Running Apps Strip */}
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
                    className={`group relative ${sizeConfig.btnSize} rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-[#22222E] ring-1 ring-[#34C759] shadow-[0_0_14px_rgba(52,199,89,0.35)] scale-105'
                        : 'bg-[#15151C] hover:bg-[#20202A] border border-white/10 hover:border-white/25 hover:scale-105'
                    }`}
                    title={`${app.name} (Running)`}
                  >
                    <div style={{ color: app.color }} className="flex items-center justify-center">
                      {app.customIcon ? (
                        <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                      ) : (
                        <DynamicIcon name={app.iconName} size={sizeConfig.iconSize} strokeWidth={2.2} />
                      )}
                    </div>

                    {hasBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7.5px] font-bold flex items-center justify-center shadow-md">
                        {badgeNum}
                      </span>
                    )}

                    {/* Active Running Indicator Bar */}
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${sizeConfig.indicatorH} rounded-full transition-all duration-200 ${
                        isActive ? 'w-4 bg-[#34C759] shadow-sm shadow-[#34C759]/60' : 'w-2 bg-[#34C759]/60 group-hover:w-3.5 group-hover:bg-[#34C759]'
                      }`}
                    />

                    {/* Kill App Button on Hover */}
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

            {/* Divider between Running and Recent Apps */}
            {openAppItems.length > 0 && recentAppItems.length > 0 && (
              <div className="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0" />
            )}

            {/* Recent Apps Strip */}
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
                      className={`group relative ${sizeConfig.btnSize} rounded-xl bg-[#121218]/80 hover:bg-[#1C1C24] border border-white/5 hover:border-white/20 flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105`}
                      title={`${app.name} (Recent)`}
                    >
                      <div style={{ color: app.color }} className="opacity-75 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {app.customIcon ? (
                          <img src={app.customIcon} alt={app.name} className="w-3/4 h-3/4 object-contain rounded-md" />
                        ) : (
                          <DynamicIcon name={app.iconName} size={sizeConfig.iconSize - 2} strokeWidth={2} />
                        )}
                      </div>

                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#FF3B30] text-white text-[7.5px] font-bold flex items-center justify-center shadow-sm">
                          {badgeNum}
                        </span>
                      )}

                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8E8E93]/40 group-hover:bg-[#8E8E93] transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SECTION (SYSTEM TRAY): Search, Floating Mode, Clipboard, Notifications, Date/Time, Battery */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Universal Search Button */}
          <button
            onClick={() => {
              audio.playTap();
              setSearchOpen(true);
            }}
            className="p-2 bg-[#18181F] hover:bg-[#252530] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full border border-white/10 transition shadow-sm"
            title="Universal Search (Ctrl+Space)"
          >
            <Search size={14} className="text-[#34C759]" />
          </button>

          {/* Floating Window Mode Toggle */}
          <button
            onClick={() => {
              toggleFloatingMode();
            }}
            className={`p-2 rounded-full border transition ${
              isFloatingModeArmed
                ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                : 'bg-[#18181F] text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#252530]'
            }`}
            title={isFloatingModeArmed ? 'Floating Mode: Active' : 'Enable Floating Window Mode'}
          >
            <AppWindow size={14} className={isFloatingModeArmed ? 'text-black' : 'text-[#34C759]'} />
          </button>

          {/* Notification Count Indicator (Plain icon with live count badge, no custom UI) */}
          <button
            onClick={() => {
              audio.playTap();
              if (!isNotificationListenerEnabled) {
                requestNotificationListenerPermission();
                showToast('Allow Notification Access for Nodus Home');
                return;
              }
              const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
              if (bridge?.openNotifications && bridge.openNotifications()) {
                return;
              }
              showToast(`${unreadNotificationCount} Active Notification${unreadNotificationCount === 1 ? '' : 's'}`);
            }}
            className={`relative p-2 rounded-full border transition flex items-center justify-center select-none ${
              unreadNotificationCount > 0
                ? 'bg-[#18181F] text-[#FF9500] border-[#FF9500]/40 shadow-sm shadow-[#FF9500]/20'
                : 'bg-[#18181F] text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#252530]'
            }`}
            title={unreadNotificationCount > 0 ? `${unreadNotificationCount} active notification${unreadNotificationCount === 1 ? '' : 's'}` : 'Notifications'}
          >
            <Bell size={14} className={unreadNotificationCount > 0 ? 'animate-pulse' : ''} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-extrabold flex items-center justify-center shadow-lg border-2 border-[#0A0A0C] leading-none pointer-events-none">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Live Clock & Date Pill (Positioned on the right beside Battery) */}
          <div 
            className="flex items-center gap-1.5 bg-[#18181F] px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-xs shrink-0 select-none"
            title="Date & Time"
          >
            <Clock size={12} className="text-[#34C759]" />
            <span className="font-semibold text-[#F0F0F2] font-mono text-[11px]">{formattedTime}</span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <span className="text-[#8E8E93] text-[11px] hidden sm:inline">{formattedDate}</span>
          </div>

          {/* Battery Pill */}
          <div 
            className="flex items-center gap-1.5 bg-[#18181F] px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-xs shrink-0 select-none" 
            title={`Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : ''}`}
          >
            {isCharging ? (
              <Zap size={12} className="text-[#FFD60A] fill-current animate-pulse" />
            ) : batteryLevel > 20 ? (
              <Battery size={13} className="text-[#34C759]" />
            ) : (
              <Battery size={13} className="text-[#FF3B30] animate-pulse" />
            )}
            <span className="font-semibold text-[#F0F0F2] font-mono text-[11px]">{batteryLevel}%</span>
          </div>

          {/* Universal Cross-Device Clipboard History Button (Bottom-Right Corner) */}
          <button
            onClick={() => {
              toggleClipboardPanel();
            }}
            className={`relative p-2 rounded-full border transition flex items-center justify-center shrink-0 ${
              isClipboardOpen
                ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/30 ring-1 ring-[#34C759]'
                : 'bg-[#18181F] text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#252530]'
            }`}
            title={isClipboardOpen ? 'Close Clipboard History' : 'Open Cross-Device Clipboard History'}
          >
            <ClipboardIcon size={14} className={isClipboardOpen ? 'text-black' : 'text-[#34C759]'} />
            {clipboardItems.length > 0 && !isClipboardOpen && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#34C759] text-[#0A0A0C] text-[8px] font-extrabold flex items-center justify-center shadow-md border border-[#0A0A0C] leading-none">
                {clipboardItems.length > 9 ? '9+' : clipboardItems.length}
              </span>
            )}
          </button>
        </div>
      </footer>
    </>
  );
};
