import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * App-wide error boundary.
 *
 * Without this, any uncaught render error unmounts the whole React tree
 * and the user is left staring at a blank white screen — a guaranteed
 * App Store rejection (Guideline 2.1, "app exhibits bugs"). This catches
 * those crashes and shows a calm, branded recovery screen with a reload
 * button instead.
 *
 * Intentionally self-contained: the fallback uses inline styles and no
 * app context (router, query client, toaster), because the thing that
 * crashed might be one of those providers.
 */
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in console / crash logs; never throws further.
    console.error('[RealSight] Uncaught render error:', error, info?.componentStack);
  }

  private reload = () => {
    try {
      window.location.reload();
    } catch {
      /* no-op */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '32px 24px',
          textAlign: 'center',
          background:
            'radial-gradient(120% 100% at 50% 0%, #0e1430 0%, #07040F 60%)',
          color: '#fff',
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 18,
            background:
              'linear-gradient(135deg, rgba(46,255,192,0.22), rgba(106,92,255,0.20))',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2effc0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.65)',
            maxWidth: 360,
            margin: 0,
          }}
        >
          The app hit an unexpected error. This is sometimes a dropped
          internet connection — check that you&apos;re online and try again.
        </p>
        <button
          type="button"
          onClick={this.reload}
          style={{
            marginTop: 6,
            padding: '12px 22px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.02em',
            color: '#0a0814',
            background: 'linear-gradient(90deg, #2effc0, #18d6a4 55%, #059669)',
          }}
        >
          Reload RealSight
        </button>
      </div>
    );
  }
}
