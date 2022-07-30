import morphdom from "morphdom";
import { Browser, RealBrowser } from "./browser";
import { EventQueue } from "./event_queue";

interface Config {
  appId: string;
  debug: boolean;
}

class Orro {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;

  private readonly state = {
    eventListeners: [],
    intervals: [],
    // TODO: remove out of state?
    eventQueue: new EventQueue(),
    msgHandler: (msg) => {},
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

  updateDom(markup) {
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

  initLogic(logic, msgHandler) {
    const eventHandlers = this.prepareEventHandlers(logic.eventListeners);
    const intervals = logic.intervals.map(this.startInterval);

    this.initEventHandlers(eventHandlers);

    Object.assign(this.state, {
      eventListeners: eventHandlers,
      intervals,
      msgHandler,
    });
  }

  updateLogic(logic) {
    this.updateEventListeners(logic.eventListeners);
    this.updateIntervals(logic.intervals);
  }

  private startInterval(interval) {
    if (interval.duration < 100) {
      console.warn(
        "Ignoring interval with low duration: ${interval.duration}ms"
      );
      return interval;
    }

    interval.id = setInterval(() => {
      this.queueUpdate({
        id: this.getIntervalId(interval),
        strategy: interval.queueStrategy,
        msg: interval.msg,
      });
    }, interval.duration);

    return interval;
  }

  private getIntervalId(interval) {
    return `${interval.id}-${interval.msg}-${interval.duration}`;
  }

  private prepareEventHandlers(eventListeners) {
    return eventListeners.reduce((acc, listener) => {
      const type = listener.event.type;

      if (!(type in acc)) {
        acc[type] = [];
      }

      acc[type].push({
        config: listener.event.config,
        id: listener.id,
        selector: listener.selector,
        msg: listener.msg,
        queueStrategy: listener.queueStrategy,
      });

      return acc;
    }, {});
  }

  private updateEventListeners(eventListeners) {
    const currentListeners = { ...this.state.eventListeners };

    eventListeners.forEach((listener) => {
      this.removeEventListeners(currentListeners, listener.id);
    });

    // TODO: call document.addEventListener on new event types (onclick, etc)
    const handlers = this.prepareEventHandlers(eventListeners);
    this.addEventHandlers(currentListeners, handlers);

    this.state.eventListeners = currentListeners;
  }

  private addEventHandlers(currentListeners, eventListeners) {
    Object.entries(eventListeners).forEach(([eventName, handlers]) => {
      const currentHandlers = currentListeners[eventName] || [];
      currentListeners[eventName] = currentHandlers.concat(handlers);
    });
  }

  private removeEventListeners(currentListeners, id) {
    Object.entries(currentListeners).forEach(([eventName, handlers]) => {
      currentListeners[eventName] = (handlers as any[]).filter((handler) => {
        return handler.id !== id;
      });
    });
  }

  private updateIntervals(intervals) {
    const currentIntervals = this.state.intervals;

    const newIds = intervals.map(this.getIntervalId);
    const currentIds = currentIntervals.map(this.getIntervalId);

    // Stop intervals that does not exist anymore
    currentIntervals
      .filter((interval) => {
        const id = this.getIntervalId(interval);
        return !newIds.includes(id);
      })
      .forEach((interval) => {
        clearInterval(interval.id);
      });

    // Get existing intervals that we want to keep
    const continuingIntervals = currentIntervals.filter((interval) => {
      const id = this.getIntervalId(interval);
      return newIds.includes(id);
    });

    // Start new intervals
    const newIntervals = intervals
      .filter((interval) => {
        const id = this.getIntervalId(interval);
        return !currentIds.includes(id);
      })
      .map(this.startInterval);

    this.state.intervals = [].concat(continuingIntervals, newIntervals);
  }

  private handleEvent(e, eventName) {
    const elem = e.target;
    const handlers = this.state.eventListeners[eventName];

    if (this.config.debug) {
      console.debug("ORRO DEBUG", {
        functionName: "handleEvent",
        eventName,
        targetElement: elem,
      });
    }

    handlers
      .filter((handler) => {
        if (handler.config.event.matchParentElements) {
          return elem.closest(handler.selector);
        } else {
          return elem.matches(handler.selector);
        }
      })
      .forEach((handler) => {
        if (handler.config.event.preventDefault) {
          e.preventDefault();
        }

        if (handler.config.event.stopPropagation) {
          e.stopPropagation();
        }

        const msg = this.replaceMsgPlaceholder(handler.msg, elem);

        this.queueUpdate({
          id: handler.selector,
          strategy: handler.queueStrategy,
          msg,
        });
      });
  }

  private replacePlaceholderValue(value) {
    if (value.startsWith("VALUE_FROM_ID:")) {
      const elemId = value.replace("VALUE_FROM_ID:", "");
      const elem = document.getElementById(elemId) as HTMLInputElement;
      if (elem && elem.value) {
        return elem.value;
      }

      return "";
    }

    return value;
  }

  private replaceMsgPlaceholder(msg, currentElem) {
    if (typeof msg !== "object") {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      const newValue = this.replacePlaceholderValue(value);
      return [key, newValue];
    });

    return Object.fromEntries(entries);
  }

  private queueUpdate({ id, strategy, msg }) {
    const msgHandler = this.state.msgHandler;

    return this.state.eventQueue.enqueue({
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

  private initEventHandlers(eventHandlers) {
    Object.keys(eventHandlers).forEach((eventName) => {
      document.addEventListener(
        eventName,
        (e) => {
          this.handleEvent(e, eventName);
        },
        true
      );
    });
  }
}

export { Orro, Config };
