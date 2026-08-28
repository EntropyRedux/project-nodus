import React, { useState, useRef } from 'react';
import { 
  Tablet, 
  Monitor, 
  Smartphone, 
  Laptop, 
  Server, 
  Cpu, 
  Activity, 
  RotateCcw, 
  Plus, 
  X, 
  Trash2,
  Layers
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { AddDeviceModal } from '../layout/AddDeviceModal';
import { DeviceProcessSidePanel } from '../layout/DeviceProcessSidePanel';
import { DEVICE_COLORS } from '../../utils/constants';

interface DeviceSwitcherOverlayStandaloneProps {
  onClose?: () => void;
}

export const DeviceSwitcherOverlayStandalone: React.FC<DeviceSwitcherOverlayStandaloneProps> = ({ onClose }) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [targetAvatarDeviceId, setTargetAvatarDeviceId] = useState<string | null>(null);

  const { 
    devices, 
    activeDeviceId, 
    selectDevice, 
    removeDevice,
    updateDeviceAvatar,
    processModalDeviceId,
    openProcessManager,
    rebootDevice
  } = useLauncher();

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  const getDeviceIcon = (type: DeviceType, size = 18) => {
    switch (type) {
      case 'tablet': return <Tablet size={size} />;
      case 'desktop': return <Monitor size={size} />;
      case 'laptop': return <Laptop size={size} />;
      case 'phone': return <Smartphone size={size} />;
      default: return <Server size={size} />;
    }
  };

  const handleTriggerAvatarUpload = (deviceId: string) => {
    setTargetAvatarDeviceId(deviceId);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
      avatarInputRef.current.click();
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetAvatarDeviceId) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          updateDeviceAvatar(targetAvatarDeviceId, ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full p-2 select-none flex flex-row relative">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      <div className="w-full h-full flex flex-row rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 bg-[#141416]/98 backdrop-blur-xl relative">
        {/* Device Switcher Column */}
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/20 shadow-sm">
                <Server size={16} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide">Fleet Mesh Control</h2>
                <p className="text-[10px] text-[#8E8E93]">{devices.length} Devices Connected</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  audio.playTap();
                  setAddModalOpen(true);
                }}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#34C759] border border-white/10 transition"
                title="Pair New Device"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white border border-white/10 transition"
                title="Close Sheet"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Devices List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
            {devices.map((device) => {
              const isActive = device.id === activeDeviceId;
              const isLocal = device.isLocal;
              const devColor = DEVICE_COLORS[device.id] || '#34C759';

              return (
                <div
                  key={device.id}
                  onClick={() => {
                    audio.playTap();
                    selectDevice(device.id);
                  }}
                  className={`p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.08] border-[#34C759]/40 shadow-lg shadow-[#34C759]/10'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Device Avatar / Icon */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerAvatarUpload(device.id);
                      }}
                      className="relative w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shrink-0 overflow-hidden group cursor-pointer"
                      style={{ backgroundColor: `${devColor}25` }}
                      title="Click to customize device portrait"
                    >
                      {device.avatar ? (
                        <img src={device.avatar} alt={device.name} className="w-full h-full object-cover" />
                      ) : (
                        <div style={{ color: devColor }}>
                          {getDeviceIcon(device.type, 18)}
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#34C759] border-2 border-[#141416]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{device.name}</span>
                        {isActive && (
                          <span className="text-[9px] font-semibold text-[#34C759] bg-[#34C759]/15 px-1.5 py-0.2 rounded-full border border-[#34C759]/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8E8E93] truncate">{device.os || device.type} • {device.ipAddress || '127.0.0.1'}</p>
                      
                      {/* Live Stats */}
                      <div className="flex items-center gap-2.5 mt-1 text-[9px] text-white/70 font-mono">
                        <span className="flex items-center gap-1">
                          <Cpu size={9} className="text-[#34C759]" /> {device.cpuLoad ?? 18}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity size={9} className="text-[#007AFF]" /> {device.ramUsage ?? '2.4 / 8.0 GB'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        openProcessManager(device.id);
                      }}
                      className={`px-2 py-0.5 rounded-xl text-[9px] font-semibold flex items-center gap-1 border transition ${
                        processModalDeviceId === device.id
                          ? 'bg-[#34C759] text-black border-[#34C759]'
                          : 'bg-white/5 text-[#8E8E93] hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Layers size={10} /> Processes
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        rebootDevice(device.id);
                      }}
                      className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#FF9500] border border-white/10 transition"
                      title="Reboot Device"
                    >
                      <RotateCcw size={11} />
                    </button>

                    {!isLocal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.playTap();
                          removeDevice(device.id);
                        }}
                        className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#FF3B30] border border-white/10 transition"
                        title="Disconnect Device"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* In-Sheet Process Sub-Panel */}
        {processModalDeviceId && (
          <div className="absolute inset-0 z-30 bg-[#141416] flex flex-col animate-in fade-in duration-200">
            <DeviceProcessSidePanel />
          </div>
        )}
      </div>

      <AddDeviceModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
};
