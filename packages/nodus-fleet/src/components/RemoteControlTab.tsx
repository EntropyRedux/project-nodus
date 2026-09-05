import React, { useState, useRef, useEffect } from 'react';
import { DeviceInfo } from '../nodus-common';
import { RemoteControlTabProps } from '../types/ui-contracts';
import { universalNetworkFetch } from '../services/FleetDirectClient';
import {
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  MousePointer2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Lock,
  Send,
  Plus,
  X,
  Check,
  Sliders,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Command,
  CornerDownLeft,
  Activity,
  Maximize2,
  GripVertical,
  GripHorizontal,
  History,
  RotateCcw,
  Edit2,
  Trash2
} from 'lucide-react';

interface ClickRipple {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface Hotkey {
  label: string;
  keys: string[];
  color?: string;
}

const DEFAULT_MACRO_SNIPPETS = [
  'git status',
  'ls -la',
  'clear',
  'docker ps',
  'systeminfo',
  'exit',
  'echo "test"'
];

const DEFAULT_HOTKEYS: Hotkey[] = [
  { label: 'Win+D', keys: ['Meta', 'd'], color: '#9ECAFF' },
  { label: 'Alt+F4', keys: ['Alt', 'F4'], color: '#FFB4AB' },
  { label: 'Ctrl+C', keys: ['Control', 'c'], color: '#82D5A5' },
  { label: 'Ctrl+V', keys: ['Control', 'v'], color: '#82D5A5' },
  { label: 'Ctrl+Z', keys: ['Control', 'z'], color: '#D4AAFF' },
  { label: 'Ctrl+Shift+Esc', keys: ['Control', 'Shift', 'Escape'], color: '#FFD87A' },
  { label: 'Alt+Tab', keys: ['Alt', 'Tab'], color: '#9ECAFF' },
  { label: 'Win+L', keys: ['Meta', 'l'], color: '#FFB4AB' },
  { label: 'PrtScn', keys: ['PrintScreen'], color: '#D4AAFF' },
  { label: 'Ctrl+A', keys: ['Control', 'a'], color: '#9ECAFF' },
];

function getDeviceIcon(type: DeviceInfo['type'], size = 15) {
  switch (type) {
    case 'tablet':
      return <Tablet size={size} />;
    case 'laptop':
      return <Laptop size={size} />;
    case 'phone':
      return <Smartphone size={size} />;
    case 'desktop':
    default:
      return <Monitor size={size} />;
  }
}

export const RemoteControlTab: React.FC<RemoteControlTabProps> = ({
  devices,
  targetDeviceId,
  onSelectDevice
}) => {
  // Remote state controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [injectText, setInjectText] = useState('');
  const [telemetryMessage, setTelemetryMessage] = useState<string | null>(null);

  // Hotkey management
  const [hotkeys, setHotkeys] = useState<Hotkey[]>(DEFAULT_HOTKEYS);
  const [isAddingHotkey, setIsAddingHotkey] = useState(false);
  const [customHotkeyInput, setCustomHotkeyInput] = useState('');

  // Quick Macro Snippets State with persistence
  const [macroSnippets, setMacroSnippets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_macro_snippets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_MACRO_SNIPPETS;
  });

  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newSnippetInput, setNewSnippetInput] = useState('');
  const [editingSnippetIdx, setEditingSnippetIdx] = useState<number | null>(null);
  const [editSnippetInput, setEditSnippetInput] = useState('');
  const [isManagingSnippets, setIsManagingSnippets] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_macro_snippets', JSON.stringify(macroSnippets));
    } catch (e) {
      console.error(e);
    }
  }, [macroSnippets]);

  // Main screen responsiveness and layout
  const [leftColWidth, setLeftColWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isLgScreen, setIsLgScreen] = useState(true);
  const [mobileDeckView, setMobileDeckView] = useState<'touchpad' | 'keys' | 'all'>('touchpad');
  const containerRef = useRef<HTMLDivElement>(null);

  // Vertical resizable split between Hotkeys (top) and Inject Keystrokes (bottom)
  const [hotkeysHeightPct, setHotkeysHeightPct] = useState(48);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const rightColRef = useRef<HTMLDivElement>(null);

  // Recent injected commands
  const [recentInjections, setRecentInjections] = useState<string[]>([
    'systeminfo',
    'git status',
    'npm run build'
  ]);

  useEffect(() => {
    const checkLg = () => setIsLgScreen(window.innerWidth >= 1024);
    checkLg();
    window.addEventListener('resize', checkLg);
    return () => window.removeEventListener('resize', checkLg);
  }, []);

  // Splitter mouse and touch drag listeners (horizontal column split)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(28, Math.min(72, rawPct));
      setLeftColWidth(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(28, Math.min(72, rawPct));
      setLeftColWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Vertical Splitter drag listeners (between Hotkeys and Inject Keystrokes)
  useEffect(() => {
    if (!isDraggingVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!rightColRef.current) return;
      const rect = rightColRef.current.getBoundingClientRect();
      const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(20, Math.min(80, rawPct));
      setHotkeysHeightPct(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!rightColRef.current || !e.touches[0]) return;
      const rect = rightColRef.current.getBoundingClientRect();
      const rawPct = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(20, Math.min(80, rawPct));
      setHotkeysHeightPct(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingVertical(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingVertical]);

  // Trackpad motion & clicks
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [isClickHeld, setIsClickHeld] = useState(false);
  const [sensitivity, setSensitivity] = useState<'normal' | 'precision' | 'fast'>('normal');

  const targetDevice = devices.find(d => d.id === targetDeviceId) || devices.find(d => !d.isLocal) || devices[0] || null;
  const controllableDevices = devices.filter(d => !d.isLocal);

  // Device selection dropdown menu state
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(e.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDeviceDropdownOpen(false);
      }
    };

    if (isDeviceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeviceDropdownOpen]);

  // Android Haptic Feedback Helper
  const triggerHaptic = (pattern: number | number[] = 12) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Safe fallback when vibration is unsupported or restricted
    }
  };

  const showTelemetry = (msg: string) => {
    setTelemetryMessage(msg);
    setTimeout(() => {
      setTelemetryMessage(null);
    }, 2400);
  };

  const handleTrackpadMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x, y });

    const dx = Math.round((e.movementX || 0) * (sensitivity === 'fast' ? 2.5 : sensitivity === 'precision' ? 0.6 : 1.2));
    const dy = Math.round((e.movementY || 0) * (sensitivity === 'fast' ? 2.5 : sensitivity === 'precision' ? 0.6 : 1.2));
    if (dx !== 0 || dy !== 0) {
      universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/mouse/move`, {
        method: 'POST',
        body: { dx, dy },
        timeoutMs: 1500,
      }).catch(() => {});
    }
  };

  // Android Touch Event Listeners with Edge Inset to protect system back gesture
  const handleTrackpadTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!targetDevice || !e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];

    // Protect against Android system gesture zones (outer 14px of display)
    if (touch.clientX < 14 || touch.clientX > window.innerWidth - 14) return;

    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x, y });
    setIsClickHeld(true);
    triggerHaptic(10);
  };

  const handleTrackpadTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!targetDevice || !targetDevice.ipAddress || !e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];

    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    const dx = Math.round((x - cursorPos.x) * 4);
    const dy = Math.round((y - cursorPos.y) * 4);
    setCursorPos({ x, y });

    if (dx !== 0 || dy !== 0) {
      universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/mouse/move`, {
        method: 'POST',
        body: { dx, dy },
        timeoutMs: 1500,
      }).catch(() => {});
    }
  };

  const handleTrackpadTouchEnd = () => {
    setIsClickHeld(false);
  };

  const triggerRipple = (x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  };

  const handleTrackpadMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsClickHeld(true);

    const buttonName = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    triggerHaptic(15);
    triggerRipple(x, y, buttonName === 'left' ? '#9ECAFF' : buttonName === 'middle' ? '#82D5A5' : '#D4AAFF');
    showTelemetry(`${buttonName.toUpperCase()} Click sent to ${targetDevice.name}`);

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/mouse/click`, {
      method: 'POST',
      body: { button: buttonName },
      timeoutMs: 1500,
    }).catch(() => {});
  };

  const handleTrackpadWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    triggerRipple(cursorPos.x, cursorPos.y, '#82D5A5');
    const dy = Math.round(e.deltaY);
    showTelemetry(dy > 0 ? 'Scroll Down' : 'Scroll Up');

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/mouse/scroll`, {
      method: 'POST',
      body: { dx: 0, dy },
      timeoutMs: 1500,
    }).catch(() => {});
  };

  const handleButtonAction = (buttonName: 'left' | 'middle' | 'right') => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    triggerHaptic(15);
    const color = buttonName === 'left' ? '#9ECAFF' : buttonName === 'middle' ? '#82D5A5' : '#D4AAFF';
    triggerRipple(cursorPos.x, cursorPos.y, color);
    showTelemetry(`${buttonName.toUpperCase()} Click sent to ${targetDevice.name}`);

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/mouse/click`, {
      method: 'POST',
      body: { button: buttonName },
      timeoutMs: 1500,
    }).catch(() => {});
  };

  const handleMediaAction = (action: string) => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    triggerHaptic(12);
    if (action === 'play_pause') {
      setIsPlaying(!isPlaying);
      showTelemetry(!isPlaying ? 'Media Play command sent' : 'Media Pause command sent');
    } else {
      showTelemetry(`Media ${action.toUpperCase()} command sent`);
    }

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/media/control`, {
      method: 'POST',
      body: { action },
      timeoutMs: 2000,
    }).catch(() => {});
  };

  const handleHotkeyClick = (hk: Hotkey) => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    triggerHaptic(12);
    showTelemetry(`Hotkey [${hk.label}] executed on ${targetDevice.name}`);

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/keyboard/hotkey`, {
      method: 'POST',
      body: { keys: hk.keys },
      timeoutMs: 2000,
    }).catch(() => {});
  };

  const handleLockWorkstation = () => {
    if (!targetDevice || !targetDevice.ipAddress) return;
    triggerHaptic([25, 50, 25]);
    showTelemetry(`Lock Workstation command sent to ${targetDevice.name}`);

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/lock`, {
      method: 'POST',
      body: {},
      timeoutMs: 2000,
    }).catch(() => {});
  };

  const executeInject = (text: string) => {
    if (!text.trim() || !targetDevice || !targetDevice.ipAddress) return;
    triggerHaptic(10);
    const clean = text.trim();
    showTelemetry(`Injected "${clean.slice(0, 18)}${clean.length > 18 ? '...' : ''}"`);
    setRecentInjections(prev => [clean, ...prev.filter(t => t !== clean)].slice(0, 6));

    universalNetworkFetch(`http://${targetDevice.ipAddress}/api/input/keyboard/text`, {
      method: 'POST',
      body: { text: clean },
      timeoutMs: 2000,
    }).catch(() => {});
  };

  const handleInjectTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectText.trim() || !targetDevice) return;
    executeInject(injectText);
    setInjectText('');
  };

  const handleAddCustomHotkey = () => {
    const raw = customHotkeyInput.trim();
    if (!raw) return;
    if (hotkeys.some(h => h.label.toLowerCase() === raw.toLowerCase())) {
      showTelemetry('Hotkey already exists');
      return;
    }
    const newHk: Hotkey = {
      label: raw,
      keys: raw.split('+').map(k => k.trim()),
      color: '#9ECAFF'
    };
    setHotkeys(prev => [...prev, newHk]);
    setCustomHotkeyInput('');
    setIsAddingHotkey(false);
    showTelemetry(`Added hotkey [${raw}]`);
  };

  const handleRemoveHotkey = (index: number) => {
    const hk = hotkeys[index];
    setHotkeys(prev => prev.filter((_, i) => i !== index));
    showTelemetry(`Removed hotkey [${hk.label}]`);
  };

  const handleResetHotkeys = () => {
    setHotkeys(DEFAULT_HOTKEYS);
    showTelemetry('Reset hotkeys to default deck');
  };

  const handleAddSnippet = () => {
    const trimmed = newSnippetInput.trim();
    if (!trimmed) return;
    if (macroSnippets.includes(trimmed)) {
      showTelemetry(`Snippet "${trimmed}" already exists`);
      return;
    }
    setMacroSnippets(prev => [...prev, trimmed]);
    setNewSnippetInput('');
    setIsAddingSnippet(false);
    showTelemetry(`Added snippet "${trimmed}"`);
  };

  const handleStartEditSnippet = (idx: number) => {
    setEditingSnippetIdx(idx);
    setEditSnippetInput(macroSnippets[idx]);
    setIsAddingSnippet(false);
  };

  const handleSaveEditSnippet = () => {
    if (editingSnippetIdx === null) return;
    const trimmed = editSnippetInput.trim();
    if (!trimmed) return;
    setMacroSnippets(prev => {
      const next = [...prev];
      next[editingSnippetIdx] = trimmed;
      return next;
    });
    showTelemetry(`Updated snippet to "${trimmed}"`);
    setEditingSnippetIdx(null);
    setEditSnippetInput('');
  };

  const handleRemoveSnippet = (idx: number) => {
    const target = macroSnippets[idx];
    setMacroSnippets(prev => prev.filter((_, i) => i !== idx));
    if (editingSnippetIdx === idx) {
      setEditingSnippetIdx(null);
      setEditSnippetInput('');
    }
    showTelemetry(`Removed snippet "${target}"`);
  };

  const handleResetSnippets = () => {
    setMacroSnippets(DEFAULT_MACRO_SNIPPETS);
    setEditingSnippetIdx(null);
    setIsAddingSnippet(false);
    showTelemetry('Reset snippets to default list');
  };

  const VolumeIcon = isMuted ? VolumeX : volume > 50 ? Volume2 : Volume1;

  return (
    <div className="flex flex-col min-h-full lg:h-full bg-[#1D2024] border border-white/5 rounded-xl overflow-hidden shadow-xl text-[#E2E2E9]">
      {/* Top Device Switcher & Synced Bar */}
      <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#191C20] border-b border-white/5 flex items-center justify-between gap-3 relative z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#A8C7FA]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono hidden xs:inline">
              Control
            </span>
          </div>

          {/* Device Selection Dropdown Menu */}
          <div className="relative" ref={deviceDropdownRef}>
            <button
              onClick={() => setIsDeviceDropdownOpen(prev => !prev)}
              disabled={controllableDevices.length === 0}
              className={`h-8 sm:h-9 flex items-center gap-2 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition border ${
                isDeviceDropdownOpen
                  ? 'bg-[#282A2F] text-white border-[#A8C7FA]/50 shadow-md ring-1 ring-[#A8C7FA]/30'
                  : 'bg-[#1D2024] hover:bg-[#282A2F] text-slate-200 border-white/10 hover:border-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              aria-expanded={isDeviceDropdownOpen}
              aria-haspopup="listbox"
              title="Select Remote Target Device"
            >
              {targetDevice ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        targetDevice.status === 'online'
                          ? '#6DD58C'
                          : targetDevice.status === 'connected'
                          ? '#A8C7FA'
                          : targetDevice.status === 'idle'
                          ? '#FFDDAF'
                          : '#879099'
                    }}
                  />
                  <span className="text-[#A8C7FA] shrink-0">
                    {getDeviceIcon(targetDevice.type, 14)}
                  </span>
                  <span className="font-semibold max-w-[120px] sm:max-w-[170px] truncate text-slate-100">
                    {targetDevice.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                    {targetDevice.ipAddress}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 italic">Select Target Node</span>
              )}
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ml-0.5 shrink-0 ${
                  isDeviceDropdownOpen ? 'rotate-180 text-[#A8C7FA]' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popup */}
            {isDeviceDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 sm:w-80 bg-[#1D2024] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Target Remote Node ({controllableDevices.length})
                  </span>
                  <span className="text-[10px] font-mono text-[#A8C7FA] bg-[#00497D]/30 px-1.5 py-0.5 rounded">
                    Direct RPC
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto px-1 space-y-0.5 no-scrollbar">
                  {controllableDevices.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500 font-mono">
                      No remote nodes found on mesh
                    </div>
                  ) : (
                    controllableDevices.map(device => {
                      const isActive = targetDevice?.id === device.id;
                      const isOnline = device.status !== 'offline';
                      return (
                        <button
                          key={device.id}
                          onClick={() => {
                            if (isOnline) {
                              onSelectDevice(device.id);
                              setIsDeviceDropdownOpen(false);
                              triggerHaptic(12);
                              showTelemetry(`Switched target node to ${device.name}`);
                            }
                          }}
                          disabled={!isOnline}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2.5 transition text-xs ${
                            isActive
                              ? 'bg-[#A8C7FA]/15 text-[#A8C7FA] font-medium border border-[#A8C7FA]/20'
                              : isOnline
                              ? 'hover:bg-[#282A2F] text-slate-200 border border-transparent'
                              : 'opacity-40 cursor-not-allowed text-slate-500 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  device.status === 'online'
                                    ? '#6DD58C'
                                    : device.status === 'connected'
                                    ? '#A8C7FA'
                                    : device.status === 'idle'
                                    ? '#FFDDAF'
                                    : '#879099'
                              }}
                            />
                            <div className="p-1.5 rounded bg-[#111318] text-slate-300 shrink-0 border border-white/5">
                              {getDeviceIcon(device.type, 13)}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="truncate font-semibold text-slate-100 flex items-center gap-1.5">
                                <span>{device.name}</span>
                                {device.isLocal && (
                                  <span className="text-[9px] px-1 py-0.2 bg-[#00497D]/40 text-[#A8C7FA] rounded font-mono">
                                    Local
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate">
                                {device.ipAddress} · {device.os || device.type}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isActive ? (
                              <div className="w-5 h-5 rounded-full bg-[#A8C7FA] text-[#062E6F] flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <span
                                className={`text-[10px] font-mono capitalize px-1.5 py-0.5 rounded ${
                                  device.status === 'online'
                                    ? 'text-[#6DD58C] bg-[#6DD58C]/10'
                                    : device.status === 'connected'
                                    ? 'text-[#A8C7FA] bg-[#A8C7FA]/10'
                                    : device.status === 'idle'
                                    ? 'text-[#FFDDAF] bg-[#FFDDAF]/10'
                                    : 'text-slate-500 bg-white/5'
                                }`}
                              >
                                {device.status}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle (< lg screens) or Split controls (lg screens) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile View Mode Switcher */}
          {!isLgScreen && (
            <div className="flex items-center bg-[#111318] p-0.5 sm:p-1 rounded-lg border border-white/5 text-[11px] font-mono">
              <button
                onClick={() => setMobileDeckView('touchpad')}
                className={`h-6 sm:h-7 px-2 sm:px-2.5 rounded-md font-medium transition flex items-center gap-1 ${
                  mobileDeckView === 'touchpad'
                    ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Precision Touchpad & Media View"
              >
                <MousePointer2 size={12} />
                <span className="hidden sm:inline">Touchpad</span>
              </button>

              <button
                onClick={() => setMobileDeckView('keys')}
                className={`h-6 sm:h-7 px-2 sm:px-2.5 rounded-md font-medium transition flex items-center gap-1 ${
                  mobileDeckView === 'keys'
                    ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Keyboard Shortcuts & Keystrokes View"
              >
                <Command size={12} />
                <span className="hidden sm:inline">Keys</span>
              </button>

              <button
                onClick={() => setMobileDeckView('all')}
                className={`h-6 sm:h-7 px-2 sm:px-2.5 rounded-md font-medium transition flex items-center gap-1 ${
                  mobileDeckView === 'all'
                    ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Scrollable Combined View"
              >
                <Sliders size={12} />
                <span>All</span>
              </button>
            </div>
          )}

          {/* Desktop Column Split Ratio & Reset */}
          {isLgScreen && (
            <button
              onClick={() => setLeftColWidth(50)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#111318] border border-white/5 text-[11px] font-mono text-slate-400 hover:text-[#A8C7FA] hover:border-[#A8C7FA]/40 transition"
              title="Reset Split Layout to 50 / 50"
            >
              <RotateCcw size={11} className="text-[#A8C7FA]" />
              <span>Split {Math.round(leftColWidth)}% / {Math.round(100 - leftColWidth)}%</span>
            </button>
          )}

          {/* LAN Synced Indicator */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono text-[#6DD58C] bg-[#0F5223]/20 border border-[#6DD58C]/20 px-2 sm:px-2.5 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6DD58C] animate-pulse" />
            <span className="hidden xs:inline">SYNCED</span>
          </div>

          {/* Sensitivity Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-[#111318] p-1 rounded-lg border border-white/5 text-[11px] font-mono">
            <span className="text-slate-500 px-1.5 text-[10px]">Speed</span>
            {(['normal', 'fast', 'precision'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSensitivity(mode)}
                className={`h-6 px-2 rounded-md capitalize font-medium transition ${
                  sensitivity === mode
                    ? 'bg-[#A8C7FA] text-[#062E6F] shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Control Deck Content: Two Resizable Columns on Desktop, Adaptive Deck on Mobile/Tablet */}
      <div
        ref={containerRef}
        className={`flex-1 ${
          isLgScreen
            ? 'flex flex-row p-4 lg:p-5 gap-0 overflow-hidden'
            : 'flex flex-col p-3 sm:p-5 gap-4 overflow-y-auto'
        } relative ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        {/* Left Column: Remote Touchpad & Media Controls */}
        {(isLgScreen || mobileDeckView === 'touchpad' || mobileDeckView === 'all') && (
          <div
            className={`flex flex-col gap-3.5 ${
              isLgScreen
                ? 'h-full overflow-y-auto w-full lg:min-w-[320px] lg:pr-3.5'
                : mobileDeckView === 'all'
                ? 'w-full shrink-0'
                : 'w-full h-full overflow-y-auto min-h-0'
            }`}
            style={
              isLgScreen
                ? {
                    flexBasis: `${leftColWidth}%`,
                    flexGrow: 0,
                    flexShrink: 0
                  }
                : undefined
            }
          >
          {/* Virtual Precision Trackpad */}
          <div
            onMouseMove={handleTrackpadMove}
            onMouseDown={handleTrackpadMouseDown}
            onMouseUp={() => setIsClickHeld(false)}
            onMouseLeave={() => setIsClickHeld(false)}
            onTouchStart={handleTrackpadTouchStart}
            onTouchMove={handleTrackpadTouchMove}
            onTouchEnd={handleTrackpadTouchEnd}
            onTouchCancel={handleTrackpadTouchEnd}
            onWheel={handleTrackpadWheel}
            onContextMenu={e => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className="flex-1 bg-[#111318] border border-white/10 rounded-xl relative cursor-crosshair overflow-hidden group flex flex-col justify-between p-5 min-h-[250px] select-none shadow-inner"
          >
            {/* Ambient Tech Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#282A2F_1px,transparent_1px),linear-gradient(to_bottom,#282A2F_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />

            {/* Active Cursor Dot with Halo */}
            {targetDevice && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 ease-out"
                style={{
                  left: `${cursorPos.x}%`,
                  top: `${cursorPos.y}%`,
                  zIndex: 10
                }}
              >
                <div
                  className={`rounded-full transition-all duration-100 ${
                    isClickHeld ? 'w-5 h-5 bg-[#A8C7FA]' : 'w-4 h-4 bg-[#A8C7FA]'
                  }`}
                  style={{
                    boxShadow: '0 0 16px #A8C7FA'
                  }}
                />
              </div>
            )}

            {/* Click Ripple Animations */}
            {ripples.map(ripple => (
              <div
                key={ripple.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 pointer-events-none animate-ping"
                style={{
                  left: `${ripple.x}%`,
                  top: `${ripple.y}%`,
                  borderColor: ripple.color,
                  zIndex: 8
                }}
              />
            ))}

            {/* Top Info Bar inside Trackpad */}
            <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 pointer-events-none">
              <span className="flex items-center gap-1.5 text-[#A8C7FA] font-medium">
                <MousePointer2 className="w-3.5 h-3.5" />
                Virtual Precision Trackpad
              </span>
              <span className="text-slate-500 font-mono">
                X: {Math.round(cursorPos.x)}% · Y: {Math.round(cursorPos.y)}%
              </span>
            </div>

            {/* Center Watermark / Helper */}
            <div className="relative z-0 my-auto text-center pointer-events-none">
              <p className="text-xs font-medium text-slate-300">
                Touch or drag anywhere to steer cursor
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Tap to click · Two-finger drag to scroll · Press & hold for drag
              </p>
            </div>

            {/* Bottom Status label */}
            <div className="absolute bottom-4 left-5 text-[11px] font-mono text-slate-500 pointer-events-none">
              Low-Latency RPC Bridge
            </div>
            <div className="absolute bottom-4 right-5 text-[11px] font-mono text-slate-500 pointer-events-none">
              ~1.2ms
            </div>
          </div>

          {/* Left / Middle / Right Mouse Buttons - Uniform Scale */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleButtonAction('left')}
              disabled={!targetDevice}
              className="bg-[#282A2F] hover:bg-[#33353A] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 transition-colors active:scale-95 disabled:opacity-40 border border-white/5 shadow-sm"
            >
              <span>Left Click</span>
            </button>

            <button
              onClick={() => handleButtonAction('middle')}
              disabled={!targetDevice}
              className="bg-[#282A2F] hover:bg-[#33353A] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 transition-colors active:scale-95 disabled:opacity-40 border border-white/5 shadow-sm"
            >
              <span>Middle</span>
            </button>

            <button
              onClick={() => handleButtonAction('right')}
              disabled={!targetDevice}
              className="bg-[#282A2F] hover:bg-[#33353A] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 transition-colors active:scale-95 disabled:opacity-40 border border-white/5 shadow-sm"
            >
              <span>Right Click</span>
            </button>
          </div>

          {/* Telemetry Action Indicator Pill */}
          <div className="h-6 flex items-center justify-center">
            {telemetryMessage ? (
              <div className="px-3 py-1 rounded-md bg-[#0F5223]/25 border border-[#6DD58C]/30 text-[#6DD58C] text-xs font-medium flex items-center gap-1.5 shadow">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{telemetryMessage}</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-slate-500">
                Touchpad active · Ready for input
              </span>
            )}
          </div>

          {/* Media & Sound Deck in Left Column */}
          <div className="p-5 rounded-xl bg-[#282A2F] border border-white/5 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                <Sliders className="w-3.5 h-3.5 text-[#A8C7FA]" />
                Media & Sound Deck
              </h4>
              <button
                onClick={handleLockWorkstation}
                disabled={!targetDevice}
                className="h-8 px-3 rounded-lg bg-[#93000A]/20 hover:bg-[#93000A]/30 text-[#FFB4AB] border border-[#FFB4AB]/20 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <Lock className="w-3 h-3" />
                <span>Lock Screen</span>
              </button>
            </div>

            {/* Media Transport Playback Buttons - Uniform Scale */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleMediaAction('prev')}
                disabled={!targetDevice}
                className="h-9 rounded-lg bg-[#1D2024] hover:bg-[#33353A] text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 border border-white/5"
              >
                <SkipBack className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => handleMediaAction('play_pause')}
                disabled={!targetDevice}
                className="h-9 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-950/30 disabled:opacity-40"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => handleMediaAction('next')}
                disabled={!targetDevice}
                className="h-9 rounded-lg bg-[#1D2024] hover:bg-[#33353A] text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 border border-white/5"
              >
                <SkipForward className="w-4 h-4" />
                <span>Next</span>
              </button>
            </div>

            {/* Volume Slider & Mute Toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  showTelemetry(!isMuted ? 'Muted workstation audio' : 'Unmuted workstation audio');
                }}
                disabled={!targetDevice}
                className="w-9 h-9 rounded-lg bg-[#1D2024] hover:bg-[#33353A] text-slate-300 disabled:opacity-40 transition border border-white/5 flex items-center justify-center"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={e => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                  showTelemetry(`Volume set to ${val}%`);
                }}
                disabled={!targetDevice}
                className="flex-1 accent-[#A8C7FA] cursor-pointer disabled:opacity-40"
              />

              <span className="text-xs font-mono text-slate-300 w-9 text-right font-medium">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Resizable Divider Handle (Desktop Only) */}
        {isLgScreen && (
          <div
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
            onDoubleClick={() => setLeftColWidth(50)}
            className="hidden lg:flex items-center justify-center w-3.5 cursor-col-resize select-none relative group h-full py-2 z-20 shrink-0"
            title="Drag left or right to resize columns · Double-click to reset 50/50"
          >
            <div
              className={`w-1 h-full rounded-full transition-colors flex items-center justify-center ${
                isDragging
                  ? 'bg-[#A8C7FA] shadow-[0_0_12px_#A8C7FA]'
                  : 'bg-white/10 group-hover:bg-[#A8C7FA]/50'
              }`}
            >
              <div
                className={`p-0.5 rounded-md bg-[#1D2024] border transition-all shadow-md ${
                  isDragging
                    ? 'border-[#A8C7FA] text-[#A8C7FA] scale-110'
                    : 'border-white/10 text-slate-400 group-hover:text-[#A8C7FA] group-hover:border-[#A8C7FA]/50'
                }`}
              >
                <GripVertical size={13} />
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Workstation Hotkeys & Inject Keystrokes */}
        {(isLgScreen || mobileDeckView === 'keys' || mobileDeckView === 'all') && (
          <div
            ref={rightColRef}
            className={`flex flex-col ${
              isLgScreen
                ? 'h-full overflow-hidden w-full lg:min-w-[300px] lg:pl-3.5 relative'
                : mobileDeckView === 'all'
                ? 'w-full gap-4 shrink-0'
                : 'w-full h-full overflow-y-auto gap-4 min-h-0'
            } ${isDraggingVertical && isLgScreen ? 'select-none cursor-row-resize' : ''}`}
            style={
              isLgScreen
                ? {
                    flexBasis: `${100 - leftColWidth}%`,
                    flexGrow: 1,
                    flexShrink: 1
                  }
                : undefined
            }
          >
            {/* Workstation Hotkeys Deck (Top Container) */}
            <div
              className={`p-3.5 sm:p-5 rounded-xl bg-[#282A2F] border border-white/5 space-y-3 overflow-y-auto flex flex-col ${
                isLgScreen ? 'shrink-0' : 'min-h-[220px]'
              }`}
              style={
                isLgScreen
                  ? {
                      flexBasis: `${hotkeysHeightPct}%`,
                      height: `${hotkeysHeightPct}%`
                    }
                  : undefined
              }
            >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                  <Sliders className="w-3.5 h-3.5 text-[#A8C7FA]" />
                  <span>Workstation Shortcuts</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400 bg-[#1D2024] px-2 py-0.5 rounded-md border border-white/5">
                  {hotkeys.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hotkeys.length !== DEFAULT_HOTKEYS.length && (
                  <button
                    onClick={handleResetHotkeys}
                    className="h-7 px-2.5 rounded-md text-[11px] font-mono text-slate-400 hover:text-white bg-[#1D2024] border border-white/5 hover:border-white/10 transition"
                    title="Reset to default hotkeys"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsAddingHotkey(!isAddingHotkey)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#062E6F] flex items-center gap-1 transition bg-[#A8C7FA] hover:bg-[#C2E7FF]"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Custom Key</span>
                </button>
              </div>
            </div>

            {/* Custom Hotkey Inline Creator Form */}
            {isAddingHotkey && (
              <div className="p-3 rounded-lg bg-[#1D2024] border border-white/10 space-y-2 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customHotkeyInput}
                    onChange={e => setCustomHotkeyInput(e.target.value)}
                    placeholder="e.g. Ctrl+Shift+Esc or Win+R"
                    autoFocus
                    className="flex-1 h-8 px-3 rounded-lg bg-[#111318] border border-white/10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#A8C7FA]"
                  />
                  <button
                    onClick={handleAddCustomHotkey}
                    disabled={!customHotkeyInput.trim()}
                    className="w-8 h-8 rounded-lg bg-[#A8C7FA] text-[#062E6F] text-xs font-bold hover:bg-[#C2E7FF] transition disabled:opacity-40 flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsAddingHotkey(false)}
                    className="w-8 h-8 rounded-lg bg-[#282A2F] text-slate-400 hover:text-white transition flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Hotkey Pills Grid - Uniform Scaled rounded-lg items */}
            <div className="flex flex-wrap gap-2 overflow-y-auto flex-1 content-start pt-1">
              {hotkeys.map((hk, idx) => (
                <div
                  key={hk.label + idx}
                  className="group relative flex items-center bg-[#1D2024] hover:bg-[#33353A] rounded-lg border border-white/5 transition hover:border-white/10 shadow-sm"
                >
                  <button
                    onClick={() => handleHotkeyClick(hk)}
                    disabled={!targetDevice}
                    className="h-9 px-3.5 text-xs font-mono text-slate-200 transition-colors active:scale-95 disabled:opacity-40 flex items-center gap-2"
                    title={`Send hotkey: ${hk.label}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hk.color || '#A8C7FA' }} />
                    <span>{hk.label}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveHotkey(idx);
                    }}
                    className="opacity-0 group-hover:opacity-100 pr-2 pl-1 h-9 text-slate-400 hover:text-red-400 transition flex items-center justify-center"
                    title={`Remove hotkey ${hk.label}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal Resizable Divider Handle (Desktop Only) */}
          {isLgScreen && (
            <div
              onMouseDown={() => setIsDraggingVertical(true)}
              onTouchStart={() => setIsDraggingVertical(true)}
              onDoubleClick={() => setHotkeysHeightPct(48)}
              className="flex items-center justify-center h-3.5 cursor-row-resize select-none relative group w-full py-0.5 z-20 shrink-0 my-0.5"
              title="Drag up or down to resize · Double-click to reset split (48% / 52%)"
            >
              <div
                className={`h-1 w-full rounded-full transition-colors flex items-center justify-center ${
                  isDraggingVertical
                    ? 'bg-[#6DD58C] shadow-[0_0_12px_#6DD58C]'
                    : 'bg-white/10 group-hover:bg-[#6DD58C]/60'
                }`}
              >
                <div
                  className={`px-2.5 py-0.5 rounded-md bg-[#1D2024] border transition-all shadow-md flex items-center gap-1.5 ${
                    isDraggingVertical
                      ? 'border-[#6DD58C] text-[#6DD58C] scale-105'
                      : 'border-white/10 text-slate-400 group-hover:text-[#6DD58C] group-hover:border-[#6DD58C]/50'
                  }`}
                >
                  <GripHorizontal size={13} />
                  <span className="text-[9px] font-mono font-semibold hidden group-hover:inline">
                    {Math.round(hotkeysHeightPct)}% / {Math.round(100 - hotkeysHeightPct)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Inject Keystrokes Deck (Bottom Container) */}
          <div
            className={`p-3.5 sm:p-5 rounded-xl bg-[#282A2F] border border-white/5 space-y-3 overflow-y-auto flex flex-col justify-between ${
              isLgScreen ? 'shrink-0' : 'min-h-[220px]'
            }`}
            style={
              isLgScreen
                ? {
                    flexBasis: `calc(${100 - hotkeysHeightPct}% - 14px)`,
                    height: `calc(${100 - hotkeysHeightPct}% - 14px)`
                  }
                : undefined
            }
          >
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 font-mono">
                  <CornerDownLeft className="w-3.5 h-3.5 text-[#6DD58C]" />
                  <span>Inject Keystrokes</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Target: {targetDevice?.name || 'None'}
                </span>
              </div>

              {/* Text / Keystrokes Injection Form */}
              <form onSubmit={handleInjectTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={injectText}
                  onChange={e => setInjectText(e.target.value)}
                  placeholder="Type text or command to inject into active window..."
                  disabled={!targetDevice}
                  className="flex-1 h-9 px-3.5 rounded-lg bg-[#111318] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A8C7FA] font-mono disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!targetDevice || !injectText.trim()}
                  className="h-9 px-4 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold font-mono flex items-center gap-1.5 transition shadow disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Inject</span>
                </button>
              </form>

              {/* Quick Keystroke Macro Chips with Full CRUD */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Macro Snippets:
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-[#1D2024] px-2 py-0.5 rounded-md border border-white/5">
                      {macroSnippets.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {JSON.stringify(macroSnippets) !== JSON.stringify(DEFAULT_MACRO_SNIPPETS) && (
                      <button
                        onClick={handleResetSnippets}
                        className="h-7 px-2.5 rounded-md text-[11px] font-mono text-slate-400 hover:text-white bg-[#1D2024] border border-white/5 hover:border-white/10 transition"
                        title="Reset snippets to default list"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsAddingSnippet(!isAddingSnippet);
                        setEditingSnippetIdx(null);
                      }}
                      className="h-7 px-2.5 rounded-md bg-[#1D2024] hover:bg-[#33353A] text-[#6DD58C] border border-white/5 text-xs font-mono font-medium flex items-center gap-1 transition"
                      title="Add new macro snippet"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsManagingSnippets(!isManagingSnippets);
                        setIsAddingSnippet(false);
                      }}
                      className={`h-7 px-2.5 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition border ${
                        isManagingSnippets
                          ? 'bg-[#A8C7FA]/20 text-[#A8C7FA] border-[#A8C7FA]/40'
                          : 'bg-[#1D2024] hover:bg-[#33353A] text-slate-400 hover:text-white border-white/5'
                      }`}
                      title="Toggle Edit / Delete mode for snippets"
                    >
                      <Edit2 size={11} />
                      <span>{isManagingSnippets ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>
                </div>

                {/* Add New Snippet Form */}
                {isAddingSnippet && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddSnippet();
                    }}
                    className="p-3 rounded-lg bg-[#1D2024] border border-white/10 flex items-center gap-2"
                  >
                    <span className="text-[11px] font-mono text-[#6DD58C] uppercase font-semibold shrink-0">
                      New:
                    </span>
                    <input
                      type="text"
                      value={newSnippetInput}
                      onChange={e => setNewSnippetInput(e.target.value)}
                      placeholder="e.g. git pull or pm2 status"
                      autoFocus
                      className="flex-1 h-8 px-3 text-xs font-mono bg-[#111318] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#6DD58C]"
                    />
                    <button
                      type="submit"
                      disabled={!newSnippetInput.trim()}
                      className="h-8 px-3 rounded-lg bg-[#0F5223] hover:bg-[#0F5223]/80 text-[#C4EED0] text-xs font-mono font-medium border border-[#6DD58C]/30 transition disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSnippet(false);
                        setNewSnippetInput('');
                      }}
                      className="w-8 h-8 rounded-lg bg-[#282A2F] text-slate-400 hover:text-white flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </form>
                )}

                {/* Edit Existing Snippet Form */}
                {editingSnippetIdx !== null && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditSnippet();
                    }}
                    className="p-3 rounded-lg bg-[#1D2024] border border-[#A8C7FA]/40 flex items-center gap-2"
                  >
                    <span className="text-[11px] font-mono text-[#A8C7FA] uppercase font-semibold shrink-0">
                      Edit:
                    </span>
                    <input
                      type="text"
                      value={editSnippetInput}
                      onChange={e => setEditSnippetInput(e.target.value)}
                      autoFocus
                      className="flex-1 h-8 px-3 text-xs font-mono bg-[#111318] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#A8C7FA]"
                    />
                    <button
                      type="submit"
                      disabled={!editSnippetInput.trim()}
                      className="h-8 px-3.5 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-mono font-bold transition disabled:opacity-40"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSnippetIdx(null);
                        setEditSnippetInput('');
                      }}
                      className="w-8 h-8 rounded-lg bg-[#282A2F] text-slate-400 hover:text-white flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </form>
                )}

                {/* Snippets List Chips - Uniform Scaled rounded-lg items */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {macroSnippets.length === 0 ? (
                    <div className="text-xs font-mono text-slate-500 py-1 flex items-center gap-2">
                      <span>No snippets defined.</span>
                      <button
                        onClick={handleResetSnippets}
                        className="text-[#A8C7FA] hover:underline"
                      >
                        Restore defaults
                      </button>
                    </div>
                  ) : (
                    macroSnippets.map((macro, idx) => (
                      <div
                        key={macro + idx}
                        className="group relative flex items-center rounded-lg bg-[#1D2024] border border-white/5 hover:border-white/10 transition shadow-sm"
                      >
                        <button
                          onClick={() => executeInject(macro)}
                          disabled={!targetDevice}
                          className="h-9 px-3 text-xs font-mono text-slate-300 hover:text-white transition disabled:opacity-40 flex items-center"
                          title={`Click to inject: "${macro}"`}
                        >
                          {macro}
                        </button>

                        {/* Edit and Remove Action Buttons */}
                        <div
                          className={`flex items-center gap-0.5 pr-1.5 transition-opacity ${
                            isManagingSnippets
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditSnippet(idx);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#A8C7FA] hover:bg-[#282A2F] transition"
                            title="Edit snippet"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSnippet(idx);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-400 hover:bg-[#282A2F] transition"
                            title="Delete snippet"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Injections Feed */}
            {recentInjections.length > 0 && (
              <div className="pt-3 border-t border-white/5 space-y-2 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 font-medium">
                  <History size={12} />
                  <span>Recent Keystroke Transmissions:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentInjections.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeInject(item)}
                      disabled={!targetDevice}
                      className="h-7 px-2.5 rounded-md bg-[#1D2024] hover:bg-[#33353A] border border-white/5 text-[11px] font-mono text-slate-300 hover:text-white transition flex items-center gap-1"
                      title="Click to re-inject"
                    >
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
