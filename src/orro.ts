import morphdom from "morphdom";
import { Browser, RealBrowser } from "./browser";
import { groupEffects } from "./effect";
import { EventListenerManager } from "./effect/event_listener";
import { IntervalManager } from "./effect/interval";
import { EventQueue, JobConfig } from "./event_queue";
import { CaptureType, Effect, Model, Msg, Page } from "./rust_types";
import { captureValue } from "./value";

interface Config {
  debug: boolean;
}

interface State {
  model: Model;
}

class Orro {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;
  private readonly eventQueue: EventQueue = new EventQueue();
  private readonly eventListenerManager: EventListenerManager;
  private readonly intervalManager: IntervalManager;

  private readonly state: State = {
    model: null,
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    const browser = new RealBrowser();

    this.eventListenerManager = new EventListenerManager(
      browser,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );

    this.intervalManager = new IntervalManager(browser, (msg, jobConfig) => {
      this.queueUpdate(msg, jobConfig);
    });

    this.state.model = page.initialModel();

    const appId = page.id();
    const appElem = browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;
    this.browser = browser;

    this.initialRender();

    const effects = this.page.getEffects(this.state.model);
    this.handleEffects(effects);
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

  private handleEffects(effects: Effect[]) {
    const groupedEffects = groupEffects(effects);
    this.eventListenerManager.setEventListeners(groupedEffects.eventListeners);
    this.intervalManager.setIntervals(groupedEffects.intervals);
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
    this.handleEffects(newEffects);
  }

  private debugLog(msg: string, ...context: any[]): void {
    if (this.config?.debug === true) {
      console.log("[ORRO]", msg, ...context);
    }
  }
}

export { Orro, Config };
