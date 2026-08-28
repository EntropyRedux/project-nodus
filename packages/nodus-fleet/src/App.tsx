import React from 'react';
import { FleetProvider } from './context/FleetContext';
import { FleetDashboard } from './components/FleetDashboard';

export default function App() {
  return (
    <FleetProvider>
      <FleetDashboard />
    </FleetProvider>
  );
}
