interface Browser {
  getElementById(id: string): HTMLElement | null;
  getActiveElement(): Element | null;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean
  ): void;
  removeInterval(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean
  ): void;
  setInterval(handler: TimerHandler, timeout?: number): number;
  clearInterval(id?: number): void;
}

class RealBrowser implements Browser {
  getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  getActiveElement(): Element | null {
    return document.activeElement;
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean
  ): void {
    document.addEventListener(type, listener, options);
  }

  removeInterval(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean
  ): void {
    document.removeEventListener(type, listener, options);
  }

  setInterval(handler: TimerHandler, timeout?: number): number {
    return window.setInterval(handler, timeout);
  }

  clearInterval(id?: number): void {
    window.clearInterval(id);
  }
}

export { Browser, RealBrowser };
