import React, { useEffect, useRef, useState } from 'react';
import { DeviceInfo } from '../nodus-common';
import { MeshTopologyVisualizerProps } from '../types/ui-contracts';
import {
  Tablet,
  Monitor,
  Laptop,
  Smartphone,
  Wifi,
  WifiOff,
  Activity,
  Cpu,
  Battery,
  ShieldCheck,
  Radio,
  Layers,
  Sparkles
} from 'lucide-react';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  device: DeviceInfo;
}

const STATUS_THEME: Record<DeviceInfo['status'], {
  nodeColor: string;
  edgeColor: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  online: {
    nodeColor: '#6DD58C', // M3 Mint Green
    edgeColor: 'rgba(109, 213, 140, 0.45)',
    glowColor: 'rgba(109, 213, 140, 0.25)',
    badgeBg: 'rgba(109, 213, 140, 0.15)',
    badgeText: '#6DD58C'
  },
  connected: {
    nodeColor: '#A8C7FA', // M3 Primary Light Blue
    edgeColor: 'rgba(168, 199, 250, 0.5)',
    glowColor: 'rgba(168, 199, 250, 0.3)',
    badgeBg: 'rgba(168, 199, 250, 0.15)',
    badgeText: '#A8C7FA'
  },
  idle: {
    nodeColor: '#FFD87A', // M3 Warm Amber
    edgeColor: 'rgba(255, 216, 122, 0.35)',
    glowColor: 'rgba(255, 216, 122, 0.18)',
    badgeBg: 'rgba(255, 216, 122, 0.15)',
    badgeText: '#FFD87A'
  },
  offline: {
    nodeColor: '#8E9199', // M3 Outline Neutral
    edgeColor: 'rgba(142, 145, 153, 0.15)',
    glowColor: 'rgba(142, 145, 153, 0.05)',
    badgeBg: 'rgba(142, 145, 153, 0.15)',
    badgeText: '#8E9199'
  },
  rebooting: {
    nodeColor: '#FFB4AB', // M3 Error Container Accent
    edgeColor: 'rgba(255, 180, 171, 0.4)',
    glowColor: 'rgba(255, 180, 171, 0.2)',
    badgeBg: 'rgba(255, 180, 171, 0.15)',
    badgeText: '#FFB4AB'
  }
};

function getDeviceIcon(type: DeviceInfo['type'], size = 18) {
  switch (type) {
    case 'tablet':
      return <Tablet size={size} />;
    case 'laptop':
      return <Laptop size={size} />;
    case 'phone':
      return <Smartphone size={size} />;
    case 'desktop':
    default:
      return <Monitor size={size} />;
  }
}

