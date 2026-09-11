# Nodus Ecosystem — Engineering & Architectural Governance

## 1. Architecture is the Source of Truth
1. The existing modular codebase architecture across the 3 core packages (`nodus-desktop`, `nodus-fleet`, `nodus-home`) is the **dominant source of truth**.
2. Any incoming code from external prototypes must be decomposed to fit this architecture. Never mirror the monolithic structure of incoming files.
3. **Module Boundaries**:
   - Each package and module owns exactly one domain concern.
   - Cross-device communication must go strictly through defined network/IPC contracts.

## 2. Core Architectural Mandate: Container-Presenter Pattern
1. **Presenter (`*View.tsx` / `*Table.tsx` / `*Tab.tsx`)**:
   - 100% pure UI, stateless, driven strictly by typed props.
   - **ZERO NATIVE LOGIC**: Never invoke native IPC/Tauri bindings (`invoke()`, `fetch()`, WebSocket, or direct network calls) inside a presenter.
2. **Container (`*Container.tsx` / `DesktopAppShell.tsx` / `FleetDashboardContainer.tsx`)**:
   - Bridges headless Zustand stores and services to Presenter components.
3. **Headless Stores & Services (`src/stores/`, `src/services/`)**:
   - Manage background workers, IPC communication, and state updates outside of React lifecycle rendering.

## 3. God Object Rule — Zero Tolerance
1. If incoming or existing code contains a single object, context, or file handling multiple concerns (e.g. data fetching + UI state + background intervals + presentation), **it must be decomposed piece-by-piece**.
2. Files over 500 lines handling multiple domains must be split into dedicated presenters, stores, or service helpers.

## 4. Mock Quarantine & Data Integrity
1. **Zero Production Fallbacks**:
   - Never embed fallback mock arrays or synthetic metrics (e.g., `MOCK_PROCESSES`, `INITIAL_DEVICES`, `INITIAL_SHORTCUTS`, `DEFAULT_LOCAL_TABLET`) inside production components, stores, hooks, or services.
   - Never fabricate telemetry values using random number generators (e.g., `(1..6).random()`). If a sensor is unavailable, return `null` or `unmeasured`.
   - Production collections must initialize with clean empty arrays (`[]`) and populate strictly from verified runtime events.
2. **Quarantine Locations**:
   - Mock and fixture data belong strictly in:
     - `src/__fixtures__/` or `mocks/` (isolated fixture modules)
     - `*.test.*` or `*.spec.*` (test suites)

## 5. Native & Network Security Standards
1. **Authentication Gateway**:
   - All network endpoints (desktop `:9120` and Android `:9120`) must require a verified session token (`X-Nodus-Auth-Token` / `Bearer`).
   - Hardcoded bypass tokens (e.g., `NODUS-FLEET-SECURE`) are strictly forbidden.
   - Initial pairing requests must be approved out-of-band via explicit PIN or UI confirmation before active session tokens are issued.
2. **Loopback Protection**:
   - Loopback requests must not bypass authentication.
3. **Shell Execution Sanitization**:
   - Reject dangerous shell metacharacters (`&`, `|`, `;`, `` ` ``, `$`, `\n`, `\r`) in arguments. Prefer parameterized argument vectors over interpolated shell strings.
4. **Android Native Bridge Gating**:
   - All `@JavascriptInterface` methods exposed to WebViews must verify origin via `isOriginTrusted()` before executing native actions.

## 6. File Encoding & UTF-8 Integrity
1. All configuration files, Markdown documents (.md), rules, and source code files must be written and saved strictly in **UTF-8 without BOM**.
2. Enforce LF line endings via `.gitattributes`.
