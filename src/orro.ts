import morphdom from "morphdom";
import {
  AbortFn,
  Browser,
  listenTargetFromString,
  RealBrowser,
  WindowSize,
} from "./browser";
import { EventQueue } from "./event_queue";
import {
  CaptureType,
  CaptureValueFromElement,
  ClosestSelectorMatcher,
  EventMatcher,
  ExactSelectorMatcher,
  KeyboardComboMatcher,
  KeyboardKeyMatcher,
  Logic,
  Model,
  Msg,
  Page,
  RustEventListener,
  RustInterval,
} from "./rust_types";

interface Config {
  debug: boolean;
}

interface State {
  model: Model;
  eventListeners: ActiveEventListener[];
  intervals: ActiveInterval[];
}

class Orro {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;
  private readonly eventQueue: EventQueue = new EventQueue();

  private readonly state: State = {
    model: null,
    eventListeners: [],
    intervals: [],
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    const browser = new RealBrowser();
    this.state.model = page.initialModel();

    const appId = page.id();
    const appElem = browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;
    this.browser = browser;

    this.initialRender();
    this.initLogic();
  }

  public getModel(): Model {
    return this.state.model;
  }

  updateDom(markup: string) {
    const focusedElement = this.browser.getActiveElement();

    morphdom(this.appElem, markup, {
      onBeforeElUpdated(fromElem, toElem) {
        // Skip update of focused input element, this prevents resetting the input value while the user is typing.
        const inputIsFocused =
          fromElem.nodeName === "INPUT" &&
          toElem.nodeName === "INPUT" &&
          fromElem.isSameNode(focusedElement) &&
          (fromElem as HTMLInputElement).value !==
            (toElem as HTMLInputElement).value;

        if (inputIsFocused) {
          return false;
        }

        // Skip elements which has the unmanaged attribute
        const isUnmanaged = fromElem.hasAttribute("unmanaged");
        if (isUnmanaged) {
          return false;
        }

        return true;
      },
    });
  }

  private initialRender() {
    const markup = this.page.viewBody(this.state.model);
    this.updateDom(markup);
  }

  private initLogic() {
    const logic = this.page.getLogic(this.state.model);

    const startedListeners = logic.eventListeners.map((listener) =>
      this.startEventListener(listener)
    );

    const intervals = logic.intervals.filter(this.isValidInterval);
    const startedIntervals = intervals.map(this.startInterval);

    this.state.eventListeners = startedListeners;
    this.state.intervals = startedIntervals;
  }

  updateLogic(logic: Logic) {
    this.updateEventListeners(logic.eventListeners);
    this.updateIntervals(logic.intervals);
  }

  private isValidInterval(interval: RustInterval): boolean {
    if (interval.duration < 100) {
      console.warn(
        "Ignoring interval with low duration: ${interval.duration}ms"
      );
      return false;
    }

    return true;
  }

  private startInterval(interval: RustInterval): ActiveInterval {
    const abort = this.browser.setInterval(() => {
      this.queueUpdate({
        id: this.formatIntervalId(interval),
        strategy: interval.queueStrategy,
        msg: interval.msg,
      });
    }, interval.duration);

    return {
      abort,
      interval,
    };
  }

  private formatIntervalId(interval: RustInterval) {
    return `${interval.id}-${interval.msg}-${interval.duration}`;
  }

  private updateEventListeners(newListeners: RustEventListener[]) {
    const oldListeners = [...this.state.eventListeners];

    const { listenersToRemove, listenersToKeep, listenersToAdd } =
      this.prepareEventListenersUpdate(oldListeners, newListeners);

    this.debugLog("Updating event listeners", {
      removing: listenersToRemove,
      keeping: listenersToKeep,
      adding: listenersToAdd,
    });

    this.stopEventListeners(listenersToRemove);
    const addedListeners = listenersToAdd.map((listener) =>
      this.startEventListener(listener)
    );

    this.state.eventListeners = [...listenersToKeep, ...addedListeners];
  }

  private prepareEventListenersUpdate(
    oldListeners: ActiveEventListener[],
    newListeners: RustEventListener[]
  ): EventListenersUpdate {
    const newIds = newListeners.map((listener) => listener.id);
    const oldIds = oldListeners.map((listener) => listener.listener.id);

    const listenersToRemove: ActiveEventListener[] = [];
    const listenersToKeep: ActiveEventListener[] = [];
    const listenersToAdd: RustEventListener[] = [];

    oldListeners.forEach((listener) => {
      if (newIds.includes(listener.listener.id)) {
        listenersToKeep.push(listener);
      } else {
        listenersToRemove.push(listener);
      }
    });

    newListeners.forEach((listener) => {
      if (!oldIds.includes(listener.id)) {
        listenersToAdd.push(listener);
      }
    });

    return {
      listenersToRemove,
      listenersToKeep,
      listenersToAdd,
    };
  }

  private stopEventListeners(listeners: ActiveEventListener[]) {
    listeners.forEach((listener) => {
      listener.abort.abort();
    });
  }

  private updateIntervals(intervals: RustInterval[]) {
    const currentIntervals = this.state.intervals;

    const newIds = intervals.map(this.formatIntervalId);
    const currentIds = currentIntervals.map(({ interval }) =>
      this.formatIntervalId(interval)
    );

    // Stop intervals that does not exist anymore
    currentIntervals
      .filter(({ interval }) => {
        const id = this.formatIntervalId(interval);
        return !newIds.includes(id);
      })
      .forEach((interval) => {
        interval.abort.abort();
      });

    // Get existing intervals that we want to keep
    const continuingIntervals = currentIntervals.filter(({ interval }) => {
      const id = this.formatIntervalId(interval);
      return newIds.includes(id);
    });

    // Start new intervals
    const newIntervals = intervals
      .filter((interval) => {
        const id = this.formatIntervalId(interval);
        return !currentIds.includes(id);
      })
      .map(this.startInterval);

    this.state.intervals = [...continuingIntervals, ...newIntervals];
  }

