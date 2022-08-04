import morphdom from "morphdom";
import { AbortFn, Browser, RealBrowser } from "./browser";
import { EventQueue } from "./event_queue";
import {
  ClosestSelectorMatcher,
  EventMatcher,
  ExactSelectorMatcher,
  KeyboardComboMatcher,
  KeyboardKeyMatcher,
  Logic,
  Msg,
  RustEventListener,
  RustInterval,
} from "./rust_types";

interface Config {
  appId: string;
  debug: boolean;
}

interface State {
  eventListeners: Map<string, ActiveEventListener>;
  intervals: RunningInterval[];
}

class Orro {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;
  private readonly eventQueue: EventQueue = new EventQueue();
  private msgHandler: (msg: object) => void = (_msg) => {};

  private readonly state: State = {
    eventListeners: new Map(),
    intervals: [],
  };

  constructor(private config: Config) {
    const browser = new RealBrowser();
    const appElem = browser.getElementById(config.appId);
    if (!appElem) {
      throw new Error(`Could not find element with id #${config.appId}`);
    }

    this.appElem = appElem;
    this.browser = browser;
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

  initLogic(logic: Logic, msgHandler: (msg: Msg) => void) {
    const groupedEventListeners = this.groupEventListeners(
      logic.eventListeners
    );
    const startedEventListeners = this.startEventListeners(
      groupedEventListeners
    );

    const intervals = logic.intervals.filter(this.isValidInterval);
    const startedIntervals = intervals.map(this.startInterval);

    this.state.eventListeners = startedEventListeners;
    this.state.intervals = startedIntervals;
    this.msgHandler = msgHandler;
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

  private startInterval(interval: RustInterval): RunningInterval {
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

  private groupEventListeners(
    eventListeners: RustEventListener[]
  ): Map<string, RustEventListener[]> {
    const groupedListeners: Map<string, RustEventListener[]> = new Map();

    eventListeners.forEach((listener) => {
      const eventType = listener.eventType;
      const listeners = groupedListeners.get(eventType) || [];
      listeners.push(listener);
      groupedListeners.set(eventType, listeners);
    });

    return groupedListeners;
  }

  private updateEventListeners(eventListeners: RustEventListener[]) {
    const currentListeners = new Map(this.state.eventListeners);

    // TODO: remove and abort event listeners

    const handlers = this.groupEventListeners(eventListeners);
    this.addEventHandlers(currentListeners, handlers);

    this.state.eventListeners = currentListeners;
  }

  private addEventHandlers(
    currentListeners: Map<string, ActiveEventListener>,
    newListeners: Map<string, RustEventListener[]>
  ) {
    newListeners.forEach((handlers, eventType) => {
      const activeListener = currentListeners.get(eventType);
      if (activeListener) {
        activeListener.handlers = activeListener.handlers.concat(handlers);
      } else {
        const activeListener = this.startEventListener(eventType, handlers);
        currentListeners.set(eventType, activeListener);
      }
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

  private handleEvent(e: Event, eventName: string): void {
    const activeListener = this.state.eventListeners.get(eventName);
    if (!activeListener) {
      return;
    }

    activeListener.handlers
      .filter((handler) => {
        return handler.matchers.every((matcher) => {
          return this.matchEvent(matcher, e);
        });
      })
      .forEach((handler) => {
        if (handler.propagation.preventDefault) {
          e.preventDefault();
        }

        if (handler.propagation.stopPropagation) {
          e.stopPropagation();
        }

        const msg = this.replaceMsgPlaceholder(handler.msg);

        this.queueUpdate({
          id: handler.selector,
          strategy: handler.queueStrategy,
          msg,
        });
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
    if ("code" in e) {
      return false;
    }

    return e.code === matcher.key || matcher.key == "any";
  }

  private matchKeyboardCombo(
    matcher: KeyboardComboMatcher,
    event: Event
  ): boolean {
    const e = event as KeyboardEvent;
    // TODO: check combinations
    return e.code === matcher.combo.key;
  }

  private replacePlaceholderValue(value: string) {
    if (value.startsWith("VALUE_FROM_ID:")) {
      const elemId = value.replace("VALUE_FROM_ID:", "");
      const elem = this.browser.getElementById(elemId) as HTMLInputElement;
      if (elem && elem.value) {
        return elem.value;
      }

      return "";
    }

    return value;
  }

  private replaceMsgPlaceholder(msg: Msg) {
    if (typeof msg !== "object") {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      const newValue = this.replacePlaceholderValue(value as string);
      return [key, newValue];
    });

    return Object.fromEntries(entries);
  }

  private queueUpdate({ id, strategy, msg }: Update) {
    const msgHandler = this.msgHandler;

    return this.eventQueue.enqueue({
      id,
      strategy,

      action() {
        if (!msg) {
          return;
        }

        msgHandler(msg);
      },
    });
  }

  private startEventListener(
    eventType: string,
    eventHandlers: RustEventListener[]
  ): ActiveEventListener {
    // TODO: listen on correct eventTarget
    const abort = this.browser.addEventListener(
      eventType,
      (e) => {
        this.handleEvent(e, eventType);
      },
      true
    );

    return { abort, handlers: eventHandlers };
  }

  // TODO: remove
  private startEventListeners(
    eventHandlers: Map<string, RustEventListener[]>
  ): Map<string, ActiveEventListener> {
    const entries: [string, ActiveEventListener][] = Array.from(
      eventHandlers
    ).map(([eventName, handlers]) => {
      const activeListener = this.startEventListener(eventName, handlers);
      return [eventName, activeListener];
    });

    return new Map(entries);
  }
}

interface ActiveEventListener {
  abort: AbortFn;
  handlers: RustEventListener[];
}

interface RunningInterval {
  abort: AbortFn;
  interval: RustInterval;
}

interface Update {
  id: string;
  strategy: string;
  msg: Msg;
}

export { Orro, Config };
