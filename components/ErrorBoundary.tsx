import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo, error });
    // Log the error to console for debugging
    console.error("Uncaught error in component:", error, errorInfo);
  }

  private getErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.toString();
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg text-dark-text p-4">
          <div className="text-center bg-dark-card p-8 rounded-lg border border-dark-border max-w-2xl w-full shadow-2xl">
            <div className="mb-4 flex justify-center">
              <svg className="w-16 h-16 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="mb-6 text-dark-text-secondary">
              We encountered an unexpected error. Please try reloading the application.
            </p>
            
            <details className="text-left bg-black/30 p-4 rounded-md mb-6 text-sm overflow-auto max-h-60 border border-dark-border/50">
              <summary className="cursor-pointer text-accent-blue font-medium hover:text-accent-blue/80 transition-colors">View Error Details</summary>
              <pre className="mt-2 text-xs text-accent-red whitespace-pre-wrap font-mono">
                {this.getErrorMessage(this.state.error)}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-accent-blue text-white font-medium rounded-md hover:bg-accent-blue/80 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-dark-bg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;