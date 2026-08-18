/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LauncherProvider } from './context/LauncherContext';
import { DesktopLauncherShell } from './components/layout/DesktopLauncherShell';

export default function App() {
  return (
    <LauncherProvider>
      <DesktopLauncherShell />
    </LauncherProvider>
  );
}
