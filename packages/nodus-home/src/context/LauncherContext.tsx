// ─── LauncherContext (Unified Composite Facade) ───────────────
// Partitions state into FleetContext, AppGridContext, SystemSettingsContext,
// and ClipboardContext while providing 100% backward compatibility for useLauncher().

import React, { useMemo } from 'react';
import {
  SystemSettingsProvider,
  useSystemSettings,
  SystemSettingsContextType,
} from './SystemSettingsContext';
import {
  FleetProvider,
  useFleet,
  FleetContextType,
} from './FleetContext';
import {
  AppGridProvider,
  useAppGrid,
  AppGridContextType,
} from './AppGridContext';
import {
  ClipboardProvider,
  useClipboard,
  ClipboardContextType,
} from './ClipboardContext';

// Export domain sub-providers and sub-hooks
export { SystemSettingsProvider, useSystemSettings } from './SystemSettingsContext';
export { FleetProvider, useFleet } from './FleetContext';
export { AppGridProvider, useAppGrid } from './AppGridContext';
export { ClipboardProvider, useClipboard } from './ClipboardContext';

export type LauncherContextType = SystemSettingsContextType &
  FleetContextType &
  AppGridContextType &
  ClipboardContextType;

/**
 * Composite Provider nesting domain contexts in order of dependency.
 */
export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
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
};

/**
 * Unified composite hook providing complete backward compatibility
 * for all components expecting useLauncher().
 */
export const useLauncher = (): LauncherContextType => {
  const sys = useSystemSettings();
  const fleet = useFleet();
  const appGrid = useAppGrid();
  const clip = useClipboard();

  return useMemo(() => ({
    ...sys,
    ...fleet,
    ...appGrid,
    ...clip,
  }), [sys, fleet, appGrid, clip]);
};
