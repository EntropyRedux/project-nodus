# 📐 Project Nodus — Technical Refactoring & Architecture Strategy

> **Target Audience**: AI Agents & Core Engineers  
> **Status**: Approved & Executable Blueprint  
> **Objective**: Modernize Project Nodus for maximum performance, zero-trust LAN security, modular maintainability, hardware neutrality, and seamless parallel UI iteration with Google AI Studio.

---

## 1. Architectural Principles & AI Studio Parallel Workflow

### 1.1 The AI Studio Parallel Ingestion Problem
Project Nodus UI layouts, widgets, and themes are actively iterated using **Google AI Studio** (e.g. React/Tailwind prototypes in `remix-nodus-home-1_1-replica`). Previously, importing new AI Studio component revisions into `packages/nodus-home` risked breaking complex state machines, native Android bridges, and Win32 RPC logic because UI and business logic were tightly coupled in `LauncherContext.tsx` (2,217 lines).

### 1.2 The Decoupled Architecture Pattern (Container / Presenter)
To allow zero-friction synchronization between AI Studio UI updates and backend capabilities:
1. **Presentational (Pure UI) Layer**: AI Studio outputs pure aesthetic components that receive strictly typed props and callbacks (e.g., `<AppIconView>`, `<DockView>`, `<DeviceCardView>`, `<WidgetRowView>`).
2. **Custom Hook / Controller Layer**: Encapsulates all bridge calls, Tauri IPC, WebSocket RPC, and local storage (e.g., `useFleetManager()`, `useAppLauncher()`, `useClipboardSync()`).
3. **Domain Core (`@nodus/common`)**: Single source of truth for types, wire protocols, and icon classifiers shared across Windows Tauri, Android WebView, and AI Studio sandboxes.

```mermaid
graph TD
    subgraph Shared Monorepo Package
        NC["packages/nodus-common (@nodus/common)"]
        NC --> Types[Types & Schemas]
        NC --> Proto[Bridge Protocol v2 & Pairing Handshake]
        NC --> Icons[Shared Lucide Icon Registry]
    end

    subgraph Nodus Desktop Tauri (Port 9120)
        ND[packages/nodus-desktop]
        RustServer[server/mod.rs Auth + Zero-Trust Pairing]
        WinCommands[Win32 Exec / GDI / Power-Save Hotcorners]
    end

    subgraph Nodus Home Android Tablet (POCO Pad / Galaxy / Pixel)
        NH[packages/nodus-home]
        subgraph Modular Providers
            FC[FleetContext]
            AC[AppGridContext]
            SC[SystemSettingsContext]
            CC[ClipboardContext]
        end
        subgraph Presentational UI Layer (AI Studio Drop Zone)
            Views[Pure Views: Dock, Widgets, Taskbar, DeviceDrawer]
        end
    end

    NC -->|workspace:*| ND
    NC -->|workspace:*| NH
    FC --> Views
    AC --> Views
    SC --> Views
    CC --> Views
    RustServer <== HMAC-SHA256 / Bearer Token ==> FC
```

---

## 2. Phase 1: Shared Core Domain Package (`packages/nodus-common`)

### 2.1 Workspace Linking Configuration
Configure npm/pnpm/bun workspaces so that both `nodus-home` and `nodus-desktop` consume `@nodus/common` directly with zero build latency:

In `packages/nodus-common/package.json`:
```json
{
  "name": "@nodus/common",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

In `packages/nodus-home/package.json` & `packages/nodus-desktop/package.json`:
```json
"dependencies": {
  "@nodus/common": "workspace:*"
}
```

### 2.2 Directory Structure
```
packages/nodus-common/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types/
    │   ├── device.ts
    │   ├── shortcut.ts
    │   ├── clipboard.ts
    │   └── settings.ts
    ├── protocol/
    │   ├── constants.ts
    │   ├── security.ts
    │   └── wire.ts
    └── utils/
        ├── iconRegistry.ts
        └── iconClassifier.ts
