import React, { useState } from 'react';
import { X, Plus, Tablet, Monitor, Smartphone, Laptop, Cpu, Wifi, HardDrive } from 'lucide-react';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Omit<DeviceInfo, 'id'>) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('tablet');
  const [os, setOs] = useState('Android 14');
  const [ipAddress, setIpAddress] = useState('');
  const [resolution, setResolution] = useState('1920 × 1200');
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
              <h3 className="text-base font-semibold text-[#F0F0F2]">Add New Device</h3>
              <p className="text-xs text-[#8E8E93]">Connect Android tablet, PC, or remote station</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1.5">
              Device Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GALAXY TAB S9, ROG ALLY, WORK PC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759] transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1.5">
              Device Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => setType(dt.id)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                OS Version
              </label>
              <input
                type="text"
                placeholder="e.g. Android 15 / Windows 11"
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0F0F2] focus:outline-none focus:border-[#34C759]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                IP Address / Host
              </label>
              <input
                type="text"
                placeholder="192.168.1.xxx"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0F0F2] focus:outline-none focus:border-[#34C759]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                Resolution / Display
              </label>
              <input
                type="text"
                placeholder="e.g. 2560 × 1600"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0F0F2] focus:outline-none focus:border-[#34C759]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                RAM Spec
              </label>
              <input
                type="text"
                placeholder="e.g. 8.0 / 16.0 GB"
                value={ramUsage}
                onChange={(e) => setRamUsage(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0F0F2] focus:outline-none focus:border-[#34C759]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-[#2C2C2E] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-[#34C759] hover:bg-[#30D158] disabled:opacity-50 text-[#0A0A0C] font-bold text-xs shadow-lg shadow-[#34C759]/20 transition flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
