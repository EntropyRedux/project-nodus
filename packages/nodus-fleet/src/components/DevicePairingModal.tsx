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
  ShieldCheck,
  Server,
  Sparkles,
  Wifi,
  Plus
} from 'lucide-react';

function getPeerIcon(hostname?: string, deviceType?: string, size = 18) {
  if (deviceType === 'tablet') return <Tablet size={size} />;
  if (deviceType === 'laptop') return <Laptop size={size} />;
  if (deviceType === 'phone') return <Smartphone size={size} />;
  if (deviceType === 'desktop') return <Monitor size={size} />;

  const h = (hostname || '').toLowerCase();
  if (h.includes('tab') || h.includes('pad') || h.includes('surface')) return <Tablet size={size} />;
  if (h.includes('phone') || h.includes('pixel') || h.includes('galaxy')) return <Smartphone size={size} />;
  if (h.includes('macbook') || h.includes('laptop') || h.includes('thinkpad')) return <Laptop size={size} />;
  return <Monitor size={size} />;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  isScanning,
  scanProgress,
  subnet,
  scannedPeers,
  onClose,
  onStartScan,
  onSubnetChange,
  onPair
}) => {
  const [authToken, setAuthToken] = useState('NODUS-FLEET-SECURE');
  const [showToken, setShowToken] = useState(false);
  const [pairedEndpoints, setPairedEndpoints] = useState<Set<string>>(new Set());
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('9120');

  if (!isOpen) return null;

  const handlePairClick = (peer: ScannedPeer) => {
    const key = `${peer.ip}:${peer.port}`;
    setPairedEndpoints(prev => new Set(prev).add(key));
    onPair(peer.ip, peer.port, authToken);
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
      <div className="relative w-full max-w-xl bg-[#1D2024] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-[#282A2F] border-b border-white/5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#00497D]/30 text-[#A8C7FA] border border-[#A8C7FA]/20 flex items-center justify-center shadow-md shrink-0">
                <Radio className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  Mesh Peer Discovery & Pairing
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  Probe local subnet for active Nodus Fleet RPC agents
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1D2024] hover:bg-[#33353A] text-slate-400 hover:text-white transition border border-white/5 flex items-center justify-center shrink-0 ml-2"
            >
              <X size={16} />
            </button>
          </div>

          {/* Subnet Input & Scan Trigger */}
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[#111318] border border-white/10 text-xs font-mono min-w-0">
                <Globe size={15} className="text-[#A8C7FA] shrink-0" />
                <input
                  type="text"
                  value={subnet}
                  onChange={e => onSubnetChange(e.target.value)}
                  placeholder="192.168.1"
                  className="flex-1 bg-transparent text-white font-mono focus:outline-none placeholder-slate-500 min-w-0"
                />
                <span className="text-slate-500 select-none shrink-0">.0 / 24</span>
              </div>

              <button
                onClick={() => onStartScan(subnet)}
                disabled={isScanning}
                className="h-9 px-3.5 sm:px-4 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold font-mono flex items-center gap-1.5 sm:gap-2 transition active:scale-95 disabled:opacity-40 shadow-sm shrink-0 touch-manipulation"
              >
                {isScanning ? (
                  <Loader2 size={15} className="animate-spin text-[#062E6F]" />
                ) : (
                  <Search size={15} />
                )}
                <span>{isScanning ? 'Probing...' : 'Start Scan'}</span>
              </button>
            </div>

            {/* Subnet Presets Quick Chips */}
            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 font-mono shrink-0">
                Presets:
              </span>
              {subnetPresets.map(pre => (
                <button
                  key={pre}
                  onClick={() => onSubnetChange(pre)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition shrink-0 ${
                    subnet === pre
                      ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                      : 'bg-[#111318] text-slate-400 hover:text-slate-200 border border-white/5'
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
              <div className="w-full h-1.5 rounded-full bg-[#111318] overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[#A8C7FA] transition-all duration-300 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Subnet Sweep: {scanProgress}%</span>
                <span>Port: 9120, 8765</span>
              </div>
            </div>
          )}
        </div>

        {/* Pairing Secret Token Input Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#212429] border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <KeyRound size={15} className="text-[#D4AAFF] shrink-0" />
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap font-mono hidden xs:inline">
              Pairing Secret:
            </span>
            <input
              type={showToken ? 'text' : 'password'}
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              placeholder="Authorization Secret Key..."
              className="flex-1 bg-[#111318] text-white font-mono text-xs focus:outline-none placeholder-slate-500 h-8 px-3 rounded-lg border border-white/10 min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="w-8 h-8 rounded-lg bg-[#1D2024] text-slate-400 hover:text-slate-200 border border-white/5 flex items-center justify-center shrink-0"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Manual Connect Form */}
        <div className="px-3.5 sm:px-6 py-3 border-b border-white/5 bg-[#1D2024]/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualIp.trim()) {
                const portNum = parseInt(manualPort, 10) || 9120;
                onPair(manualIp.trim(), portNum, authToken);
                setPairedEndpoints(prev => new Set(prev).add(`${manualIp.trim()}:${portNum}`));
                setManualIp('');
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111318] border border-white/10 text-xs">
              <Globe size={14} className="text-[#A8C7FA] shrink-0" />
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="Direct IP (e.g. 192.168.1.35)"
                className="w-full bg-transparent text-white font-mono placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="w-20 flex items-center px-2.5 py-1.5 rounded-lg bg-[#111318] border border-white/10 text-xs">
              <input
                type="text"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
                placeholder="9120"
                className="w-full bg-transparent text-white font-mono focus:outline-none text-center"
              />
            </div>
            <button
              type="submit"
              disabled={!manualIp.trim()}
              className="h-8 px-3.5 rounded-lg bg-[#0842A0] hover:bg-[#0B57D0] text-[#D3E3FD] text-xs font-semibold font-mono flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Plus size={14} />
              <span>Connect</span>
            </button>
          </form>
        </div>

        {/* Scanned Peers List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-2.5 sm:space-y-3 min-h-0">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Discovered LAN Peers ({scannedPeers.length})</span>
            {scannedPeers.length > 0 && (
              <span className="text-[#6DD58C]">Ready to pair</span>
            )}
          </div>

          {scannedPeers.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#282A2F] border border-white/5 flex items-center justify-center text-slate-400">
                <Wifi size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">No peers discovered yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Ensure the target device has Nodus Fleet Agent running on port 9120.
                </p>
              </div>
            </div>
          ) : (
            scannedPeers.map(peer => {
              const endpointKey = `${peer.ip}:${peer.port}`;
              const isPaired = pairedEndpoints.has(endpointKey) || peer.isInFleet;

              return (
                <div
                  key={endpointKey}
                  className="p-3 sm:p-4 rounded-xl bg-[#282A2F] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#111318] text-[#A8C7FA] flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                      {getPeerIcon(peer.hostname, peer.deviceType, 18)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">
                          {peer.hostname || 'Remote Node'}
                        </h4>
                        {peer.hasAgent && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#0F5223] text-[#C4EED0]">
                            Agent Online
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {peer.ip}:{peer.port} · {peer.os || 'LAN Endpoint'}
                      </p>
                    </div>
                  </div>

                  {/* Pair Action Button */}
                  <button
                    onClick={() => handlePairClick(peer)}
                    disabled={isPaired}
                    className={`h-8 px-3.5 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0 touch-manipulation w-full sm:w-auto ${
                      isPaired
                        ? 'bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/30 cursor-default'
                        : 'bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] shadow-sm'
                    }`}
                  >
                    {isPaired ? <Check size={14} /> : <Plus size={14} />}
                    <span>{isPaired ? 'Paired' : 'Pair Node'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
