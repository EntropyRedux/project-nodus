import React, { useRef, useState } from 'react';
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
  Check, 
  Trash2,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { AddDeviceModal } from '../layout/AddDeviceModal';
import { DeviceProcessSidePanel } from '../layout/DeviceProcessSidePanel';
import { DEVICE_COLORS } from '../../utils/constants';

export const DeviceSwitcherOverlayStandalone: React.FC = () => {
  const mountTimeRef = useRef(Date.now());
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
    if (Date.now() - mountTimeRef.current < 350) return;
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
    <div 
      className="h-screen w-screen bg-black/50 backdrop-blur-xs flex items-center justify-start p-3 sm:p-5 select-none animate-in fade-in duration-200 relative"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* Main Container Card: Auto-expands when process panel is open */}
      <div 
        className="h-full max-h-[92vh] flex flex-row rounded-3xl overflow-hidden shadow-2xl shadow-black/90 animate-in slide-in-from-left duration-300 border border-white/10 bg-[#141416]/95 backdrop-blur-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Device Switcher Column */}
        <div className="w-80 sm:w-88 h-full flex flex-col border-r border-white/10 shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#34C759]/15 text-[#34C759] border border-[#34C759]/20 shadow-sm">
                <Server size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Fleet Mesh Control</h2>
                <p className="text-[11px] text-[#8E8E93]">{devices.length} Devices Connected</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  audio.playTap();
                  setAddModalOpen(true);
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#34C759] border border-white/10 transition"
                title="Pair New Device"
              >
                <Plus size={15} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white border border-white/10 transition"
                title="Close Sheet"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Devices List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {devices.map((device) => {
              const isActive = device.id === activeDeviceId;
              const isLocal = device.isLocal;
              const colorInfo = DEVICE_COLORS[device.color] || DEVICE_COLORS.blue;

              return (
                <div
                  key={device.id}
                  onClick={() => {
                    audio.playTap();
                    selectDevice(device.id);
                  }}
                  className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.08] border-[#34C759]/40 shadow-lg shadow-[#34C759]/10'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Device Avatar / Icon */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerAvatarUpload(device.id);
                      }}
                      className="relative w-11 h-11 rounded-2xl flex items-center justify-center border border-white/10 shrink-0 overflow-hidden group cursor-pointer"
                      style={{ backgroundColor: `${colorInfo.hex}25` }}
                      title="Click to customize device portrait"
                    >
                      {device.avatar ? (
                        <img src={device.avatar} alt={device.name} className="w-full h-full object-cover" />
                      ) : (
                        <div style={{ color: colorInfo.hex }}>
                          {getDeviceIcon(device.type, 20)}
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#34C759] border-2 border-[#141416]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{device.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-semibold text-[#34C759] bg-[#34C759]/15 px-2 py-0.5 rounded-full border border-[#34C759]/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8E8E93] truncate">{device.os || device.type} • {device.ip || '127.0.0.1'}</p>
                      
                      {/* Live Stats */}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/70 font-mono">
                        <span className="flex items-center gap-1">
                          <Cpu size={10} className="text-[#34C759]" /> {device.cpuUsage ?? 24}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity size={10} className="text-[#007AFF]" /> {device.ramUsage ?? 48}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        openProcessManager(device.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 border transition ${
                        processModalDeviceId === device.id
                          ? 'bg-[#34C759] text-black border-[#34C759]'
                          : 'bg-white/5 text-[#8E8E93] hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Layers size={11} /> Processes
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.playTap();
                        rebootDevice(device.id);
                      }}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#FF9500] border border-white/10 transition"
                      title="Reboot Device"
                    >
                      <RotateCcw size={12} />
                    </button>

                    {!isLocal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.playTap();
                          removeDevice(device.id);
                        }}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-[#FF3B30] border border-white/10 transition"
                        title="Disconnect Device"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Process Manager Sub-Panel */}
        {processModalDeviceId && (
          <div className="w-84 sm:w-96 h-full flex flex-col animate-in slide-in-from-left duration-200">
            <DeviceProcessSidePanel />
          </div>
        )}
      </div>

      <AddDeviceModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
};
