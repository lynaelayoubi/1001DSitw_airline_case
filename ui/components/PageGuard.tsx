import { Component, type ReactNode } from 'react';

/**
 * If a page fails to draw, say so and offer a way back, instead of a blank screen in front of a room.
 * "Reset demo and reload" clears what this browser remembers (ui/store.ts), in case that is the cause.
 */
export class PageGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const resetAndReload = () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('handback.v2.'))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // Storage unavailable: a reload is all there is.
      }
      window.location.reload();
    };
    return (
      <div className="py-12">
        <p className="font-medium">This page could not be shown.</p>
        <p className="mt-1 text-slate-500">The rest of the app is fine. Reload to try again, or reset the demo if it keeps happening.</p>
        <div className="mt-4 flex gap-6">
          <button className="link" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button className="link" onClick={resetAndReload}>
            Reset demo and reload
          </button>
        </div>
      </div>
    );
  }
}
