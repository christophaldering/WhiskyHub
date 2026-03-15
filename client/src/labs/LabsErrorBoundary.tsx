import { Component, ReactNode } from "react";
import { Wine, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class LabsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[LABS] Rendering error:", error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="labs-fade-in"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
            style={{ background: "var(--labs-danger-muted)" }}
          >
            <Wine className="w-7 h-7" style={{ color: "var(--labs-danger)" }} />
          </div>

          <h2
            className="labs-h2 mb-2"
            style={{ color: "var(--labs-text)" }}
            data-testid="labs-error-boundary-title"
          >
            Something went wrong
          </h2>
          <p
            className="text-sm mb-6 max-w-sm"
            style={{ color: "var(--labs-text-muted)" }}
          >
            An unexpected error occurred while loading this page. Try refreshing, or head back to the home screen.
          </p>

          <div className="flex items-center gap-3">
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={this.handleRetry}
              data-testid="labs-error-boundary-retry"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/labs"
              className="labs-btn-ghost"
              data-testid="labs-error-boundary-home"
            >
              Back to Labs
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
