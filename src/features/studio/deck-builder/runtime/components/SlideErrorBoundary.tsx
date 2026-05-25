import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  slideLabel?: string;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Per-slide error boundary. The Stage renders ALL outline slides
 * eagerly in the hidden print branch so a print-to-PDF captures
 * every page; if any slide throws (e.g. the LLM returned null fields
 * the slide didn't null-check), it would otherwise crash the whole
 * Stage and the viewer sees pure black.
 *
 * Wrapping each slide ensures one bad slide is replaced with a
 * tiny placeholder while the rest of the deck still renders.
 *
 * The boundary's visual is intentionally minimal — it's a fallback
 * for an internal bug, not a normal state.
 */
export class SlideErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, errorMessage: err?.message ?? 'Unknown error' };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    // Surface the error in console so DevTools shows it during dev
    // and prod debugging. Don't try to ship to an error-tracking
    // service from here — that's a separate concern.
    console.error('[SlideErrorBoundary] slide render failed', err, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <section className="slide-print absolute inset-0 flex flex-col items-center justify-center bg-ink-900 px-12 text-center text-bone/55">
        <AlertTriangle className="mb-3 h-8 w-8 text-amber-300" />
        <div className="text-xs uppercase tracking-[0.28em] text-amber-300/85">
          Slide rendering error
        </div>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-bone/75">
          {this.props.slideLabel ? `The "${this.props.slideLabel}" slide could not render.` : 'This slide could not render.'}
          {' '}The rest of your deck is intact — you can re-generate or edit
          this slide in the composer.
        </p>
        {this.state.errorMessage ? (
          <p className="mt-3 font-mono text-[10px] text-bone/35">
            {this.state.errorMessage}
          </p>
        ) : null}
      </section>
    );
  }
}
