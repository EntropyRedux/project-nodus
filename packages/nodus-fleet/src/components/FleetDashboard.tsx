import React, { useState } from 'react';
import { useFleet } from '../context/FleetContext';
import {
  Server,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Clipboard,
  ShieldCheck,
  ExternalLink,
  Power,
  Trash2,
  RefreshCw,
  Layers,
  Activity,
  Sliders,
  Send,
  Plus
} from 'lucide-react';
import { DEVICE_COLORS, DeviceInfo } from '@nodus/common';
import { DeviceControlModal } from './DeviceControlModal';

export const FleetDashboard: React.FC = () => {
  const {
    devices,
    clipboardItems,
    serverConfig,
    isHomeInstalled,
    isConnected,
    openInHome,
    rebootDevice,
    removeDevice,
    clearClipboard,
    refreshState
  } = useFleet();

  const [controlDevice, setControlDevice] = useState<DeviceInfo | null>(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'laptop': return <Laptop className="w-5 h-5" />;
      case 'phone': return <Smartphone className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation / Status Header */}
      <header className="px-6 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Nodus Fleet</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Extension
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Device Mesh & Universal Sync Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshState}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isHomeInstalled && (
            <button
              onClick={openInHome}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md shadow-emerald-600/20"
            >
              <Layers className="w-4 h-4" />
              <span>Open Nodus Home</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connected Mesh Devices */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Mesh Network Devices ({devices.length})
            </h2>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Daemon Active
            </div>
          </div>

          {devices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
              <Server className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No companion devices connected yet.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ensure Nodus Agent or Nodus Home is running on your other devices on the same Wi-Fi network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {devices.map(device => {
                const color = DEVICE_COLORS[device.id] || '#007AFF';
                return (
                  <div
                    key={device.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                          style={{ backgroundColor: color }}
                        >
                          {getDeviceIcon(device.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{device.name}</h3>
                          <p className="text-xs text-slate-400 capitalize">{device.os} • {device.ipAddress}</p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {device.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      <div>
                        <span className="block text-[10px] text-slate-500">RAM</span>
                        <span className="text-slate-200 font-mono">{device.ramUsage || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500">CPU</span>
                        <span className="text-slate-200 font-mono">{device.cpuLoad ? `${device.cpuLoad}%` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => setControlDevice(device)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition border border-blue-500/30"
                        title="Open Control Deck"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Control</span>
                      </button>
                      <button
                        onClick={() => rebootDevice(device.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                        title="Reboot Device"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Reboot</span>
                      </button>
                      <button
                        onClick={() => removeDevice(device.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1 transition"
                        title="Remove Device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Universal Clipboard & Sync Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-emerald-400" />
              Universal Clipboard ({clipboardItems.length})
            </h2>
            {clipboardItems.length > 0 && (
              <button
                onClick={clearClipboard}
                className="text-xs text-slate-500 hover:text-red-400 transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Cross-Device Sync
              </span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>

            {/* Broadcast Clipboard Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!broadcastText.trim()) return;
                const bridge = (window as any).NodusNativeBridge;
                if (bridge && typeof bridge.setClipboardText === 'function') {
                  bridge.setClipboardText(broadcastText);
                }
                setBroadcastStatus('Broadcasted to mesh');
                setBroadcastText('');
                setTimeout(() => setBroadcastStatus(null), 2000);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Broadcast to all devices..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs transition"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            {broadcastStatus && (
              <p className="text-[11px] text-emerald-400 text-center font-medium">{broadcastStatus}</p>
            )}

            {clipboardItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Clipboard history is empty. Items copied across mesh devices will automatically sync here.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {clipboardItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-blue-400">{item.deviceName}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <p className="font-mono text-slate-200 line-clamp-3 select-text">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Device Control Modal */}
      {controlDevice && (
        <DeviceControlModal
          device={controlDevice}
          onClose={() => setControlDevice(null)}
        />
      )}
    </div>
  );
};
