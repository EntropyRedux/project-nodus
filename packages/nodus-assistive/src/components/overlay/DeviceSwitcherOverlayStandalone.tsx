import React from 'react';
import { useAssistive } from '../../context/AssistiveContext';
import { Server, Monitor, Laptop, Smartphone, Tablet, X } from 'lucide-react';
import { DEVICE_COLORS } from '@nodus/common';

export const DeviceSwitcherOverlayStandalone: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { devices, activeDeviceId, toggleSidebar } = useAssistive();

  const handleClose = () => {
    if (onClose) onClose();
    else toggleSidebar();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'laptop': return <Laptop className="w-5 h-5" />;
      case 'phone': return <Smartphone className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 w-80 max-w-full pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm">Mesh Fleet</span>
          <span className="text-xs text-slate-500 font-mono">({devices.length})</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {devices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No devices discovered. Ensure Nodus Fleet is active on your network.
          </div>
        ) : (
          devices.map(device => {
            const color = DEVICE_COLORS[device.id] || '#007AFF';
            const isActive = device.id === activeDeviceId;

            return (
              <div
                key={device.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-800/90 border-blue-500/50 shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow"
                    style={{ backgroundColor: color }}
                  >
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-200">{device.name}</h4>
                    <p className="text-[10px] text-slate-400 capitalize">{device.os} • {device.ipAddress}</p>
                  </div>
                </div>

                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {device.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
