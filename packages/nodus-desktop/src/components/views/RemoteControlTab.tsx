import React, { useState, useRef, useEffect } from 'react';
import { DeviceInfo } from '../../types/desktop';
import { RemoteControlTabProps } from '../../types/ui-contracts';
import { TauriService } from '../../services/TauriCommands';
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

  // Two resizable columns state (percentage for left column)
  const [leftColWidth, setLeftColWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isLgScreen, setIsLgScreen] = useState(true);
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

  const localHostDevice: DeviceInfo = devices.find(d => d.isLocal) || devices[0] || {
    id: 'this-pc',
    name: 'Workstation Host',
    type: 'desktop',
    os: 'windows',
    status: 'online',
    ipAddress: '127.0.0.1',
    isLocal: true,
  };

  const targetDevice = devices.find(d => d.id === targetDeviceId) || localHostDevice;
  const controllableDevices = devices.length > 0 ? devices : [localHostDevice];

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

  const getDeviceEndpoint = (ip: string, path: string): string => {
    const host = ip.includes(':') ? ip : `${ip}:9120`;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://${host}${cleanPath}`;
  };

  const lastMovePosRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const handleTrackpadMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!targetDevice) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x, y });

    if (lastMovePosRef.current) {
      const mult = sensitivity === 'precision' ? 0.6 : sensitivity === 'fast' ? 2.4 : 1.2;
      const dx = Math.round((e.clientX - lastMovePosRef.current.clientX) * mult);
      const dy = Math.round((e.clientY - lastMovePosRef.current.clientY) * mult);

      if (dx !== 0 || dy !== 0) {
        if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
          TauriService.simulateMouseMove(dx, dy);
        } else if (targetDevice.ipAddress) {
          fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/move'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
            body: JSON.stringify({ dx, dy }),
          }).catch(() => {});
        }
      }
    }
    lastMovePosRef.current = { clientX: e.clientX, clientY: e.clientY };
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
    lastMovePosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
  };

  const handleTrackpadTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!targetDevice || !e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];

    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    setCursorPos({ x, y });

    if (lastMovePosRef.current) {
      const mult = sensitivity === 'precision' ? 0.6 : sensitivity === 'fast' ? 2.4 : 1.2;
      const dx = Math.round((touch.clientX - lastMovePosRef.current.clientX) * mult);
      const dy = Math.round((touch.clientY - lastMovePosRef.current.clientY) * mult);

      if (dx !== 0 || dy !== 0) {
        if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
          TauriService.simulateMouseMove(dx, dy);
        } else if (targetDevice.ipAddress) {
          fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/move'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
            body: JSON.stringify({ dx, dy }),
          }).catch(() => {});
        }
      }
    }
    lastMovePosRef.current = { clientX: touch.clientX, clientY: touch.clientY };
  };

  const handleTrackpadTouchEnd = () => {
    setIsClickHeld(false);
    lastMovePosRef.current = null;
  };

  const triggerRipple = (x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  };

  const handleTrackpadMouseDown = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!targetDevice) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsClickHeld(true);

    const buttonName = e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left';
    const color = buttonName === 'right' ? '#D4AAFF' : buttonName === 'middle' ? '#82D5A5' : '#9ECAFF';
    triggerHaptic(buttonName === 'left' ? 10 : 15);
    triggerRipple(x, y, color);

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.simulateMouseClick(buttonName);
      showTelemetry(`${buttonName.toUpperCase()} Click`);
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/click'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ button: buttonName }),
        });
      } catch (_) {}
      showTelemetry(`${buttonName.toUpperCase()} Click -> ${targetDevice.name}`);
    }
  };

  const handleTrackpadWheel = async (e: React.WheelEvent<HTMLDivElement>) => {
    if (!targetDevice) return;
    triggerRipple(cursorPos.x, cursorPos.y, '#82D5A5');
    const deltaY = e.deltaY > 0 ? -1 : 1;

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.simulateMouseScroll(0, deltaY);
      showTelemetry(e.deltaY > 0 ? 'Scroll Down' : 'Scroll Up');
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/scroll'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ dy: deltaY * 120 }),
        });
      } catch (_) {}
      showTelemetry(e.deltaY > 0 ? 'Scroll Down' : 'Scroll Up');
    }
  };

  const handleButtonAction = async (buttonName: 'left' | 'middle' | 'right') => {
    if (!targetDevice) return;
    triggerHaptic(15);
    const color = buttonName === 'left' ? '#9ECAFF' : buttonName === 'middle' ? '#82D5A5' : '#D4AAFF';
    triggerRipple(cursorPos.x, cursorPos.y, color);

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.simulateMouseClick(buttonName);
      showTelemetry(`${buttonName.toUpperCase()} Click`);
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/click'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ button: buttonName }),
        });
      } catch (_) {}
      showTelemetry(`${buttonName.toUpperCase()} Click sent to ${targetDevice.name}`);
    }
  };

  const handleMediaAction = async (action: string) => {
    if (!targetDevice) return;
    triggerHaptic(12);

    const mappedAction = action === 'prev' ? 'prev_track' : action === 'next' ? 'next_track' : action;

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.controlMedia(mappedAction);
      if (action === 'play_pause') {
        setIsPlaying(prev => !prev);
        showTelemetry(!isPlaying ? 'Media Play command executed' : 'Media Pause command executed');
      } else {
        showTelemetry(`Media ${action.toUpperCase()} command executed`);
      }
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/media'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action: mappedAction }),
        });
        if (action === 'play_pause') {
          setIsPlaying(prev => !prev);
        }
        showTelemetry(`Media ${action.toUpperCase()} command sent to ${targetDevice.name}`);
      } catch (_) {}
    }
  };

  const handleHotkeyClick = async (hk: Hotkey) => {
    if (!targetDevice) return;
    triggerHaptic(12);

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.simulateHotkey(hk.keys);
      showTelemetry(`Hotkey [${hk.label}] executed`);
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/keyboard/hotkey'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ keys: hk.keys }),
        });
      } catch (_) {}
      showTelemetry(`Hotkey [${hk.label}] executed on ${targetDevice.name}`);
    }
  };

  const handleLockWorkstation = async () => {
    if (!targetDevice) return;
    triggerHaptic([25, 50, 25]);

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.lockWorkstation();
      showTelemetry('Lock Workstation executed');
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/system/control'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action: 'lock' }),
        });
      } catch (_) {}
      showTelemetry(`Lock Workstation command sent to ${targetDevice.name}`);
    }
  };

  const executeInject = async (text: string, pressEnter: boolean = false) => {
    if (!text.trim() || !targetDevice) return;
    triggerHaptic(10);
    const clean = text.trim();
    const payload = pressEnter ? `${clean}\n` : clean;

    if (targetDevice.isLocal || targetDevice.ipAddress === '127.0.0.1') {
      await TauriService.simulateText(payload);
      showTelemetry(`Injected "${clean.slice(0, 18)}${clean.length > 18 ? '...' : ''}"`);
    } else if (targetDevice.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/keyboard/text'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ text: payload }),
        });
      } catch (_) {}
      showTelemetry(`Injected "${clean.slice(0, 18)}${clean.length > 18 ? '...' : ''}" -> ${targetDevice.name}`);
    }
    setRecentInjections(prev => [clean, ...prev.filter(t => t !== clean)].slice(0, 6));
  };

  const handleInjectTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectText.trim() || !targetDevice) return;
    executeInject(injectText, true);
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

  const handleToggleMute = async () => {
    setIsMuted(prev => !prev);
    if (targetDevice?.isLocal || targetDevice?.ipAddress === '127.0.0.1') {
      await TauriService.controlMedia('volume_mute');
    } else if (targetDevice?.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/media'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action: 'volume_mute' }),
        });
      } catch (_) {}
    }
    showTelemetry(!isMuted ? 'Muted workstation audio' : 'Unmuted workstation audio');
  };

  const handleVolumeChange = async (newVal: number) => {
    const diff = newVal - volume;
    setVolume(newVal);
    setIsMuted(false);

    const action = diff > 0 ? 'volume_up' : 'volume_down';
    const steps = Math.min(5, Math.max(1, Math.round(Math.abs(diff) / 5)));

    if (targetDevice?.isLocal || targetDevice?.ipAddress === '127.0.0.1') {
      for (let i = 0; i < steps; i++) {
        await TauriService.controlMedia(action);
      }
    } else if (targetDevice?.ipAddress) {
      try {
        await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/media'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action }),
        });
      } catch (_) {}
    }
    showTelemetry(`Volume set to ${newVal}%`);
  };

  const VolumeIcon = isMuted ? VolumeX : volume > 50 ? Volume2 : Volume1;

  return (
    <div className="flex flex-col h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)]">
      {/* Top Device Switcher & Synced Bar */}
      <div className="px-5 py-3.5 bg-[var(--surface-base)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-4 overflow-x-auto shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)] font-mono">
              Control Deck
            </span>
          </div>
          <div className="flex items-center gap-2">
            {controllableDevices.map(device => {
              const isActive = targetDevice?.id === device.id;
              const isOnline = device.status !== 'offline';
              return (
                <button
                  key={device.id}
                  onClick={() => isOnline && onSelectDevice(device.id)}
                  disabled={!isOnline}
                  className={`h-8 flex items-center gap-2 px-3 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] shadow-sm font-semibold'
                      : isOnline
                      ? 'bg-[var(--chip-bg)] text-[var(--chip-text)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)]'
                      : 'bg-[var(--surface-container)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
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
                  {getDeviceIcon(device.type, 13)}
                  <span>{device.name}</span>
                  {device.isLocal && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 font-bold tracking-tight">
                      THIS PC
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Synced Indicator & Sensitivity */}
        <div className="flex items-center gap-3">
          {/* Column Split Ratio & Reset */}
          <button
            onClick={() => setLeftColWidth(50)}
            className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--border-active)] transition"
            title="Reset Split Layout to 50 / 50"
          >
            <RotateCcw size={11} className="text-[var(--accent-primary)]" />
            <span>Split {Math.round(leftColWidth)}% / {Math.round(100 - leftColWidth)}%</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-[#6DD58C] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LAN SYNCED</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-[var(--surface-container)] p-1 rounded-lg border border-[var(--border-subtle)] text-[11px] font-mono">
            <span className="text-[var(--text-muted)] px-2 text-[10px]">Speed</span>
            {(['normal', 'fast', 'precision'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSensitivity(mode)}
                className={`h-6 px-2.5 rounded-md capitalize font-medium transition ${
                  sensitivity === mode
                    ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] shadow-sm font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Control Deck Content: Two Resizable Columns */}
      <div
        ref={containerRef}
        className={`flex-1 flex flex-col lg:flex-row p-5 gap-4 lg:gap-0 overflow-hidden relative ${
          isDragging ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Left Column: Remote Touchpad & Media Controls */}
        <div
          className="flex flex-col gap-3.5 h-full overflow-y-auto w-full lg:min-w-[320px] lg:pr-3.5"
          style={{
            flexBasis: isLgScreen ? `${leftColWidth}%` : 'auto',
            flexGrow: isLgScreen ? 0 : 1,
            flexShrink: 0
          }}
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
            className="flex-1 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl relative cursor-crosshair overflow-hidden group flex flex-col justify-between p-5 min-h-[250px] select-none shadow-inner"
          >
            {/* Ambient Tech Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-40 pointer-events-none" />

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
                    isClickHeld ? 'w-5 h-5 bg-[var(--accent-primary)]' : 'w-4 h-4 bg-[var(--accent-primary)]'
                  }`}
                  style={{
                    boxShadow: '0 0 16px var(--accent-primary)'
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
            <div className="relative z-10 flex items-center justify-between text-xs font-mono text-[var(--text-muted)] pointer-events-none">
              <span className="flex items-center gap-1.5 text-[var(--accent-primary)] font-medium">
                <MousePointer2 className="w-3.5 h-3.5" />
                Virtual Precision Trackpad
              </span>
              <span className="text-[var(--text-muted)] font-mono">
                X: {Math.round(cursorPos.x)}% · Y: {Math.round(cursorPos.y)}%
              </span>
            </div>

            {/* Center Watermark / Helper */}
            <div className="relative z-0 my-auto text-center pointer-events-none">
              <p className="text-xs font-medium text-[var(--text-heading)]">
                Touch or drag anywhere to steer cursor
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
                Tap to click · Two-finger drag to scroll · Press & hold for drag
              </p>
            </div>

            {/* Bottom Status label */}
            <div className="absolute bottom-4 left-5 text-[11px] font-mono text-[var(--text-muted)] pointer-events-none">
              Low-Latency RPC Bridge
            </div>
            <div className="absolute bottom-4 right-5 text-[11px] font-mono text-[var(--text-muted)] pointer-events-none">
              ~1.2ms
            </div>
          </div>

          {/* Left / Middle / Right Mouse Buttons - Uniform Scale */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleButtonAction('left')}
              disabled={!targetDevice}
              className="bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[var(--control-btn-text)] transition-colors active:scale-95 disabled:opacity-40 border border-[var(--border-subtle)] shadow-sm"
            >
              <span>Left Click</span>
            </button>

            <button
              onClick={() => handleButtonAction('middle')}
              disabled={!targetDevice}
              className="bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[var(--control-btn-text)] transition-colors active:scale-95 disabled:opacity-40 border border-[var(--border-subtle)] shadow-sm"
            >
              <span>Middle</span>
            </button>

            <button
              onClick={() => handleButtonAction('right')}
              disabled={!targetDevice}
              className="bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] h-11 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[var(--control-btn-text)] transition-colors active:scale-95 disabled:opacity-40 border border-[var(--border-subtle)] shadow-sm"
            >
              <span>Right Click</span>
            </button>
          </div>

          {/* Telemetry Action Indicator Pill */}
          <div className="h-6 flex items-center justify-center">
            {telemetryMessage ? (
              <div className="px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-[#6DD58C] text-xs font-medium flex items-center gap-1.5 shadow">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{telemetryMessage}</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Touchpad active · Ready for input
              </span>
            )}
          </div>

          {/* Media & Sound Deck in Left Column */}
          <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-2 font-mono">
                <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Media & Sound Deck
              </h4>
              <button
                onClick={handleLockWorkstation}
                disabled={!targetDevice}
                className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-[#FFB4AB] border border-red-500/20 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
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
                className="h-9 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 border border-[var(--border-subtle)]"
              >
                <SkipBack className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => handleMediaAction('play_pause')}
                disabled={!targetDevice}
                className="h-9 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md disabled:opacity-40"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => handleMediaAction('next')}
                disabled={!targetDevice}
                className="h-9 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 border border-[var(--border-subtle)]"
              >
                <SkipForward className="w-4 h-4" />
                <span>Next</span>
              </button>
            </div>

            {/* Volume Slider & Mute Toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleToggleMute}
                disabled={!targetDevice}
                className="w-9 h-9 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] disabled:opacity-40 transition border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                <VolumeIcon className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={e => handleVolumeChange(Number(e.target.value))}
                disabled={!targetDevice}
                className="flex-1 accent-[var(--accent-primary)] cursor-pointer disabled:opacity-40"
              />

              <span className="text-xs font-mono text-[var(--text-heading)] w-9 text-right font-medium">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Resizable Divider Handle (Desktop) */}
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
                ? 'bg-[var(--accent-primary)] shadow-[0_0_12px_var(--accent-primary)]'
                : 'bg-[var(--border-subtle)] group-hover:bg-[var(--accent-primary)]/50'
            }`}
          >
            <div
              className={`p-0.5 rounded-md bg-[var(--surface-container)] border transition-all shadow-md ${
                isDragging
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] scale-110'
                  : 'border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:border-[var(--border-active)]'
              }`}
            >
              <GripVertical size={13} />
            </div>
          </div>
        </div>

        {/* Right Column: Workstation Hotkeys & Inject Keystrokes (Vertically Resizable) */}
        <div
          ref={rightColRef}
          className={`flex flex-col h-full overflow-hidden w-full lg:min-w-[300px] lg:pl-3.5 relative ${
            isDraggingVertical ? 'select-none cursor-row-resize' : ''
          }`}
          style={{
            flexBasis: isLgScreen ? `${100 - leftColWidth}%` : 'auto',
            flexGrow: 1,
            flexShrink: 1
          }}
        >
          {/* Workstation Hotkeys Deck (Top Resizable Container) */}
          <div
            className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-3 overflow-y-auto shrink-0 flex flex-col"
            style={{
              flexBasis: `${hotkeysHeightPct}%`,
              height: `${hotkeysHeightPct}%`
            }}
          >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-2 font-mono">
                  <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Workstation Shortcuts</span>
                </h4>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-container)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                  {hotkeys.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hotkeys.length !== DEFAULT_HOTKEYS.length && (
                  <button
                    onClick={handleResetHotkeys}
                    className="h-7 px-2.5 rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-heading)] bg-[var(--surface-container)] border border-[var(--border-subtle)] transition"
                    title="Reset to default hotkeys"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsAddingHotkey(!isAddingHotkey)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[var(--m3-on-primary)] flex items-center gap-1 transition bg-[var(--accent-primary)] hover:opacity-90"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Custom Key</span>
                </button>
              </div>
            </div>

            {/* Custom Hotkey Inline Creator Form */}
            {isAddingHotkey && (
              <div className="p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] space-y-2 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customHotkeyInput}
                    onChange={e => setCustomHotkeyInput(e.target.value)}
                    placeholder="e.g. Ctrl+Shift+Esc or Win+R"
                    autoFocus
                    className="flex-1 h-8 px-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-mono text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
                  />
                  <button
                    onClick={handleAddCustomHotkey}
                    disabled={!customHotkeyInput.trim()}
                    className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsAddingHotkey(false)}
                    className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition flex items-center justify-center"
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
                  className="group relative flex items-center bg-[var(--surface-container)] hover:bg-[var(--card-hover)] rounded-lg border border-[var(--border-subtle)] transition hover:border-[var(--border-active)] shadow-sm"
                >
                  <button
                    onClick={() => handleHotkeyClick(hk)}
                    disabled={!targetDevice}
                    className="h-9 px-3.5 text-xs font-mono text-[var(--text-body)] transition-colors active:scale-95 disabled:opacity-40 flex items-center gap-2"
                    title={`Send hotkey: ${hk.label}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hk.color || 'var(--accent-primary)' }} />
                    <span>{hk.label}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveHotkey(idx);
                    }}
                    className="opacity-0 group-hover:opacity-100 pr-2 pl-1 h-9 text-[var(--text-muted)] hover:text-red-500 transition flex items-center justify-center"
                    title={`Remove hotkey ${hk.label}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal Resizable Divider Handle */}
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
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-[var(--border-subtle)] group-hover:bg-emerald-500/60'
              }`}
            >
              <div
                className={`px-2.5 py-0.5 rounded-md bg-[var(--surface-container)] border transition-all shadow-md flex items-center gap-1.5 ${
                  isDraggingVertical
                    ? 'border-emerald-500 text-emerald-500 scale-105'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:border-emerald-500/50'
                }`}
              >
                <GripHorizontal size={13} />
                <span className="text-[9px] font-mono font-semibold hidden group-hover:inline">
                  {Math.round(hotkeysHeightPct)}% / {Math.round(100 - hotkeysHeightPct)}%
                </span>
              </div>
            </div>
          </div>

          {/* Inject Keystrokes Deck (Bottom Resizable Container) */}
          <div
            className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] space-y-3 overflow-y-auto shrink-0 flex flex-col justify-between"
            style={{
              flexBasis: `calc(${100 - hotkeysHeightPct}% - 14px)`,
              height: `calc(${100 - hotkeysHeightPct}% - 14px)`
            }}
          >
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-2 font-mono">
                  <CornerDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Inject Keystrokes</span>
                </h4>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
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
                  className="flex-1 h-9 px-3.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] font-mono disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!targetDevice || !injectText.trim()}
                  className="h-9 px-4 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-semibold font-mono flex items-center gap-1.5 transition shadow disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Inject</span>
                </button>
              </form>

              {/* Quick Keystroke Macro Chips with Full CRUD */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase text-[var(--text-muted)] font-semibold">
                      Macro Snippets:
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-container)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                      {macroSnippets.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {JSON.stringify(macroSnippets) !== JSON.stringify(DEFAULT_MACRO_SNIPPETS) && (
                      <button
                        onClick={handleResetSnippets}
                        className="h-7 px-2.5 rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-heading)] bg-[var(--surface-container)] border border-[var(--border-subtle)] transition"
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
                      className="h-7 px-2.5 rounded-md bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-emerald-600 dark:text-[#6DD58C] border border-[var(--border-subtle)] text-xs font-mono font-medium flex items-center gap-1 transition"
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
                          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--border-active)]'
                          : 'bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border-[var(--border-subtle)]'
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
                    className="p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center gap-2"
                  >
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-[#6DD58C] uppercase font-semibold shrink-0">
                      New:
                    </span>
                    <input
                      type="text"
                      value={newSnippetInput}
                      onChange={e => setNewSnippetInput(e.target.value)}
                      placeholder="e.g. git pull or pm2 status"
                      autoFocus
                      className="flex-1 h-8 px-3 text-xs font-mono bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
                    />
                    <button
                      type="submit"
                      disabled={!newSnippetInput.trim()}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-medium border border-emerald-500/30 transition disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSnippet(false);
                        setNewSnippetInput('');
                      }}
                      className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center justify-center"
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
                    className="p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-active)] flex items-center gap-2"
                  >
                    <span className="text-[11px] font-mono text-[var(--accent-primary)] uppercase font-semibold shrink-0">
                      Edit:
                    </span>
                    <input
                      type="text"
                      value={editSnippetInput}
                      onChange={e => setEditSnippetInput(e.target.value)}
                      autoFocus
                      className="flex-1 h-8 px-3 text-xs font-mono bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
                    />
                    <button
                      type="submit"
                      disabled={!editSnippetInput.trim()}
                      className="h-8 px-3.5 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-mono font-bold transition disabled:opacity-40"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSnippetIdx(null);
                        setEditSnippetInput('');
                      }}
                      className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </form>
                )}

                {/* Snippets List Chips - Uniform Scaled rounded-lg items */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {macroSnippets.length === 0 ? (
                    <div className="text-xs font-mono text-[var(--text-muted)] py-1 flex items-center gap-2">
                      <span>No snippets defined.</span>
                      <button
                        onClick={handleResetSnippets}
                        className="text-[var(--accent-primary)] hover:underline"
                      >
                        Restore defaults
                      </button>
                    </div>
                  ) : (
                    macroSnippets.map((macro, idx) => (
                      <div
                        key={macro + idx}
                        className="group relative flex items-center rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition shadow-sm"
                      >
                        <button
                          onClick={() => executeInject(macro)}
                          disabled={!targetDevice}
                          className="h-9 px-3 text-xs font-mono text-[var(--text-body)] hover:text-[var(--text-heading)] transition disabled:opacity-40 flex items-center"
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
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-elevated)] transition"
                            title="Edit snippet"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSnippet(idx);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--surface-elevated)] transition"
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
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] font-medium">
                  <History size={12} />
                  <span>Recent Keystroke Transmissions:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentInjections.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeInject(item)}
                      disabled={!targetDevice}
                      className="h-7 px-2.5 rounded-md bg-[var(--surface-container)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-body)] hover:text-[var(--text-heading)] transition flex items-center gap-1"
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
      </div>
    </div>
  );
};
