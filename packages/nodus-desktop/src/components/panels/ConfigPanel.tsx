import React, { useState } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { 
  Settings, 
  Shield, 
  Server, 
  FolderOpen, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Tablet,
  Monitor,
  Wifi,
  HardDrive
} from 'lucide-react';

export const ConfigPanel: React.FC = () => {
  const { 
    serverConfig, 
    updateServerConfig, 
    trustedDevices, 
    toggleTrustDevice, 
    removeTrustedDevice, 
    updateDevicePermissions 
  } = useDesktop();

  const [copiedPin, setCopiedPin] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(serverConfig.pairingSecret);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleRegeneratePin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newPin = 'NODUS-';
    for (let i = 0; i < 6; i++) {
      newPin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateServerConfig({ pairingSecret: newPin });
  };

  const handleSaveNotification = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings size={20} className="text-[#34C759]" />
            <span>Bridge Configuration & Security Studio</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Configure local companion daemon, security PIN, node permissions, and allowed directory paths.
          </p>
        </div>
        {saveToast && (
          <span className="px-3 py-1 rounded-xl bg-[#34C759]/20 text-[#34C759] text-xs font-bold border border-[#34C759]/40 flex items-center gap-1.5 animate-in fade-in duration-150">
            <Check size={13} />
            <span>Settings Saved</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ─── 1. Host Server & Network Daemon ──────────────────────── */}
        <section className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center">
              <Server size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Local Bridge Daemon</h3>
              <p className="text-[11px] text-[#8E8E93]">HTTP REST & UDP Discovery Listener</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Listening Host
                </label>
                <input
                  type="text"
                  value={serverConfig.host}
                  onChange={(e) => {
                    updateServerConfig({ host: e.target.value });
                    handleSaveNotification();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#34C759]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={serverConfig.port}
                  onChange={(e) => {
                    updateServerConfig({ port: parseInt(e.target.value, 10) || 9120 });
                    handleSaveNotification();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#34C759]"
                />
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="pt-2 space-y-2.5">
              <div 
                onClick={() => {
                  updateServerConfig({ autoStartOnBoot: !serverConfig.autoStartOnBoot });
                  handleSaveNotification();
                }}
                className="p-3 rounded-2xl bg-[#181822] hover:bg-[#1E1E2A] border border-white/5 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">Auto-Start with Windows</h4>
                  <p className="text-[10.5px] text-[#8E8E93]">Launch background companion bridge on system logon</p>
                </div>
                {serverConfig.autoStartOnBoot ? (
                  <ToggleRight size={26} className="text-[#34C759]" />
                ) : (
                  <ToggleLeft size={26} className="text-[#636366]" />
                )}
              </div>

              <div 
                onClick={() => {
                  updateServerConfig({ broadcastMdns: !serverConfig.broadcastMdns });
                  handleSaveNotification();
                }}
                className="p-3 rounded-2xl bg-[#181822] hover:bg-[#1E1E2A] border border-white/5 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">Broadcast mDNS & UDP Beacon</h4>
                  <p className="text-[10.5px] text-[#8E8E93]">Allow Android tablets on subnet to discover this PC</p>
                </div>
                {serverConfig.broadcastMdns ? (
                  <ToggleRight size={26} className="text-[#007AFF]" />
                ) : (
                  <ToggleLeft size={26} className="text-[#636366]" />
                )}
              </div>

              <div 
                onClick={() => {
                  updateServerConfig({ encryptionEnabled: !serverConfig.encryptionEnabled });
                  handleSaveNotification();
                }}
                className="p-3 rounded-2xl bg-[#181822] hover:bg-[#1E1E2A] border border-white/5 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">AES-256 Payload Encryption</h4>
                  <p className="text-[10.5px] text-[#8E8E93]">Encrypt clipboard & remote exec data over LAN</p>
                </div>
                {serverConfig.encryptionEnabled ? (
                  <ToggleRight size={26} className="text-[#BF5AF2]" />
                ) : (
                  <ToggleLeft size={26} className="text-[#636366]" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. Security PIN & Pairing Secret ────────────────────── */}
        <section className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Security Key & Pairing PIN</h3>
              <p className="text-[11px] text-[#8E8E93]">Prevent unauthorized nodes from executing actions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase">Pairing PIN / Token</span>
              <span className="text-[10px] text-[#34C759] font-mono">Status: Enforced</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#181822] border border-white/10 font-mono text-sm font-bold text-white tracking-widest flex items-center justify-between">
                <span>{serverConfig.pairingSecret}</span>
                <Key size={14} className="text-[#007AFF]" />
              </div>
              <button
                onClick={handleCopyPin}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white transition border border-white/10"
                title="Copy Pairing PIN"
              >
                {copiedPin ? <Check size={16} className="text-[#34C759]" /> : <Copy size={16} />}
              </button>
              <button
                onClick={handleRegeneratePin}
                className="p-2.5 rounded-xl bg-[#007AFF]/20 hover:bg-[#007AFF]/30 text-[#007AFF] transition border border-[#007AFF]/30"
                title="Regenerate New PIN"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <p className="text-[11px] text-[#8E8E93] leading-relaxed">
              Enter this pairing token in the Nodus Home launcher on your POCO Pad to authenticate cross-device commands.
            </p>
          </div>

          {/* Directory Whitelist */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8E8E93] uppercase flex items-center gap-1.5">
                <FolderOpen size={13} className="text-[#FF9500]" />
                <span>Allowed Execution Paths</span>
              </label>
              <span className="text-[10px] text-[#8E8E93]">Semicolon delimited</span>
            </div>
            <textarea
              rows={2}
              value={serverConfig.allowedPaths}
              onChange={(e) => {
                updateServerConfig({ allowedPaths: e.target.value });
                handleSaveNotification();
              }}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#FF9500] resize-none"
              placeholder="C:\Projects;C:\Program Files;C:\Tools"
            />
          </div>
        </section>
      </div>

      {/* ─── 3. Trusted Devices Allowlist Matrix ──────────────────── */}
      <section className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BF5AF2]/20 text-[#BF5AF2] flex items-center justify-center">
              <Key size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Authorized Nodes & Permission Matrix</h3>
              <p className="text-[11px] text-[#8E8E93]">Granular access control per authenticated device</p>
            </div>
          </div>
          <span className="text-xs text-[#8E8E93] font-mono">
            {trustedDevices.filter((d) => d.isTrusted).length} / {trustedDevices.length} Trusted
          </span>
        </div>

        <div className="space-y-2.5">
          {trustedDevices.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-2xl bg-[#181822] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center text-lg">
                  {device.os === 'android' ? <Tablet size={20} /> : <Monitor size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{device.name}</h4>
                    <span className="px-1.5 py-0.2 rounded-md bg-white/5 text-[10px] font-mono text-[#34C759]">
                      {device.ip}
                    </span>
                  </div>
                  <p className="text-[10.5px] font-mono text-[#8E8E93]">{device.fingerprint}</p>
                </div>
              </div>

              {/* Permission Checkboxes */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    updateDevicePermissions(device.id, {
                      remoteExec: !device.permissions.remoteExec,
                    })
                  }
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    device.permissions.remoteExec
                      ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/40'
                      : 'bg-white/5 text-[#636366] border-white/5'
                  }`}
                >
                  Remote Exec
                </button>

                <button
                  onClick={() =>
                    updateDevicePermissions(device.id, {
                      clipboardSync: !device.permissions.clipboardSync,
                    })
                  }
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    device.permissions.clipboardSync
                      ? 'bg-[#007AFF]/20 text-[#007AFF] border-[#007AFF]/40'
                      : 'bg-white/5 text-[#636366] border-white/5'
                  }`}
                >
                  Clipboard
                </button>

                <button
                  onClick={() =>
                    updateDevicePermissions(device.id, {
                      powerControl: !device.permissions.powerControl,
                    })
                  }
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    device.permissions.powerControl
                      ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/40'
                      : 'bg-white/5 text-[#636366] border-white/5'
                  }`}
                >
                  Power / Lock
                </button>

                <button
                  onClick={() => toggleTrustDevice(device.id)}
                  className={`p-1.5 rounded-xl border transition ${
                    device.isTrusted
                      ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/30'
                      : 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/30'
                  }`}
                  title={device.isTrusted ? 'Revoke Device Trust' : 'Authorize Device'}
                >
                  {device.isTrusted ? <Lock size={14} /> : <Unlock size={14} />}
                </button>

                <button
                  onClick={() => removeTrustedDevice(device.id)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] border border-white/5 transition"
                  title="Remove Device"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
