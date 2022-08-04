interface AbortFn {
  abort: () => void;
}

interface Browser {
  getElementById(id: string): HTMLElement | null;
  getActiveElement(): Element | null;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): AbortFn;
  setInterval(handler: TimerHandler, timeout?: number): AbortFn;
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
    useCapture?: boolean
  ): AbortFn {
    const controller = new AbortController();

    document.addEventListener(type, listener, {
      signal: controller.signal,
      capture: useCapture,
    });

    return {
      abort() {
        controller.abort();
      },
    };
  }

  setInterval(handler: TimerHandler, timeout?: number): AbortFn {
    const id = window.setInterval(handler, timeout);

    return {
      abort() {
        window.clearInterval(id);
      },
    };
  }
}

export { Browser, RealBrowser, AbortFn };
