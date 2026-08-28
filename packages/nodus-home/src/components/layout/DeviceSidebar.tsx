import React, { useState, useRef } from 'react';
import { 
  Tablet, 
  Monitor, 
  Smartphone, 
  Laptop, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Check, 
  Cpu, 
  Wifi, 
  Battery, 
  Sparkles,
  Server,
  Layers,
  Activity,
  RotateCcw,
  Skull,
  Code,
  Image as ImageIcon,
  Lock,
  Zap
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceInfo, DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { AddDeviceModal } from './AddDeviceModal';
import { DEVICE_COLORS } from '../../utils/constants';

export const DeviceSidebar: React.FC = () => {
  const { 
    devices, 
    activeDeviceId, 
    selectDevice, 
    moveDeviceUp, 
    moveDeviceDown, 
    addDevice, 
    removeDevice,
    updateDeviceAvatar,
    isSidebarCollapsed,
    toggleSidebar,
    deviceProcesses,
    processModalDeviceId,
    openProcessManager,
    killAllUserProcesses,
    rebootDevice,
    lockDevice,
    settings,
    launchApp
  } = useLauncher();

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [targetAvatarDeviceId, setTargetAvatarDeviceId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const leftPanelAlpha = (settings.leftPanelOpacity ?? 85) / 100;

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

  const getDeviceIcon = (type: DeviceType, size = 18) => {
    switch (type) {
      case 'tablet':
        return <Tablet size={size} />;
      case 'desktop':
        return <Monitor size={size} />;
      case 'laptop':
        return <Laptop size={size} />;
      case 'phone':
        return <Smartphone size={size} />;
      default:
        return <Tablet size={size} />;
    }
  };

  return (
    <>
      {/* Hidden File Input for Custom Device Portraits */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* 1. Permanent Fixed Compact Navigation Rail (Zero-Reflow Flex Child) */}
      <aside
        className="w-16 h-full flex-shrink-0 flex flex-col border-r border-white/10 select-none z-20"
        style={{
          backgroundColor: `rgba(10, 10, 12, ${leftPanelAlpha})`,
          contain: 'layout style',
        }}
      >
        {/* Top Header & Expand Button */}
        <div className="p-3 border-b border-white/5 flex items-center justify-center">
          <button
            onClick={toggleSidebar}
            title="Expand Device Drawer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#34C759] hover:scale-105 transition flex items-center justify-center group"
          >
            <Server size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Compact Device Rail: ONLY Icons / Portraits */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-none flex flex-col items-center">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId;
            const devColor = DEVICE_COLORS[device.id] || '#34C759';

            return (
              <div key={device.id} className="relative group">
                <button
                  onClick={() => {
                    audio.playTap();
                    selectDevice(device.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleTriggerAvatarUpload(device.id);
                  }}
                  title={`${device.name} (${device.os})\nTip: Right-click to change portrait`}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center relative transition-all duration-200 border ${
                    isActive
                      ? 'bg-[#1C1C1E] ring-2 shadow-lg scale-105'
                      : 'bg-[#1C1C1E]/60 border-white/10 hover:bg-[#1C1C1E] hover:border-white/20'
                  }`}
                  style={{
                    borderColor: isActive ? devColor : undefined,
                    boxShadow: isActive ? `0 4px 16px -2px ${devColor}50` : undefined,
                  }}
                >
                  {device.customAvatar ? (
                    <img
                      src={device.customAvatar}
                      alt={device.name}
                      className="w-full h-full object-cover rounded-2xl pointer-events-none"
                    />
                  ) : (
                    <div style={{ color: isActive ? devColor : `${devColor}CC` }}>
                      {getDeviceIcon(device.type, 20)}
                    </div>
                  )}

                  {/* Active Indicator Pulse Dot */}
                  {isActive && (
                    <span 
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0A0A0C] animate-pulse"
                      style={{ backgroundColor: devColor }}
                    />
                  )}
                </button>
              </div>
            );
          })}

          {/* + Add Device Button in Rail */}
          <button
            onClick={() => {
              audio.playTap();
              setAddModalOpen(true);
            }}
            className="w-11 h-11 rounded-2xl border border-dashed border-white/20 hover:border-[#34C759] bg-[#1C1C1E]/40 hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#34C759] transition flex items-center justify-center group"
            title="Add Device"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Rail Footer */}
        <div className="p-2 border-t border-white/5 flex justify-center">
          <button
            onClick={() => {
              audio.playTap();
              launchApp('studio');
            }}
            title="Dual-Platform Bridge Code Studio"
            className="p-2 bg-[#007AFF]/15 hover:bg-[#007AFF]/25 text-[#007AFF] rounded-xl transition"
          >
            <Code size={16} />
          </button>
        </div>
      </aside>

      {/* 2. Backdrop Overlay for Expanded Device Drawer */}
      {!isSidebarCollapsed && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* 3. GPU-Accelerated Slide-Out Device Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col backdrop-blur-3xl border-r border-white/15 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          !isSidebarCollapsed ? 'translate-x-0 pointer-events-auto shadow-black/80' : '-translate-x-full pointer-events-none'
        }`}
        style={{
          backgroundColor: `rgba(14, 14, 18, ${leftPanelAlpha})`,
          contain: 'layout paint',
        }}
      >
        {/* Header with Close / Collapse */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-xl bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
              <Server size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#F0F0F2] tracking-wide uppercase">Devices</h2>
              <p className="text-[10px] text-[#8E8E93] truncate">{devices.length} linked nodes</p>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            title="Collapse Sidebar"
            className="p-1.5 rounded-xl hover:bg-white/10 text-[#8E8E93] hover:text-[#F0F0F2] transition flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Detailed Device List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {devices.map((device, index) => {
            const isActive = device.id === activeDeviceId;
            const isProcOpen = processModalDeviceId === device.id;
            const procsCount = (deviceProcesses[device.id] || []).length;
            const devColor = DEVICE_COLORS[device.id] || '#34C759';

            return (
              <div
                key={device.id}
                className={`group relative rounded-2xl transition border ${
                  isActive
                    ? 'bg-[#1C1C22] shadow-lg ring-1'
                    : 'bg-[#18181C] border-white/10 hover:bg-[#1C1C22]'
                }`}
                style={{
                  borderColor: isActive ? devColor : undefined,
                  boxShadow: isActive ? `0 10px 25px -5px ${devColor}25` : undefined,
                }}
              >
                <div className="p-3 space-y-2.5">
                  {/* Header Row with Index, Name, Icon and Active Badge */}
                  <div
                    onClick={() => selectDevice(device.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-[#8E8E93] bg-[#0A0A0C] px-1.5 py-0.5 rounded-md border border-white/5">
                        {index + 1}
                      </span>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerAvatarUpload(device.id);
                        }}
                        title="Click to change device portrait from gallery"
                        className="w-8 h-8 rounded-xl overflow-hidden transition-all border flex items-center justify-center relative group/avatar cursor-pointer shrink-0"
                        style={{
                          backgroundColor: isActive ? `${devColor}25` : `${devColor}12`,
                          color: devColor,
                          borderColor: isActive ? `${devColor}50` : 'transparent',
                        }}
                      >
                        {device.customAvatar ? (
                          <img
                            src={device.customAvatar}
                            alt={device.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getDeviceIcon(device.type, 16)
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition">
                          <ImageIcon size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#F0F0F2] truncate flex items-center gap-1.5">
                          {device.name}
                          {isActive && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-pulse" 
                              style={{ backgroundColor: devColor }}
                            />
                          )}
                        </h4>
                        <p className="text-[10px] text-[#8E8E93] truncate">{device.os}</p>
                      </div>
                    </div>

                    {/* Reorder Buttons & Actions */}
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                      <button
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDeviceUp(device.id);
                        }}
                        title="Move Up"
                        className="p-1 rounded hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        disabled={index === devices.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDeviceDown(device.id);
                        }}
                        title="Move Down"
                        className="p-1 rounded hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry / Specs Row */}
                  <div
                    onClick={() => selectDevice(device.id)}
                    className="cursor-pointer grid grid-cols-2 gap-1.5 text-[9px] text-[#8E8E93] bg-[#0A0A0C] rounded-xl p-2 border border-white/10"
                  >
                    <div className="flex items-center gap-1">
                      <Wifi size={10} className="text-[#34C759]" />
                      <span className="font-mono truncate">{device.ipAddress || '127.0.0.1'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers size={10} className="text-[#007AFF]" />
                      <span className="font-mono">{device.resolution || 'Auto'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={10} className="text-[#AF52DE]" />
                      <span className="font-mono">CPU: {device.cpuLoad ?? 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Battery size={10} className="text-[#FF9500]" />
                      <span className="font-mono">{device.battery !== undefined ? `${device.battery}%` : 'AC Power'}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                    {/* Desktop & Server Nodes: Full Remote Process Inspector */}
                    {(device.type === 'desktop' || device.type === 'laptop' || (device.os && (device.os.toLowerCase().includes('windows') || device.os.toLowerCase().includes('linux') || device.os.toLowerCase().includes('macos')))) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openProcessManager(device.id);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition"
                          style={{
                            backgroundColor: isProcOpen ? devColor : '#0A0A0C',
                            borderColor: isProcOpen ? devColor : 'rgba(255,255,255,0.1)',
                            color: isProcOpen ? '#0A0A0C' : devColor,
                          }}
                        >
                          <Activity size={11} />
                          <span>Processes</span>
                          <span className="px-1 rounded-full bg-black/40 text-[9px] font-mono">
                            {procsCount}
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killAllUserProcesses(device.id);
                          }}
                          title="Kill All Non-System Processes"
                          className="py-1 px-2 rounded-lg text-[10px] font-bold bg-[#0A0A0C] hover:bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 hover:border-[#FF3B30] flex items-center gap-1 transition"
                        >
                          <Skull size={11} />
                          <span>Kill</span>
                        </button>
                      </>
                    ) : (
                      /* Android Tablet / Phone Nodes: Free RAM & Lock Screen */
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killAllUserProcesses(device.id);
                          }}
                          title="Clear Non-System Background Tasks to Free RAM"
                          className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-[#0A0A0C] hover:bg-[#34C759]/20 text-[#34C759] border border-white/10 hover:border-[#34C759]/40 flex items-center justify-center gap-1 transition"
                        >
                          <Zap size={11} />
                          <span>Free RAM</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            lockDevice(device.id);
                          }}
                          title="Lock Screen"
                          className="py-1 px-2 rounded-lg text-[10px] font-bold bg-[#0A0A0C] hover:bg-[#007AFF]/20 text-[#007AFF] border border-white/10 hover:border-[#007AFF]/40 flex items-center gap-1 transition"
                        >
                          <Lock size={11} />
                          <span>Lock</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rebootDevice(device.id);
                      }}
                      disabled={device.isRebooting}
                      title="Reboot Node"
                      className="py-1 px-2 rounded-lg text-[10px] font-bold bg-[#0A0A0C] hover:bg-[#FF9500]/20 text-[#FF9500] border border-[#FF9500]/30 hover:border-[#FF9500] flex items-center gap-1 transition disabled:opacity-30"
                    >
                      <RotateCcw size={11} className={device.isRebooting ? 'animate-spin' : ''} />
                      <span>Reboot</span>
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-[9px] text-[#8E8E93] pt-0.5">
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          device.isRebooting
                            ? 'bg-[#FF9500] animate-ping'
                            : isActive
                            ? 'bg-[#34C759]'
                            : 'bg-[#8E8E93]'
                        }`}
                      />
                      {device.isRebooting ? 'Rebooting Node...' : isActive ? 'Active Node' : device.status}
                    </span>

                    {device.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                        title="Remove Device"
                        className="p-1 text-[#FF3B30]/70 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* + Add Device Button */}
          <button
            onClick={() => {
              audio.playTap();
              setAddModalOpen(true);
            }}
            className="w-full py-3 rounded-2xl border border-dashed border-white/20 hover:border-[#34C759] bg-[#1C1C22]/60 hover:bg-[#1C1C22] text-[#8E8E93] hover:text-[#34C759] transition flex items-center justify-center gap-2 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold tracking-wide">Add Device</span>
          </button>
        </div>

        {/* Footer Summary */}
        <div className="p-3 border-t border-white/10 bg-[#0A0A0C] text-[10px] text-[#8E8E93] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
              Node Cluster Online
            </span>
            <span className="font-mono text-white/50">{devices.length} Nodes</span>
          </div>
          <button
            onClick={() => {
              audio.playTap();
              launchApp('studio');
            }}
            className="w-full py-2 px-2.5 bg-[#007AFF]/15 hover:bg-[#007AFF]/25 text-[#007AFF] border border-[#007AFF]/30 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <Code size={13} /> Bridge Code Studio
          </button>
        </div>
      </aside>

      {/* Add Device Dialog */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addDevice}
      />
    </>
  );
};
