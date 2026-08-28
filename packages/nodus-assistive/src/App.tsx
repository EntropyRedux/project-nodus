import React from 'react';
import { AssistiveProvider } from './context/AssistiveContext';
import { TaskbarOverlayStandalone } from './components/overlay/TaskbarOverlayStandalone';

export default function App() {
  return (
    <AssistiveProvider>
      <TaskbarOverlayStandalone />
    </AssistiveProvider>
  );
}
