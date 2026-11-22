"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-surface rounded-2xl border border-border shadow-sm space-y-4 my-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center text-xl font-bold">
            !
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-foreground">
              Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this section. Your
              data is safe.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="p-3 bg-surface-raised rounded-lg text-xs font-mono text-muted-foreground max-w-md overflow-x-auto border border-border">
              {this.state.error.message}
            </div>
          )}
          <div className="flex gap-3">
            <Button size="sm" variant="outline" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
