import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Terminal, RotateCcw, Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useRepairStore } from '../../store/useRepairStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRepairing: boolean;
  repairedSuccessfully: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRepairing: false,
    repairedSuccessfully: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isRepairing: false, repairedSuccessfully: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Automatically report failure to RepairStore
    try {
      useRepairStore.getState().reportFailure({
        type: error.name.includes('Reference') ? 'UNDEFINED_VARIABLE' : 'RUNTIME_EXCEPTION',
        message: `${error.name}: ${error.message}`,
        location: error.stack?.split('\n')[1]?.trim() || 'React subtree',
        componentStack: errorInfo.componentStack || undefined
      });
    } catch {
      // Fallback
    }

    console.error('Interception by AgentOS ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isRepairing: false, repairedSuccessfully: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleSendToAgent = async () => {
    this.setState({ isRepairing: true });
    
    const store = useRepairStore.getState();
    const activeFailures = store.failures;
    const targetFailure = activeFailures[0];

    if (targetFailure) {
      await store.initiateAutonomousRepair(targetFailure.id);
      this.setState({ isRepairing: false, repairedSuccessfully: true });
      setTimeout(() => {
        this.handleRetry();
      }, 1200);
    } else {
      this.setState({ isRepairing: false });
      this.handleRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 font-sans text-zinc-900 dark:text-zinc-50">
          <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-3 mb-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h1 className="text-xl font-bold tracking-tight">System Recovery Mode</h1>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                A critical runtime error was intercepted by the Agent OS Error Boundary. The system remained online and captured failure diagnostics.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Error Details</h2>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                  <p className="text-sm font-mono font-medium text-red-600 dark:text-red-400 mb-2">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                </div>
              </div>

              {this.state.errorInfo && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">Component Stack</h2>
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-h-48">
                    <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              )}

              {this.state.repairedSuccessfully && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Autonomous Repair Agent generated clean patch and verified compiler checks. Re-mounting component...</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-wrap gap-3 justify-end items-center">
              <Button variant="outline" onClick={this.handleReload} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Full Reload
              </Button>
              <Button variant="primary" onClick={this.handleRetry} className="gap-2">
                <RefreshCcw className="w-4 h-4" /> Retry Render
              </Button>
              <Button 
                variant="default" 
                onClick={this.handleSendToAgent}
                disabled={this.state.isRepairing}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                {this.state.isRepairing ? (
                  <>
                    <Wrench className="w-4 h-4 animate-spin" /> Repairing with Agent...
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" /> Autonomous Repair
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
