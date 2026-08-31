import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { LauncherProvider, useLauncher } from '../LauncherContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LauncherProvider>{children}</LauncherProvider>
);

describe('LauncherContext Facade', () => {
  it('should export unified methods from all 4 domain providers', () => {
    const { result } = renderHook(() => useLauncher(), { wrapper });

    // From FleetContext
    expect(result.current.devices).toBeDefined();
    expect(typeof result.current.selectDevice).toBe('function');
    expect(typeof result.current.fetchDeviceProcesses).toBe('function');
    expect(typeof result.current.executeRemoteApp).toBe('function');

    // From AppGridContext
    expect(result.current.apps).toBeDefined();
    expect(typeof result.current.launchApp).toBe('function');
    expect(typeof result.current.createFolder).toBe('function');
    expect(typeof result.current.toggleFloatingMode).toBe('function');

    // From SystemSettingsContext
    expect(result.current.settings).toBeDefined();
    expect(typeof result.current.updateSettings).toBe('function');
    expect(typeof result.current.showToast).toBe('function');
    expect(typeof result.current.toggleQuickSettings).toBe('function');

    // From ClipboardContext
    expect(result.current.clipboardItems).toBeDefined();
    expect(typeof result.current.addClipboardItem).toBe('function');
    expect(typeof result.current.toggleClipboardPanel).toBe('function');
  });
});
