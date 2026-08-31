import React, { useState } from 'react';
import { X, Plus, Tablet, Monitor, Smartphone, Laptop, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { universalNetworkFetch } from '../../services/FleetDirectClient';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Omit<DeviceInfo, 'id'>) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { settings } = useLauncher();
  const currentTheme = getSystemTheme(settings?.theme || 'aurora-dark');
  const currentAccent = getAccentColor(settings?.accentColor || 'emerald');

  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('desktop');
  const [ipAddress, setIpAddress] = useState('192.168.1.177');
  const [port, setPort] = useState('9120');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTypeChange = (newType: DeviceType) => {
    setType(newType);
    setPort('9120');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIp = ipAddress.trim();
    const targetPort = parseInt(port.trim(), 10) || 9120;

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
          port: 9120,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150">
      <div 
        className={`w-full max-w-md ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-6 shadow-2xl space-y-5`}
        style={{ backgroundColor: getSurfaceRgba(settings?.theme || 'aurora-dark', 95, 'popup') }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'} pb-3`}>
          <div className="flex items-center gap-2">
            <div 
              className={`p-2 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              <Plus size={18} />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${currentTheme.classes.textPrimary}`}>Pair Network Node</h3>
              <p className={`text-xs ${currentTheme.classes.textSecondary}`}>Live LAN handshake with Windows PC or Android</p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} transition`}
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
            <label className={`block text-xs font-semibold ${currentTheme.classes.textSecondary} uppercase tracking-wider mb-1.5`}>
              Device Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((dt) => {
                const isSelected = type === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => handleTypeChange(dt.id)}
                    className={`p-2.5 ${currentTheme.buttonRadius} border flex items-center gap-2 text-xs font-medium transition ${
                      isSelected
                        ? currentTheme.isLight
                          ? 'bg-[#FFFFFF] border-[#10B981] text-[#0F172A] shadow-xs'
                          : 'bg-[#10B981]/15 border-[#10B981] text-[#F0F0F2]'
                        : `${currentTheme.classes.itemCard} ${currentTheme.classes.textSecondary}`
                    }`}
                  >
                    <span style={{ color: isSelected ? currentAccent.hex : undefined }}>{dt.icon}</span>
                    <span className={isSelected ? currentTheme.classes.textPrimary : undefined}>{dt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className={`block text-xs font-semibold ${currentTheme.classes.textSecondary} uppercase tracking-wider mb-1`}>
                Target IP Address
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 192.168.1.177"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3.5 py-2 text-xs font-mono transition`}
                autoFocus
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold ${currentTheme.classes.textSecondary} uppercase tracking-wider mb-1`}>
                Port
              </label>
              <input
                type="number"
                required
                placeholder="9120"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3 py-2 text-xs font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold ${currentTheme.classes.textSecondary} uppercase tracking-wider mb-1`}>
              Custom Nickname <span className={`${currentTheme.classes.textMuted} font-normal`}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Main Workstation, Studio PC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full ${currentTheme.classes.inputField} px-3.5 py-2 text-xs`}
            />
          </div>

          {/* Action buttons */}
          <div className={`flex items-center justify-end gap-2 pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isConnecting}
              className={`px-4 py-2 ${currentTheme.buttonRadius} text-xs font-medium ${currentTheme.classes.actionButton} transition`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting || !ipAddress.trim()}
              className={`px-5 py-2.5 ${currentTheme.buttonRadius} bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-[#090B10] font-bold text-xs shadow-lg shadow-[#10B981]/20 transition flex items-center gap-2`}
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

