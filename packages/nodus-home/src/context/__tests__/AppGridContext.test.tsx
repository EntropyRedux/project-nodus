import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { SystemSettingsProvider } from '../SystemSettingsContext';
import { FleetProvider } from '../FleetContext';
import { AppGridProvider, useAppGrid } from '../AppGridContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SystemSettingsProvider>
    <FleetProvider>
      <AppGridProvider>{children}</AppGridProvider>
    </FleetProvider>
  </SystemSettingsProvider>
);

describe('AppGridContext', () => {
  it('should initialize with default apps and dock items', () => {
    const { result } = renderHook(() => useAppGrid(), { wrapper });
    expect(result.current.apps.length).toBeGreaterThan(0);
    expect(result.current.dockAppIds.length).toBeGreaterThan(0);
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('should create and delete a folder correctly', () => {
    const { result } = renderHook(() => useAppGrid(), { wrapper });

    act(() => {
      result.current.createFolder('Productivity Tools', ['settings'], 0);
    });

    const created = result.current.folders.find((f) => f.name === 'Productivity Tools');
    expect(created).toBeDefined();
    expect(created?.appIds).toContain('settings');

    act(() => {
      if (created) {
        result.current.deleteFolder(created.id);
      }
    });

    const deleted = result.current.folders.find((f) => f.name === 'Productivity Tools');
    expect(deleted).toBeUndefined();
  });

  it('should manage drawer categorization tabs', () => {
    const { result } = renderHook(() => useAppGrid(), { wrapper });

    act(() => {
      result.current.addDrawerTab('finance');
    });
    expect(result.current.drawerTabs).toContain('finance');

    act(() => {
      result.current.renameDrawerTab('finance', 'fintech');
    });
    expect(result.current.drawerTabs).toContain('fintech');
    expect(result.current.drawerTabs).not.toContain('finance');

    act(() => {
      result.current.removeDrawerTab('fintech');
    });
    expect(result.current.drawerTabs).not.toContain('fintech');
  });

  it('should toggle floating mode armed state', () => {
    const { result } = renderHook(() => useAppGrid(), { wrapper });

    const initial = result.current.isFloatingModeArmed;
    act(() => {
      result.current.toggleFloatingMode();
    });
    expect(result.current.isFloatingModeArmed).toBe(!initial);
  });
});
