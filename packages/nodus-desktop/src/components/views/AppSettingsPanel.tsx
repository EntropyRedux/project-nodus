import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Clipboard,
  Radio,
  Shield,
  Trash2,
  Check,
  RefreshCw,
  Clock,
  Layers,
  Power,
  KeyRound,
  Eye,
  EyeOff,
  Server,
  AlertTriangle,
  FolderLock,
  Smartphone,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  Navigation,
  Palette,
  MousePointer2,
  Zap,
  Sliders
} from 'lucide-react';
import { useProcessStore } from '../../stores/useProcessStore';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { useFleetStore } from '../../stores/useFleetStore';
import { Theme, THEMES } from '../theme/ThemePicker';
import { TauriService, getStoredAuthToken } from '../../services/TauriCommands';

interface AppSettingsPanelProps {
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export const AppSettingsPanel: React.FC<AppSettingsPanelProps> = ({
  currentTheme = 'midnight',
  onThemeChange
}) => {
  const {
    isMonitoringEnabled,
    setMonitoringEnabled,
    refreshIntervalMs,
    setRefreshIntervalMs,
    limitTopN,
    setLimitTopN,
    loadProcesses
  } = useProcessStore();

  const {
    isSyncEnabled,
    toggleSync: toggleClipboardSync,
    clearAll: clearClipboardHistory,
    items: clipboardItems
  } = useClipboardStore();

  const {
    isServerRunning,
    toggleServer,
    serverConfig,
    subnet,
    setSubnet,
    systemStats
  } = useFleetStore();

  const [pairingToken, setPairingToken] = useState(serverConfig.pairingSecret || '');
  const [showToken, setShowToken] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Experimental Android Host Control Preferences
  const [isAndroidMediaEnabled, setIsAndroidMediaEnabled] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('nodus_exp_android_audio');
      return s !== null ? s === 'true' : true;
    } catch (_) { return true; }
  });

  const [isAndroidAccessibilityEnabled, setIsAndroidAccessibilityEnabled] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('nodus_exp_android_accessibility');
      return s !== null ? s === 'true' : false;
    } catch (_) { return false; }
  });

  const [isAdbDirectInputEnabled, setIsAdbDirectInputEnabled] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('nodus_exp_android_adb');
      return s !== null ? s === 'true' : false;
    } catch (_) { return false; }
  });

  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Android Mouse Emulation Engine Mode ('overlay' | 'adb')
  const [mouseEngineMode, setMouseEngineMode] = useState<'overlay' | 'adb'>(() => {
    try {
      const s = localStorage.getItem('nodus_android_mouse_mode');
      return (s === 'adb' || s === 'overlay') ? s : 'overlay';
    } catch (_) { return 'overlay'; }
  });
  const [isStartingAdbMouse, setIsStartingAdbMouse] = useState(false);

  const handleSelectMouseMode = async (mode: 'overlay' | 'adb') => {
    setMouseEngineMode(mode);
    try {
      localStorage.setItem('nodus_android_mouse_mode', mode);
      window.dispatchEvent(new CustomEvent('nodus_mouse_mode_changed', { detail: mode }));
    } catch (_) {}

    if (mode === 'adb') {
      setIsStartingAdbMouse(true);
      showToast('Starting ADB Kernel Mouse daemon...');
      try {
        const ok = await TauriService.startAdbMouseDaemon();
        if (ok) {
          showToast('ADB Kernel Mouse daemon active (PointerController)');
        } else {
          showToast('ADB daemon start attempted (ensure ADB connected on :5555)');
        }
      } catch (e) {
        showToast('ADB daemon start error');
      } finally {
        setIsStartingAdbMouse(false);
      }
    } else {
      try {
        await TauriService.stopAdbMouseDaemon();
      } catch (_) {}
      showToast('Switched to Standalone Overlay Cursor mode');
    }
  };

  // Pointer Tracking Sensitivity Multiplier
  const [pointerSensitivity, setPointerSensitivity] = useState<number>(() => {
    try {
      const s = localStorage.getItem('nodus_mouse_sensitivity');
      if (s) {
        const val = parseFloat(s);
        if (!isNaN(val) && val >= 0.2 && val <= 3.5) return val;
      }
    } catch (_) {}
    return 1.2;
  });

  // Floating Pointer Enable/Disable and Auto-Hide State
  const [isPointerEnabled, setIsPointerEnabled] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('nodus_pointer_enabled');
      if (s !== null) return s === 'true';
      const legacy = localStorage.getItem('nodus_pointer_visible');
      return legacy !== null ? legacy === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [isPointerAutoHide, setIsPointerAutoHide] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('nodus_pointer_autohide');
      return s === 'true';
    } catch (_) {
      return false;
    }
  });

  const updateSensitivity = (val: number) => {
    const clamped = Math.max(0.2, Math.min(3.5, Math.round(val * 10) / 10));
    setPointerSensitivity(clamped);
    try {
      localStorage.setItem('nodus_mouse_sensitivity', clamped.toString());
      window.dispatchEvent(new CustomEvent('nodus_mouse_sensitivity_changed', { detail: clamped }));
    } catch (_) {}
    showToast(`Pointer Sensitivity: ${clamped.toFixed(1)}x`);
  };

  const updatePointerEnabled = async (enabled: boolean) => {
    setIsPointerEnabled(enabled);
    try {
      localStorage.setItem('nodus_pointer_enabled', String(enabled));
      localStorage.setItem('nodus_pointer_visible', String(enabled));
      window.dispatchEvent(new CustomEvent('nodus_pointer_enabled_changed', { detail: enabled }));
      window.dispatchEvent(new CustomEvent('nodus_pointer_visibility_changed', { detail: enabled }));
    } catch (_) {}
    showToast(enabled ? 'Mouse Pointer: Enabled' : 'Mouse Pointer: Disabled');

    const paired = useFleetStore.getState().devices;
    const androidDevice = paired.find((p: any) => p.os?.toLowerCase() === 'android' || p.type === 'tablet' || p.type === 'phone');
    if (androidDevice?.ipAddress) {
      try {
        const token = (androidDevice as any)?.authToken || getStoredAuthToken() || 'NODUS-FLEET-SECURE';
        await fetch(`http://${androidDevice.ipAddress}:9120/api/system/overlay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Nodus-Auth-Token': token,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: enabled ? 'enable' : 'disable',
            autoHide: isPointerAutoHide
          })
        });
      } catch (_) {}
    }
  };

  const updatePointerAutoHide = async (autoHide: boolean) => {
    setIsPointerAutoHide(autoHide);
    try {
      localStorage.setItem('nodus_pointer_autohide', String(autoHide));
      window.dispatchEvent(new CustomEvent('nodus_pointer_autohide_changed', { detail: autoHide }));
    } catch (_) {}
    showToast(autoHide ? 'Pointer Auto-Hide: Enabled (3.5s)' : 'Pointer Auto-Hide: Disabled (Always Visible)');

    const paired = useFleetStore.getState().devices;
    const androidDevice = paired.find((p: any) => p.os?.toLowerCase() === 'android' || p.type === 'tablet' || p.type === 'phone');
    if (androidDevice?.ipAddress) {
      try {
        const token = (androidDevice as any)?.authToken || getStoredAuthToken() || 'NODUS-FLEET-SECURE';
        await fetch(`http://${androidDevice.ipAddress}:9120/api/system/overlay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Nodus-Auth-Token': token,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            autoHide: autoHide
          })
        });
      } catch (_) {}
    }
  };

  React.useEffect(() => {
    const handleSensitivityChange = (e: any) => {
      if (typeof e.detail === 'number') {
        setPointerSensitivity(e.detail);
      }
    };
    const handleEnabledChange = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setIsPointerEnabled(e.detail);
      }
    };
    const handleAutoHideChange = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setIsPointerAutoHide(e.detail);
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nodus_mouse_sensitivity' && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val)) setPointerSensitivity(val);
      }
      if ((e.key === 'nodus_pointer_enabled' || e.key === 'nodus_pointer_visible') && e.newValue !== null) {
        setIsPointerEnabled(e.newValue === 'true');
      }
      if (e.key === 'nodus_pointer_autohide' && e.newValue !== null) {
        setIsPointerAutoHide(e.newValue === 'true');
      }
    };
    window.addEventListener('nodus_mouse_sensitivity_changed', handleSensitivityChange);
    window.addEventListener('nodus_pointer_enabled_changed', handleEnabledChange);
    window.addEventListener('nodus_pointer_visibility_changed', handleEnabledChange);
    window.addEventListener('nodus_pointer_autohide_changed', handleAutoHideChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('nodus_mouse_sensitivity_changed', handleSensitivityChange);
      window.removeEventListener('nodus_pointer_enabled_changed', handleEnabledChange);
      window.removeEventListener('nodus_pointer_visibility_changed', handleEnabledChange);
      window.removeEventListener('nodus_pointer_autohide_changed', handleAutoHideChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const showToast = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleResetAllData = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    try {
      useFleetStore.getState().resetAllFleetData();
      clearClipboardHistory();
      showToast('Cache and Paired Devices Reset');
      setConfirmReset(false);
    } catch (_) {}
  };

  const intervalOptions = [
    { label: 'Manual (Off)', value: 0 },
    { label: '2s (High)', value: 2000 },
    { label: '4s (Balanced)', value: 4000 },
    { label: '8s (Eco)', value: 8000 },
    { label: '15s (Low)', value: 15000 },
  ];

  const topNOptions = [
    { label: 'Top 25', value: 25 },
    { label: 'Top 40', value: 40 },
    { label: 'Top 75', value: 75 },
    { label: 'All', value: 0 },
  ];

  const subnetPresets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-base)] text-[var(--text-body)] overflow-y-auto p-4 sm:p-6 md:p-8 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-container)] text-[var(--accent-on-container)] flex items-center justify-center border border-[var(--border-active)] shadow-sm">
            <Settings size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-heading)] tracking-tight">
              Settings & Module Preferences
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Customize active background modules, refresh intervals, and network mesh behavior
            </p>
          </div>
        </div>

        {saveFeedback && (
          <div className="px-3.5 py-1.5 rounded-lg bg-[var(--btn-success-bg)] text-[var(--btn-success-text)] border border-[var(--btn-success-border)] text-xs font-mono font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Check size={14} />
            <span>{saveFeedback}</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 pb-12">
        {/* ── CARD 0: APPEARANCE & THEME ENGINE ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <Palette size={18} className="text-[var(--accent-primary)]" />
              <div>
                <h3 className="text-sm font-bold text-[var(--text-heading)]">
                  Appearance & Design System Theme
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                  1:1 unified Material 3 aesthetic synchronized across Nodus Desktop and Nodus Fleet
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)]">
              {THEMES.find(t => t.id === currentTheme)?.name || 'Midnight Dark'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 pt-1">
            {THEMES.map(t => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (onThemeChange) {
                      onThemeChange(t.id);
                      showToast(`Theme: ${t.name}`);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-3 active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface-container)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/40 shadow-md'
                      : 'bg-[var(--surface-base)] border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--surface-container)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.color }}
                    >
                      {isSelected && <Check size={11} className="text-white drop-shadow" />}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      {t.id}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-heading)]">{t.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono line-clamp-2 mt-0.5">
                      {t.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CARD 1: PROCESS & RESOURCE MONITORING ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Process & Resource Monitoring
              </h3>
            </div>
            <button
              onClick={() => {
                setMonitoringEnabled(!isMonitoringEnabled);
                showToast(`Process Monitoring ${!isMonitoringEnabled ? 'Enabled' : 'Paused'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isMonitoringEnabled
                  ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                  : 'bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)] border-[var(--badge-warn-border)]'
              }`}
            >
              {isMonitoringEnabled ? '● Active' : '● Paused (Eco)'}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-mono">
            Poll and group workstation processes with live CPU and Working Set memory telemetry.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono flex items-center gap-1.5 mb-1.5">
                <Clock size={13} className="text-[var(--accent-primary)]" />
                <span>Auto-Refresh Polling Interval</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {intervalOptions.map(opt => (
                  <button
                    key={opt.value}
                    disabled={!isMonitoringEnabled}
                    onClick={() => {
                      setRefreshIntervalMs(opt.value);
                      showToast(`Refresh Interval set to ${opt.label}`);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono transition border disabled:opacity-40 ${
                      refreshIntervalMs === opt.value
                        ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-container)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono flex items-center gap-1.5 mb-1.5">
                <Layers size={13} className="text-[var(--accent-primary)]" />
                <span>Top-N Process Slicing (Lightweight Mode)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {topNOptions.map(opt => (
                  <button
                    key={opt.value}
                    disabled={!isMonitoringEnabled}
                    onClick={() => {
                      setLimitTopN(opt.value);
                      showToast(`Process Limit set to ${opt.label}`);
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-mono transition border disabled:opacity-40 ${
                      limitTopN === opt.value
                        ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-container)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Limits rendered process count to eliminate UI lag while preserving full search-on-demand.
              </p>
            </div>
          </div>
        </div>

        {/* ── CARD 2: UNIVERSAL MESH CLIPBOARD ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clipboard size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Universal Mesh Clipboard
              </h3>
            </div>
            <button
              onClick={() => {
                toggleClipboardSync();
                showToast(`Clipboard Sync ${!isSyncEnabled ? 'Enabled' : 'Paused'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isSyncEnabled
                  ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                  : 'bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)] border-[var(--badge-warn-border)]'
              }`}
            >
              {isSyncEnabled ? '● Sync Active' : '● Sync Paused'}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-mono">
            Automatically synchronize copied text, code, links, and base64 images across all paired devices.
          </p>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-semibold text-[var(--text-heading)]">Stored Clipboard History</p>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  {clipboardItems.length} active history snippet{clipboardItems.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => {
                  clearClipboardHistory();
                  showToast('Clipboard History Cleared');
                }}
                disabled={clipboardItems.length === 0}
                className="h-8 px-3 rounded-lg text-xs font-mono font-medium text-[var(--btn-danger-text)] hover:bg-red-500/10 border border-red-500/20 transition disabled:opacity-40"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 3: MESH NETWORK & DAEMON CONFIGURATION ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Local Host Daemon & Discovery
              </h3>
            </div>
            <button
              onClick={() => {
                toggleServer();
                showToast(`Host Daemon ${!isServerRunning ? 'Started' : 'Stopped'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isServerRunning
                  ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                  : 'bg-[var(--status-offline-bg)] text-[var(--status-offline-text)] border-[var(--status-offline-border)]'
              }`}
            >
              {isServerRunning ? '● Daemon Running' : '● Daemon Stopped'}
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono block mb-1">
                Default Subnet Base Preset
              </label>
              <div className="flex items-center gap-2">
                {subnetPresets.map(pre => (
                  <button
                    key={pre}
                    onClick={() => {
                      setSubnet(pre);
                      showToast(`Subnet set to ${pre}.x`);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono transition border ${
                      subnet === pre
                        ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-container)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {pre}.x
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono flex items-center gap-1.5 mb-1">
                <KeyRound size={13} className="text-[var(--accent-primary)]" />
                <span>Pairing Secret Token</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={pairingToken}
                  onChange={e => setPairingToken(e.target.value)}
                  className="flex-1 bg-[var(--input-bg)] text-[var(--text-heading)] font-mono text-xs focus:outline-none placeholder:text-[var(--text-muted)] h-8 px-3 rounded-lg border border-[var(--input-border)]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="w-8 h-8 rounded-lg bg-[var(--surface-container)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 4: SYSTEM INFO & CACHE RESET ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Shield size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">
              System Overview & Cache Management
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">HOSTNAME</span>
              <span className="font-semibold text-[var(--text-heading)] truncate block">
                {systemStats?.hostname || 'Host PC'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">RPC PORT</span>
              <span className="font-semibold text-[var(--text-heading)] block">9120 (HTTP) / 8765 (UDP)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-heading)]">Reset Paired Cache</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                Clear stored peer registry and local storage keys.
              </p>
            </div>
            <button
              onClick={handleResetAllData}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 active:scale-95 shrink-0 ${
                confirmReset
                  ? 'bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] border border-[var(--btn-danger-border)]'
                  : 'bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-[var(--btn-danger-text)] border border-[var(--border-subtle)]'
              }`}
            >
              <Trash2 size={14} />
              <span>{confirmReset ? 'Confirm Reset?' : 'Reset Cache'}</span>
            </button>
          </div>
        </div>

        {/* ── CARD 5: EXPERIMENTAL ANDROID HOST CONTROL (ZERO-COMPUTE) ── */}
        <div className="p-5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-heading)]">
                    Experimental Android Host Control
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    LABS
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Standard Mode: Android controls Desktop (Core). Reverse Mode: Desktop controls Android (Modular Experimental).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                <Shield size={12} className="text-emerald-500" />
                Zero-Compute Dormant Engine
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-mono leading-relaxed">
            <span className="font-semibold text-[var(--text-heading)]">⚡ Zero-Compute Guarantee: </span>
            When these modules are turned OFF, they consume 0% background compute, spawn zero background threads, and perform no polling loops on either your Desktop or Android tablet.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Audio Stream Control */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Native Media Stream</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isAndroidMediaEnabled;
                      setIsAndroidMediaEnabled(next);
                      localStorage.setItem('nodus_exp_android_audio', String(next));
                      showToast(`Android Media Stream ${next ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold transition border ${
                      isAndroidMediaEnabled
                        ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                        : 'bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)] border-[var(--badge-warn-border)]'
                    }`}
                  >
                    {isAndroidMediaEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Control Android device volume stream, mute, and media playback via native AudioManager. Zero permissions required.
                </p>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                ✓ Ready out-of-the-box
              </span>
            </div>

            {/* Accessibility Gestures */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Android Navigation</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isAndroidAccessibilityEnabled;
                      setIsAndroidAccessibilityEnabled(next);
                      localStorage.setItem('nodus_exp_android_accessibility', String(next));
                      showToast(`Android Navigation ${next ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold transition border ${
                      isAndroidAccessibilityEnabled
                        ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                        : 'bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)] border-[var(--badge-warn-border)]'
                    }`}
                  >
                    {isAndroidAccessibilityEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Dispatches global Back, Home, Recents, Notifications, and Lock gestures to Android via Nodus Accessibility Service.
                </p>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                Requires Accessibility Setup
              </span>
            </div>

            {/* ADB Direct Bridge & Wireless Shell */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Wireless ADB Shell Bridge</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !isAdbDirectInputEnabled;
                      setIsAdbDirectInputEnabled(next);
                      localStorage.setItem('nodus_exp_android_adb', String(next));
                      showToast(`Wireless ADB Shell Bridge ${next ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold transition border ${
                      isAdbDirectInputEnabled
                        ? 'bg-[var(--status-online-bg)] text-[var(--status-online-text)] border-[var(--status-online-border)]'
                        : 'bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)] border-[var(--badge-warn-border)]'
                    }`}
                  >
                    {isAdbDirectInputEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Automatically bridges Android node terminal sessions to an interactive Wireless ADB shell (UID 2000), giving full logcat, process management, and OS execution.
                </p>
              </div>
              <span className="text-[10px] text-[var(--accent-primary)] font-mono">
                ⚡ Experimental Developer Mode
              </span>
            </div>
          </div>

          {/* ── ANDROID MOUSE EMULATION ENGINE (STANDALONE OVERLAY VS ADB KERNEL) ── */}
          <div className="p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MousePointer2 size={16} className="text-[var(--accent-primary)]" />
                <span className="text-xs font-bold text-[var(--text-heading)]">
                  Android Mouse Emulation Engine
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-container)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  Active: {mouseEngineMode === 'adb' ? '⚡ Native ADB Kernel' : '🖱️ System Overlay'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Projects a visible hardware mouse pointer on your Android tablet
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Standalone Floating Overlay */}
              <button
                type="button"
                onClick={() => handleSelectMouseMode('overlay')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer ${
                  mouseEngineMode === 'overlay'
                    ? 'bg-[var(--surface-container)] border-sky-500/80 ring-2 ring-sky-500/30 shadow-sm'
                    : 'bg-[var(--surface-container)]/50 border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                      <MousePointer2 size={14} />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-heading)]">
                      Option A: System Overlay Cursor
                    </span>
                  </div>
                  {mouseEngineMode === 'overlay' && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed">
                  Zero ADB &amp; zero root required. Nodus Fleet renders a hardware-accelerated floating cursor across the screen via <code className="text-[10px] text-sky-400">SYSTEM_ALERT_WINDOW</code>. Auto-fades when idle and dispatches taps at the cursor tip.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-sky-400">
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">Standalone WiFi</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">Auto-Hide 3.5s</span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">Hardware Clamped</span>
                </div>
              </button>

              {/* Option B: Native Kernel Mouse via ADB */}
              <button
                type="button"
                onClick={() => handleSelectMouseMode('adb')}
                disabled={isStartingAdbMouse}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer ${
                  mouseEngineMode === 'adb'
                    ? 'bg-[var(--surface-container)] border-amber-500/80 ring-2 ring-amber-500/30 shadow-sm'
                    : 'bg-[var(--surface-container)]/50 border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Zap size={14} />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-heading)]">
                      Option B: Native Kernel Mouse
                    </span>
                  </div>
                  {mouseEngineMode === 'adb' && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed">
                  Registers a true virtual USB Linux mouse kernel device via Android's <code className="text-[10px] text-amber-400">/system/bin/uinput</code> daemon over wireless ADB. Triggers Android 14's native <code className="text-[10px] text-amber-400">PointerController</code> and official OS cursor.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">Linux /dev/uinput</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">PointerController</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">Official System Pointer</span>
                </div>
              </button>
            </div>

            {/* Pointer Tracking Speed & Sensitivity Slider Section */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] space-y-2.5 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders size={15} className="text-[var(--accent-primary)]" />
                  <span className="text-xs font-bold text-[var(--text-heading)]">
                    Pointer Tracking Speed &amp; Sensitivity
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)] shadow-sm">
                  {pointerSensitivity.toFixed(1)}x Multiplier
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Adjust how fast the mouse cursor responds to touch gestures across the tablet display.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold">Precise (0.2x)</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={pointerSensitivity}
                  onChange={e => updateSensitivity(parseFloat(e.target.value))}
                  aria-label="Pointer Tracking Sensitivity"
                  className="flex-1 h-2 bg-[var(--surface-base)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold">Fast (3.0x)</span>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Quick Presets:</span>
                {[
                  { label: '0.5x Slow', val: 0.5 },
                  { label: '1.0x Normal', val: 1.0 },
                  { label: '1.5x Smooth', val: 1.5 },
                  { label: '2.2x Rapid', val: 2.2 },
                ].map(pre => (
                  <button
                    key={pre.val}
                    type="button"
                    onClick={() => updateSensitivity(pre.val)}
                    className={`h-6 px-2.5 rounded-md text-[10px] font-mono transition border ${
                      Math.abs(pointerSensitivity - pre.val) < 0.05
                        ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-bold border-transparent shadow-sm'
                        : 'bg-[var(--surface-base)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {pre.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pointer Enable & Screen Overlay Controls */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] space-y-3 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MousePointer2 size={15} className="text-[var(--accent-primary)]" />
                  <span className="text-xs font-bold text-[var(--text-heading)]">
                    Hardware Pointer Overlay Control
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Enable/Disable Toggle Button */}
                  <button
                    type="button"
                    onClick={() => updatePointerEnabled(!isPointerEnabled)}
                    title={isPointerEnabled ? 'Hardware Pointer overlay is ENABLED on target device screen. Click to DISABLE.' : 'Hardware Pointer overlay is DISABLED. Click to ENABLE.'}
                    className={`h-7 px-3 rounded-lg text-xs font-mono font-semibold transition border flex items-center gap-1.5 ${
                      isPointerEnabled
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25'
                    }`}
                  >
                    {isPointerEnabled ? <Eye size={13} className="text-emerald-400" /> : <EyeOff size={13} className="text-zinc-400" />}
                    <span>{isPointerEnabled ? 'Pointer Enabled' : 'Pointer Disabled'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[var(--text-heading)] font-semibold block">Keep Visible Permanently</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      {isPointerAutoHide ? 'Auto-fades after 3.5s idle' : 'Stays visible on screen continuously'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePointerAutoHide(!isPointerAutoHide)}
                    className={`h-6 px-2.5 rounded-md text-[10px] font-mono font-bold transition border ${
                      !isPointerAutoHide
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-[var(--surface-container)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {!isPointerAutoHide ? 'ALWAYS ON' : 'AUTO-FADE'}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[var(--text-heading)] font-semibold block">Overlay Hotspot Tip</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Hardware clamped screen coordinates</span>
                  </div>
                  <span className="text-[10px] text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    SYSTEM_ALERT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Setup Guide */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full px-4 py-3 bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] transition flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-[var(--accent-primary)]" />
                <span className="text-xs font-bold text-[var(--text-heading)]">
                  Step-by-Step Setup Guide & Instructions
                </span>
              </div>
              {showSetupGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showSetupGuide && (
              <div className="p-4 bg-[var(--surface-base)] space-y-3 text-xs font-mono text-[var(--text-body)] border-t border-[var(--border-subtle)]">
                <div>
                  <h4 className="font-bold text-[var(--text-heading)] text-xs mb-1">
                    1. Enabling Android Accessibility Service (For System Navigation & Gestures)
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)] pl-1">
                    <li>Open <strong className="text-[var(--text-heading)]">Settings</strong> on your Android tablet (e.g. POCO Pad / Xiaomi / Samsung).</li>
                    <li>Navigate to <strong className="text-[var(--text-heading)]">Additional Settings &gt; Accessibility &gt; Downloaded Apps</strong> (or Installed Services).</li>
                    <li>Tap on <strong className="text-[var(--text-heading)]">Nodus Fleet</strong> and switch the toggle to <strong className="text-emerald-500">ON</strong>.</li>
                    <li>Confirm the system permission prompt. Nodus Accessibility Service is now dormant and ready to receive commands with zero background idle compute.</li>
                  </ol>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <h4 className="font-bold text-[var(--text-heading)] text-xs mb-1">
                    2. Native Media Control (Out of the box)
                  </h4>
                  <p className="text-[var(--text-muted)]">
                    Volume, mute, play/pause, next track, and previous track work immediately over HTTP on port 9120 without enabling special permissions.
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <h4 className="font-bold text-[var(--text-heading)] text-xs mb-1">
                    3. Standard Operation (Android controlling Desktop)
                  </h4>
                  <p className="text-[var(--text-muted)]">
                    No extra setup is required! The Android tablet controls your Windows/Linux desktop mouse, keyboard, media, and shortcuts out-of-the-box using the Desktop Host Daemon.
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <h4 className="font-bold text-[var(--text-heading)] text-xs mb-1">
                    4. Android Mouse Emulation (Visible Hardware Cursor)
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)] pl-1">
                    <li>
                      <strong className="text-[var(--text-heading)]">Option A (System Overlay Cursor):</strong> Operates over pure WiFi (port 9120) with zero ADB connection. If cursor is not visible, ensure &quot;Display over other apps&quot; permission is granted for Nodus Fleet in Android Settings &gt; Apps &gt; Special App Access &gt; Display Over Other Apps.
                    </li>
                    <li>
                      <strong className="text-[var(--text-heading)]">Option B (ADB Kernel Mouse):</strong> Connect wireless ADB (<code className="text-amber-400">192.168.1.35:5555</code>). Spawns a real kernel uinput device that makes Android think a physical mouse is plugged in, activating the native OS pointer.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
