import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, RefreshCw, Maximize2, Play, Pause, Settings, Radio, ShieldCheck, Zap, MousePointer } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { simulateBridgeRpc } from '../../utils/bridgeProtocol';
import { audio } from '../../utils/audio';

export const RemoteStreamApp: React.FC = () => {
  const { devices, activeDeviceId, activeDevice, addNotification } = useLauncher();
  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeDeviceId);
  const [streamQuality, setStreamQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [isStreaming, setIsStreaming] = useState(true);
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentNode = devices.find((d) => d.id === selectedNodeId) || activeDevice;

  // Render simulated high-performance frame buffer onto canvas
  useEffect(() => {
    if (!isStreaming) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const renderFrame = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background workspace canvas
      ctx.fillStyle = '#0F0F12';
      ctx.fillRect(0, 0, w, h);

      // Grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Simulated remote window frame
      const winX = 40 + Math.sin(tick * 0.02) * 5;
      const winY = 40;
      const winW = w - 80;
      const winH = h - 80;

      ctx.fillStyle = '#1C1C1E';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, winH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Window header
      ctx.fillStyle = '#2C2C2E';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, 32, [16, 16, 0, 0]);
      ctx.fill();

      // Remote window dots
      ctx.fillStyle = '#FF3B30';
      ctx.beginPath();
      ctx.arc(winX + 20, winY + 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF9500';
      ctx.beginPath();
      ctx.arc(winX + 36, winY + 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#34C759';
      ctx.beginPath();
      ctx.arc(winX + 52, winY + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Title
      ctx.fillStyle = '#F0F0F2';
      ctx.font = '11px monospace';
      ctx.fillText(`${currentNode.name} (${currentNode.os}) - Remote Display Stream`, winX + 70, winY + 20);

      // Active status pulse indicator
      const pulseX = winX + winW - 20;
      ctx.fillStyle = '#34C759';
      ctx.beginPath();
      ctx.arc(pulseX, winY + 16, 4 + Math.sin(tick * 0.1) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
    return () => cancelAnimationFrame(animId);
  }, [isStreaming, currentNode, streamQuality]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    audio.playTap();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Forward click event over RPC to target node
    try {
      await simulateBridgeRpc('EXECUTE_COMMAND', currentNode.id, {
        command: `input tap ${x} ${y}`,
      });
      addNotification({
        appId: 'stream',
        appName: 'Remote Stream',
        title: 'Input Event Forwarded',
        message: `Tap (${x}, ${y}) sent to ${currentNode.name}`,
        iconName: 'MousePointer',
        color: '#007AFF',
      });
    } catch (_) {}
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden font-sans">
      {/* Top Controls Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#34C759] to-[#007AFF] flex items-center justify-center text-black shadow-lg shadow-[#34C759]/20 font-bold">
            <Monitor size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Live Remote Viewport Canvas Stream</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] font-mono font-bold border border-[#34C759]/30">
                LOW-LATENCY 60 FPS
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Real-time screen buffer streaming and touch input forwarding to remote nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Node Dropdown */}
          <select
            value={selectedNodeId}
            onChange={(e) => {
              audio.playTap();
              setSelectedNodeId(e.target.value);
            }}
            className="bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#34C759]"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.os})
              </option>
            ))}
          </select>

          {/* Quality Selector */}
          <div className="flex items-center bg-[#1C1C1E] p-1 rounded-xl border border-white/5 text-xs font-mono font-bold">
            {(['1080p', '720p', '480p'] as const).map((q) => (
              <button
                key={q}
                onClick={() => {
                  audio.playTap();
                  setStreamQuality(q);
                }}
                className={`px-2.5 py-1 rounded-lg transition ${
                  streamQuality === q ? 'bg-[#34C759] text-black' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Pause / Play Stream */}
          <button
            onClick={() => {
              audio.playTap();
              setIsStreaming(!isStreaming);
            }}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isStreaming ? 'bg-[#FF3B30]/15 text-[#FF3B30]' : 'bg-[#34C759] text-black'
            }`}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center relative bg-[#060608] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onClick={handleCanvasClick}
          className="w-full max-w-4xl h-auto aspect-video rounded-2xl border border-white/10 shadow-2xl cursor-crosshair object-contain bg-[#0F0F12]"
        />

        {/* Viewport Overlay HUD */}
        <div className="absolute top-6 right-6 bg-[#0A0A0C]/80 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-[#34C759]">
            <Zap size={13} /> {fps} FPS
          </span>
          <span className="text-[#8E8E93]">•</span>
          <span className="text-[#007AFF]">{latency} ms</span>
          <span className="text-[#8E8E93]">•</span>
          <span className="text-white uppercase">{streamQuality}</span>
        </div>
      </div>
    </div>
  );
};
