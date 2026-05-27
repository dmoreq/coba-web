import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(matchers);

// Recharts ResponsiveContainer requires ResizeObserver in jsdom
global.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          contentRect: {
            width: 400,
            height: 200,
            top: 0,
            left: 0,
            bottom: 200,
            right: 400,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this,
    );
    Object.defineProperty(target, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(target, "clientHeight", { configurable: true, value: 200 });
  }

  unobserve() {}
  disconnect() {}
};
