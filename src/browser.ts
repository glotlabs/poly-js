interface Browser {
  getElementById(id: string): HTMLElement | null;
  getActiveElement(): Element | null;
  addEventListener(
    target: ListenTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    config: ListenConfig
  ): AbortFn;
  setInterval(handler: TimerHandler, timeout?: number): AbortFn;
}

class RealBrowser implements Browser {
  public getElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  public getActiveElement(): Element | null {
    return document.activeElement;
  }

  public addEventListener(
    target: ListenTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    config: ListenConfig
  ): AbortFn {
    const controller = new AbortController();
    const listenTarget = getListenTarget(target);

    listenTarget.addEventListener(type, listener, {
      signal: controller.signal,
      capture: config.capture,
      passive: config.passive,
    });

    return {
      abort() {
        controller.abort();
      },
    };
  }

  public setInterval(handler: TimerHandler, timeout?: number): AbortFn {
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

interface ListenConfig {
  capture: boolean;
  passive: boolean;
}

interface AbortFn {
  abort: () => void;
}

export { Browser, RealBrowser, AbortFn, listenTargetFromString };