```

### 2.3 Shared Types Definition (`packages/nodus-common/src/types/device.ts`)
```typescript
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'tablet' | 'mobile' | 'laptop' | 'server';
  os: string;
  status: 'connected' | 'idle' | 'offline';
  ipAddress: string;
  port?: number;
  battery?: number;
  cpuLoad?: number;
  ramUsage?: string;
  storage?: string;
  resolution?: string;
  customColor?: string;
  lastSeen?: number;
  isPaired?: boolean;
}

export interface DiscoveredShortcut {
  id: string;
  name: string;
  pathOrAppId: string;
  isUwp: boolean;
  iconBase64?: string;
  iconName?: string;
  iconColor?: string;
  category: 'tools' | 'productivity' | 'media' | 'games' | 'system';
  enabled: boolean;
}
```

---

## 3. Phase 2: Zero-Trust Security, LAN Pairing Handshake & Port Harmonization

### 3.1 The Peer-to-Peer Pairing Handshake Model (KDE Connect / LocalSend Style)
To avoid broadcasting sensitive auth tokens in plaintext UDP beacons or locking out the tablet on reboot:

1. **Discovery**: Desktop broadcasts UDP beacon with its hostname, IP, port (`9120`), and `paired: false`.
2. **First-Time Pairing**:
   - Tablet sends `POST /api/fleet/pair-request` with `{ "deviceId": "tablet-xxx", "name": "POCO Pad", "publicKey": "..." }`.
   - Nodus Desktop triggers a native HUD notification or 4-digit PIN dialog:  
     *"Allow POCO Pad (192.168.1.55) to control this workstation? [Approve / Reject]"*.
   - Once approved on PC, Desktop issues a persistent session token and saves the tablet into `trusted_devices.json`.
3. **Subsequent Reconnects**:
   - Tablet sends `X-Nodus-Auth-Token` on every request. Re-connections are **instant and silent** across PC reboots.

### 3.2 Secure Desktop Server Implementation (`packages/nodus-desktop/src-tauri/src/server/mod.rs`)
```rust
use std::collections::HashSet;
use std::sync::Mutex;
use uuid::Uuid;

static TRUSTED_TOKENS: Mutex<Option<HashSet<String>>> = Mutex::new(None);

fn is_authorized(request: &tiny_http::Request) -> bool {
    let lock = TRUSTED_TOKENS.lock().unwrap();
    let tokens = match *lock {
        Some(ref set) => set,
        None => return true, // Dev mode bypass if no tokens configured
    };
    
    request.headers().iter().any(|h| {
        let field = h.field.as_str().to_ascii_lowercase();
        if field == "authorization" {
            let val = h.value.as_str();
            tokens.contains(val.strip_prefix("Bearer ").unwrap_or(val))
        } else if field == "x-nodus-auth-token" {
            tokens.contains(h.value.as_str())
        } else {
            false
        }
    })
}

fn cors_headers_for(origin: Option<&str>) -> Vec<Header> {
    let allowed_origin = match origin {
        Some(o) if o.starts_with("tauri://") 
                || o.starts_with("http://localhost") 
                || o.starts_with("http://127.0.0.1") 
                || o == "https://appassets.androidplatform.net" => o,
        _ => "https://appassets.androidplatform.net",
    };

    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], allowed_origin.as_bytes()).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization, X-Nodus-Auth-Token"[..]).unwrap(),
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap(),
    ]
}
```

### 3.3 Complete Port 8890 Deprecation Sweep
Standardize all active network traffic to port `9120` (HTTP) and port `8765` (UDP Discovery):

| File | Old Legacy Value | New Standardized Value |
| :--- | :--- | :--- |
| `packages/nodus-home/src/utils/constants.ts` | `serverPort: 8890` | `serverPort: 9120` |
| `packages/nodus-home/src/utils/bridgeProtocol.ts` | `http://${host}:8890/api/rpc` | `http://${host}:9120/api/exec` |
| `packages/nodus-home/src/utils/platformSnippets.ts` | `port 8890` references | `port 9120` |
| `packages/nodus-home/src/components/layout/AddDeviceModal.tsx` | Default input `8890` | Default input `9120` |
| `packages/nodus-home/src/components/apps/SettingsApp.tsx` | Port `8890` badge | Port `9120` badge |

