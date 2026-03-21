import { Component, ReactNode } from "react";
import { Wine, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  overlay?: boolean;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS") ||
    (msg.includes("Load failed") && msg.includes("import"))
  );
}

export default class LabsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[LABS] Rendering error:", error.message, info.componentStack);

    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: info.componentStack?.slice(0, 1000),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});

    if (isChunkLoadError(error)) {
      const reloadKey = "cs_chunk_reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null, isChunkError: false });
    }
  };

  render() {
    if (this.state.hasError) {
      const content = (
        <div
          className="labs-fade-in"
          style={{
            minHeight: this.props.overlay ? undefined : "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: this.props.overlay ? "32px 24px" : "48px 24px",
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
            {this.state.isChunkError
              ? "A new version is available. The page will reload automatically."
              : "An unexpected error occurred while loading this page. Try refreshing, or head back to the home screen."}
          </p>

          <div className="flex items-center gap-3">
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={this.handleRetry}
              data-testid="labs-error-boundary-retry"
            >
              <RefreshCw className="w-4 h-4" />
              {this.state.isChunkError ? "Reload Page" : "Try Again"}
            </button>
            {this.props.overlay && this.props.onClose ? (
              <button
                className="labs-btn-ghost"
                onClick={this.props.onClose}
                data-testid="labs-error-boundary-close"
              >
                Close
              </button>
            ) : (
              <a
                href="/labs"
                className="labs-btn-ghost"
                data-testid="labs-error-boundary-home"
              >
                Back to Labs
              </a>
            )}
          </div>
        </div>
      );

      if (this.props.overlay) {
        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && this.props.onClose) {
                this.props.onClose();
              }
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "var(--labs-surface, #1a1a2e)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {content}
            </div>
          </div>
        );
      }

      return content;
    }

    return this.props.children;
  }
}
