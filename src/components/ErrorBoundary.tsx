import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-lg space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Workstation Error Detected</h2>
              <p className="text-xs text-zinc-500">
                A runtime exception occurred in the component hierarchy.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-zinc-100 dark:bg-zinc-950 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-red-500">
                {this.state.error.message}
              </div>
            )}
            <Button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2 font-semibold text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Workstation</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
