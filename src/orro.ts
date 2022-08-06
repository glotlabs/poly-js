import morphdom from "morphdom";
import { Browser, RealBrowser } from "./browser";
import { groupEffects } from "./effect";
import { EventListenerManager } from "./effect/event_listener";
import { IntervalManager } from "./effect/interval";
import { defaultJobConfig, EventQueue, JobConfig } from "./event_queue";
import { BrowserLogger, Logger } from "./logger";
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
  private readonly logger: Logger;
  private readonly eventQueue: EventQueue;
  private readonly eventListenerManager: EventListenerManager;
  private readonly intervalManager: IntervalManager;

  private readonly state: State = {
    model: null,
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    this.browser = new RealBrowser();
    this.logger = new BrowserLogger({
      debug: config?.debug ?? false,
    });
    this.eventQueue = new EventQueue(this.logger);

    const appId = page.id();
    const appElem = this.browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;

    this.eventListenerManager = new EventListenerManager(
      this.browser,
      this.logger,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );

    this.intervalManager = new IntervalManager(
      this.browser,
      this.logger,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );

    this.state.model = page.initialModel();
    this.initialRender();

    const effects = this.page.getEffects(this.state.model);
    this.handleEffects(effects);
  }

  public getModel(): Model {
    return this.state.model;
  }

  public send(msg: Msg, jobConfig?: JobConfig) {
    this.queueUpdate(msg, jobConfig ?? defaultJobConfig());
  }

  private updateDom(markup: string) {
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
    const groupedEffects = groupEffects(effects, this.logger);
    this.eventListenerManager.setEventListeners(groupedEffects.eventListeners);
    this.intervalManager.setIntervals(groupedEffects.intervals);
  }

  private replaceMsgPlaceholder(msg: Msg) {
    if (!isObject(msg)) {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      if (isObject(msg) && "type" in Object(value)) {
        const newValue = captureValue(
          this.browser,
          value as CaptureType,
          this.logger
        );

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
        this.update(msg);
      },
    });
  }

  private update(msg: Msg) {
    const realMsg = this.replaceMsgPlaceholder(msg);
    this.state.model = this.page.update(realMsg, this.state.model);

    const markup = this.page.viewBody(this.state.model);
    this.updateDom(markup);

    const newEffects = this.page.getEffects(this.state.model);
    this.handleEffects(newEffects);
  }
}

function isObject(obj: any) {
  return obj === Object(obj);
}

export { Orro, Config };
