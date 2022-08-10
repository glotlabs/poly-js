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
  getWindowSize(): WindowSize;
  pushUrl(url: string): void;
  replaceUrl(url: string): void;
}

interface LocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class BrowserLocalStorage implements LocalStorage {
  public getItem(key: string) {
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string) {
    return localStorage.setItem(key, value);
  }
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

  public getWindowSize(): WindowSize {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  public pushUrl(url: string): void {
    history.pushState({}, "", url);
  }

  public replaceUrl(url: string): void {
    history.replaceState({}, "", url);
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

interface WindowSize {
  width: number;
  height: number;
}

export {
  Browser,
  RealBrowser,
  LocalStorage,
  BrowserLocalStorage,
  AbortFn,
  listenTargetFromString,
  WindowSize,
};
