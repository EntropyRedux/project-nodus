import React, { useState, useEffect } from 'react';
import { DeviceInfo } from '@nodus/common';
import {
  X,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Lock,
  Terminal,
  Activity,
  Send,
  RefreshCw,
  Cpu,
  HardDrive
} from 'lucide-react';
import { universalNetworkFetch } from '../services/FleetDirectClient';

interface DeviceControlModalProps {
  device: DeviceInfo;
  onClose: () => void;
}

export const DeviceControlModal: React.FC<DeviceControlModalProps> = ({ device, onClose }) => {
  const [textInput, setTextInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [processes, setProcesses] = useState<Array<{ pid: number; name: string; memory_kb: number }>>([]);
  const [activeSubTab, setActiveSubTab] = useState<'controls' | 'processes'>('controls');

  const cleanIp = device.ipAddress.replace(/^https?:\/\//, '').split(':')[0];
  const port = device.port || 9120;
  const baseUrl = `http://${cleanIp}:${port}`;

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const sendMedia = async (action: string) => {
    setLoadingAction(true);
    try {
      const res = await universalNetworkFetch(`${baseUrl}/api/media/control`, {
        method: 'POST',
        body: { action },
      });
      if (res.ok) showStatus(`Media action "${action}" sent`);
      else showStatus('Failed to send media action');
    } catch (e) {
      showStatus('Cannot connect to node endpoint');
    } finally {
      setLoadingAction(false);
    }
  };

  const lockPc = async () => {
    try {
      const res = await universalNetworkFetch(`${baseUrl}/api/lock`, { method: 'POST' });
      if (res.ok) showStatus('Workstation locked');
      else showStatus('Lock failed');
    } catch (e) {
      showStatus('Cannot connect to node endpoint');
    }
  };

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    try {
      const res = await universalNetworkFetch(`${baseUrl}/api/input/keyboard/text`, {
        method: 'POST',
        body: { text: textInput },
      });
      if (res.ok) {
        showStatus('Text typed into active window');
        setTextInput('');
      } else {
        showStatus('Failed to send text');
      }
    } catch (e) {
      showStatus('Cannot connect to node endpoint');
    }
  };

  const sendHotkey = async (keys: string[]) => {
    try {
      const res = await universalNetworkFetch(`${baseUrl}/api/input/keyboard/hotkey`, {
        method: 'POST',
        body: { keys },
      });
      if (res.ok) showStatus(`Hotkey [${keys.join('+')}] executed`);
      else showStatus('Hotkey failed');
    } catch (e) {
      showStatus('Cannot connect to node endpoint');
    }
  };

  const fetchProcesses = async () => {
    try {
      const res = await universalNetworkFetch<{ processes?: Array<{ pid: number; name: string; memory_kb: number }> }>(`${baseUrl}/api/processes`);
      if (res.ok && res.data) {
        setProcesses(res.data.processes || []);
      }
    } catch (e) {
      console.warn('Could not fetch processes', e);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'processes') {
      fetchProcesses();
    }
  }, [activeSubTab]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">{device.name}</h2>
              <p className="text-xs text-slate-400">{device.ipAddress} • {device.os.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className="bg-emerald-500/20 text-emerald-300 text-xs px-4 py-2 text-center border-b border-emerald-500/30">
            {statusMsg}
          </div>
        )}

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveSubTab('controls')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeSubTab === 'controls'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Remote Controls
          </button>
          <button
            onClick={() => setActiveSubTab('processes')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeSubTab === 'processes'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Process Manager
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeSubTab === 'controls' ? (
            <>
              {/* Media & Volume */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  Media & Volume Controls
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => sendMedia('volume_down')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-200 transition"
                  >
                    <Volume1 className="w-4 h-4" />
                    <span>Vol -</span>
                  </button>
                  <button
                    onClick={() => sendMedia('volume_mute')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-200 transition"
                  >
                    <VolumeX className="w-4 h-4 text-red-400" />
                    <span>Mute</span>
                  </button>
                  <button
                    onClick={() => sendMedia('volume_up')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-200 transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Vol +</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => sendMedia('prev')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-200 transition"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <button
                    onClick={() => sendMedia('play_pause')}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium flex items-center justify-center gap-1.5 text-white transition shadow-md"
                  >
                    <Play className="w-4 h-4" />
                    <span>Play/Pause</span>
                  </button>
                  <button
                    onClick={() => sendMedia('next')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 text-slate-200 transition"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Next</span>
                  </button>
                </div>
              </div>

              {/* Quick Windows Hotkeys */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  Workstation Hotkeys
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => sendHotkey(['ctrl', 'shift', 'esc'])}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Task Manager
                  </button>
                  <button
                    onClick={() => sendHotkey(['win', 'd'])}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Show Desktop
                  </button>
                  <button
                    onClick={() => sendHotkey(['win', 'shift', 's'])}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Snipping Tool
                  </button>
                  <button
                    onClick={() => sendHotkey(['alt', 'tab'])}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Alt+Tab
                  </button>
                  <button
                    onClick={() => sendHotkey(['win', 'e'])}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Explorer
                  </button>
                  <button
                    onClick={lockPc}
                    className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock PC</span>
                  </button>
                </div>
              </div>

              {/* Text Injection */}
              <form onSubmit={sendText} className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  Inject Text
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type text to send to active window..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Processes Table */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  {processes.length} Processes Running
                </span>
                <button
                  onClick={fetchProcesses}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {processes.slice(0, 40).map((p) => (
                  <div
                    key={p.pid}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{p.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-500">PID: {p.pid}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                      {(p.memory_kb / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
