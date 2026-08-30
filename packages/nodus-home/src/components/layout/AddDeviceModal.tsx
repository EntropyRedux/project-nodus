import React, { useState } from 'react';
import { X, Plus, Tablet, Monitor, Smartphone, Laptop, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { universalNetworkFetch } from '../../services/FleetDirectClient';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Omit<DeviceInfo, 'id'>) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('desktop');
  const [ipAddress, setIpAddress] = useState('192.168.1.177');
  const [port, setPort] = useState('9120');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    if (newType === 'desktop' || newType === 'laptop') {
      setPort('9120');
    } else {
      setPort('8890');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIp = ipAddress.trim();
    const targetPort = parseInt(port.trim(), 10) || (type === 'desktop' ? 9120 : 8890);

    if (!targetIp) {
      setErrorMsg('Please enter a target IP address');
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);

    try {
      const probeRes = await universalNetworkFetch(`http://${targetIp}:${targetPort}/api/status`, {
        timeoutMs: 3500,
      });

      if (!probeRes.ok || !probeRes.data) {
        throw new Error(probeRes.error || `Node responded with status ${probeRes.status}`);
      }

      const data = probeRes.data;

      // Register POCO Pad with the target PC
      universalNetworkFetch(`http://${targetIp}:${targetPort}/api/fleet/register`, {
        method: 'POST',
        body: {
          id: 'poco-pad',
          name: 'POCO Pad',
          type: 'tablet',
          os: 'Android 14 (HyperOS)',
          ip: '192.168.1.35',
          port: 8890,
          resolution: '2560 × 1600',
          status: 'online',
        },
      }).catch(() => {});

      audio.playTap();
      onAdd({
        name: name.trim() || data.name || data.hostname || (type === 'desktop' ? 'Windows Companion PC' : 'Remote Station'),
        type,
        os: data.os || (type === 'desktop' ? 'Windows 11' : 'Android'),
        status: 'connected',
        ipAddress: `${targetIp}:${targetPort}`,
        resolution: data.resolution || (type === 'desktop' ? '1920 × 1080' : '2560 × 1600'),
        battery: type === 'desktop' ? undefined : (data.battery ?? 90),
        cpuLoad: typeof data.cpuLoad === 'number' ? data.cpuLoad : 0,
        ramUsage: data.ramUsage || '0 / 16.0 GB',
        storage: data.storage || '256 / 512 GB',
        isCustom: true,
      });

      setIsConnecting(false);
      onClose();
    } catch (err: any) {
      setIsConnecting(false);
      setErrorMsg(`Could not connect to http://${targetIp}:${targetPort}. Make sure Nodus Desktop is running on your PC.`);
    }
  };

  const deviceTypes: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
    { id: 'desktop', label: 'Windows Companion PC', icon: <Monitor size={16} /> },
    { id: 'tablet', label: 'Android Tablet', icon: <Tablet size={16} /> },
    { id: 'laptop', label: 'Laptop / 2-in-1', icon: <Laptop size={16} /> },
    { id: 'phone', label: 'Smartphone', icon: <Smartphone size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150">
      <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 text-[#F0F0F2]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#34C759]/15 text-[#34C759]">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#F0F0F2]">Pair Network Node</h3>
              <p className="text-xs text-[#8E8E93]">Live LAN handshake with Windows PC or Android</p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 flex items-start gap-2.5 text-xs text-[#FF3B30]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1.5">
              Device Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => handleTypeChange(dt.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium transition ${
                    type === dt.id
                      ? 'bg-[#34C759]/15 border-[#34C759] text-[#F0F0F2]'
                      : 'bg-[#0A0A0C] border-white/5 text-[#8E8E93] hover:bg-[#2C2C2E]'
                  }`}
                >
                  <span className={type === dt.id ? 'text-[#34C759]' : 'text-[#8E8E93]'}>{dt.icon}</span>
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                Target IP Address
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 192.168.1.177"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759] transition"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                Port
              </label>
              <input
                type="number"
                required
                placeholder="9120"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[#F0F0F2] focus:outline-none focus:border-[#34C759]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              Custom Nickname <span className="text-[#8E8E93] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Main Workstation, Studio PC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isConnecting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-[#2C2C2E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting || !ipAddress.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#34C759] hover:bg-[#30D158] disabled:opacity-50 text-[#0A0A0C] font-bold text-xs shadow-lg shadow-[#34C759]/20 transition flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting & Probing...</span>
                </>
              ) : (
                <>
                  <Plus size={15} />
                  <span>Connect & Verify</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

