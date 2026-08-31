import React, { useState } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Cpu, 
  Lock, 
  Trash2, 
  Check, 
  Radio, 
  RefreshCw, 
  Server, 
  Key, 
  ShieldCheck, 
  Zap, 
  HardDrive,
  Activity,
  Plus
} from 'lucide-react';
import { useDesktop } from '../../context/DesktopContext';
import { DeviceInfo, DeviceType } from '../../types/desktop';

export const FleetPanel: React.FC = () => {
  const { 
    devices, 
    activeDeviceId, 
    selectDevice, 
    activeDevice,
    removeDevice,
    connectDeviceManual,
    isDiscovering,
    startAutoDiscovery,
    serverConfig,
    lockWorkstation,
    systemStats
  } = useDesktop();

  // Manual Form State
  const [manualName, setManualName] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('9120');
  const [manualType, setManualType] = useState<DeviceType>('tablet');
  const [manualSecret, setManualSecret] = useState('NODUS-FLEET-SECURE');
  const [pairSuccess, setPairSuccess] = useState(false);

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'tablet': return <Tablet size={18} />;
      case 'desktop': return <Monitor size={18} />;
      case 'phone': return <Smartphone size={18} />;
      default: return <Monitor size={18} />;
    }
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;

    connectDeviceManual({
      name: manualName.trim() || 'Remote Node',
      ip: manualIp.trim(),
      port: parseInt(manualPort, 10) || 9120,
      type: manualType,
    });

    setPairSuccess(true);
    setTimeout(() => setPairSuccess(false), 1200);
  };

  return (
    <div className="w-full h-full flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio size={20} className="text-[#34C759]" />
            <span>Multi-Device Fleet Mesh & Subnet Radar</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Discover, pair, and inspect active nodes across your local workstation network.
          </p>
        </div>

        <button
          onClick={startAutoDiscovery}
          disabled={isDiscovering}
          className="px-4 py-2 rounded-2xl bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#34C759]/25 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isDiscovering ? 'animate-spin' : ''} />
          <span>{isDiscovering ? 'Scanning Subnet...' : 'Auto-Discover (LAN)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* ─── Left Column: Active Nodes List (5 cols) ─────────────── */}
        <section className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Active Nodes ({devices.length})
            </h3>
            <span className={`text-[11px] font-mono ${devices.length > 0 ? 'text-[#34C759]' : 'text-[#8E8E93]'}`}>
              {devices.length > 0 ? 'Mesh Online' : 'No Remote Peers'}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1">
            {devices.length === 0 ? (
              <div className="p-6 rounded-3xl bg-[#121218] border border-white/5 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#8E8E93]">
                  <Radio size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Remote Devices Connected</h4>
                  <p className="text-xs text-[#8E8E93] max-w-xs mt-1 leading-relaxed">
                    0 remote peers in cluster. Use Auto-Discover (LAN) to scan the network or connect a device manually.
                  </p>
                </div>
              </div>
            ) : (
              devices.map((device) => {
                const isSelected = activeDeviceId === device.id;
                return (
                  <div
                    key={device.id}
                    onClick={() => selectDevice(device.id)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-[#181822] border-[#34C759] shadow-xl shadow-[#34C759]/10'
                        : 'bg-[#121218] hover:bg-[#181822] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${
                            isSelected ? 'bg-[#34C759] text-black' : 'bg-white/5 text-[#8E8E93]'
                          }`}
                        >
                          {getDeviceIcon(device.type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            {device.name}
                            {device.status === 'online' || device.status === 'connected' ? (
                              <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_6px_#34C759]" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-[#636366]" />
                            )}
                          </h4>
                          <p className="text-[11px] font-mono text-[#8E8E93]">{device.ipAddress}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDevice(device.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] transition"
                        title="Remove Node"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Micro Telemetry */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px] font-mono text-[#8E8E93]">
                      <div>
                        CPU: <span className="text-white font-bold">{device.cpuLoad ?? 0}%</span>
                      </div>
                      <div>
                        RAM: <span className="text-white font-bold">{device.ramUsage ?? '0 GB'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ─── Right Column: Selected Node Details & Manual Pairing (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Detailed Selected Node Card (or Host Station when no peers) */}
          {activeDevice ? (
            <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center">
                    {getDeviceIcon(activeDevice.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{activeDevice.name}</h3>
                    <p className="text-xs text-[#8E8E93]">{activeDevice.os} • {activeDevice.ipAddress}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
                    activeDevice.status === 'connected' || activeDevice.status === 'online'
                      ? 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/30'
                      : 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/30'
                  }`}
                >
                  {activeDevice.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">Resolution</span>
                  <span className="text-xs font-mono font-bold text-white">{activeDevice.resolution}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">CPU Load</span>
                  <span className="text-xs font-mono font-bold text-[#34C759]">{activeDevice.cpuLoad ?? 0}%</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">Memory Usage</span>
                  <span className="text-xs font-mono font-bold text-[#007AFF]">{activeDevice.ramUsage ?? '0 GB'}</span>
                </div>
              </div>

              {/* Node Remote Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => alert(`Ping request sent to ${activeDevice.name}`)}
                  className="flex-1 py-2 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Zap size={13} className="text-[#34C759]" />
                  <span>Ping Node</span>
                </button>
                <button
                  onClick={() => alert(`Synchronized state with ${activeDevice.name}`)}
                  className="flex-1 py-2 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <RefreshCw size={13} className="text-[#007AFF]" />
                  <span>Sync State</span>
                </button>
                <button
                  onClick={lockWorkstation}
                  className="flex-1 py-2 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 text-[#FF9500] transition active:scale-98"
                >
                  <Lock size={13} />
                  <span>Lock Screen</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Host Workstation (This PC)</h3>
                    <p className="text-xs text-[#8E8E93]">
                      {systemStats?.hostname || 'Windows PC'} • 127.0.0.1:{serverConfig.port}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold border border-[#007AFF]/30 uppercase">
                  Host Bridge
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">Screen</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {typeof window !== 'undefined' ? `${window.screen.width} × ${window.screen.height}` : '1920 × 1080'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">Host CPU Load</span>
                  <span className="text-xs font-mono font-bold text-[#34C759]">
                    {systemStats?.cpu_load_percent ? Math.round(systemStats.cpu_load_percent) : 0}%
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase font-bold text-[#8E8E93]">Host Memory</span>
                  <span className="text-xs font-mono font-bold text-[#007AFF]">
                    {systemStats
                      ? `${(systemStats.ram_used_mb / 1024).toFixed(1)} / ${(systemStats.ram_total_mb / 1024).toFixed(1)} GB`
                      : '0 GB'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Manual IP / Port Pair Box */}
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={15} className="text-[#007AFF]" />
                <span>Pair New Node Manually</span>
              </h3>
              {pairSuccess && (
                <span className="text-xs text-[#34C759] font-bold flex items-center gap-1">
                  <Check size={13} />
                  <span>Node Connected</span>
                </span>
              )}
            </div>

            <form onSubmit={handleManualConnect} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. POCO Pad"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#007AFF]"
                  required
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Device Type
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as DeviceType)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white outline-none focus:border-[#007AFF]"
                >
                  <option value="tablet">Android Tablet</option>
                  <option value="desktop">Windows PC</option>
                  <option value="phone">Smartphone</option>
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Target IP Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.118"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#007AFF]"
                  required
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#8E8E93] uppercase block mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white outline-none focus:border-[#007AFF]"
                  required
                />
              </div>

              <div className="col-span-2 flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold shadow-lg shadow-[#007AFF]/25 transition active:scale-95"
                >
                  Connect & Pair Node
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
