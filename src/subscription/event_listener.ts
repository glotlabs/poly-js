import { AbortFn, Browser, listenTargetFromString } from "../browser";
import { Domain, Logger, Verbosity } from "../logger";

import {
  Msg,
  ClosestSelectorMatcher,
  EventMatcher,
  ExactSelectorMatcher,
  KeyboardKeyMatcher,
  RustEventListener,
  SubscriptionMsg,
  MouseButtonMatcher,
} from "../rust_types";

interface ActiveEventListener {
  abort: AbortFn;
  listener: RustEventListener;
}

interface State {
  eventListeners: ActiveEventListener[];
}

class EventListenerManager {
  private readonly state: State = {
    eventListeners: [],
  };

  constructor(
    private readonly browser: Browser,
    private readonly logger: Logger,
    private readonly onMsg: (msg: SubscriptionMsg, event: Event) => void
  ) { }

  public setEventListeners(newListeners: RustEventListener[]) {
    const oldListeners = [...this.state.eventListeners];

    const { listenersToRemove, listenersToKeep, listenersToAdd } =
      prepareEventListenersDelta(oldListeners, newListeners);

    this.logger.debug({
      domain: Domain.EventListener,
      verbosity: Verbosity.Normal,
      message: "Updating event listeners",
      context: {
        removing: listenersToRemove,
        keeping: listenersToKeep,
        adding: listenersToAdd,
      },
    });

    this.stopEventListeners(listenersToRemove);

    const addedListeners = listenersToAdd.map((listener) =>
      this.startEventListener(listener)
    );

    this.state.eventListeners = [...listenersToKeep, ...addedListeners];
  }

  private startEventListener(listener: RustEventListener): ActiveEventListener {
    const listenTarget = listenTargetFromString(listener.listenTarget);

    const abort = this.browser.addEventListener(
      listenTarget,
      listener.eventType,
      (event) => {
        this.handleEvent(event, listener);
      },
      {
        capture: true,
        passive: !listener.propagation.preventDefault,
      }
    );

    this.logger.debug({
      domain: Domain.EventListener,
      verbosity: Verbosity.Verbose,
      message: "Started event listener",
      context: {
        id: listener.id,
        eventType: listener.eventType,
        target: listener.listenTarget,
      },
    });

    return {
      abort,
      listener,
    };
  }

  private stopEventListeners(listeners: ActiveEventListener[]) {
    listeners.forEach((listener) => {
      listener.abort.abort();

      this.logger.debug({
        domain: Domain.EventListener,
        verbosity: Verbosity.Verbose,
        message: "Stopped event listener",
        context: {
          id: listener.listener.id,
          eventType: listener.listener.eventType,
          target: listener.listener.listenTarget,
        },
      });
    });
  }

  private handleEvent(event: Event, listener: RustEventListener): void {
    const matchesEvent = listener.matchers.every((matcher) => {
      return this.matchEvent(matcher, event);
    });

    if (!matchesEvent) {
      this.logger.debug({
        domain: Domain.EventListener,
        verbosity: Verbosity.Verbose,
        message: "Event did not match",
        context: {
          id: listener.id,
          type: listener.eventType,
          listenTarget: listener.listenTarget,
          event,
          matchers: listener.matchers,
        },
      });

      return;
    }

    if (listener.propagation.preventDefault) {
      event.preventDefault();
    }

    if (listener.propagation.stopPropagation) {
      event.stopPropagation();
    }

    this.logger.debug({
      domain: Domain.EventListener,
      verbosity: Verbosity.Normal,
      message: "Event matched",
      context: {
        id: listener.id,
        type: listener.eventType,
        target: listener.listenTarget,
        matchers: listener.matchers,
        event,
        msg: listener.msg,
      },
    });

    this.onMsg(listener.msg, event);
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

      case "mouseButton":
        return this.matchMouseButton(
          matcher.config as MouseButtonMatcher,
          event
        );

      case "keyboardKey":
        return this.matchKeyboardKey(
          matcher.config as KeyboardKeyMatcher,
          event
        );

      default:
        this.logger.warn({
          domain: Domain.EventListener,
          message: "Unknown event matcher",
          context: { type: matcher.type },
        });
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

  private matchMouseButton(matcher: MouseButtonMatcher, event: Event): boolean {
    const e = event as MouseEvent;
    if (!("button" in e)) {
      return false;
    }

    return matcher.button == mouseButtonToString(e.button);
  }

  private matchKeyboardKey(matcher: KeyboardKeyMatcher, event: Event): boolean {
    const e = event as KeyboardEvent;
    if (!("code" in e)) {
      return false;
    }

    if (matcher.require_ctrl && !e.ctrlKey) {
      return false
    }

    if (matcher.require_meta && !e.metaKey) {
      return false
    }

    const key = matcher.key.toLowerCase();
    const code = e.code.toLowerCase();

    return code === key || key === "any";
  }
}

interface EventListenersDelta {
  listenersToRemove: ActiveEventListener[];
  listenersToKeep: ActiveEventListener[];
  listenersToAdd: RustEventListener[];
}

function prepareEventListenersDelta(
  oldListeners: ActiveEventListener[],
  newListeners: RustEventListener[]
): EventListenersDelta {
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

function mouseButtonToString(n: number): string | null {
  switch (n) {
    case 0:
      return "main";
    case 1:
      return "auxiliary";
    case 2:
      return "secondary";
    case 3:
      return "fourth";
    case 4:
      return "fifth";
  }

  return null;
}

export { EventListenerManager, ActiveEventListener };
