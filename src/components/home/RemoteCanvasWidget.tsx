import React, { useEffect, useRef, useState } from 'react';
import { Activity, Zap, Play, Check, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DEFAULT_CLUSTER_MACROS, ClusterMacro, runClusterMacro } from '../../utils/macroEngine';
import { audio } from '../../utils/audio';

export const RemoteCanvasWidget: React.FC = () => {
  const { activeDevice, devices, addNotification } = useLauncher();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [runningMacroId, setRunningMacroId] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([15, 18, 22, 20, 25, 19, 17, 24, 21, 18, 26, 20]);

  // Live Canvas Sparkline Drawing
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLoad = activeDevice.cpuLoad ?? Math.floor(Math.random() * 15 + 15);
      setCpuHistory((prev) => [...prev.slice(1), currentLoad]);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeDevice.cpuLoad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw grid background lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 10; y < height; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw sparkline curve
    if (cpuHistory.length > 1) {
      const stepX = width / (cpuHistory.length - 1);
      ctx.beginPath();
      ctx.strokeStyle = '#34C759';
      ctx.lineWidth = 2;

      cpuHistory.forEach((val, i) => {
        const x = i * stepX;
        const y = height - (val / 100) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill area under curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(52, 199, 89, 0.25)');
      grad.addColorStop(1, 'rgba(52, 199, 89, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, [cpuHistory]);

  const handleExecuteMacro = async (macro: ClusterMacro) => {
    audio.playTap();
    setRunningMacroId(macro.id);

    await runClusterMacro(macro);

    setRunningMacroId(null);
    addNotification({
      appId: 'system',
      appName: 'Cluster Automation',
      title: `${macro.name} Executed`,
      message: `Completed ${macro.steps.length} multi-node actions.`,
      iconName: macro.icon,
      color: macro.color,
    });
  };

  return (
    <div className="w-full bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-xl space-y-3">
      {/* Header telemetry info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#34C759]/15 text-[#34C759]">
            <Activity size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">{activeDevice.name} Live Telemetry</h4>
            <span className="text-[10px] text-[#8E8E93] font-mono">{activeDevice.ipAddress} • {devices.length} Nodes</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0A0A0C] px-2.5 py-1 rounded-xl border border-white/5 font-mono text-xs">
          <Cpu size={12} className="text-[#34C759]" />
          <span className="text-white font-bold">{cpuHistory[cpuHistory.length - 1]}%</span>
          <span className="text-[9px] text-[#8E8E93]">CPU</span>
        </div>
      </div>

      {/* Live Canvas Sparkline Graph */}
      <div className="relative w-full h-16 bg-[#0A0A0C] rounded-xl border border-white/5 overflow-hidden">
        <canvas ref={canvasRef} width={340} height={64} className="w-full h-full block" />
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#8E8E93]">
          6s Interval Polling
        </div>
      </div>

      {/* Quick Macro Action Triggers */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
        {DEFAULT_CLUSTER_MACROS.map((macro) => {
          const isRunning = runningMacroId === macro.id;
          return (
            <button
              key={macro.id}
              onClick={() => handleExecuteMacro(macro)}
              disabled={isRunning}
              className="p-2.5 rounded-xl bg-[#121214] hover:bg-[#2C2C2E] border border-white/5 hover:border-white/20 text-left transition flex items-center justify-between group"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-bold text-white block truncate">{macro.name}</span>
                <span className="text-[9px] text-[#8E8E93] truncate block">{macro.description}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-[#34C759]/20 text-[#34C759] transition shrink-0">
                {isRunning ? <Zap size={13} className="animate-spin text-[#34C759]" /> : <Play size={13} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
