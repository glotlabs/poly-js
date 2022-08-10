import { AbortFn, Browser, listenTargetFromString } from "../browser";
import { JobConfig, queueStrategyFromString } from "../event_queue";
import { Domain, Logger, Verbosity } from "../logger";

import {
  Msg,
  ClosestSelectorMatcher,
  EventMatcher,
  ExactSelectorMatcher,
  KeyboardComboMatcher,
  KeyboardKeyMatcher,
  RustEventListener,
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
    private readonly onMsg: (msg: Msg, jobConfig: JobConfig) => void
  ) {}

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
      return;
    }

    if (listener.propagation.preventDefault) {
      event.preventDefault();
    }

    if (listener.propagation.stopPropagation) {
      event.stopPropagation();
    }

    this.onMsg(listener.msg, {
      id: listener.id,
      strategy: queueStrategyFromString(listener.queueStrategy, this.logger),
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

export { EventListenerManager, ActiveEventListener };
