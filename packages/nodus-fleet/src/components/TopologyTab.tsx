import React from 'react';
import { DeviceInfo } from '../nodus-common';
import {
  Tablet,
  Laptop,
  Smartphone,
  Monitor,
  Filter,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { MeshTopologyVisualizer } from './MeshTopologyVisualizer';

export interface TopologyTabProps {
  devices: DeviceInfo[];
  filteredDevices: DeviceInfo[];
  selectedDeviceId: string;
  deviceFilter: string;
  isServerRunning: boolean;
  onSelectDevice: (id: string) => void;
  onFilterChange: (filter: 'all' | 'desktop' | 'laptop' | 'tablet' | 'online') => void;
  onToggleServer: () => void;
  onRemoveDevice: (id: string) => void;
  onNavigateTab: (tab: 'control' | 'processes') => void;
  triggerHaptic?: (pattern?: number | number[]) => void;
}

export const TopologyTab: React.FC<TopologyTabProps> = ({
  devices,
  filteredDevices,
  selectedDeviceId,
  deviceFilter,
  isServerRunning,
  onSelectDevice,
  onFilterChange,
  onToggleServer,
  onRemoveDevice,
  onNavigateTab,
  triggerHaptic = () => {},
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-6 space-y-6">
      <div className="flex flex-col gap-6">
        {/* Interactive SVG Mesh Topology Graph */}
        <MeshTopologyVisualizer
          devices={devices}
          activeDeviceId={selectedDeviceId}
          onSelectDevice={id => onSelectDevice(id)}
        />

        {/* Filter Chips Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mr-1 shrink-0">
              <Filter size={13} />
              Filter:
            </span>
            {[
              { id: 'all', label: `All (${devices.length})` },
              { id: 'desktop', label: 'Workstations' },
              { id: 'laptop', label: 'Laptops' },
              { id: 'tablet', label: 'Tablets' },
              { id: 'online', label: 'Online' },
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => {
                  triggerHaptic(8);
                  onFilterChange(chip.id as any);
                }}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap inline-flex items-center justify-center shrink-0 touch-manipulation ${
                  deviceFilter === chip.id
                    ? 'bg-[var(--accent-primary)] text-[var(--accent-container-text,#062E6F)] shadow-sm font-semibold'
                    : 'bg-[var(--chip-bg)] hover:bg-[var(--surface-elevated)] text-[var(--chip-text)] border border-[var(--border-subtle)]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-[var(--text-muted)]">
            Showing {filteredDevices.length} of {devices.length} nodes
          </span>
        </div>

        {/* Connected Device Overview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDevices.map(device => {
            const isSelected = selectedDeviceId === device.id;

            return (
              <div
                key={device.id}
                onClick={() => onSelectDevice(device.id)}
                className={`bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-1 ring-[var(--border-active)] bg-[var(--surface-elevated)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                      {device.type === 'tablet' ? (
                        <Tablet size={20} />
                      ) : device.type === 'laptop' ? (
                        <Laptop size={20} />
                      ) : device.type === 'phone' ? (
                        <Smartphone size={20} />
                      ) : (
                        <Monitor size={20} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-heading)]">
                        {device.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                        ID: {device.id} · {device.ipAddress} · {device.os.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {device.isLocal ? (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-md font-medium tracking-wide flex items-center gap-1.5 border"
                      style={{
                        backgroundColor: isServerRunning ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
                        color: isServerRunning ? 'var(--status-online-text)' : 'var(--status-offline-text)',
                        borderColor: isServerRunning ? 'var(--status-online-border)' : 'var(--status-offline-border)',
                      }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isServerRunning ? 'bg-[#6DD58C] animate-pulse' : 'bg-[#FFB4AB]'
                        }`}
                      />
                      {isServerRunning ? 'DAEMON ACTIVE' : 'SERVER STOPPED'}
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border ${
                        device.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : 'bg-blue-500/10 text-[var(--accent-primary)] border-[var(--border-active)]'
                      }`}
                    >
                      {device.status === 'online' ? 'Stable' : device.status}
                    </span>
                  )}
                </div>

                {/* CPU Usage Linear Progress Indicator */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-[var(--surface-container)] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all duration-500 rounded-md"
                      style={{ width: `${device.cpuUsagePercent || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>CPU Workload</span>
                    <span className="text-[var(--text-body)] font-semibold">{device.cpuUsagePercent || 0}%</span>
                  </div>
                </div>

                {/* Telemetry Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">LATENCY</span>
                    <span className="text-emerald-500 font-semibold">{device.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">BATTERY</span>
                    <span className="text-[var(--text-body)] font-semibold">{device.batteryPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">ROLE</span>
                    <span className="text-[var(--accent-primary)] font-semibold">
                      {device.isLocal ? 'HOST' : 'REMOTE'}
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  {device.isLocal ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        triggerHaptic(12);
                        onToggleServer();
                      }}
                      title={isServerRunning ? 'Stop Server & Unregister from Mesh' : 'Start Server & Broadcast to Mesh'}
                      className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: isServerRunning ? 'var(--btn-danger-bg)' : 'var(--btn-success-bg)',
                        color: isServerRunning ? 'var(--btn-danger-text)' : 'var(--btn-success-text)',
                        borderColor: isServerRunning ? 'var(--btn-danger-border)' : 'var(--btn-success-border)',
                      }}
                    >
                      {isServerRunning ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isServerRunning ? 'Stop Server' : 'Start Server'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveDevice(device.id);
                      }}
                      title="Remove Node from Fleet"
                      className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: 'var(--btn-danger-bg)',
                        color: 'var(--btn-danger-text)',
                        borderColor: 'var(--btn-danger-border)',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectDevice(device.id);
                      onNavigateTab('control');
                    }}
                    disabled={device.isLocal}
                    className="h-8 px-3.5 rounded-lg bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] text-xs font-medium text-[var(--control-btn-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--border-subtle)] active:scale-95 inline-flex items-center justify-center touch-manipulation"
                  >
                    Control Deck
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectDevice(device.id);
                      onNavigateTab('processes');
                    }}
                    className="h-8 px-3.5 rounded-lg bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] text-xs font-medium text-[var(--control-btn-text)] transition-colors border border-[var(--border-subtle)] active:scale-95 inline-flex items-center justify-center touch-manipulation"
                  >
                    Processes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
