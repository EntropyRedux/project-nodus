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
  Palette
} from 'lucide-react';
import { useProcessStore } from '../../stores/useProcessStore';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { useFleetStore } from '../../stores/useFleetStore';
import { Theme, THEMES } from '../theme/ThemePicker';

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

  const [pairingToken, setPairingToken] = useState(serverConfig.pairingSecret || 'NODUS-FLEET-SECURE');
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
      localStorage.removeItem('nodus_desktop_paired_devices');
      localStorage.removeItem('nodus_trusted_devices');
      localStorage.removeItem('nodus_clipboard_history');
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
