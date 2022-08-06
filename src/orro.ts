import morphdom from "morphdom";
import { AbortFn, Browser, RealBrowser } from "./browser";
import { groupEffects } from "./effect";
import {
  ActiveEventListener,
  EventListenerManager,
} from "./effect/event_listener";
import { EventQueue, JobConfig } from "./event_queue";
import {
  CaptureType,
  Effect,
  Model,
  Msg,
  Page,
  RustInterval,
} from "./rust_types";
import { captureValue } from "./value";

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
  private readonly eventListenerManager: EventListenerManager;

  private readonly state: State = {
    model: null,
    eventListeners: [],
    intervals: [],
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    const browser = new RealBrowser();

    this.eventListenerManager = new EventListenerManager(
      browser,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );

    this.state.model = page.initialModel();

    const appId = page.id();
    const appElem = browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;
    this.browser = browser;

    this.initialRender();
    this.initEffects();
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

  private initEffects() {
    const effects = this.page.getEffects(this.state.model);
    const groupedEffects = groupEffects(effects);

    this.eventListenerManager.setEventListeners(groupedEffects.eventListeners);

    const intervals = groupedEffects.intervals.filter(this.isValidInterval);
    const startedIntervals = intervals.map(this.startInterval);

    this.state.intervals = startedIntervals;
  }

  updateEffects(effects: Effect[]) {
    const groupedEffects = groupEffects(effects);
    this.eventListenerManager.setEventListeners(groupedEffects.eventListeners);
    this.updateIntervals(groupedEffects.intervals);
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
      this.queueUpdate(interval.msg, {
        id: this.formatIntervalId(interval),
        strategy: interval.queueStrategy,
      });
    }, interval.duration);

    return {
      abort,
      interval,
    };
  }

  // TODO: Set id in rust?
  // TODO: msg can be an object
  private formatIntervalId(interval: RustInterval) {
    return `${interval.id}-${interval.msg}-${interval.duration}`;
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

  private replaceMsgPlaceholder(msg: Msg) {
    if (typeof msg !== "object") {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      if (typeof value === "object" || "type" in (value as object)) {
        const newValue = captureValue(this.browser, value as CaptureType);
        return [key, newValue];
      } else {
        return [key, value];
      }
    });

    return Object.fromEntries(entries);
  }

  private queueUpdate(msg: Msg, jobConfig: JobConfig) {
    if (!msg) {
      return;
    }

    return this.eventQueue.enqueue({
      config: jobConfig,
      action: () => {
        const realMsg = this.replaceMsgPlaceholder(msg);
        this.update(realMsg);
      },
    });
  }

  public update(msg: Msg) {
    this.state.model = this.page.update(msg, this.state.model);

    const markup = this.page.viewBody(this.state.model);
    this.updateDom(markup);

    const newEffects = this.page.getEffects(this.state.model);
    this.updateEffects(newEffects);
  }

  private debugLog(msg: string, ...context: any[]): void {
    if (this.config?.debug === true) {
      console.log("[ORRO]", msg, ...context);
    }
  }
}

interface ActiveInterval {
  abort: AbortFn;
  interval: RustInterval;
}

export { Orro, Config };
