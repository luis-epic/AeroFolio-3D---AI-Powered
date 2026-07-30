import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Rendered instead of `children` when a render error is caught. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors in the subtree.
 *
 * Wrapped around the WebGL layer so a driver failure, an unsupported GPU, or a
 * bad shader degrades to a quiet background instead of an unrecoverable black
 * screen. The DOM overlay renders independently and stays fully usable.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaced for diagnostics; the UI degrades silently for the visitor.
    console.error('[ErrorBoundary] render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