### 3.4 Zero-CPU Hotcorners Optimization (`hotcorners/mod.rs`)
```rust
// Replace 16ms busy-loop when hotcorners are disabled with 500ms power-save sleep
loop {
    if !HOTCORNERS_ENABLED.load(Ordering::Relaxed) {
        std::thread::sleep(Duration::from_millis(500));
        continue;
    }
    std::thread::sleep(POLL_INTERVAL); // 16ms only when actively armed
    // ...
}
```

---

## 4. Phase 4: Nodus Home Context Decomposition

Partition the 2,217-line monolithic `LauncherContext.tsx` into 4 decoupled domain providers:

### 4.1 Domain Breakdown
```
packages/nodus-home/src/context/
├── FleetContext.tsx          <-- Devices, Discovery, Process Lists, Remote Stats
├── AppGridContext.tsx        <-- Apps, Folders, Pagination, Dock, Search
├── SystemSettingsContext.tsx <-- Themes, Wallpapers, Audio, Quick Settings
├── ClipboardContext.tsx      <-- Local & Cross-Device Sync Clipboard History
└── LauncherContext.tsx       <-- Backward-Compatibility Composite Facade
```

### 4.2 Step 1: `FleetContext.tsx`
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceInfo, DeviceProcess } from '@nodus/common';
import { universalNetworkFetch } from '../services/FleetDirectClient';

interface FleetContextType {
  devices: DeviceInfo[];
  activeDeviceId: string;
  activeDevice: DeviceInfo;
  selectDevice: (id: string) => void;
  updateDevice: (id: string, partial: Partial<DeviceInfo>) => void;
  fetchDeviceProcesses: (deviceId: string) => Promise<DeviceProcess[]>;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const FleetContext = createContext<FleetContextType | null>(null);
export const useFleet = () => {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error('useFleet must be used within FleetProvider');
  return ctx;
};
```

### 4.3 Step 2: `AppGridContext.tsx`
```typescript
import React, { createContext, useContext, useState } from 'react';
import { AppItem, FolderItem } from '../types/launcher';

interface AppGridContextType {
  apps: AppItem[];
  folders: FolderItem[];
  dockAppIds: string[];
  currentPageIndex: number;
  totalPages: number;
  setCurrentPageIndex: (page: number) => void;
  launchApp: (appId: string, forceMode?: 'fullscreen' | 'floating') => void;
  createFolder: (name: string, appIds: string[], pageIndex: number) => void;
  uninstallApp: (appId: string) => void;
}

export const AppGridContext = createContext<AppGridContextType | null>(null);
export const useAppGrid = () => {
  const ctx = useContext(AppGridContext);
  if (!ctx) throw new Error('useAppGrid must be used within AppGridProvider');
  return ctx;
};
```

### 4.4 Step 3: Composite Facade (`LauncherContext.tsx`)
```typescript
import React from 'react';
import { FleetProvider, useFleet } from './FleetContext';
import { AppGridProvider, useAppGrid } from './AppGridContext';
import { SystemSettingsProvider, useSystemSettings } from './SystemSettingsContext';
import { ClipboardProvider, useClipboard } from './ClipboardContext';

export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SystemSettingsProvider>
    <FleetProvider>
      <AppGridProvider>
        <ClipboardProvider>
          {children}
        </ClipboardProvider>
      </AppGridProvider>
    </FleetProvider>
  </SystemSettingsProvider>
);

