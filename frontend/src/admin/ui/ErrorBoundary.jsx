// ErrorBoundary — catches render/runtime crashes in a screen so ONE broken screen
// shows a recoverable fallback (with the error) instead of white-screening the
// whole admin. React error boundaries must be class components.
import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it in the console for debugging; the UI shows a friendly fallback.
    console.error("Admin screen crashed:", error, info);
  }

  // Reset when the parent swaps screens (keyed by resetKey) so navigating away
  // from a broken screen clears the error.
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">This screen hit a snag</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong loading this page. Try again, or switch to another tab
            and back.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 break-words rounded-lg bg-background/60 px-3 py-2 text-left font-mono text-xs text-muted-foreground">
              {String(this.state.error.message)}
            </p>
          )}
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-accent-foreground"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