  private handleEvent(event: Event, listener: RustEventListener): void {
    const matchesEvent = listener.matchers.every((matcher) => {
      return this.matchEvent(matcher, event);
    });

    if (!matchesEvent) {
      return;
    }

    if (listener.propagation.preventDefault) {
      event.preventDefault();
    }

    if (listener.propagation.stopPropagation) {
      event.stopPropagation();
    }

    const msg = this.replaceMsgPlaceholder(listener.msg);

    this.queueUpdate({
      id: listener.id,
      strategy: listener.queueStrategy,
      msg,
    });
  }

  private matchEvent(matcher: EventMatcher, event: Event): boolean {
    switch (matcher.type) {
      case "exactSelector":
        return this.matchExactSelector(
          matcher.config as ExactSelectorMatcher,
          event
        );

      case "closestSelector":
        return this.matchClosestSelector(
          matcher.config as ClosestSelectorMatcher,
          event
        );

      case "keyboardKey":
        return this.matchKeyboardKey(
          matcher.config as KeyboardKeyMatcher,
          event
        );

      case "keyboardCombo":
        return this.matchKeyboardCombo(
          matcher.config as KeyboardComboMatcher,
          event
        );

      default:
        console.warn(`Unknown matcher type: ${matcher.type}`);
    }

    return false;
  }

  private matchExactSelector(
    matcher: ExactSelectorMatcher,
    event: Event
  ): boolean {
    const elem = event.target as Element;
    if (!elem || !("matches" in elem)) {
      return false;
    }

    return elem.matches(matcher.selector);
  }

  private matchClosestSelector(
    matcher: ClosestSelectorMatcher,
    event: Event
  ): boolean {
    const elem = event.target as Element;
    if (!elem || !("closest" in elem)) {
      return false;
    }

    return elem.closest(matcher.selector) != null;
  }

  private matchKeyboardKey(matcher: KeyboardKeyMatcher, event: Event): boolean {
    const e = event as KeyboardEvent;
    if (!("code" in e)) {
      return false;
    }

    const key = matcher.key.toLowerCase();
    const code = e.code.toLowerCase();

    return code === key || key === "any";
  }

  private matchKeyboardCombo(
    matcher: KeyboardComboMatcher,
    event: Event
  ): boolean {
    const e = event as KeyboardEvent;
    if (!("code" in e)) {
      return false;
    }

    // TODO: check combinations
    const key = matcher.combo.key.toLowerCase();
    const code = e.code.toLowerCase();

    return code === key || key === "any";
  }

  private captureValue(captureType: CaptureType): any {
    switch (captureType.type) {
      case "valueFromElement":
        return this.captureValueFromElement(
          captureType.config as CaptureValueFromElement
        );

      case "windowSize":
        return this.captureWindowSize();

      default:
        console.warn(`Unknown capture value type: ${captureType.type}`);
    }

    return `Failed to capture value of type '${captureType.type}'`;
  }

  private captureValueFromElement(config: CaptureValueFromElement) {
    const elem = this.browser.getElementById(
      config.elementId
    ) as HTMLInputElement;

    if (elem && elem.value) {
      return safeJsonParse(elem.value);
    }

    return `Failed to capture element value from element with id: '${config.elementId}'`;
  }

  private captureWindowSize(): WindowSize {
    return this.browser.getWindowSize();
  }

  private replaceMsgPlaceholder(msg: Msg) {
    if (typeof msg !== "object") {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      if (typeof value === "object" || "type" in (value as object)) {
        const newValue = this.captureValue(value as CaptureType);
        return [key, newValue];
      } else {
        return [key, value];
      }
    });

    return Object.fromEntries(entries);
  }

  private queueUpdate({ id, strategy, msg }: Update) {
    if (!msg) {
      return;
    }

    return this.eventQueue.enqueue({
      id,
      strategy,
      action: () => {
        this.sendMsg(msg);
      },
    });
  }

  private startEventListener(listener: RustEventListener): ActiveEventListener {
    const listenTarget = listenTargetFromString(listener.listenTarget);

    const abort = this.browser.addEventListener(
      listenTarget,
      listener.eventType,
      (event) => {
        this.handleEvent(event, listener);
      },
      true
    );

    this.debugLog("Started listener", {
      id: listener.id,
      eventType: listener.eventType,
      target: listener.listenTarget,
    });

    return { abort, listener };
  }

  public sendMsg(msg: Msg) {
    this.state.model = this.page.update(msg, this.state.model);

    const markup = this.page.viewBody(this.state.model);
    this.updateDom(markup);

    const newLogic = this.page.getLogic(this.state.model);
    this.updateLogic(newLogic);
  }

  private debugLog(msg: string, ...context: any[]): void {
    if (this.config?.debug === true) {
      console.log("[ORRO]", msg, ...context);
    }
  }
}

interface ActiveEventListener {
  abort: AbortFn;
  listener: RustEventListener;
}

interface ActiveInterval {
  abort: AbortFn;
  interval: RustInterval;
}

interface EventListenersUpdate {
  listenersToRemove: ActiveEventListener[];
  listenersToKeep: ActiveEventListener[];
  listenersToAdd: RustEventListener[];
}

interface Update {
  id: string;
  strategy: string;
  msg: Msg;
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error(e);
    return "";
  }
}

export { Orro, Config };