export const useLauncher = () => ({
  ...useFleet(),
  ...useAppGrid(),
  ...useSystemSettings(),
  ...useClipboard(),
});
```

---

## 5. Phase 5: Hardware Neutrality & Dynamic Device Identity

### 5.1 Dynamic Tablet Self-Identity (`HomeActivity.kt`)
Pass the tablet's real hardware model (`Build.MODEL`, `Build.MANUFACTURER`) across the JavaScript bridge on boot:
```kotlin
// In HomeActivity.kt setupNativeBridge:
val deviceInfoJson = JSONObject().apply {
    put("model", Build.MODEL)
    put("manufacturer", Build.MANUFACTURER)
    put("osVersion", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
    put("deviceType", "tablet")
}
webView.evaluateJavascript("window.__NODUS_DEVICE_INFO__ = $deviceInfoJson;", null)
```

### 5.2 Generic Android Intent App Launching
Replace Xiaomi/MIUI-specific package names with standard Android intent categories:
```typescript
// Instead of hardcoding 'com.miui.calculator':
export const GENERIC_INTENTS = {
  calculator: 'android.intent.category.APP_CALCULATOR',
  browser: 'android.intent.category.APP_BROWSER',
  email: 'android.intent.category.APP_EMAIL',
  music: 'android.intent.category.APP_MUSIC',
  gallery: 'android.intent.category.APP_GALLERY',
};
```

---

## 6. Phase 6: Tree-Shakeable Lucide Icon Registry

Replace wildcard `import * as Icons` (which inflates the bundle by ~800 KB) with a curated registry:

In `packages/nodus-common/src/utils/iconRegistry.ts`:
```typescript
import {
  Settings,
  Calculator,
  PenTool,
  Terminal,
  MessageSquare,
  Globe,
  Code,
  Sparkles,
  Gamepad2,
  Tv,
  Folder,
  Layers,
  Search,
  Check,
  X,
  RefreshCw,
  AppWindow,
  Cpu,
  Database,
  Music,
  Camera,
  Shield,
  Zap,
  Sliders,
  Laptop
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, React.ComponentType<any>> = {
  Settings, Calculator, PenTool, Terminal, MessageSquare, Globe, Code,
  Sparkles, Gamepad2, Tv, Folder, Layers, Search, Check, X, RefreshCw,
  AppWindow, Cpu, Database, Music, Camera, Shield, Zap, Sliders, Laptop
};

export function getRegisteredIcon(name?: string): React.ComponentType<any> {
  if (!name) return AppWindow;
  return ICON_REGISTRY[name] || AppWindow;
}
```

---

## 7. Step-by-Step Agent Execution Plan

```markdown
- [ ] **Step 1: Monorepo Linking & Port Sweep**
  - Configure `workspace:*` dependencies for `@nodus/common`.
  - Replace all remaining references to port `8890` with port `9120` across `nodus-home` and `nodus-desktop`.

- [ ] **Step 2: Desktop Security & Power Optimization**
  - Implement pairing token validation and CORS lockdown in `server/mod.rs`.
  - Update `hotcorners/mod.rs` to sleep for 500ms when disabled.

- [ ] **Step 3: Context Partitioning**
  - Create `FleetContext.tsx`, `AppGridContext.tsx`, `SystemSettingsContext.tsx`, and `ClipboardContext.tsx`.
  - Re-export unified facade in `LauncherContext.tsx`.

- [ ] **Step 4: Tree-Shaking & Bundle Optimization**
  - Create `iconRegistry.ts` in `@nodus/common` and replace `* as Icons` in `AppIcon.tsx`.
  - Verify bundle reduction with `npm run build`.

- [ ] **Step 5: Hardware Identity Integration**
  - Inject `Build.MODEL` in `HomeActivity.kt` and consume it in `LauncherContext.tsx` on tablet startup.
```
