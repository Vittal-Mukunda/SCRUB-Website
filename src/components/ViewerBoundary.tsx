import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/** Catches 3D/WebGL failures so the product page still shows the photo instead of breaking. */
export default class ViewerBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D viewer failed, falling back to photo:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
