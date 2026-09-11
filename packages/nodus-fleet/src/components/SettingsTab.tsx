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
  Server,
  Vibrate,
  Sliders,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  Info,
  Sparkles,
  Navigation,
  Volume2,
  Terminal,
  Palette,
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { Theme, THEMES } from './ThemePicker';

interface SettingsTabProps {
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  isMonitoringEnabled: boolean;
  onToggleMonitoring: (enabled: boolean) => void;
  refreshIntervalMs: number;
  onChangeInterval: (ms: number) => void;
  limitTopN: number;
  onChangeLimitTopN: (limit: number) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
  subnetInput: string;
  onChangeSubnet: (subnet: string) => void;
  onResetAllData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentTheme = 'midnight',
  onThemeChange,
  isMonitoringEnabled,
  onToggleMonitoring,
  refreshIntervalMs,
  onChangeInterval,
  limitTopN,
  onChangeLimitTopN,
  hapticsEnabled,
  onToggleHaptics,
  subnetInput,
  onChangeSubnet,
  onResetAllData
}) => {
  const fleet = useFleet();
  const isServerRunning = fleet?.isServerRunning ?? true;
  const toggleServer = fleet?.toggleServer || (() => {});
  const isSyncEnabled = fleet?.isClipboardSyncEnabled ?? true;
  const toggleClipboardSync = fleet?.toggleClipboardSync || (() => {});
  const clipboardItems = fleet?.clipboardItems || [];
  const clearClipboard = fleet?.clearClipboard || (() => {});

  const [showToken, setShowToken] = useState(false);
  const [pairingToken, setPairingToken] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const triggerHaptic = (pattern: number | number[] = 12) => {
    if (!hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  };

  const intervalOptions = [
    { label: 'Manual (Off)', value: 0 },
    { label: '3s (Balanced)', value: 3000 },
    { label: '5s (Eco)', value: 5000 },
    { label: '10s (Low)', value: 10000 },
  ];

  const topNOptions = [
    { label: 'Top 25', value: 25 },
    { label: 'Top 40', value: 40 },
    { label: 'Top 75', value: 75 },
    { label: 'All', value: 0 },
  ];

  const subnetPresets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--app-bg)] text-[var(--text-body)] overflow-y-auto p-3 sm:p-5 md:p-6 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-[#0842A0] text-[#D3E3FD] flex items-center justify-center shadow-md shadow-blue-950/40 shrink-0">
            <Settings size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-heading)] tracking-tight">
                Settings & Module Preferences
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/30 text-[10px] font-mono font-semibold">
                v1.1.2 · Companion
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Customize background intervals, memory telemetry, and network mesh behavior
            </p>
          </div>
        </div>

        {toastMessage && (
          <div className="px-3.5 py-1.5 rounded-lg bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/30 text-xs font-mono font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Check size={14} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5 pb-10">
        {/* ── CARD 0: APPEARANCE & THEME ENGINE ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <Palette size={18} className="text-[var(--accent-primary)]" />
              <div>
                <h3 className="text-sm font-bold text-[var(--text-heading)]">
                  Appearance & Design System Theme
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  1:1 unified Material 3 aesthetic synchronized across Nodus Fleet and Nodus Desktop
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
                    triggerHaptic(12);
                    if (onThemeChange) {
                      onThemeChange(t.id);
                      showToast(`Theme: ${t.name}`);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2.5 active:scale-95 touch-manipulation cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface-elevated)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/40 shadow-md'
                      : 'bg-[var(--surface-base)] border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--surface-elevated)]'
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
                    <div className="text-[10px] text-[var(--text-muted)] font-mono line-clamp-2 mt-0.5">
                      {t.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CARD 1: PROCESS & RESOURCE MONITORING ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Process & Resource Monitoring
              </h3>
            </div>
            <button
              onClick={() => {
                triggerHaptic(15);
                onToggleMonitoring(!isMonitoringEnabled);
                showToast(`Process Monitoring ${!isMonitoringEnabled ? 'Enabled' : 'Paused'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isMonitoringEnabled
                  ? 'bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30'
                  : 'bg-[#3A1D1D] text-[#FFB4AB] border-red-500/30'
              }`}
            >
              {isMonitoringEnabled ? '● Active' : '● Paused (Eco)'}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-mono">
            Poll and group workstation processes with live CPU and Working Set memory telemetry.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono flex items-center gap-1.5 mb-1.5">
                <Clock size={13} className="text-[var(--accent-primary)]" />
                <span>Auto-Refresh Polling Interval</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {intervalOptions.map(opt => (
                  <button
                    key={opt.value}
                    disabled={!isMonitoringEnabled}
                    onClick={() => {
                      triggerHaptic(10);
                      onChangeInterval(opt.value);
                      showToast(`Refresh Interval: ${opt.label}`);
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-mono transition border disabled:opacity-40 ${
                      refreshIntervalMs === opt.value
                        ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-base)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
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
                      triggerHaptic(10);
                      onChangeLimitTopN(opt.value);
                      showToast(`Process Limit: ${opt.label}`);
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-mono transition border disabled:opacity-40 ${
                      limitTopN === opt.value
                        ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-base)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Limits rendered process rows in WebView to eliminate scrolling lag.
              </p>
            </div>
          </div>
        </div>

        {/* ── CARD 2: UNIVERSAL MESH CLIPBOARD ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clipboard size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Universal Mesh Clipboard
              </h3>
            </div>
            <button
              onClick={() => {
                triggerHaptic(15);
                toggleClipboardSync();
                showToast(`Clipboard Sync ${!isSyncEnabled ? 'Enabled' : 'Paused'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isSyncEnabled
                  ? 'bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30'
                  : 'bg-[#3A1D1D] text-[#FFB4AB] border-red-500/30'
              }`}
            >
              {isSyncEnabled ? '● Sync Active' : '● Sync Paused'}
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] font-mono">
            Synchronize text, code, links, and base64 images seamlessly with connected workstation nodes.
          </p>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-semibold text-[var(--text-heading)]">Stored Clipboard History</p>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  {clipboardItems.length} active history snippet{clipboardItems.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic([20, 30, 20]);
                  clearClipboard();
                  showToast('Clipboard History Cleared');
                }}
                disabled={clipboardItems.length === 0}
                className="h-8 px-3 rounded-lg text-xs font-mono font-medium text-[var(--btn-danger-text)] hover:bg-red-500/10 border border-[var(--btn-danger-border)] transition disabled:opacity-40"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 3: MESH NETWORK & LOCAL DAEMON ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server size={18} className="text-[var(--accent-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-heading)]">
                Local Android Daemon & HTTP Server
              </h3>
            </div>
            <button
              onClick={() => {
                triggerHaptic(15);
                toggleServer();
                showToast(`Daemon ${!isServerRunning ? 'Started' : 'Stopped'}`);
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                isServerRunning
                  ? 'bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30'
                  : 'bg-[#3A1D1D] text-[#FFB4AB] border-red-500/30'
              }`}
            >
              {isServerRunning ? '● Server Active' : '● Server Stopped'}
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-heading)] font-mono block mb-1">
                Subnet Scanning CIDR Preset
              </label>
              <div className="flex items-center gap-2">
                {subnetPresets.map(pre => (
                  <button
                    key={pre}
                    onClick={() => {
                      triggerHaptic(10);
                      onChangeSubnet(pre);
                      showToast(`Subnet set to ${pre}.x`);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono transition border ${
                      subnetInput === pre
                        ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold shadow-sm border-transparent'
                        : 'bg-[var(--surface-base)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)] border-[var(--border-subtle)]'
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
                  className="w-8 h-8 rounded-lg bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 4: TABLET HAPTICS & CACHE MANAGEMENT ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Smartphone size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">
              Device Controls & Reset
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <Vibrate size={16} className="text-[var(--accent-primary)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-heading)]">Haptic Vibration Feedback</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    Tactile clicks for buttons, trackpad, and drawer toggles
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onToggleHaptics(!hapticsEnabled);
                  if (!hapticsEnabled) triggerHaptic([30, 40]);
                  showToast(`Haptics ${!hapticsEnabled ? 'Enabled' : 'Disabled'}`);
                }}
                className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition active:scale-95 border ${
                  hapticsEnabled
                    ? 'bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                }`}
              >
                {hapticsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-heading)]">Reset Local Registry & Cache</p>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Clear stored paired devices and local settings.
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(20);
                  if (!confirmReset) {
                    setConfirmReset(true);
                    setTimeout(() => setConfirmReset(false), 4000);
                  } else {
                    onResetAllData();
                    setConfirmReset(false);
                    showToast('Cache and Paired Registry Reset');
                  }
                }}
                className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 active:scale-95 shrink-0 ${
                  confirmReset
                    ? 'bg-[#93000A] text-[#FFB4AB] border border-red-500/30'
                    : 'bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] text-[var(--btn-danger-text)] border border-[var(--border-subtle)]'
                }`}
              >
                <Trash2 size={14} />
                <span>{confirmReset ? 'Confirm Reset?' : 'Reset Cache'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 5: EXPERIMENTAL REMOTE HOST ACCESSIBILITY & ZERO-COMPUTE ENGINE ── */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-container)] border border-[var(--border-subtle)] shadow-sm space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-heading)]">
                    Experimental Reverse Remote Control & ADB
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    LABS
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Allows paired Desktop PCs to control this Android device via system gestures, audio stream, and wireless ADB shell.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                <Shield size={12} className="text-emerald-400" />
                Zero-Compute Dormant State
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-mono leading-relaxed">
            <span className="font-semibold text-[var(--text-heading)]">⚡ Zero-Compute Architecture: </span>
            When idle or when reverse control is not in use, this service consumes 0% background CPU, monitors no accessibility event streams, and runs zero polling loops.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Accessibility Status Card */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Navigation & Gestures</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30">
                    Ready
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Enables remote Back, Home, Recents, Notifications, and touch taps from your Desktop.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    try {
                      // @ts-ignore
                      if (window.NodusNativeBridge?.openAccessibilitySettings) {
                        // @ts-ignore
                        window.NodusNativeBridge.openAccessibilitySettings();
                        showToast('Opening Android Accessibility Settings...');
                      } else {
                        showToast('Settings > Accessibility > Nodus Fleet');
                      }
                    } catch (_) {
                      showToast('Settings > Accessibility > Nodus Fleet');
                    }
                  }}
                  className="h-7 px-2.5 rounded-lg bg-[var(--accent-container)] hover:opacity-90 text-[var(--accent-on-container)] text-[11px] font-mono font-medium transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>Open System Settings</span>
                </button>
              </div>
            </div>

            {/* Native Media Stream */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Media Stream</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-[#0F5223] text-[#C4EED0] border-[#6DD58C]/30">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Allows desktop to adjust volume slider, mute, and media playback via Android AudioManager.
                </p>
              </div>

              <span className="text-[10px] text-emerald-400 font-mono pt-1">
                ✓ Ready (Port 9120)
              </span>
            </div>

            {/* Wireless ADB Shell Bridge */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-[var(--text-heading)]">Wireless ADB Bridge</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    PORT 5555
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-2 leading-tight">
                  Allows paired Desktop PC to bridge directly into an Android Toybox shell via Wireless ADB over port 5555.
                </p>
              </div>

              <span className="text-[10px] text-emerald-400 font-mono pt-1">
                Zero-Compute Idle
              </span>
            </div>
          </div>

          {/* Step-by-Step Setup Guide */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] space-y-2 text-xs font-mono">
            <h4 className="font-bold text-[var(--text-heading)] text-xs flex items-center gap-1.5">
              <Info size={14} className="text-[var(--accent-primary)]" />
              Setup Instructions for Reverse Remote Control:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)] pl-1 leading-relaxed">
              <li>Open <strong className="text-[var(--text-heading)]">Settings</strong> on this tablet (POCO Pad / HyperOS / MIUI / Samsung).</li>
              <li>Navigate to <strong className="text-[var(--text-heading)]">Additional Settings &gt; Accessibility &gt; Downloaded apps</strong> (or Installed Services).</li>
              <li>Select <strong className="text-[var(--text-heading)]">Nodus Fleet</strong> and switch toggle to <strong className="text-emerald-400">ON</strong>.</li>
              <li>Accept the Android system accessibility prompt. (Zero compute is consumed when idle).</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
