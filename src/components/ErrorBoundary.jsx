import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleHome = this.handleHome.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('Uncaught application error:', error);
      if (info?.componentStack) {
        console.error('Component stack:', info.componentStack);
      }
    }
  }

  handleReload() {
    window.location.reload();
  }

  handleHome() {
    window.location.assign('/');
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary">
        <h1>Something went wrong.</h1>
        <p>The page hit an unexpected error. You can reload it or return to the home page.</p>
        {import.meta.env.DEV && (
          <pre className="error-boundary-detail">{String(error?.message || error)}</pre>
        )}
        <div className="error-boundary-actions">
          <button type="button" className="button" onClick={this.handleReload}>Reload page</button>
          <button type="button" className="text-btn" onClick={this.handleHome}>Return home</button>
        </div>
      </div>
    );
  }
}
