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
import {
  NotesProvider,
  useNotes,
  NotesContextType,
} from './NotesContext';

// Export domain sub-providers and sub-hooks
export { SystemSettingsProvider, useSystemSettings } from './SystemSettingsContext';
export { FleetProvider, useFleet } from './FleetContext';
export { AppGridProvider, useAppGrid } from './AppGridContext';
export { ClipboardProvider, useClipboard } from './ClipboardContext';
export { NotesProvider, useNotes } from './NotesContext';

export type LauncherContextType = SystemSettingsContextType &
  FleetContextType &
  AppGridContextType &
  ClipboardContextType &
  NotesContextType;

/**
 * Composite Provider nesting domain contexts in order of dependency.
 */
export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SystemSettingsProvider>
      <FleetProvider>
        <AppGridProvider>
          <ClipboardProvider>
            <NotesProvider>
              {children}
            </NotesProvider>
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
  const notes = useNotes();

  return useMemo(() => ({
    ...sys,
    ...fleet,
    ...appGrid,
    ...clip,
    ...notes,
  }), [sys, fleet, appGrid, clip, notes]);
};

