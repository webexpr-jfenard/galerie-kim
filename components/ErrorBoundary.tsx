import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    if (window.appRouter) {
      window.appRouter.navigateTo('/');
    } else {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-card border border-destructive/20 rounded-lg p-6 shadow-lg">
              {/* Error Icon */}
              <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>

              {/* Error Title */}
              <h1 className="text-xl font-semibold text-center mb-2 text-destructive">
                Something went wrong
              </h1>

              {/* Error Description */}
              <p className="text-muted-foreground text-center mb-6">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>

              {/* Error Details */}
              {this.state.error && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-sm mb-2">Error Details:</h3>
                  <div className="text-xs font-mono text-destructive bg-background rounded p-2 overflow-auto max-h-32">
                    {this.state.error.message}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </div>

              {/* Additional Debug Info (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-6">
                  <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    Show Technical Details
                  </summary>
                  <div className="mt-2 text-xs font-mono bg-muted/50 rounded p-2 overflow-auto max-h-40">
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                </details>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center mt-6 text-sm text-muted-foreground">
              <p>
                If this error persists, try:
              </p>
              <ul className="mt-2 space-y-1">
                <li>• Refreshing the page</li>
                <li>• Clearing your browser cache</li>
                <li>• Checking your internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}