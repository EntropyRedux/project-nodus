import React from 'react';
import { TopWidgetRow } from './TopWidgetRow';
import { useLauncher } from '../../context/LauncherContext';

export const WidgetArea: React.FC = () => {
  const { settings } = useLauncher();
  const hasWidgets =
    settings.enableClockWidget !== false ||
    settings.enableDeviceNameWidget !== false ||
    settings.enableBatteryWidget !== false ||
    settings.enableNotesWidget !== false;

  if (!hasWidgets) return null;

  return (
    <div className="w-full px-4 pt-1 select-none max-w-5xl mx-auto">
      <TopWidgetRow />
    </div>
  );
};