export const MeshTopologyVisualizer: React.FC<MeshTopologyVisualizerProps> = ({
  devices,
  activeDeviceId,
  onSelectDevice
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 720, height: 420 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // ResizeObserver for responsive SVG
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Telemetry packet animation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Compute node layouts: Local tablet pinned in center, remote devices arranged in orbit
  const { width, height } = dimensions;
  const centerX = width / 2;
  const centerY = height / 2;

  const isCompact = width < 500 || height < 380;
  const isUltraCompact = width < 380 || height < 320;

  const localDevice = devices.find(d => d.isLocal) || devices[0];
  const remoteDevices = devices.filter(d => d.id !== localDevice?.id);

  const nodePositions: NodePosition[] = [];

  if (localDevice) {
    nodePositions.push({
      id: localDevice.id,
      x: centerX,
      y: centerY,
      device: localDevice
    });
  }

  // Radial orbit calculation with adaptive radius for small screens / orientations
  const orbitRadius = isUltraCompact
    ? Math.max(65, Math.min(width * 0.28, height * 0.28))
    : isCompact
    ? Math.max(80, Math.min(width * 0.31, height * 0.31))
    : Math.max(110, Math.min(width * 0.35, height * 0.36));

  remoteDevices.forEach((dev, idx) => {
    const total = Math.max(1, remoteDevices.length);
    // Start angle offset by -90deg (top) for aesthetic symmetry
    const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
    // Add subtle organic offset based on index (clamped on compact viewports)
    const rOffset = isCompact ? (idx % 2 === 0 ? 5 : -5) : (idx % 2 === 0 ? 10 : -10);
    const r = orbitRadius + rOffset;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    nodePositions.push({
      id: dev.id,
      x,
      y,
      device: dev
    });
  });

  const hoveredNode = nodePositions.find(n => n.id === hoveredNodeId);
  const selectedNode = nodePositions.find(n => n.id === activeDeviceId);

  const localNode = nodePositions.find(n => n.device.isLocal);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[300px] sm:h-[360px] md:h-[430px] lg:h-[460px] rounded-xl bg-[#1D2024] border border-white/5 overflow-hidden shadow-xl flex flex-col justify-between select-none touch-manipulation"
    >
      {/* High-tech SVG Canvas */}
      <svg
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full pointer-events-auto"
      >
        <defs>
          {/* Radial glow gradients for each device status */}
          {Object.entries(STATUS_THEME).map(([status, theme]) => (
            <radialGradient key={status} id={`glow-${status}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={theme.glowColor} />
              <stop offset="60%" stopColor={theme.glowColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          ))}

          {/* Linear gradient for local tablet hub glow */}
          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(168, 199, 250, 0.35)" />
            <stop offset="50%" stopColor="rgba(0, 73, 125, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Grid pattern */}
          <pattern id="topology-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#A8C7FA"
              strokeWidth="0.5"
              strokeOpacity="0.04"
            />
          </pattern>
        </defs>

        {/* Ambient Grid Layer */}
        <rect width="100%" height="100%" fill="url(#topology-grid)" />

        {/* Concentric Radar Rings radiating from Central Tablet Hub */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius * 0.45}
          fill="none"
          stroke="#A8C7FA"
          strokeWidth="1"
          strokeDasharray="3 6"
          strokeOpacity="0.1"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke="#A8C7FA"
          strokeWidth="1"
          strokeDasharray="4 8"
          strokeOpacity="0.12"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius * 1.3}
          fill="none"
          stroke="#A8C7FA"
          strokeWidth="0.75"
          strokeDasharray="2 10"
          strokeOpacity="0.06"
        />

        {/* Crosshair coordinate lines */}
        <line
          x1={centerX - orbitRadius * 1.4}
          y1={centerY}
          x2={centerX + orbitRadius * 1.4}
          y2={centerY}
          stroke="#A8C7FA"
          strokeWidth="0.5"
          strokeOpacity="0.08"
          strokeDasharray="4 12"
        />
        <line
          x1={centerX}
          y1={centerY - orbitRadius * 1.4}
          x2={centerX}
          y2={centerY + orbitRadius * 1.4}
          stroke="#A8C7FA"
          strokeWidth="0.5"
          strokeOpacity="0.08"
          strokeDasharray="4 12"
        />

        {/* Hub ambient halo */}
        <circle cx={centerX} cy={centerY} r={80} fill="url(#hub-glow)" />

        {/* Edge Lines connecting Local Node to Remote Devices */}
        {localNode &&
          nodePositions
            .filter(n => n.id !== localNode.id)
            .map(node => {
              const statusTheme = STATUS_THEME[node.device.status] || STATUS_THEME.online;
              const isOffline = node.device.status === 'offline';
              const isTargetActive = activeDeviceId === node.id;

              // Compute packet position along the line
              const progress = (pulsePhase % 100) / 100;
              const packetX = localNode.x + (node.x - localNode.x) * progress;
              const packetY = localNode.y + (node.y - localNode.y) * progress;

              // Reverse packet for bidirectional telemetry
              const reverseProgress = ((pulsePhase + 50) % 100) / 100;
              const returnX = node.x + (localNode.x - node.x) * reverseProgress;
              const returnY = node.y + (localNode.y - node.y) * reverseProgress;

              return (
                <g key={`edge-${node.id}`}>
                  {/* Glowing background line */}
                  <line
                    x1={localNode.x}
                    y1={localNode.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={statusTheme.nodeColor}
                    strokeWidth={isTargetActive ? 2.5 : 1.5}
                    strokeOpacity={isTargetActive ? 0.6 : isOffline ? 0.1 : 0.25}
                  />

                  {/* Animated dashed telemetry line */}
                  {!isOffline && (
                    <line
                      x1={localNode.x}
                      y1={localNode.y}
                      x2={node.x}
                      y2={node.y}
                      stroke={statusTheme.nodeColor}
                      strokeWidth={1.5}
                      strokeDasharray="6 8"
                      strokeDashoffset={-pulsePhase * 0.8}
                      strokeOpacity={0.65}
                    />
                  )}

                  {/* Data packet traveling forward */}
                  {!isOffline && (
                    <circle
                      cx={packetX}
                      cy={packetY}
                      r={3}
                      fill={statusTheme.nodeColor}
                      opacity={0.9}
                    />
                  )}

                  {/* Return packet traveling back */}
                  {!isOffline && (
                    <circle
                      cx={returnX}
                      cy={returnY}
                      r={2}
                      fill="#A8C7FA"
                      opacity={0.7}
                    />
                  )}
                </g>
              );
            })}

        {/* Node Halos & Interactive Circles */}
        {nodePositions.map(node => {
          const isLocal = node.device.isLocal;
          const statusTheme = STATUS_THEME[node.device.status] || STATUS_THEME.online;
          const isSelected = activeDeviceId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const nodeRadius = isLocal
            ? (isUltraCompact ? 22 : isCompact ? 26 : 34)
            : (isUltraCompact ? 16 : isCompact ? 20 : 26);

          return (
            <g
              key={`node-${node.id}`}
              className="cursor-pointer transition-transform duration-200"
              onClick={() => onSelectDevice?.(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              {/* Outer Glow Halo */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius * 1.8}
                fill={`url(#glow-${node.device.status})`}
                opacity={isSelected || isHovered ? 1 : 0.4}
              />

              {/* Pulsing Selection Ring */}
              {(isSelected || isHovered) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius + (isCompact ? 6 : 9)}
                  fill="none"
                  stroke={statusTheme.nodeColor}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.85"
                  className="animate-spin"
                  style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '8s' }}
                />
              )}

              {/* Node Body Container */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={isLocal ? '#003258' : '#282A2F'}
                stroke={isSelected ? '#A8C7FA' : statusTheme.nodeColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
              />

              {/* Node Inner Ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r={Math.max(4, nodeRadius - (isCompact ? 3 : 4))}
                fill={isLocal ? '#00497D' : '#1D2024'}
                stroke={statusTheme.nodeColor}
                strokeWidth="0.75"
                strokeOpacity="0.4"
              />

              {/* Status Telemetry Dot Badge on top-right of node */}
              <circle
                cx={node.x + nodeRadius * 0.72}
                cy={node.y - nodeRadius * 0.72}
                r={isCompact ? 4.5 : 5.5}
                fill={statusTheme.nodeColor}
                stroke="#1D2024"
                strokeWidth="2"
              />

              {/* Node Label Below */}
              <text
                x={node.x}
                y={node.y + nodeRadius + (isCompact ? 13 : 16)}
                textAnchor="middle"
                fontSize={isUltraCompact ? "9" : isCompact ? "10" : "11"}
                fontWeight={600}
                fill={isSelected ? '#A8C7FA' : '#E2E2E6'}
                className="pointer-events-none drop-shadow-md"
              >
                {isCompact && node.device.name.length > 15
                  ? `${node.device.name.slice(0, 13)}…`
                  : node.device.name}
              </text>

              {/* IP / Role Pill Subtitle */}
              <text
                x={node.x}
                y={node.y + nodeRadius + (isCompact ? 22 : 28)}
                textAnchor="middle"
                fontSize={isUltraCompact ? "8" : "9"}
                fontFamily="monospace"
                fill={statusTheme.nodeColor}
                opacity="0.85"
                className="pointer-events-none"
              >
                {isLocal ? 'HOST' : isCompact ? node.device.ipAddress.replace(/^192\.168\./, '…') : node.device.ipAddress}
              </text>
            </g>
          );
        })}
      </svg>

      {/* HTML Overlay: Central Local Icon & Remote Device Icons inside SVG coordinates */}
      {nodePositions.map(node => {
        const isLocal = node.device.isLocal;
        const statusTheme = STATUS_THEME[node.device.status] || STATUS_THEME.online;
        const iconSize = isLocal
          ? (isUltraCompact ? 15 : isCompact ? 18 : 22)
          : (isUltraCompact ? 12 : isCompact ? 14 : 17);

        return (
          <div
            key={`icon-${node.id}`}
            onClick={() => onSelectDevice?.(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center transition-transform duration-200"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              color: isLocal ? '#A8C7FA' : statusTheme.nodeColor
            }}
          >
            {getDeviceIcon(node.device.type, iconSize)}
          </div>
        );
      })}

      {/* Top Overlay Bar: Header & Mesh Status */}
      <div className="relative z-10 px-3 sm:px-5 pt-3 sm:pt-4 pb-2 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Topology
          </div>
          <div className="bg-[#282A2F] text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md text-slate-300 font-mono border border-white/5">
            {devices.filter(d => d.status === 'online' || d.status === 'connected').length}/{devices.length} Nodes
          </div>
        </div>

        {/* Selected device tag */}
        {selectedNode && (
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 h-6 sm:h-7 px-2 sm:px-3 rounded-lg bg-[#282A2F] text-[10px] sm:text-[11px] font-mono text-slate-300 border border-white/5 shadow-sm max-w-[170px] sm:max-w-xs truncate">
            <span className="text-slate-400 uppercase font-semibold hidden xs:inline">Target:</span>
            <span className="font-semibold text-[#A8C7FA] truncate">{selectedNode.device.name}</span>
            <span
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_THEME[selectedNode.device.status]?.nodeColor || '#6DD58C' }}
            />
          </div>
        )}
      </div>

      {/* Hovered / Active Telemetry Detail Popover */}
      {hoveredNode && (
        <div
          className="absolute z-20 pointer-events-none p-3 sm:p-4 rounded-xl bg-[#282A2F]/95 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-200 min-w-[190px] sm:min-w-[210px] max-w-[90%]"
          style={{
            left: Math.max(10, Math.min(width - 220, hoveredNode.x - 100)),
            top: hoveredNode.y > height / 2 ? Math.max(10, hoveredNode.y - 135) : Math.min(height - 120, hoveredNode.y + 35)
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <span style={{ color: STATUS_THEME[hoveredNode.device.status]?.nodeColor }}>
                {getDeviceIcon(hoveredNode.device.type, 14)}
              </span>
              <span className="text-xs font-semibold text-white truncate">{hoveredNode.device.name}</span>
            </div>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase shrink-0"
              style={{
                backgroundColor: STATUS_THEME[hoveredNode.device.status]?.badgeBg,
                color: STATUS_THEME[hoveredNode.device.status]?.badgeText
              }}
            >
              {hoveredNode.device.status}
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Endpoint:</span>
              <span className="text-slate-200">{hoveredNode.device.ipAddress}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Architecture:</span>
              <span className="text-slate-200 capitalize">{hoveredNode.device.os}</span>
            </div>
            {hoveredNode.device.latencyMs !== undefined && (
              <div className="flex justify-between text-slate-400">
                <span>RTT Latency:</span>
                <span className="text-[#6DD58C]">{hoveredNode.device.latencyMs} ms</span>
              </div>
            )}
            {hoveredNode.device.batteryPercent !== undefined && (
              <div className="flex justify-between text-slate-400">
                <span>Battery:</span>
                <span className="text-slate-200">{hoveredNode.device.batteryPercent}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Telemetry Legend & Controls */}
      <div className="relative z-10 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#282A2F]/90 border-t border-white/5 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Status Legend Pills */}
        <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar">
          {(['online', 'connected', 'idle', 'offline'] as const).map(status => {
            const theme = STATUS_THEME[status];
            return (
              <div key={status} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                  style={{
                    backgroundColor: theme.nodeColor,
                    boxShadow: `0 0 6px ${theme.nodeColor}`
                  }}
                />
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-300 capitalize">
                  {status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tip text */}
        <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3 h-3 text-[#A8C7FA]" />
          <span className="hidden xs:inline">Tap node to assign as remote target</span>
          <span className="xs:hidden">Tap node to target</span>
        </div>
      </div>
    </div>
  );
};
