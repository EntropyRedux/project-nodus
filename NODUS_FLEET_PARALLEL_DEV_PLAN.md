# Nodus Fleet: Parallel Development Strategy & UI/UX Prototyping Guide

## 1. Executive Summary & Parallel Development Workflow

This document establishes the parallel engineering model for **Nodus Fleet** (`com.nodus.fleet`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PARALLEL DEVELOPMENT ENGINE                     │
├──────────────────────────────────┬─────────────────────────────────────┤
│   IDEs & CLI AGENTS (Core/Mesh)  │    AI STUDIO / FIGMA (UI/UX Studio) │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Android Shell & Native Bridges │ • High-fidelity UI/UX Prototyping   │
│ • UDP Subnet Discovery Daemon    │ • Micro-interactions & Glassmorphism│
│ • Tauri Win32 Desktop Server     │ • Visual Theme & Component Polish   │
│ • ContentProvider IPC Pipeline   │ • Standalone Responsive Layouts     │
│ • Smart Container Wiring         │ • Pure Presentational Components    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

To enable **frictionless, zero-overhead drop-in replacement**, the frontend architecture enforces strict separation between:
1. **Pure Presentational Components (`src/components/ui/`)**: Stateless, styling-rich React views driven purely by standard TypeScript prop contracts.
2. **Smart Containers (`src/components/containers/`)**: State controllers that bridge `FleetContext`, Android `NodusNativeBridge`, and Tauri HTTP RPC endpoints directly into UI props.

---

## 2. Directory & Component Architecture

```
packages/nodus-fleet/src/
├── types/
│   ├── fleet.ts               # Core entity types (DeviceInfo, Process, ClipboardItem)
│   └── ui-contracts.ts        # Strict TypeScript prop interfaces for UI components
├── components/
│   ├── ui/                    # 🟢 PURE PRESENTATIONAL (Drop-in target from AI Studio/Figma)
│   │   ├── DeviceCard.tsx             # Node card with live telemetry & quick actions
│   │   ├── RemoteControlPad.tsx       # Media playback, virtual hotkeys, text injection
│   │   ├── ProcessMonitorTable.tsx    # Real-time task manager & PID killer
│   │   ├── UniversalClipboardFeed.tsx # Cross-device clipboard timeline
│   │   ├── MeshTopologyVisualizer.tsx # Network topology & node status radar
│   │   ├── QuickActionsBar.tsx        # Top status bar & scan controls
│   │   └── DevicePairingModal.tsx     # Subnet radar scan & manual pairing
│   └── containers/            # 🔵 SMART CONTAINERS (Wires state & RPC to UI)
│       ├── FleetDashboardContainer.tsx
│       ├── DeviceControlContainer.tsx
│       └── ClipboardSyncContainer.tsx
├── context/
│   ├── FleetContext.tsx       # Single source of truth for devices, clipboard, & bridge
│   └── ThemeContext.tsx       # Theme definitions (Obsidian Glass, Cyber Slate, etc.)
├── mocks/
│   └── mockFleetData.ts       # Self-contained preview harness for AI Studio
└── services/
    ├── FleetDirectClient.ts   # Direct HTTP client with Bearer auth & native fallback
    └── FleetNativeBridge.ts   # Native JavascriptInterface wrappers
```

---

## 3. Strict UI Component Contracts

These TypeScript interfaces are the **unbreakable contracts** between AI Studio/Figma and the CLI core developers:

```typescript
// packages/nodus-fleet/src/types/ui-contracts.ts
import { DeviceInfo, DeviceProcess, ClipboardItem, NetworkServerConfig } from '@nodus/common';

export interface DeviceCardProps {
  device: DeviceInfo;
  color?: string;
  isLocal?: boolean;
  onSelect?: (deviceId: string) => void;
  onOpenControls?: (device: DeviceInfo) => void;
  onReboot?: (deviceId: string) => void;
  onRemove?: (deviceId: string) => void;
}

export interface RemoteControlPadProps {
  device: DeviceInfo;
  statusMessage?: string | null;
  isLoading?: boolean;
  onMediaAction: (action: 'play_pause' | 'prev' | 'next' | 'volume_up' | 'volume_down' | 'volume_mute') => void;
  onHotkey: (keys: string[]) => void;
  onInjectText: (text: string) => void;
  onLockSystem: () => void;
  onSleepSystem?: () => void;
  onClose: () => void;
}

export interface ProcessMonitorProps {
  device: DeviceInfo;
  processes: DeviceProcess[];
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh: () => void;
  onKillProcess: (pid: number) => void;
}

export interface UniversalClipboardFeedProps {
  items: ClipboardItem[];
  onCopyItem?: (text: string) => void;
  onClearHistory?: () => void;
  onBroadcastText?: (text: string) => void;
  broadcastStatus?: string | null;
}

export interface MeshTopologyVisualizerProps {
  devices: DeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
}

export interface QuickActionsBarProps {
  serverConfig?: NetworkServerConfig;
  connectedCount: number;
  isScanning?: boolean;
  isHomeInstalled?: boolean;
  onRescanMesh: () => void;
  onOpenHome?: () => void;
  onOpenPairingModal?: () => void;
}

export interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManualPair: (ip: string, port: number, token?: string) => void;
  isPairing?: boolean;
  pairingError?: string | null;
}
```

---

## 4. Context Files for AI Studio / Figma Make Upload

When uploading or referencing context in AI Studio / Figma Make, provide the following files:

| File Path | Description / Relevance |
| :--- | :--- |
| `packages/nodus-common/src/types/device.ts` | Complete schema for `DeviceInfo`, `DeviceProcess`, telemetry metrics. |
| `packages/nodus-common/src/types/clipboard.ts` | Universal clipboard entity models and timestamps. |
| `packages/nodus-common/src/ipc/contract.ts` | IPC action strings, broadcast types, and authorities. |
| `packages/nodus-fleet/src/types/ui-contracts.ts` | Strict prop interfaces for all presentational components. |
| `packages/nodus-fleet/src/context/FleetContext.tsx` | State context & action dispatchers available to containers. |
| `packages/nodus-fleet/src/components/FleetDashboard.tsx` | Baseline reference implementation of the dashboard. |
| `packages/nodus-fleet/src/components/DeviceControlModal.tsx` | Baseline reference implementation of modal controls. |

---

## 5. Master Prompt for AI Studio / Figma Make

Copy and paste the following prompt directly into **Google AI Studio**, **Figma Make**, or LLM prototyping tools:

````markdown
# SYSTEM INSTRUCTION: Nodus Fleet UI/UX Prototyping & Component Generator

## Role & Mission
You are the Lead UI/UX Engineer for **Nodus Fleet** (`com.nodus.fleet`), a distributed multi-device command plane and device mesh controller designed for high-refresh-rate tablets (POCO Pad 12.1" 120Hz HyperOS / Android 14) and Windows companion workstations.

Your goal is to design and output **production-ready, ultra-premium React 18+ components using Tailwind CSS and Lucide React icons**.

---

## Architecture & Drop-in Rules (Zero Refactoring)
The codebase uses a **Parallel Development Architecture**. Follow these strict constraints:
1. **Pure Presentational Components**: All components must be pure presentation. Do NOT make `fetch()` calls or call native Android bridge methods directly. All actions must be triggered via prop callbacks.
2. **Strict Props Adherence**: Adhere 100% to the prop interfaces defined in `packages/nodus-fleet/src/types/ui-contracts.ts`.
3. **Icons**: Use only `lucide-react` icons.
4. **Self-Contained Mock Fallbacks**: When developing or previewing, provide a default export or mock container that renders cleanly without requiring a live backend.

---

## Visual Design Language & Aesthetics
- **Theme**: Obsidian Dark Mode (`bg-slate-950` / `bg-[#0B0F17]`).
- **Glassmorphism**: Subtle translucent panels (`bg-slate-900/75 backdrop-blur-xl border border-slate-800/80 shadow-2xl`).
- **Accent Palette**:
  - Windows PC / Workstation: Vibrant Emerald (`#34C759` / `text-emerald-400` / `border-emerald-500/30`)
  - POCO Pad / Tablet: Electric Sapphire (`#007AFF` / `text-blue-400` / `border-blue-500/30`)
  - Remote Android / Peripherals: Vibrant Purple (`#AF52DE` / `text-purple-400`)
  - Warning / Telemetry Alerts: Amber (`#F59E0B`) / Rose (`#F43F5E`)
- **Typography & Details**:
  - Monospace font for telemetry, IP addresses, PIDs, and ports (`font-mono text-xs`).
  - Smooth micro-interactions (`transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`).
  - Live pulse indicators for online nodes (`animate-pulse w-2 h-2 rounded-full bg-emerald-400`).

---

## Target Components to Generate:
1. `DeviceCard.tsx`: Node tile with status pill, CPU/RAM gauge, battery indicator, and action buttons ("Remote Control", "Reboot", "Remove").
2. `RemoteControlPad.tsx`: Glassmorphism control pad with media playback buttons (Play/Pause, Track Skip, Volume Wheel), Windows Quick Lock, virtual text injector, and common hotkey macros (Ctrl+Alt+Del, Alt+F4, Win+D).
3. `ProcessMonitorTable.tsx`: Live task manager table with search/filter, memory usage bars, and single-tap "End Process" button with confirmation state.
4. `UniversalClipboardFeed.tsx`: Synced clipboard timeline with time-ago badges, character counters, one-tap copy, and instant broadcast input bar.
5. `MeshTopologyVisualizer.tsx`: Visual network radar/graph showing interconnected companion nodes and latency.
6. `DevicePairingModal.tsx`: Subnet IP scan radar + manual IP/port/token input modal.

---

## Output Format
- Provide clean, self-contained TSX code for the requested component.
- Include all necessary Tailwind classes and typed prop interfaces.
````

---

## 6. Drop-in Integration Workflow for CLI Developers

When receiving generated component code from AI Studio / Figma Make:

1. **Save Component**:
   Place the generated TSX file into `packages/nodus-fleet/src/components/ui/<ComponentName>.tsx`.
2. **Verify Prop Match**:
   Ensure `<ComponentName>Props` matches `packages/nodus-fleet/src/types/ui-contracts.ts`.
3. **Wire to Container**:
   Import `<ComponentName>` into `packages/nodus-fleet/src/components/containers/` and pass live state handlers from `useFleet()`.
4. **Run Verification**:
   ```bash
   npm run test:home
   npm run build:fleet
   ```
This completes the integration loop in under 2 minutes with zero friction.
