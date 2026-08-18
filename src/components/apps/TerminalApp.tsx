import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TermIcon, Play, Radio, Server, Activity, ShieldCheck } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const TerminalApp: React.FC = () => {
  const { 
    devices, 
    activeDeviceId, 
    activeDevice, 
    remoteExecutables, 
    executeRemoteApp, 
    clipboardItems, 
    addClipboardItem,
    killProcess,
    deviceProcesses
  } = useLauncher();

  const [history, setHistory] = useState<string[]>([
    '═══════════════════════════════════════════════════════════════════════',
    '  Nova Multi-Device Cluster CLI & Remote Shell Controller v2.4.0',
    '  Connected Node: ' + activeDevice.name + ' (' + activeDevice.ipAddress + ')',
    '  Type "help" for a list of remote execution and cluster commands.',
    '═══════════════════════════════════════════════════════════════════════',
  ]);
  const [inputVal, setInputVal] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;
    audio.playTap();
    setInputVal('');

    const newHistory = [...history, `[${activeDevice.name.toLowerCase()}]# ${cmd}`];
    const args = cmd.split(' ').filter(Boolean);
    const main = args[0]?.toLowerCase();

    switch (main) {
      case 'help':
        newHistory.push(
          'Available Cluster & Remote Commands:',
          '  cluster status          - Show status of host server & connected devices',
          '  cluster list            - List all trusted node IPs and OS specifications',
          '  bridge status           - View Android/Windows bridge agents and port status',
          '  bridge test <action>    - Simulate RPC payload (e.g. bridge test PING or GET_PROCESSES)',
          '  bridge snippets         - List native code conversion templates available',
          '  exec <name>             - Trigger remote executable shortcut (e.g. exec vscode)',
          '  executables             - List registered remote shortcuts and binaries',
          '  ps                      - Display running processes for ' + activeDevice.name,
          '  kill <pid>              - Terminate process by PID on ' + activeDevice.name,
          '  clip get                - Show recent clipboard sync history items',
          '  clip copy <text>        - Broadcast text to fleet universal clipboard',
          '  ping <node>             - Check ping latency to remote bridge node',
          '  ssh <node>              - Open direct SSH session (e.g. ssh nodus-kitkat-legacy)',
          '  uname -a                - Show system kernel information',
          '  clear                   - Clear console screen'
        );
        break;

      case 'bridge':
        const sub = args[1]?.toLowerCase();
        if (sub === 'status') {
          newHistory.push(
            'DUAL-PLATFORM BRIDGE DAEMON STATUS:',
            '  Android Accessibility: ACTIVE (com.novalauncher.cluster/.service.NovaAccessibilityService)',
            '  Android WebSocket Link: CONNECTED (ws://192.168.1.104:8890/device-rpc)',
            '  Windows C#/.NET Bridge: LISTENING (http://192.168.1.150:9120)',
            '  Security Auth Token: win-bridge-sec-token-894 (Active)'
          );
        } else if (sub === 'snippets') {
          newHistory.push(
            'PHASE 2 DUAL-PLATFORM CODE TEMPLATES:',
            '  • NovaAccessibilityService.kt   (Android Key & Global Window Interceptor)',
            '  • NovaDaemonService.kt          (Android Background OkHttp WebSocket Link)',
            '  • AndroidManifest.xml           (System Permissions & Service Bindings)',
            '  • connect-cluster-adb.sh        (Wireless ADB Auto-Pairing Script)',
            '  • WindowsBridgeService.cs       (Windows C# .NET 8 Background Service)',
            '  • nova-agent.ps1                (Windows Zero-Dependency PowerShell 7 Daemon)',
            '  • server.mjs                    (Cross-Platform Node/Bun WebSocket Hub)',
            '  • RegisterNovaProtocol.reg      (Windows nova-bridge:// URI Protocol)',
            '  -> Open "Dual-Platform Studio" app to export or copy complete source files.'
          );
        } else if (sub === 'test') {
          const actionToTest = (args[2] || 'PING').toUpperCase();
          newHistory.push(`[BRIDGE RPC] Dispatching ${actionToTest} to ${activeDevice.name}...`);
          setTimeout(() => {
            setHistory(prev => [
              ...prev,
              `[BRIDGE RPC 200 OK] Received response from ${activeDevice.ipAddress} (${activeDevice.os}): Latency 3ms. Status: ACKNOWLEDGED`
            ]);
          }, 300);
        } else {
          newHistory.push('Usage: bridge [status|snippets|test <ACTION>]');
        }
        break;

      case 'cluster':
        if (args[1] === 'status') {
          newHistory.push(
            'CLUSTER MESH STATUS:',
            '  Host Server: 192.168.1.104:8890 (WebSocket Hub)',
            '  Security: AES-GCM Encrypted / Pairing Token Active',
            '  Active Nodes: ' + devices.filter(d => d.status === 'online' || d.status === 'connected').length + '/' + devices.length + ' online',
            '  Sync State: Bi-directional event stream active'
          );
        } else if (args[1] === 'list') {
          newHistory.push('CONNECTED FLEET NODES:');
          devices.forEach(d => {
            newHistory.push(`  • [${d.id}] ${d.name.padEnd(12)} | ${d.ipAddress.padEnd(15)} | ${d.os.padEnd(20)} | [${d.status.toUpperCase()}]`);
          });
        } else {
          newHistory.push('Usage: cluster [status|list]');
        }
        break;

      case 'executables':
        newHistory.push('REGISTERED REMOTE EXECUTABLES:');
        remoteExecutables.forEach(re => {
          newHistory.push(`  • ${re.name.padEnd(22)} -> Node: ${re.deviceName.padEnd(10)} [${re.execType}] (${re.commandOrPackage})`);
        });
        break;

      case 'exec':
        const targetQuery = args.slice(1).join(' ').toLowerCase();
        if (!targetQuery) {
          newHistory.push('Usage: exec <executable_name> (e.g. exec "Visual Studio Code" or exec "code")');
          break;
        }
        const found = remoteExecutables.find(
          r => r.name.toLowerCase().includes(targetQuery) || r.commandOrPackage.toLowerCase().includes(targetQuery)
        );
        if (found) {
          newHistory.push(`[RPC] Dispatched execution intent to ${found.deviceName} for "${found.name}"...`);
          executeRemoteApp(found).then(res => {
            setHistory(prev => [...prev, `[RPC Response]: ${res.message}`]);
          });
        } else {
          newHistory.push(`Error: No executable matching "${targetQuery}" found. Type "executables" to view list.`);
        }
        break;

      case 'ps':
      case 'top':
        const procs = deviceProcesses[activeDeviceId] || [];
        newHistory.push(`ACTIVE PROCESS TABLE FOR ${activeDevice.name} (${activeDevice.ipAddress}):`);
        newHistory.push('PID    USER          CPU%   MEM(MB)  STATUS   COMMAND');
        procs.forEach(p => {
          newHistory.push(
            `${p.pid.toString().padEnd(6)} ${p.user.padEnd(13)} ${p.cpu.toFixed(1).padStart(5)}% ${p.memoryMb.toString().padStart(6)} MB  ${p.status.padEnd(8)} ${p.name}`
          );
        });
        break;

      case 'kill':
        const targetPid = parseInt(args[1], 10);
        if (isNaN(targetPid)) {
          newHistory.push('Usage: kill <pid> (e.g. kill 1420)');
        } else {
          killProcess(activeDeviceId, targetPid);
          newHistory.push(`Sent SIGKILL to PID ${targetPid} on ${activeDevice.name}.`);
        }
        break;

      case 'clip':
        if (args[1] === 'get') {
          newHistory.push('UNIVERSAL FLEET CLIPBOARD (Recent):');
          clipboardItems.slice(0, 5).forEach((ci, idx) => {
            newHistory.push(`  ${idx + 1}. [${ci.deviceName}] (${ci.type}): "${ci.text}"`);
          });
        } else if (args[1] === 'copy') {
          const textToCopy = args.slice(2).join(' ');
          if (!textToCopy) {
            newHistory.push('Usage: clip copy <text_to_broadcast>');
          } else {
            addClipboardItem({ text: textToCopy, deviceId: activeDeviceId });
            newHistory.push(`Broadcasted to cluster: "${textToCopy}"`);
          }
        } else {
          newHistory.push('Usage: clip [get|copy <text>]');
        }
        break;

      case 'ping':
        const targetHost = args[1] || activeDevice.ipAddress;
        newHistory.push(
          `PING ${targetHost} (56 data bytes):`,
          `64 bytes from ${targetHost}: icmp_seq=1 ttl=64 time=1.42 ms`,
          `64 bytes from ${targetHost}: icmp_seq=2 ttl=64 time=1.28 ms`,
          `64 bytes from ${targetHost}: icmp_seq=3 ttl=64 time=1.35 ms`,
          `--- ${targetHost} ping statistics ---`,
          `3 packets transmitted, 3 received, 0% packet loss, min/avg/max = 1.28/1.35/1.42 ms`
        );
        break;

      case 'ssh':
        const sshTarget = args[1] || 'nodus-kitkat-legacy';
        newHistory.push(
          `Connecting to SSH server on ${sshTarget}:22 (Linux Deploy Chroot)...`,
          `Welcome to Debian GNU/Linux 12 (bookworm) on ${sshTarget} (ARMv7)`,
          `Last login: Tue Aug 18 18:45:00 2026 from 100.64.0.1 (Tailnet)`,
          `root@${sshTarget}:~# `
        );
        break;

      case 'uname':
        newHistory.push(`Linux nova-controller 6.1.42-android-aarch64 #1 SMP PREEMPT GNU/Linux [Node: ${activeDevice.name}]`);
        break;

      case 'clear':
        setHistory([]);
        return;

      default:
        newHistory.push(`bash: ${cmd}: command not found. Type "help" for cluster commands.`);
    }

    setHistory(newHistory);
  };

  return (
    <div className="h-full flex flex-col bg-[#08080A] text-[#34C759] font-mono text-xs p-4 select-text">
      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <TermIcon size={14} className="text-[#34C759]" />
          <span className="font-semibold text-white">nova-cluster@{activeDevice.name.toLowerCase().replace(/\s+/g, '-')}:~</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-[#8E8E93]">IP: {activeDevice.ipAddress}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 py-3 font-mono">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed text-slate-300">
            {line.startsWith('════') || line.startsWith('CLUSTER') || line.startsWith('CONNECTED') || line.startsWith('REGISTERED') ? (
              <span className="text-[#34C759] font-bold">{line}</span>
            ) : line.startsWith('[') ? (
              <span className="text-[#007AFF] font-bold">{line}</span>
            ) : (
              line
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommand} className="flex items-center gap-2 pt-2 border-t border-white/10 select-none">
        <span className="text-[#34C759] font-bold">#</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type 'help', 'cluster status', 'exec <name>', 'ps'..."
          className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
          autoFocus
        />
        <button
          type="submit"
          className="px-2.5 py-1 bg-[#34C759]/20 hover:bg-[#34C759]/30 text-[#34C759] rounded border border-[#34C759]/40 text-[10px] font-bold flex items-center gap-1"
        >
          <Play size={10} /> Send
        </button>
      </form>
    </div>
  );
};
