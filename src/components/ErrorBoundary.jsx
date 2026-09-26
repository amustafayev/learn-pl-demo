import { Component } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Alert } from "../design-system.jsx";

// Keeps a render crash inside the subtree it wraps — one broken component
// (or the third-party H5P player) shows this notice instead of blanking the
// whole app. When `resetKey` changes (a new route, edited component data),
// it tries rendering its children again.
export class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.className}>
        <Alert tone="warning" icon={IconAlertTriangle} title={this.props.title || "This part couldn't be displayed"}
          actionLabel="Try again" onAction={() => this.setState({ error: null })}>
          {this.state.error.message}
        </Alert>
      </div>
    );
  }
}
