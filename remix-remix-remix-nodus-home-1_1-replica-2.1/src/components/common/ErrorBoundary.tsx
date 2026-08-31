import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in Nodus Workstation:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#090B10] text-[#F1F5F9] flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-[#0E121A] border border-[#F43F5E]/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 flex items-center justify-center text-[#F43F5E]">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#F1F5F9] font-mono">Workstation Diagnostic Mode</h1>
                <p className="text-xs text-[#94A3B8]">Recovering interface state...</p>
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-xs font-mono text-[#F43F5E] overflow-x-auto max-h-32">
              {this.state.error?.message || 'Interface rendering error encountered'}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-mono font-medium text-[#F1F5F9] transition cursor-pointer"
              >
                Reload
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#090B10] text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-[#38BDF8]/20 transition cursor-pointer"
              >
                <RefreshCw size={13} /> Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
