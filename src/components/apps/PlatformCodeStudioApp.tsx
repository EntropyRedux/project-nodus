import React, { useState } from 'react';
import { 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Smartphone, 
  Laptop, 
  Layers, 
  Send, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  FileCode, 
  Sliders, 
  Play, 
  Radio,
  ExternalLink,
  Clipboard,
  Cpu
} from 'lucide-react';
import { 
  PLATFORM_SNIPPETS, 
  DEFAULT_BRIDGE_CONFIG, 
  BridgeConfigOptions, 
  CodeFileSnippet 
} from '../../utils/platformSnippets';
import { simulateBridgeRpc, WirePacketLog, BridgeRpcMessage } from '../../utils/bridgeProtocol';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const PlatformCodeStudioApp: React.FC = () => {
  const { devices, addClipboardItem, addNotification } = useLauncher();
  
  // Tab state: 'snippets' | 'simulator' | 'guide'
  const [activeTab, setActiveTab] = useState<'snippets' | 'simulator' | 'guide'>('snippets');
  
  // Snippet selector & config
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>('android-accessibility-service');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'windows' | 'cross-platform'>('all');
  const [config, setConfig] = useState<BridgeConfigOptions>(DEFAULT_BRIDGE_CONFIG);
  const [copied, setCopied] = useState(false);

  // Simulator State
  const [simTargetDevice, setSimTargetDevice] = useState<string>(devices[0] ? `${devices[0].name} (${devices[0].ipAddress})` : 'POCO Pad 2405CPCFBG');
  const [simAction, setSimAction] = useState<BridgeRpcMessage['action']>('GET_PROCESSES');
  const [simCustomCmd, setSimCustomCmd] = useState('wt.exe -p "PowerShell"');
  const [simClipboardText, setSimClipboardText] = useState('https://github.com/nova-launcher/cluster');
  const [simPid, setSimPid] = useState(4892);
  const [packetLogs, setPacketLogs] = useState<WirePacketLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [latestResponse, setLatestResponse] = useState<unknown | null>(null);

  const activeSnippet = PLATFORM_SNIPPETS.find((s) => s.id === selectedSnippetId) || PLATFORM_SNIPPETS[0];
  const generatedCode = activeSnippet.generateCode(config);

  const filteredSnippets = PLATFORM_SNIPPETS.filter((s) => 
    platformFilter === 'all' ? true : s.platform === platformFilter
  );

  const handleCopyCode = () => {
    audio.playTap();
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToUniversalClipboard = () => {
    audio.playTap();
    addClipboardItem({
      text: generatedCode,
      type: 'code',
    });
    addNotification({
      appId: 'settings',
      appName: 'Code Studio',
      title: `Snippet Synced to Fleet`,
      message: `Pushed ${activeSnippet.name} to universal clipboard.`,
      iconName: 'FileCode',
      color: '#007AFF',
    });
  };

  const handleDownloadFile = () => {
    audio.playTap();
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeSnippet.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunSimulation = async () => {
    audio.playTap();
    setIsSimulating(true);

    const params: Record<string, unknown> = {};
    if (simAction === 'EXECUTE_COMMAND') params.command = simCustomCmd;
    if (simAction === 'SET_CLIPBOARD') params.text = simClipboardText;
    if (simAction === 'KILL_PROCESS') params.pid = simPid;
    if (simAction === 'LAUNCH_INTENT') params.packageName = 'com.google.android.youtube';

    const { request, response, packet } = await simulateBridgeRpc(simAction, simTargetDevice, params);
    
    setPacketLogs((prev) => [packet, ...prev.slice(0, 15)]);
    setLatestResponse(response);
    setIsSimulating(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-lg shadow-[#007AFF]/20">
            <Code size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Dual-Platform Architecture Studio</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 font-mono font-bold">
                PHASE 2
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Android (Kotlin / Accessibility) + Windows 11 (C# / PowerShell 7 / Node.js) Conversion & Bridge Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-[#1C1C1E] p-1 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            onClick={() => { audio.playTap(); setActiveTab('snippets'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'snippets' ? 'bg-[#007AFF] text-white shadow' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <FileCode size={14} /> Snippets & Exporter
          </button>
          <button
            onClick={() => { audio.playTap(); setActiveTab('simulator'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'bg-[#007AFF] text-white shadow' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <Radio size={14} /> RPC Wire Simulator
          </button>
          <button
            onClick={() => { audio.playTap(); setActiveTab('guide'); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'guide' ? 'bg-[#007AFF] text-white shadow' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <ShieldCheck size={14} /> Architecture Guide
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'snippets' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Snippet File Explorer */}
          <div className="w-72 border-r border-white/5 bg-[#0E0E10] flex flex-col shrink-0">
            {/* Filter Buttons */}
            <div className="p-3 border-b border-white/5 flex gap-1 text-[11px]">
              {(['all', 'android', 'windows', 'cross-platform'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-2 py-1 rounded-lg font-medium capitalize transition ${
                    platformFilter === p
                      ? 'bg-white/10 text-white'
                      : 'text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Snippet List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredSnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => { audio.playTap(); setSelectedSnippetId(snippet.id); }}
                  className={`w-full p-2.5 rounded-xl text-left transition flex flex-col gap-1 border ${
                    selectedSnippetId === snippet.id
                      ? 'bg-[#1C1C1E] border-[#007AFF]/50 text-white'
                      : 'bg-transparent border-transparent text-[#8E8E93] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      {snippet.platform === 'android' ? (
                        <Smartphone size={13} className="text-[#34C759]" />
                      ) : snippet.platform === 'windows' ? (
                        <Laptop size={13} className="text-[#007AFF]" />
                      ) : (
                        <Layers size={13} className="text-[#BF5AF2]" />
                      )}
                      {snippet.name}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 font-mono text-[#8E8E93]">
                      {snippet.language}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8E8E93] line-clamp-2 leading-tight">
                    {snippet.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Dynamic Config Drawer */}
            <div className="p-3 border-t border-white/5 bg-[#121214] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] flex items-center gap-1">
                <Sliders size={12} /> Bridge Parameters
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="text-[10px] text-[#8E8E93]">Host IP</label>
                  <input
                    type="text"
                    value={config.hostIp}
                    onChange={(e) => setConfig({ ...config, hostIp: e.target.value })}
                    className="w-full bg-[#1C1C1E] px-2 py-1 rounded border border-white/5 text-white font-mono text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8E8E93]">Host Port</label>
                  <input
                    type="number"
                    value={config.hostPort}
                    onChange={(e) => setConfig({ ...config, hostPort: parseInt(e.target.value, 10) || 8890 })}
                    className="w-full bg-[#1C1C1E] px-2 py-1 rounded border border-white/5 text-white font-mono text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8E8E93]">Bridge Port</label>
                  <input
                    type="number"
                    value={config.bridgePort}
                    onChange={(e) => setConfig({ ...config, bridgePort: parseInt(e.target.value, 10) || 9120 })}
                    className="w-full bg-[#1C1C1E] px-2 py-1 rounded border border-white/5 text-white font-mono text-[10px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8E8E93]">Auth Token</label>
                  <input
                    type="text"
                    value={config.authToken}
                    onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                    className="w-full bg-[#1C1C1E] px-2 py-1 rounded border border-white/5 text-white font-mono text-[10px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Area: Code View & Action Bar */}
          <div className="flex-1 flex flex-col bg-[#08080A]">
            {/* Action Bar */}
            <div className="px-4 py-2.5 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-white">{activeSnippet.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8E8E93] font-mono">
                  {activeSnippet.category.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendToUniversalClipboard}
                  className="px-2.5 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-white rounded-xl text-xs flex items-center gap-1.5 border border-white/5 transition"
                  title="Push snippet to Universal Fleet Clipboard"
                >
                  <Clipboard size={13} className="text-[#FF9500]" /> Fleet Clip
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="px-2.5 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-white rounded-xl text-xs flex items-center gap-1.5 border border-white/5 transition"
                >
                  <Download size={13} /> Export File
                </button>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
            </div>

            {/* Code Display */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed select-text bg-[#08080A]">
              <pre className="whitespace-pre">{generatedCode}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Wire Simulator Tab */}
      {activeTab === 'simulator' && (
        <div className="flex-1 flex flex-col p-5 space-y-4 overflow-y-auto">
          {/* Dispatch Control Bar */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio size={16} className="text-[#007AFF]" /> RPC Dispatch Controller
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8E8E93] block mb-1 font-semibold">Target Node</label>
                <select
                  value={simTargetDevice}
                  onChange={(e) => setSimTargetDevice(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={`${d.name} (${d.ipAddress})`}>
                      {d.name} ({d.os})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8E8E93] block mb-1 font-semibold">RPC Method Action</label>
                <select
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value as BridgeRpcMessage['action'])}
                  className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-[#34C759]"
                >
                  <option value="PING">PING (Healthcheck)</option>
                  <option value="GET_PROCESSES">GET_PROCESSES (Process Table)</option>
                  <option value="KILL_PROCESS">KILL_PROCESS (SIGKILL)</option>
                  <option value="EXECUTE_COMMAND">EXECUTE_COMMAND (CLI / Binary)</option>
                  <option value="LAUNCH_INTENT">LAUNCH_INTENT (Android App)</option>
                  <option value="SET_CLIPBOARD">SET_CLIPBOARD (Sync text)</option>
                  <option value="LOCK_DEVICE">LOCK_DEVICE (Screen Lock)</option>
                  <option value="BATTERY_STATUS">BATTERY_STATUS (Telemetry)</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                {simAction === 'EXECUTE_COMMAND' && (
                  <div className="flex-1">
                    <label className="text-[10px] text-[#8E8E93] block mb-1 font-semibold">Command String</label>
                    <input
                      type="text"
                      value={simCustomCmd}
                      onChange={(e) => setSimCustomCmd(e.target.value)}
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                      placeholder="code . / wt.exe"
                    />
                  </div>
                )}
                {simAction === 'SET_CLIPBOARD' && (
                  <div className="flex-1">
                    <label className="text-[10px] text-[#8E8E93] block mb-1 font-semibold">Clipboard Text</label>
                    <input
                      type="text"
                      value={simClipboardText}
                      onChange={(e) => setSimClipboardText(e.target.value)}
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                )}
                {simAction === 'KILL_PROCESS' && (
                  <div className="flex-1">
                    <label className="text-[10px] text-[#8E8E93] block mb-1 font-semibold">Target PID</label>
                    <input
                      type="number"
                      value={simPid}
                      onChange={(e) => setSimPid(parseInt(e.target.value, 10) || 1000)}
                      className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                )}

                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-5 py-2.5 bg-[#34C759] hover:bg-[#30B752] text-black font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#34C759]/20 transition shrink-0"
                >
                  <Play size={14} /> Send RPC
                </button>
              </div>
            </div>
          </div>

          {/* Wire Protocol Sniffer Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {/* Packet Log */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity size={14} className="text-[#34C759]" /> Wire Protocol Traffic (WebSocket IPC)
                </span>
                <span className="text-[10px] text-[#8E8E93] font-mono">{packetLogs.length} Packets</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {packetLogs.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-[#8E8E93]">
                    Click "Send RPC" to dispatch and inspect wire packets
                  </div>
                ) : (
                  packetLogs.map((p) => (
                    <div key={p.id} className="p-3 bg-[#0A0A0C] border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[#007AFF]/20 text-[#007AFF] font-bold">
                          {p.protocol}
                        </span>
                        <span className="text-[#8E8E93]">{p.timestamp} ({p.latencyMs}ms)</span>
                      </div>
                      <div className="text-xs text-white font-mono flex items-center justify-between">
                        <span>{p.source} ➔ {p.destination}</span>
                        <span className="text-[#34C759] font-bold text-[10px]">{p.status}</span>
                      </div>
                      <pre className="text-[10px] text-slate-400 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre">
                        {p.payload}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Response Inspector */}
            <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal size={14} className="text-[#007AFF]" /> RPC Response Inspector
                </span>
                <span className="text-[10px] text-[#34C759] font-mono">STATUS 200 OK</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-[#0A0A0C] rounded-xl border border-white/5 font-mono text-xs text-emerald-400 select-text">
                {latestResponse ? (
                  <pre className="whitespace-pre">{JSON.stringify(latestResponse, null, 2)}</pre>
                ) : (
                  <div className="text-[#8E8E93] text-center pt-16">
                    Awaiting RPC response data...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto text-xs">
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone size={18} className="text-[#34C759]" /> 1. Android Tablet Deployment (LineageOS / HyperOS)
            </h3>
            <p className="text-[#8E8E93] leading-relaxed">
              Compile or sideload the <code className="text-white bg-black/40 px-1 py-0.5 rounded">NovaAccessibilityService.kt</code> and <code className="text-white bg-black/40 px-1 py-0.5 rounded">NovaDaemonService.kt</code> onto your Android device (such as the Samsung Galaxy Tab 4 SM-T230NU or POCO-PAD).
            </p>
            <div className="p-3 bg-[#0A0A0C] rounded-xl font-mono text-[11px] text-slate-300 space-y-1">
              <p className="text-[#34C759]"># Fast Provisioning via Wireless ADB:</p>
              <p>adb connect 192.168.1.104:5555</p>
              <p>adb shell settings put secure enabled_accessibility_services com.novalauncher.cluster/.service.NovaAccessibilityService</p>
              <p>adb shell settings put secure accessibility_enabled 1</p>
            </div>
          </div>

          <div className="bg-[#161618] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop size={18} className="text-[#007AFF]" /> 2. Windows 11 Workstation Setup (C# Service or PowerShell 7)
            </h3>
            <p className="text-[#8E8E93] leading-relaxed">
              Run <code className="text-white bg-black/40 px-1 py-0.5 rounded">nova-agent.ps1</code> or install the C# .NET 8 background service on your Windows 11 PC. It will listen on port <code className="text-white bg-black/40 px-1 py-0.5 rounded">9120</code> for remote application triggers (e.g. Visual Studio Code, Steam, Taskkill, Workstation Lock).
            </p>
            <div className="p-3 bg-[#0A0A0C] rounded-xl font-mono text-[11px] text-slate-300 space-y-1">
              <p className="text-[#007AFF]"># Start PowerShell Bridge Daemon:</p>
              <p>pwsh.exe -ExecutionPolicy Bypass -File .\nova-agent.ps1 -Port 9120 -AuthToken "win-bridge-sec-token-894"</p>
            </div>
          </div>

          <div className="bg-[#161618] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#BF5AF2]" /> 3. Cross-Device Mesh Networking
            </h3>
            <p className="text-[#8E8E93] leading-relaxed">
              All nodes advertise and discover each other over mDNS / UDP broadcast. The host node (192.168.1.104) coordinates process kills, application dispatches, and bi-directional clipboard sync with sub-millisecond local network latency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
