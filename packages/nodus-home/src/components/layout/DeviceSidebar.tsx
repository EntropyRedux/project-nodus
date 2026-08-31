import React, { useState, useRef } from 'react';
import { 
  Tablet, 
  Monitor, 
  Smartphone, 
  Laptop, 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Cpu, 
  Wifi, 
  Battery, 
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
import { DeviceType } from '../../types/launcher';
import { audio } from '../../utils/audio';
import { AddDeviceModal } from './AddDeviceModal';
import { DEVICE_COLORS, getDeviceColor } from '../../utils/constants';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

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

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [targetAvatarDeviceId, setTargetAvatarDeviceId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* 1. Permanent Fixed Compact Navigation Rail */}
      <aside
        className={`w-16 h-full flex-shrink-0 flex flex-col ${currentTheme.isLight ? 'border-r border-[#CBD5E1]' : 'border-r border-white/[0.06]'} select-none z-20 ${currentTheme.classes.containerFont} backdrop-blur-2xl transition-colors duration-200`}
        style={{ contain: 'layout style', backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'sidebar') }}
      >
        <div className={`p-3 ${currentTheme.isLight ? 'border-b border-[#E2E8F0]' : 'border-b border-white/[0.04]'} flex items-center justify-center`}>
          <button
            onClick={toggleSidebar}
            title="Toggle Cluster Nodes Drawer"
            className={`p-2 ${currentTheme.buttonRadius} ${currentTheme.isLight ? 'bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1]' : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06]'} hover:scale-105 transition flex items-center justify-center group`}
            style={{ color: currentAccent.hex }}
          >
            <Server size={18} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Compact Device Rail: Icons / Portraits */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 scrollbar-none flex flex-col items-center">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId;
            const devColor = getDeviceColor(device.id, device.type, device.os, (device as any).customColor);

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
                  className={`w-11 h-11 ${currentTheme.cardRadius} flex items-center justify-center relative transition-all duration-200 border ${
                    isActive
                      ? currentTheme.isLight ? 'bg-[#FFFFFF] ring-2 scale-105 shadow-md' : 'bg-white/[0.08] ring-1 scale-105'
                      : currentTheme.isLight ? 'bg-[#FFFFFF] border-[#E2E8F0] hover:bg-[#F8FAFD] hover:border-[#CBD5E1]' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1]'
                  }`}
                  style={{
                    borderColor: isActive ? devColor : undefined,
                    boxShadow: isActive ? `0 4px 14px -2px ${devColor}40` : undefined,
                  }}
                >
                  {device.customAvatar ? (
                    <img
                      src={device.customAvatar}
                      alt={device.name}
                      className={`w-full h-full object-cover ${currentTheme.cardRadius} pointer-events-none`}
                    />
                  ) : (
                    <div style={{ color: isActive ? devColor : `${devColor}CC` }}>
                      {getDeviceIcon(device.type, 19)}
                    </div>
                  )}

                  {isActive && (
                    <span 
                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 ${currentTheme.isLight ? 'border-white' : 'border-[#090B10]'}`}
                      style={{ backgroundColor: devColor }}
                    />
                  )}
                </button>
              </div>
            );
          })}

          <button
            onClick={() => {
              audio.playTap();
              setAddModalOpen(true);
            }}
            className={`w-11 h-11 ${currentTheme.cardRadius} border border-dashed transition flex items-center justify-center group ${
              currentTheme.isLight ? 'border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F8FAFD]' : 'border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.06]'
            }`}
            style={{ color: currentAccent.hex, borderColor: `${currentAccent.hex}60` }}
            title="Connect New Device Node"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className={`p-2 ${currentTheme.isLight ? 'border-t border-[#E2E8F0]' : 'border-t border-white/[0.04]'} flex justify-center`}>
          <button
            onClick={() => {
              audio.playTap();
              launchApp('studio');
            }}
            title="Dual-Platform Bridge Code Studio"
            className={`p-2 ${currentTheme.isLight ? 'bg-[#FFFFFF] hover:bg-[#F1F5F9] border-[#CBD5E1]' : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.06]'} ${currentTheme.buttonRadius} transition border`}
            style={{ color: currentAccent.hex }}
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

      {/* 3. Slide-Out Device Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-76 sm:w-84 flex flex-col ${currentTheme.isLight ? 'border-r border-[#CBD5E1]' : 'border-r border-white/[0.06]'} shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${currentTheme.classes.containerFont} backdrop-blur-3xl ${
          !isSidebarCollapsed ? 'translate-x-0 pointer-events-auto shadow-black/60' : '-translate-x-full pointer-events-none'
        }`}
        style={{ contain: 'layout paint', backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
      >
        <div className={`p-3.5 ${currentTheme.classes.cardHeader} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={`p-1.5 ${currentTheme.buttonRadius} border`}
              style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
            >
              <Server size={16} />
            </div>
            <div>
              <h2 className={`text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide uppercase font-mono`}>
                {currentTheme.archetype === 'hud' ? 'CLUSTER MESH // NODES' : 'Cluster Mesh'}
              </h2>
              <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>{devices.length} linked active nodes</p>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            title="Collapse Sidebar"
            className={`p-1.5 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} transition flex items-center justify-center`}
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
            const devColor = getDeviceColor(device.id, device.type, device.os, (device as any).customColor);

            return (
              <div
                key={device.id}
                className={`group relative ${currentTheme.cardRadius} ${currentTheme.classes.itemCard} transition border ${
                  isActive ? (currentTheme.isLight ? 'shadow-md ring-2' : 'shadow-lg ring-1') : ''
                }`}
                style={{
                  borderColor: isActive ? devColor : undefined,
                  boxShadow: isActive ? `0 8px 24px -4px ${devColor}30` : undefined,
                }}
              >
                <div className="p-3 space-y-2.5">
                  <div
                    onClick={() => selectDevice(device.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[10px] font-mono font-bold ${currentTheme.isLight ? 'text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]' : 'text-[#94A3B8] bg-black/40 border-white/5'} px-1.5 py-0.5 ${currentTheme.buttonRadius} border`}>
                        0{index + 1}
                      </span>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerAvatarUpload(device.id);
                        }}
                        title="Click to change device portrait"
                        className={`w-8 h-8 ${currentTheme.buttonRadius} overflow-hidden transition-all border flex items-center justify-center relative group/avatar cursor-pointer shrink-0`}
                        style={{
                          backgroundColor: isActive ? `${devColor}20` : `${devColor}10`,
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
                        <h4 className={`text-xs font-bold ${currentTheme.classes.textPrimary} truncate flex items-center gap-1.5`}>
                          {device.name}
                          {isActive && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-telemetry" 
                              style={{ backgroundColor: devColor }}
                            />
                          )}
                        </h4>
                        <p className={`text-[10px] ${currentTheme.classes.textSecondary} truncate`}>{device.os}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                      <button
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDeviceUp(device.id);
                        }}
                        title="Move Up"
                        className={`p-1 rounded ${currentTheme.classes.actionButton} disabled:opacity-20`}
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
                        className={`p-1 rounded ${currentTheme.classes.actionButton} disabled:opacity-20`}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Row */}
                  <div
                    onClick={() => selectDevice(device.id)}
                    className={`cursor-pointer grid grid-cols-2 gap-1.5 text-[10px] ${
                      currentTheme.isLight 
                        ? 'text-[#475569] bg-[#F8FAFD] border-[#CBD5E1]' 
                        : 'text-[#94A3B8] bg-black/30 border-white/[0.06]'
                    } ${currentTheme.buttonRadius} p-2 border font-mono`}
                  >
                    <div className="flex items-center gap-1">
                      <Wifi size={11} className="text-[#10B981]" />
                      <span className="truncate">{device.ipAddress || '127.0.0.1'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers size={11} style={{ color: currentAccent.hex }} />
                      <span className="truncate">{device.resolution || 'Auto'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu size={11} className="text-[#A855F7]" />
                      <span>CPU: {device.cpuLoad ?? 0}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Battery size={11} className="text-[#F59E0B]" />
                      <span>{device.battery !== undefined ? `${device.battery}%` : 'AC Line'}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className={`flex items-center gap-1.5 pt-1 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/[0.06]'}`}>
                    {(device.type === 'desktop' || device.type === 'laptop' || (device.os && (device.os.toLowerCase().includes('windows') || device.os.toLowerCase().includes('linux') || device.os.toLowerCase().includes('macos')))) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openProcessManager(device.id);
                          }}
                          className={`flex-1 py-1 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold flex items-center justify-center gap-1 border transition font-mono`}
                          style={{
                            backgroundColor: isProcOpen ? devColor : currentTheme.isLight ? '#F1F5F9' : '#090B10',
                            borderColor: isProcOpen ? devColor : currentTheme.isLight ? '#CBD5E1' : 'rgba(255,255,255,0.1)',
                            color: isProcOpen ? '#090B10' : devColor,
                          }}
                        >
                          <Activity size={11} />
                          <span>Procs</span>
                          <span className={`px-1 rounded ${currentTheme.isLight ? 'bg-[#E2E8F0] text-[#0F172A]' : 'bg-black/40'} text-[9px] font-mono`}>
                            {procsCount}
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killAllUserProcesses(device.id);
                          }}
                          title="Kill All Non-System Processes"
                          className={`py-1 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold ${
                            currentTheme.isLight 
                              ? 'bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] border border-[#FCA5A5]' 
                              : 'bg-[#090B10] hover:bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30 hover:border-[#F43F5E]'
                          } flex items-center gap-1 transition`}
                        >
                          <Skull size={11} />
                          <span>Kill</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            killAllUserProcesses(device.id);
                          }}
                          title="Clear Non-System Background Tasks to Free RAM"
                          className={`flex-1 py-1 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold ${
                            currentTheme.isLight 
                              ? 'bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0]' 
                              : 'bg-[#090B10] hover:bg-[#10B981]/20 text-[#10B981] border border-white/10 hover:border-[#10B981]/40'
                          } flex items-center justify-center gap-1 transition`}
                        >
                          <Zap size={11} />
                          <span>Flush RAM</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            lockDevice(device.id);
                          }}
                          title="Lock Screen"
                          className={`py-1 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold ${
                            currentTheme.isLight 
                              ? 'bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]' 
                              : 'bg-[#090B10] hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-white/10 hover:border-[#38BDF8]/40'
                          } flex items-center gap-1 transition`}
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
                      className={`py-1 px-2 ${currentTheme.buttonRadius} text-[10px] font-bold ${
                        currentTheme.isLight 
                          ? 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] border border-[#FCD34D]' 
                          : 'bg-[#090B10] hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 hover:border-[#F59E0B]'
                      } flex items-center gap-1 transition disabled:opacity-30`}
                    >
                      <RotateCcw size={11} className={device.isRebooting ? 'animate-spin' : ''} />
                      <span>Reboot</span>
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <div className={`flex items-center justify-between text-[9px] ${currentTheme.classes.textSecondary} pt-0.5 font-mono`}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          device.isRebooting
                            ? 'bg-[#F59E0B] animate-ping'
                            : isActive
                            ? 'bg-[#10B981]'
                            : 'bg-[#64748B]'
                        }`}
                      />
                      {device.isRebooting ? 'Rebooting...' : isActive ? 'Active Node' : device.status}
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

          <button
            onClick={() => {
              audio.playTap();
              setAddModalOpen(true);
            }}
            className={`w-full py-3 ${currentTheme.cardRadius} border border-dashed transition flex items-center justify-center gap-2 group ${
              currentTheme.isLight ? 'bg-[#FFFFFF] hover:bg-[#F8FAFD] border-[#CBD5E1]' : 'border-white/20 bg-white/[0.02] hover:bg-white/[0.06]'
            }`}
            style={{ color: currentAccent.hex, borderColor: `${currentAccent.hex}50` }}
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold tracking-wide">Add Device</span>
          </button>
        </div>

        {/* Footer Summary */}
        <div className={`p-3 ${currentTheme.classes.cardHeader} text-[10px] ${currentTheme.classes.textSecondary} flex flex-col gap-2`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              Node Cluster Online
            </span>
            <span className={`font-mono ${currentTheme.classes.textMuted}`}>{devices.length} Nodes</span>
          </div>
          <button
            onClick={() => {
              audio.playTap();
              launchApp('studio');
            }}
            className={`w-full py-2 px-2.5 ${currentTheme.buttonRadius} font-bold flex items-center justify-center gap-1.5 transition text-[11px] border`}
            style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
          >
            <Code size={13} /> Bridge Code Studio
          </button>
        </div>
      </aside>

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addDevice}
      />
    </>
  );
};
