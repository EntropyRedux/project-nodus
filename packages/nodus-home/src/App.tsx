import React from 'react';
import { LauncherProvider } from './context/LauncherContext';
import { DesktopLauncherShell } from './components/layout/DesktopLauncherShell';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[Nodus Home Crash]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans select-none">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-bold border border-red-500/30">
            !
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Nodus Home Launcher Recovered</h2>
            <p className="text-xs text-[#94A3B8] max-w-sm font-mono">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
          >
            Reset State & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LauncherProvider>
        <DesktopLauncherShell />
      </LauncherProvider>
    </ErrorBoundary>
  );
}
