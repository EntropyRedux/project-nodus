import React, { useState } from 'react';
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
  Code
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
    isSidebarCollapsed,
    toggleSidebar,
    deviceProcesses,
    processModalDeviceId,
    openProcessManager,
    killAllUserProcesses,
    rebootDevice,
    settings,
    launchApp
  } = useLauncher();

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const leftPanelAlpha = (settings.leftPanelOpacity ?? 85) / 100;

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
      <aside
        className={`h-full flex flex-col backdrop-blur-2xl border-r border-white/10 select-none z-30 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64 sm:w-72'
        }`}
        style={{
          backgroundColor: `rgba(10, 10, 12, ${leftPanelAlpha})`,
        }}
      >
        {/* Top Header & Collapse Toggle */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1.5 rounded-xl bg-[#34C759]/15 text-[#34C759]">
                <Server size={16} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#F0F0F2] tracking-wide uppercase">Devices</h2>
                <p className="text-[10px] text-[#8E8E93] truncate">{devices.length} linked nodes</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center text-[#34C759]">
              <Server size={18} />
            </div>
          )}

          <button
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-xl hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#F0F0F2] transition flex items-center justify-center"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Device List (Top to Bottom, Rearrangeable) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 scrollbar-none">
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
                    ? 'bg-[#1C1C1E] shadow-lg ring-1'
                    : 'bg-[#1C1C1E]/50 border-white/5 hover:bg-[#1C1C1E]/80 hover:border-white/10'
                }`}
                style={{
                  borderColor: isActive ? devColor : undefined,
                  boxShadow: isActive ? `0 10px 25px -5px ${devColor}20` : undefined,
                }}
              >
                {/* Collapsed View */}
                {isSidebarCollapsed ? (
                  <div className="w-full py-2.5 flex flex-col items-center justify-center relative gap-1">
                    <button
                      onClick={() => selectDevice(device.id)}
                      title={`${index + 1}. ${device.name} (${device.os})`}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <div 
                        className="transition-colors"
                        style={{ color: isActive ? devColor : `${devColor}B3` }}
                      >
                        {getDeviceIcon(device.type, 18)}
                      </div>
                      <span className="text-[9px] font-mono text-[#8E8E93] font-bold">
                        {index + 1}
                      </span>
                      {isActive && (
                        <span 
                          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: devColor }}
                        />
                      )}
                    </button>

                    {/* Quick collapsed actions */}
                    <div className="flex flex-col gap-1 mt-1 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProcessManager(device.id);
                        }}
                        title={`Processes (${procsCount})`}
                        className="p-1 rounded-md transition"
                        style={{
                          backgroundColor: isProcOpen ? devColor : '#0A0A0C',
                          color: isProcOpen ? '#0A0A0C' : devColor,
                        }}
                      >
                        <Activity size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rebootDevice(device.id);
                        }}
                        disabled={device.isRebooting}
                        title="Reboot"
                        className="p-1 rounded-md bg-[#0A0A0C] text-[#FF9500] hover:bg-[#2C2C2E] transition disabled:opacity-30"
                      >
                        <RotateCcw size={11} className={device.isRebooting ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded Full Device Card */
                  <div className="p-3 space-y-2.5">
                    {/* Header Row with Index, Name, Icon and Active Badge */}
                    <div
                      onClick={() => selectDevice(device.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-[#8E8E93] bg-[#0A0A0C] px-1.5 py-0.5 rounded-md">
                          {index + 1}
                        </span>
                        <div
                          className="p-1.5 rounded-xl transition-all border"
                          style={{
                            backgroundColor: isActive ? `${devColor}25` : `${devColor}12`,
                            color: devColor,
                            borderColor: isActive ? `${devColor}50` : 'transparent',
                          }}
                        >
                          {getDeviceIcon(device.type, 16)}
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
                      className="cursor-pointer grid grid-cols-2 gap-1.5 text-[9px] text-[#8E8E93] bg-[#0A0A0C]/70 rounded-xl p-2 border border-white/5"
                    >
                      <div className="flex items-center gap-1">
                        <Wifi size={10} className="text-[#007AFF]" />
                        <span className="truncate">{device.ipAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers size={10} className="text-[#BF5AF2]" />
                        <span className="truncate">{device.resolution.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu size={10} className="text-[#34C759]" />
                        <span>CPU: {device.cpuLoad ?? 20}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {device.battery !== undefined ? (
                          <>
                            <Battery size={10} className="text-[#FF9500]" />
                            <span>{device.battery}%</span>
                          </>
                        ) : (
                          <>
                            <Server size={10} className="text-[#FF3B30]" />
                            <span>AC Power</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Device Management Action Row: Processes, Kill, Reboot */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {/* 1. View Running Processes Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProcessManager(device.id);
                        }}
                        className={`flex-1 px-2 py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition group/btn shadow-sm border ${
                          isProcOpen
                            ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                            : 'bg-[#0A0A0C] hover:bg-[#2C2C2E] border-white/10 hover:border-[#34C759]/50 text-[#F0F0F2]'
                        }`}
                        title={`View running processes on ${device.name}`}
                      >
                        <Activity size={12} className={isProcOpen ? 'text-[#0A0A0C]' : 'text-[#34C759] group-hover/btn:scale-110 transition-transform'} />
                        <span>Processes</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${
                          isProcOpen ? 'bg-black/20 text-[#0A0A0C] font-bold' : 'text-[#34C759] bg-[#34C759]/15'
                        }`}>
                          {procsCount}
                        </span>
                      </button>

                      {/* 2. Kill User Tasks Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          killAllUserProcesses(device.id);
                        }}
                        disabled={device.isRebooting}
                        className="px-2 py-1.5 bg-[#0A0A0C] hover:bg-[#FF3B30]/20 border border-white/10 hover:border-[#FF3B30]/40 rounded-xl text-[10px] font-semibold text-[#8E8E93] hover:text-[#FF3B30] flex items-center justify-center gap-1 transition disabled:opacity-30"
                        title={`Kill non-system tasks on ${device.name}`}
                      >
                        <Skull size={11} className="text-[#FF3B30]" />
                        <span className="hidden sm:inline">Kill</span>
                      </button>

                      {/* 3. Reboot Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rebootDevice(device.id);
                        }}
                        disabled={device.isRebooting}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition ${
                          device.isRebooting
                            ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/40 cursor-not-allowed'
                            : 'bg-[#0A0A0C] hover:bg-[#FF9500]/20 border-white/10 hover:border-[#FF9500]/40 text-[#8E8E93] hover:text-[#FF9500]'
                        }`}
                        title={`Reboot ${device.name}`}
                      >
                        <RotateCcw size={11} className={device.isRebooting ? 'animate-spin text-[#FF9500]' : 'text-[#FF9500]'} />
                        <span className="hidden sm:inline">
                          {device.isRebooting ? 'Rebooting' : 'Reboot'}
                        </span>
                      </button>
                    </div>

                    {/* Status Footer & Delete Custom Option */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          device.isRebooting
                            ? 'bg-[#FF9500]/20 text-[#FF9500]'
                            : isActive
                            ? 'bg-[#34C759]/20 text-[#34C759]'
                            : 'bg-white/5 text-[#8E8E93]'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
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
                )}
              </div>
            );
          })}

          {/* 5. + Add Device Button */}
          <button
            onClick={() => {
              audio.playTap();
              setAddModalOpen(true);
            }}
            className={`w-full rounded-2xl border border-dashed border-white/20 hover:border-[#34C759] bg-[#1C1C1E]/40 hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#34C759] transition flex items-center justify-center gap-2 group ${
              isSidebarCollapsed ? 'py-3.5' : 'py-3'
            }`}
            title="Add Device"
          >
            <Plus size={isSidebarCollapsed ? 18 : 16} className="group-hover:scale-110 transition-transform" />
            {!isSidebarCollapsed && (
              <span className="text-xs font-bold tracking-wide">Add Device</span>
            )}
          </button>
        </div>

        {/* Footer Active Summary (When Expanded) */}
        {!isSidebarCollapsed ? (
          <div className="p-2.5 border-t border-white/5 bg-[#0A0A0C]/50 text-[10px] text-[#8E8E93] flex flex-col gap-2">
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
              className="w-full py-1.5 px-2 bg-[#007AFF]/15 hover:bg-[#007AFF]/25 text-[#007AFF] border border-[#007AFF]/30 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-[10px]"
            >
              <Code size={12} /> Bridge Code Studio
            </button>
          </div>
        ) : (
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
        )}
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
