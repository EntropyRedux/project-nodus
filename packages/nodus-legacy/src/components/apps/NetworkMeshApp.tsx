import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Wifi, 
  Server, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Send, 
  Zap, 
  Check, 
  ArrowRight,
  Lock,
  Globe,
  Sliders
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const NetworkMeshApp: React.FC = () => {
  const { devices, activeDeviceId, selectDevice, settings, updateNetworkServerConfig, addNotification } = useLauncher();
  const [pingLatencies, setPingLatencies] = useState<Record<string, number>>({
    'sm-t230nu': 1,
    'poco-pad': 4,
    'main-pc': 2,
    'tab-pc': 7,
  });
  const [isPinging, setIsPinging] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string>(activeDeviceId);

  const handlePingAll = () => {
    audio.playTap();
    setIsPinging(true);
    setTimeout(() => {
      setPingLatencies({
        'sm-t230nu': 1,
        'poco-pad': Math.floor(Math.random() * 4 + 2),
        'main-pc': Math.floor(Math.random() * 3 + 1),
        'tab-pc': Math.floor(Math.random() * 6 + 4),
      });
      setIsPinging(false);
    }, 600);
  };

  const currentNode = devices.find((d) => d.id === selectedNode) || devices[0];

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#BF5AF2] flex items-center justify-center text-white shadow-lg shadow-[#007AFF]/20">
            <Radio size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Cluster Mesh Topology & Network Monitor</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] font-mono font-bold border border-[#007AFF]/30">
                mDNS / UDP DISCOVERY
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Real-time cross-device peer-to-peer WebSocket mesh link between Android tablets and Windows PC
            </p>
          </div>
        </div>

        <button
          onClick={handlePingAll}
          disabled={isPinging}
          className="px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
        >
          <RefreshCw size={13} className={isPinging ? 'animate-spin' : ''} /> Ping All Nodes
        </button>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Connected Nodes Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap size={14} className="text-[#34C759]" /> Active Mesh Nodes ({devices.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((device) => {
                const latency = pingLatencies[device.id] ?? 3;
                const isSelected = device.id === selectedNode;

                return (
                  <div
                    key={device.id}
                    onClick={() => {
                      audio.playTap();
                      setSelectedNode(device.id);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1C1C1E] border-[#007AFF] shadow-lg ring-1 ring-[#007AFF]/40'
                        : 'bg-[#121214] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          device.type === 'desktop' ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'bg-[#34C759]/20 text-[#34C759]'
                        }`}>
                          {device.type === 'desktop' ? <Laptop size={16} /> : <Tablet size={16} />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{device.name}</h4>
                          <span className="text-[10px] text-[#8E8E93] font-mono">{device.ipAddress}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#34C759]/15 text-[#34C759]">
                          {latency} ms
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#8E8E93] bg-[#0A0A0C] p-2 rounded-xl mt-2">
                      <div>OS: <span className="text-white">{device.os}</span></div>
                      <div>Status: <span className="text-[#34C759] uppercase">{device.status}</span></div>
                      <div>Battery: <span className="text-white">{device.battery}%</span></div>
                      <div>CPU Load: <span className="text-white">{device.cpuLoad}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wire Stream Health */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity size={14} className="text-[#007AFF]" /> WebSocket Event Stream Logs
            </h3>
            <div className="p-3 bg-[#0A0A0C] rounded-xl font-mono text-[11px] text-slate-300 space-y-1 h-36 overflow-y-auto">
              <p className="text-[#34C759]">[WS HUB: {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8890] Server listening on active interface</p>
              {devices.map((dev) => (
                <p key={dev.id} className="text-[#007AFF]">
                  [EVENT] Node {dev.name} ({dev.ipAddress}) handshake verified ({dev.status.toUpperCase()})
                </p>
              ))}
              <p className="text-slate-400">[RPC] Polling heartbeat to {devices.length} active peers (0 packet loss)</p>
            </div>
          </div>
        </div>

        {/* Selected Node Details & Diagnostics */}
        <div className="space-y-4">
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#34C759]" /> Node Diagnostics: {currentNode.name}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#0A0A0C] rounded-xl flex justify-between">
                <span className="text-[#8E8E93]">Node ID:</span>
                <span className="font-mono text-white">{currentNode.id}</span>
              </div>
              <div className="p-2.5 bg-[#0A0A0C] rounded-xl flex justify-between">
                <span className="text-[#8E8E93]">IP Address:</span>
                <span className="font-mono text-[#007AFF]">{currentNode.ipAddress}</span>
              </div>
              <div className="p-2.5 bg-[#0A0A0C] rounded-xl flex justify-between">
                <span className="text-[#8E8E93]">Screen Res:</span>
                <span className="font-mono text-white">{currentNode.resolution}</span>
              </div>
              <div className="p-2.5 bg-[#0A0A0C] rounded-xl flex justify-between">
                <span className="text-[#8E8E93]">RAM Footprint:</span>
                <span className="font-mono text-white">{currentNode.ramUsage}</span>
              </div>
              <div className="p-2.5 bg-[#0A0A0C] rounded-xl flex justify-between">
                <span className="text-[#8E8E93]">Storage:</span>
                <span className="font-mono text-white">{currentNode.storage}</span>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playTap();
                selectDevice(currentNode.id);
                addNotification({
                  appId: 'network',
                  appName: 'Network Mesh',
                  title: 'Active Node Switched',
                  message: `Now controlling ${currentNode.name} (${currentNode.ipAddress})`,
                  iconName: 'Radio',
                  color: '#007AFF',
                });
              }}
              className="w-full py-2.5 bg-[#34C759] hover:bg-[#30B752] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
            >
              Set as Primary Target Node
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
