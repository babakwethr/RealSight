import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Identifier so React resets the boundary when the user switches steps. */
  resetKey?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Wizard-level error boundary. The Deck Builder lives across 5 steps;
 * if a single step's render throws (a bad prop, a stale draft shape, a
 * malformed slide HTML the LLM produced), without this the renderer
 * either crashes (the Edge "this page has a problem" screen Babak kept
 * seeing) or React unmounts the whole tree, losing the wizard chrome.
 *
 * This boundary swallows the error, surfaces a friendly retry card,
 * and resets the moment the user navigates to a different step (the
 * resetKey changes).
 */
export class WizardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, errorMessage: err?.message ?? 'Unknown error' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error('[WizardErrorBoundary] step render failed', err, info);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset whenever the parent passes a new resetKey (step change).
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, errorMessage: undefined });
    }
  }

  private retry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-7 text-center backdrop-blur-md">
        <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-amber-300" />
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
          Something hiccuped
        </div>
        <h2 className="mt-2 text-xl font-bold text-white">
          This step didn't load cleanly.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/65">
          The rest of your deck is safe — it's saved in the database. Try
          re-loading the step, or use Back to go to the previous step and
          come forward again.
        </p>
        {this.state.errorMessage ? (
          <p className="mt-3 font-mono text-[10px] text-white/40">
            {this.state.errorMessage.slice(0, 200)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={this.retry}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-300/25"
        >
          <RotateCw className="h-3 w-3" />
          Try again
        </button>
      </div>
    );
  }
}
