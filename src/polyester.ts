import morphdom from "morphdom";
import { Browser, RealBrowser } from "./browser";
import { SubscriptionManager } from "./subscription";
import {
  BrowserLogger,
  Logger,
  Config as LoggerConfig,
  defaultLoggerConfig,
  Domain,
  Verbosity,
} from "./logger";
import { Effect, Model, Msg, Page } from "./rust_types";
import { EffectHandler } from "./effect";
import { JsonHelper } from "./json";
import { BrowserLocalStorage, LocalStorage } from "./browser/local_storage";
import { BrowserWindow, Window } from "./browser/window";
import { BrowserHistory, History } from "./browser/history";
import {
  Config as AppEffectConfig,
  defaultAppEffectConfig,
} from "./effect/app";
import { BrowserDate, Date } from "./browser/date";
import { BrowserConsole, ConsoleInterface } from "./browser/console";
import { BrowserLocation, LocationInterface } from "./browser/location";

interface Config {
  loggerConfig?: LoggerConfig;
  appEffectConfig?: AppEffectConfig;
}

interface State {
  model: Model;
}

class Polyester {
  private readonly appElem: HTMLElement;
  private readonly browser: Browser;
  private readonly console: ConsoleInterface;
  private readonly window: Window;
  private readonly date: Date;
  private readonly localStorage: LocalStorage;
  private readonly logger: Logger;
  private readonly jsonHelper: JsonHelper;
  private readonly history: History;
  private readonly location: LocationInterface;
  private readonly subscriptionManager: SubscriptionManager;
  private readonly effectHandler: EffectHandler;

  private readonly state: State = {
    model: null,
  };

  constructor(private readonly page: Page, private readonly config?: Config) {
    this.browser = new RealBrowser();
    this.console = new BrowserConsole();

    const appId = page.id();
    const appElem = this.browser.getElementById(appId);
    if (!appElem) {
      throw new Error(`Could not find element with id '${appId}'`);
    }

    this.appElem = appElem;
    this.window = new BrowserWindow();
    this.date = new BrowserDate();
    this.localStorage = new BrowserLocalStorage();
    this.logger = new BrowserLogger(
      config?.loggerConfig ?? defaultLoggerConfig()
    );
    this.jsonHelper = new JsonHelper(this.logger);
    this.history = new BrowserHistory();
    this.location = new BrowserLocation();
    this.subscriptionManager = new SubscriptionManager(
      this.browser,
      this.logger,
      (msg: any) => {
        this.update(msg);
      }
    );
    this.effectHandler = new EffectHandler(
      this.config?.appEffectConfig ?? defaultAppEffectConfig(),
      this.browser,
      this.console,
      this.window,
      this.date,
      this.history,
      this.location,
      this.localStorage,
      this.jsonHelper,
      this.logger,
      (msg: Msg) => {
        this.update(msg);
      }
    );
  }

  public init() {
    const { model, effects } = this.page.init();
    this.handleModelAndEffects(model, effects);
  }

  // TODO: Return proper types from RustEnum and replace any
  public send(msg: Msg) {
    this.update({ msg });
  }

  public onAppEffect(handler: (effect: any) => void) {
    this.effectHandler.setAppEffectHandler(handler);
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
      domain: Domain.Core,
      verbosity: Verbosity.Verbose,
      message: "Updated DOM with new markup",
      context: {
        markup: markup,
      },
    });
  }

  private prepareMsg(msg: Msg): any {
    if (!("effect" in msg)) {
      return msg.msg;
    }

    const effectResult = this.effectHandler.run(msg.effect, msg.sourceEvent);

    if (!isObject(msg.msg)) {
      return msg.msg;
    }

    const entries = Object.entries(msg.msg);

    const newEntries = entries.map(([key, value]) => {
      if (value === "$CAPTURE_VALUE") {
        return [key, effectResult];
      }
      return [key, value];
    });

    return Object.fromEntries(newEntries);
  }

  private update(msg: Msg) {
    const realMsg = this.prepareMsg(msg);

    this.logger.debug({
      domain: Domain.Core,
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
    this.logger.debug({
      domain: Domain.Core,
      verbosity: Verbosity.Normal,
      message: "Updating model",
      context: { model },
    });

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
