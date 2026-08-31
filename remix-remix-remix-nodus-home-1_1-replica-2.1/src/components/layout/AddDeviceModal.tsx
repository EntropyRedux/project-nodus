import React, { useState } from 'react';
import { X, Plus, Tablet, Monitor, Smartphone, Laptop } from 'lucide-react';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Omit<DeviceInfo, 'id'>) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('tablet');
  const [os, setOs] = useState('Android 14 / HyperOS');
  const [ipAddress, setIpAddress] = useState('');
  const [resolution, setResolution] = useState('2560 × 1600 @ 120Hz');
  const [ramUsage, setRamUsage] = useState('4.0 / 8.0 GB');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      type,
      os: os.trim() || 'Custom OS',
      status: 'online',
      ipAddress: ipAddress.trim() || '192.168.1.200',
      resolution: resolution.trim() || '1920 × 1080',
      battery: type === 'desktop' ? undefined : 88,
      cpuLoad: 20,
      ramUsage: ramUsage.trim() || '4.0 / 8.0 GB',
      storage: '128 / 256 GB',
      isCustom: true,
    });

    setName('');
    onClose();
  };

  const deviceTypes: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
    { id: 'tablet', label: 'Tablet / Pad', icon: <Tablet size={16} /> },
    { id: 'desktop', label: 'Desktop PC', icon: <Monitor size={16} /> },
    { id: 'laptop', label: 'Laptop / Mac', icon: <Laptop size={16} /> },
    { id: 'phone', label: 'Smartphone', icon: <Smartphone size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in zoom-in-95 duration-150">
      <div 
        className={`w-full max-w-md ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-6 shadow-2xl space-y-5 ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'modal') }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between ${currentTheme.classes.modalHeader} pb-3`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wide">
                {currentTheme.archetype === 'hud' ? 'REGISTER MESH NODE // LINK' : 'Register Mesh Node'}
              </h3>
              <p className="text-xs text-[#94A3B8]">Link Android tablet, workstation, or remote compute server</p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playTap();
              onClose();
            }}
            className={`p-1.5 ${currentTheme.buttonRadius} hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] transition`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Node Identifier
            </label>
            <input
              type="text"
              required
              placeholder="e.g. WORKSTATION-ALPHA, GALAXY-TAB-S9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full ${currentTheme.classes.inputField} px-3.5 py-2 text-xs transition`}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
              Form Factor Archetype
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => setType(dt.id)}
                  className={`p-2.5 ${currentTheme.cardRadius} border flex items-center gap-2 text-xs font-medium transition`}
                  style={
                    type === dt.id
                      ? { backgroundColor: currentAccent.badgeBg, borderColor: currentAccent.hex, color: '#F1F5F9' }
                      : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }
                  }
                >
                  <span style={{ color: type === dt.id ? currentAccent.hex : '#94A3B8' }}>{dt.icon}</span>
                  <span className="font-sans text-xs">{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                OS Environment
              </label>
              <input
                type="text"
                placeholder="e.g. Android 14 / Linux 6.8"
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3 py-1.5 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                IP Address / Host
              </label>
              <input
                type="text"
                placeholder="192.168.1.xxx"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3 py-1.5 text-xs`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Display Buffer
              </label>
              <input
                type="text"
                placeholder="e.g. 2560 × 1600"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3 py-1.5 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Memory Spec
              </label>
              <input
                type="text"
                placeholder="e.g. 8.0 / 16.0 GB"
                value={ramUsage}
                onChange={(e) => setRamUsage(e.target.value)}
                className={`w-full ${currentTheme.classes.inputField} px-3 py-1.5 text-xs`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${currentTheme.buttonRadius} text-xs font-mono font-medium text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04] transition`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-5 py-2 ${currentTheme.buttonRadius} disabled:opacity-50 font-bold text-xs shadow-lg transition flex items-center gap-1.5 font-mono`}
              style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
            >
              <Plus size={14} /> Link Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
