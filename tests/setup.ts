class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const g = globalThis as unknown as Record<string, unknown>;
g.ResizeObserver ??= ResizeObserverStub;

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    })) as unknown as typeof window.matchMedia;
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16)) as unknown as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as unknown as typeof window.cancelAnimationFrame;
  }
  // jsdom has no canvas implementation; components must guard a null context.
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
