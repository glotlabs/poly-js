interface Browser {
  getElementById(id: string): HTMLElement | null;
  getActiveElement(): Element | null;
  addEventListener(
    target: ListenTarget,
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
    target: ListenTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): AbortFn {
    const controller = new AbortController();

    getListenTarget(target).addEventListener(type, listener, {
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

enum ListenTarget {
  Window,
  Document,
}

function listenTargetFromString(str: string): ListenTarget {
  switch (str) {
    case "window":
      return ListenTarget.Window;

    case "document":
      return ListenTarget.Document;
  }

  throw new Error(`Unknown listen target: ${str}`);
}

function getListenTarget(target: ListenTarget): Window | Document {
  switch (target) {
    case ListenTarget.Window:
      return window;
    case ListenTarget.Document:
      return document;
  }
}

interface AbortFn {
  abort: () => void;
}

export { Browser, RealBrowser, AbortFn, listenTargetFromString };
