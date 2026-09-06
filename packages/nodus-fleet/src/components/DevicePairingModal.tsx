import React, { useState } from 'react';
import { DevicePairingModalProps, ScannedPeer } from '../types/ui-contracts';
import {
  X,
  Search,
  Globe,
  KeyRound,
  Loader2,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  Radio,
  Eye,
  EyeOff,
  Wifi,
  Plus,
  AlertTriangle,
  Play,
  Pencil,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

function getPeerIcon(hostname?: string, deviceType?: string, size = 18) {
  if (deviceType === 'tablet') return <Tablet size={size} />;
  if (deviceType === 'laptop') return <Laptop size={size} />;
  if (deviceType === 'phone') return <Smartphone size={size} />;
  if (deviceType === 'desktop') return <Monitor size={size} />;

  const h = (hostname || '').toLowerCase();
  if (h.includes('tab') || h.includes('pad') || h.includes('surface')) return <Tablet size={size} />;
  if (h.includes('phone') || h.includes('pixel') || h.includes('galaxy') || h.includes('iphone')) return <Smartphone size={size} />;
  if (h.includes('macbook') || h.includes('laptop') || h.includes('thinkpad')) return <Laptop size={size} />;
  return <Monitor size={size} />;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  isScanning,
  scanProgress,
  subnet,
  scannedPeers,
  lanDeviceCount,
  onUpdateNickname,
  isServerRunning = true,
  onStartServer,
  onClose,
  onStartScan,
  onSubnetChange,
  onPair,
}) => {
  const [authToken, setAuthToken] = useState('NODUS-FLEET-SECURE');
  const [showToken, setShowToken] = useState(false);
  const [pairedEndpoints, setPairedEndpoints] = useState<Set<string>>(new Set());

  // Direct manual IP connect form
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('9120');

  // Inline nickname editing state
  const [editingIp, setEditingIp] = useState<string | null>(null);
  const [editNicknameValue, setEditNicknameValue] = useState<string>('');

  if (!isOpen) return null;

  const handlePairClick = (peer: ScannedPeer) => {
    const key = `${peer.ip}:${peer.port}`;
    setPairedEndpoints(prev => new Set(prev).add(key));
    onPair(peer.ip, peer.port, authToken, peer);
  };

  const handleManualPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    const cleanIp = manualIp.trim();
    const portNum = parseInt(manualPort, 10) || 9120;
    const key = `${cleanIp}:${portNum}`;
    setPairedEndpoints(prev => new Set(prev).add(key));

    const manualPeer: ScannedPeer = {
      ip: cleanIp,
      port: portNum,
      hostname: `Host (${cleanIp})`,
      hasAgent: true,
      isInFleet: true,
      isTrusted: true,
      deviceType: 'desktop',
      os: 'windows',
    };

    onPair(cleanIp, portNum, authToken, manualPeer);
    setManualIp('');
  };

  const handleStartEditing = (peer: ScannedPeer) => {
    setEditingIp(peer.ip);
    setEditNicknameValue(peer.nickname || peer.hostname || `Device (${peer.ip})`);
  };

  const handleSaveNickname = (peer: ScannedPeer) => {
    const cleanNick = editNicknameValue.trim();
    if (onUpdateNickname) {
      onUpdateNickname(peer.ip, cleanNick, true);
    }
    setEditingIp(null);
  };

  const handleCancelEditing = () => {
    setEditingIp(null);
    setEditNicknameValue('');
  };

  const handleTrustQuickly = (peer: ScannedPeer) => {
    if (onUpdateNickname) {
      const defaultName = peer.nickname || peer.hostname || `Node (${peer.ip})`;
      onUpdateNickname(peer.ip, defaultName, true);
    }
  };

  const subnetPresets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop scrim */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Window */}
      <div className="relative w-full max-w-xl bg-[var(--surface-modal)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200 text-[var(--text-body)]">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)] flex items-center justify-center shadow-md shrink-0">
                <Radio className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-[var(--text-heading)] truncate">
                    Mesh Peer Discovery & Pairing
                  </h3>
                  {typeof lanDeviceCount === 'number' && lanDeviceCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0"
                      style={{
                        backgroundColor: 'var(--accent-container)',
                        color: 'var(--accent-on-container)',
                      }}
                      title={`${lanDeviceCount} active LAN devices on subnet`}
                    >
                      {lanDeviceCount} on WiFi
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5 truncate">
                  Probe local subnet for connected LAN devices & active Nodus nodes
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] transition border border-[var(--border-subtle)] flex items-center justify-center shrink-0 ml-2"
            >
              <X size={16} />
            </button>
          </div>

          {/* Server Stopped Warning Banner */}
          {!isServerRunning && (
            <div
              className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
              style={{
                backgroundColor: 'var(--status-offline-bg)',
                color: 'var(--status-offline-text)',
                borderColor: 'var(--status-offline-border)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0" />
                <div>
                  <p className="font-semibold">Local Host Daemon is Stopped</p>
                  <p className="text-[11px] opacity-85 mt-0.5 font-mono">
                    Start the local server daemon to enable subnet scanning and accept connections.
                  </p>
                </div>
              </div>
              {onStartServer && (
                <button
                  onClick={onStartServer}
                  className="h-8 px-3 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm"
                  style={{
                    backgroundColor: 'var(--btn-success-bg)',
                    color: 'var(--btn-success-text)',
                    borderColor: 'var(--btn-success-border)',
                    borderWidth: '1px',
                  }}
                >
                  <Play size={13} />
                  <span>Start Server</span>
                </button>
              )}
            </div>
          )}

          {/* Subnet Input & Scan Trigger */}
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-mono min-w-0">
                <Globe size={15} className="text-[var(--accent-primary)] shrink-0" />
                <input
                  type="text"
                  value={subnet}
                  onChange={e => onSubnetChange(e.target.value)}
                  disabled={!isServerRunning}
                  placeholder="192.168.1"
                  className="flex-1 bg-transparent text-[var(--text-heading)] font-mono focus:outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50 min-w-0"
                />
                <span className="text-[var(--text-muted)] select-none shrink-0">.0 / 24</span>
              </div>

              <button
                onClick={() => {
                  if (isServerRunning && !isScanning) {
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      try { navigator.vibrate(15); } catch (_) {}
                    }
                    onStartScan(subnet);
                  }
                }}
                disabled={isScanning || !isServerRunning}
                title={!isServerRunning ? 'Start Host Daemon first to scan subnet' : 'Scan subnet for devices'}
                className="h-9 px-3.5 sm:px-4 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold font-mono flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0 touch-manipulation cursor-pointer select-none"
              >
                {isScanning ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                <span>{isScanning ? 'Probing...' : 'Start Scan'}</span>
              </button>
            </div>

            {/* Subnet Presets Quick Chips */}
            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] font-mono shrink-0">
                Presets:
              </span>
              {subnetPresets.map(pre => (
                <button
                  key={pre}
                  onClick={() => onSubnetChange(pre)}
                  disabled={!isServerRunning}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition shrink-0 disabled:opacity-40 ${
                    subnet === pre
                      ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                      : 'bg-[var(--chip-bg)] text-[var(--chip-text)] hover:opacity-80 border border-[var(--border-subtle)]'
                  }`}
                >
                  {pre}.x
                </button>
              ))}
            </div>
          </div>

          {/* Scanning Progress Bar */}
          {isScanning && (
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-1.5 rounded-full bg-[var(--input-bg)] overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="h-full bg-[var(--accent-primary)] transition-all duration-300 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span>Subnet Sweep & ARP Discovery: {scanProgress}%</span>
                <span>Probing Port 9120, 8765</span>
              </div>
            </div>
          )}
        </div>

        {/* Pairing Secret Token Input Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--surface-container)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <KeyRound size={15} className="text-[var(--accent-primary)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap font-mono hidden xs:inline">
              Pairing Secret:
            </span>
            <input
              type={showToken ? 'text' : 'password'}
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              placeholder="Authorization Secret Key..."
              className="flex-1 bg-[var(--input-bg)] text-[var(--text-heading)] font-mono text-xs focus:outline-none placeholder:text-[var(--text-muted)] h-8 px-3 rounded-lg border border-[var(--input-border)] min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Manual Direct IP Connect Form */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-modal)]/60">
          <form onSubmit={handleManualPair} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-mono min-w-0">
              <Globe size={14} className="text-[var(--accent-primary)] shrink-0" />
              <input
                type="text"
                value={manualIp}
                onChange={e => setManualIp(e.target.value)}
                placeholder="Direct Host IP (e.g. 192.168.1.100)"
                className="w-full bg-transparent text-[var(--text-heading)] font-mono placeholder:text-[var(--text-muted)] focus:outline-none min-w-0"
              />
            </div>
            <div className="w-20 flex items-center px-2 h-8 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs font-mono shrink-0">
              <input
                type="text"
                value={manualPort}
                onChange={e => setManualPort(e.target.value)}
                placeholder="9120"
                className="w-full bg-transparent text-[var(--text-heading)] font-mono focus:outline-none text-center"
              />
            </div>
            <button
              type="submit"
              disabled={!manualIp.trim()}
              className="h-8 px-3.5 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold font-mono flex items-center gap-1 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              <Plus size={14} />
              <span>Connect</span>
            </button>
          </form>
        </div>

        {/* Scanned Peers List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Discovered LAN Devices ({scannedPeers.length})</span>
            {scannedPeers.length > 0 && (
              <span className="font-semibold" style={{ color: 'var(--status-online-text)' }}>
                Scan Complete
              </span>
            )}
          </div>

          {scannedPeers.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                <Wifi size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-heading)]">No devices discovered yet</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono max-w-sm">
                  {isServerRunning
                    ? "Enter your subnet and click 'Start Scan' to discover all active devices on your WiFi, or enter Direct IP above."
                    : 'Start the Local Host Daemon above to enable device discovery.'}
                </p>
              </div>
            </div>
          ) : (
            scannedPeers.map(peer => {
              const endpointKey = `${peer.ip}:${peer.port}`;
              const isPaired = pairedEndpoints.has(endpointKey) || peer.isInFleet;
              const isEditing = editingIp === peer.ip;
              const displayName = peer.nickname || peer.hostname || `Device (${peer.ip})`;
              const isUntrusted = peer.isUnknown === true || (!peer.isTrusted && !peer.hasAgent);

              return (
                <div
                  key={endpointKey}
                  className={`p-3.5 sm:p-4 rounded-xl bg-[var(--card-bg)] border transition shadow-sm flex items-center justify-between gap-3 sm:gap-4 ${
                    isUntrusted
                      ? 'border-amber-500/40 hover:border-amber-500/60'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                    {/* Device Icon */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[var(--input-bg)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--border-subtle)] shadow-inner shrink-0">
                      {getPeerIcon(peer.hostname, peer.deviceType, 18)}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name / Inline Nickname Editor & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editNicknameValue}
                              onChange={e => setEditNicknameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveNickname(peer);
                                if (e.key === 'Escape') handleCancelEditing();
                              }}
                              autoFocus
                              placeholder="Device Nickname..."
                              className="h-6 px-2 text-xs font-semibold bg-[var(--input-bg)] text-[var(--text-heading)] border border-[var(--border-active)] rounded focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveNickname(peer)}
                              title="Save Nickname"
                              className="h-6 w-6 rounded bg-[var(--btn-success-bg)] text-[var(--btn-success-text)] hover:opacity-80 flex items-center justify-center border border-[var(--btn-success-border)]"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={handleCancelEditing}
                              title="Cancel"
                              className="h-6 w-6 rounded bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] flex items-center justify-center border border-[var(--border-subtle)]"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group min-w-0">
                            <h4
                              className="text-xs font-semibold text-[var(--text-heading)] truncate max-w-[150px] sm:max-w-[200px]"
                              title={displayName}
                            >
                              {displayName}
                            </h4>
                            {onUpdateNickname && (
                              <button
                                onClick={() => handleStartEditing(peer)}
                                title="Set Device Nickname"
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition p-0.5 rounded"
                              >
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Badges: Agent Status */}
                        {peer.hasAgent ? (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold shrink-0"
                            style={{
                              backgroundColor: 'var(--badge-agent-bg)',
                              color: 'var(--badge-agent-text)',
                            }}
                          >
                            Agent Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0">
                            LAN Device
                          </span>
                        )}

                        {/* Badges: Trust vs Unknown */}
                        {isUntrusted ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold shrink-0"
                            style={{
                              backgroundColor: 'var(--badge-warn-bg)',
                              color: 'var(--badge-warn-text)',
                              border: '1px solid var(--badge-warn-border)',
                            }}
                            title="Unrecognized device discovered on local WiFi"
                          >
                            <ShieldAlert size={11} className="shrink-0" />
                            Unknown Device
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium shrink-0"
                            style={{
                              backgroundColor: 'var(--badge-trusted-bg)',
                              color: 'var(--badge-trusted-text)',
                              border: '1px solid var(--badge-trusted-border)',
                            }}
                            title="Trusted recognized device"
                          >
                            <ShieldCheck size={11} className="shrink-0" />
                            Trusted
                          </span>
                        )}
                      </div>

                      {/* Device Metadata Subtitle */}
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                        {peer.ip}{peer.port ? `:${peer.port}` : ''}
                        {peer.nickname && peer.hostname && peer.nickname !== peer.hostname ? ` • Host: ${peer.hostname}` : ''}
                        {` • ${peer.os || (peer.hasAgent ? 'Nodus Companion' : 'Connected Device')}`}
                        {peer.mac ? ` • MAC: ${peer.mac}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quick "Trust" button for Unknown Devices */}
                    {isUntrusted && onUpdateNickname && (
                      <button
                        onClick={() => handleTrustQuickly(peer)}
                        title="Mark device as trusted in Nodus registry"
                        className="h-8 px-2.5 rounded-lg text-[11px] font-mono font-medium flex items-center gap-1 bg-[var(--surface-elevated)] hover:bg-[var(--surface-container)] text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] transition active:scale-95"
                      >
                        <ShieldCheck size={13} className="text-emerald-400" />
                        <span>Trust</span>
                      </button>
                    )}

                    {/* Connect Action Button */}
                    <button
                      onClick={() => handlePairClick(peer)}
                      disabled={isPaired}
                      className={`h-8 px-3.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 ${
                        isPaired
                          ? 'bg-emerald-600 text-white border border-emerald-500/30 cursor-default'
                          : peer.hasAgent
                          ? 'bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] shadow-sm'
                          : 'bg-[var(--surface-elevated)] hover:bg-[var(--surface-container)] text-[var(--text-heading)] border border-[var(--border-active)] hover:border-[var(--accent-primary)] shadow-sm'
                      }`}
                      title={isPaired ? 'Device already connected to fleet' : peer.hasAgent ? 'Pair with Nodus node' : `Pair with endpoint ${peer.ip}:${peer.port || 9120}`}
                    >
                      {isPaired ? <Check size={14} /> : <Plus size={14} />}
                      <span>{isPaired ? 'Connected' : 'Connect'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
