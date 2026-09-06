import React from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  ShieldCheck,
  Check,
  X,
  Radio,
  Wifi,
  KeyRound,
} from 'lucide-react';

export interface IncomingPairRequest {
  id: string;
  name: string;
  ipAddress: string;
  httpPort?: number;
  deviceType?: string;
  type?: string;
  os?: string;
  token?: string;
  timestamp?: number;
}

export interface IncomingPairModalProps {
  request: IncomingPairRequest | null;
  onAccept: (request: IncomingPairRequest) => void;
  onDecline: (request: IncomingPairRequest) => void;
}

function getDeviceIcon(type?: string, name?: string, size = 24) {
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (t.includes('tablet') || n.includes('pad') || n.includes('tab')) return <Tablet size={size} />;
  if (t.includes('laptop') || n.includes('book') || n.includes('laptop')) return <Laptop size={size} />;
  if (t.includes('phone') || n.includes('phone') || n.includes('pixel')) return <Smartphone size={size} />;
  return <Monitor size={size} />;
}

export const IncomingPairModal: React.FC<IncomingPairModalProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  if (!request) return null;

  const displayName = request.name || `Device (${request.ipAddress})`;
  const deviceType = request.deviceType || request.type || 'desktop';
  const os = request.os || 'windows';
  const port = request.httpPort || 9120;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop with strong blur */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => onDecline(request)}
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md bg-[var(--surface-modal)] border border-[var(--border-active)] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200 text-[var(--text-body)]">
        {/* Glowing Top Ambient Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--accent-primary)] via-emerald-400 to-[var(--accent-primary)] animate-pulse" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Title & Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] text-[var(--accent-on-container)] flex items-center justify-center border border-[var(--border-active)] shadow-sm">
                <Radio className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-heading)] font-mono uppercase tracking-wider">
                  Pairing Request
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Incoming connection over LAN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
              <ShieldCheck size={12} />
              <span>Verified Local</span>
            </div>
          </div>

          {/* Device Card Preview */}
          <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-container)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--border-active)] shrink-0 shadow-inner">
              {getDeviceIcon(deviceType, displayName, 22)}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[var(--text-heading)] truncate" title={displayName}>
                {displayName}
              </h4>
              <p className="text-xs font-mono text-[var(--accent-primary)] mt-0.5">
                {request.ipAddress}:{port}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--surface-container)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {os}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {deviceType}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] leading-relaxed space-y-1">
            <p className="text-[var(--text-heading)] font-semibold flex items-center gap-1.5">
              <KeyRound size={13} className="text-[var(--accent-primary)]" />
              <span>Allow this device to join your fleet?</span>
            </p>
            <p>
              Once paired, this device will be able to synchronize clipboard history, execute shortcuts, and monitor hardware telemetry.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onDecline(request)}
              className="h-10 px-4 rounded-xl text-xs font-semibold font-mono flex items-center justify-center gap-2 bg-[var(--surface-elevated)] hover:bg-[var(--surface-container)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] hover:border-red-500/40 transition active:scale-95 shadow-sm"
            >
              <X size={15} className="text-red-400" />
              <span>Decline</span>
            </button>

            <button
              onClick={() => onAccept(request)}
              className="h-10 px-4 rounded-xl text-xs font-semibold font-mono flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 transition active:scale-95 shadow-md font-bold"
            >
              <Check size={16} />
              <span>Accept & Pair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
