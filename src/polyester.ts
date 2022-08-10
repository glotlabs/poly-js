import morphdom from "morphdom";
import { Browser, RealBrowser } from "./browser";
import { SubscriptionManager } from "./subscription";
import { defaultJobConfig, EventQueue, JobConfig } from "./event_queue";
import {
  BrowserLogger,
  Logger,
  Config as LoggerConfig,
  defaultLoggerConfig,
  DebugDomain,
  Verbosity,
} from "./logger";
import { CaptureType, Effect, Model, Msg, Page } from "./rust_types";
import { ValueExtractor } from "./value_extractor";
import { EffectHandler } from "./effect";
import { JsonHelper } from "./json";
import { BrowserLocalStorage, LocalStorage } from "./browser/local_storage";
import { BrowserWindow, Window } from "./browser/window";

interface Config {
  loggerConfig?: LoggerConfig;
}

interface State {
  model: Model;
}

class Polyester {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;
  private readonly window: Window;
  private readonly localStorage: LocalStorage;
  private readonly logger: Logger;
  private readonly jsonHelper: JsonHelper;
  private readonly valueExtractor: ValueExtractor;
  private readonly eventQueue: EventQueue;
  private readonly subscriptionManager: SubscriptionManager;
  private readonly effectHandler: EffectHandler;

  private readonly state: State = {
    model: null,
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    this.browser = new RealBrowser();

    const appId = page.id();
    const appElem = this.browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;
    this.window = new BrowserWindow();
    this.localStorage = new BrowserLocalStorage();
    this.logger = new BrowserLogger(
      config?.loggerConfig ?? defaultLoggerConfig()
    );
    this.jsonHelper = new JsonHelper(this.logger);
    this.valueExtractor = new ValueExtractor(
      this.browser,
      this.window,
      this.localStorage,
      this.jsonHelper,
      this.logger
    );
    this.eventQueue = new EventQueue(this.logger);
    this.subscriptionManager = new SubscriptionManager(
      this.browser,
      this.logger,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );
    this.effectHandler = new EffectHandler(
      this.browser,
      this.localStorage,
      this.jsonHelper,
      this.logger,
      (msg, jobConfig) => {
        this.queueUpdate(msg, jobConfig);
      }
    );

    const { model, effects } = page.init();
    this.handleModelAndEffects(model, effects);
  }

  public getModel(): Model {
    return this.state.model;
  }

  public send(msg: Msg, jobConfig?: JobConfig) {
    this.queueUpdate(msg, jobConfig ?? defaultJobConfig());
  }

  public onCustomEffect(handler: (effect: any) => void) {
    this.effectHandler.setCustomEffectHandler(handler);
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

    this.logger.debug({
      domain: DebugDomain.Core,
      verbosity: Verbosity.Verbose,
      message: "Updated DOM with new markup",
      context: {
        markup: markup,
      },
    });
  }

  private replaceMsgPlaceholder(msg: Msg) {
    if (!isObject(msg)) {
      return msg;
    }

    const entries = Object.entries(msg).map(([key, value]) => {
      if (isObject(msg) && "type" in Object(value)) {
        const newValue = this.valueExtractor.extract(value as CaptureType);
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

    this.logger.debug({
      domain: DebugDomain.Core,
      verbosity: Verbosity.Normal,
      message: "Sending msg to rust",
      context: {
        msg: realMsg,
      },
    });

    const { model, effects } = this.page.update(realMsg, this.state.model);
    this.handleModelAndEffects(model, effects);
  }

  private handleModelAndEffects(model: Model, effects: Effect[]) {
    this.state.model = model;
    const markup = this.page.viewBody(this.state.model);
    this.updateDom(markup);

    const newSubscriptions = this.page.getSubscriptions(this.state.model);
    this.subscriptionManager.handle(newSubscriptions);
    this.effectHandler.handle(effects);
  }
}

function isObject(obj: any) {
  return obj === Object(obj);
}

export { Polyester, Config };
