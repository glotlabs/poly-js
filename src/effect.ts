import { History } from "./browser/history";
import { LocalStorage } from "./browser/local_storage";
import { AppEffectHandler } from "./effect/app";
import { LocalStorageEffectHandler } from "./effect/local_storage";
import { NavigationEffectHandler } from "./effect/navigation";
import { JsonHelper } from "./json";
import { Domain, Logger, Verbosity } from "./logger";
import { Config as AppEffectConfig } from "./effect/app";
import {
  ConsoleEffect,
  DomEffect,
  Effect,
  EffectfulMsg,
  LocalStorageEffect,
  Msg,
  NavigationEffect,
  TimeEffect,
} from "./rust_types";
import { DomEffectHandler } from "./effect/dom";
import { Window } from "./browser/window";
import { Browser } from "./browser";
import { TimeEffectHandler } from "./effect/time";
import { Date } from "./browser/date";
import { ConsoleEffectHandler } from "./effect/console";
import { ConsoleInterface } from "./browser/console";
import { LocationInterface } from "./browser/location";

class EffectHandler {
  private readonly domHandler: DomEffectHandler;
  private readonly consoleHandler: ConsoleEffectHandler;
  private readonly timeHandler: TimeEffectHandler;
  private readonly navigationHandler: NavigationEffectHandler;
  private readonly localStorageHandler: LocalStorageEffectHandler;
  private readonly appEffectHandler: AppEffectHandler;

  constructor(
    private readonly appEffectConfig: AppEffectConfig,
    private readonly browser: Browser,
    private readonly console: ConsoleInterface,
    private readonly window: Window,
    private readonly date: Date,
    private readonly history: History,
    private readonly location: LocationInterface,
    private readonly localStorage: LocalStorage,
    private readonly jsonHelper: JsonHelper,
    private readonly logger: Logger,
    private readonly onMsg: (msg: Msg) => void
  ) {
    this.domHandler = new DomEffectHandler(
      this.browser,
      this.window,
      this.jsonHelper,
      this.logger
    );

    this.consoleHandler = new ConsoleEffectHandler(this.console, this.logger);

    this.timeHandler = new TimeEffectHandler(this.date, this.logger);

    this.navigationHandler = new NavigationEffectHandler(
      this.history,
      this.location,
      this.logger
    );

    this.localStorageHandler = new LocalStorageEffectHandler(
      this.localStorage,
      this.jsonHelper,
      this.logger
    );

    this.appEffectHandler = new AppEffectHandler(
      this.appEffectConfig,
      this.logger
    );
  }

  public handle(effects: Effect[]) {
    const groupedEffects = groupEffects(effects, this.logger);

    this.logger.debug({
      domain: Domain.Effects,
      verbosity: Verbosity.Normal,
      message: "Handling effects",
      context: groupedEffects,
    });

    groupedEffects.effectfulMsgEffects.forEach((effect) => {
      this.handleEffectfulMsg(effect);
    });

    groupedEffects.domEffects.forEach((effect) => {
      this.domHandler.handle(effect, null);
    });

    groupedEffects.consoleEffects.forEach((effect) => {
      this.consoleHandler.handle(effect);
    });

    groupedEffects.navigationEffects.forEach((effect) => {
      this.navigationHandler.handle(effect);
    });

    groupedEffects.localStorageEffects.forEach((effect) => {
      this.localStorageHandler.handle(effect);
    });

    groupedEffects.appEffects.forEach((effect) => {
      this.appEffectHandler.handle(effect);
    });
  }

  public run(effect: Effect, sourceEvent: Event | null): any {
    switch (effect.type) {
      case "none":
        throw new Error("Cannot run 'none' effect");

      case "effectfulMsg":
        throw new Error("Cannot run 'effectful message' effect");

      case "navigation":
        return this.navigationHandler.handle(effect.config as NavigationEffect);

      case "localStorage":
        return this.localStorageHandler.handle(
          effect.config as LocalStorageEffect
        );

      case "dom":
        return this.domHandler.handle(effect.config as DomEffect, sourceEvent);

      case "console":
        return this.consoleHandler.handle(effect.config as ConsoleEffect);

      case "time":
        return this.timeHandler.handle(effect.config as TimeEffect);

      case "app":
        return this.appEffectHandler.handle(effect.config);

      default:
        this.logger.error({
          domain: Domain.Effects,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }

    throw new Error(`Unknown effect type: ${effect.type}`);
  }

  public setAppEffectHandler(handler: (effect: any) => void) {
    this.appEffectHandler.setHandler(handler);
  }

  private handleEffectfulMsg({ msg, effect }: EffectfulMsg): void {
    this.onMsg({ msg, effect });
  }
}

interface GroupedEffects {
  effectfulMsgEffects: EffectfulMsg[];
  domEffects: DomEffect[];
  consoleEffects: ConsoleEffect[];
  navigationEffects: NavigationEffect[];
  localStorageEffects: LocalStorageEffect[];
  appEffects: any[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = {
    effectfulMsgEffects: [],
    domEffects: [],
    consoleEffects: [],
    navigationEffects: [],
    localStorageEffects: [],
    appEffects: [],
  };

  effects.forEach((effect) => {
    switch (effect.type) {
      case "effectfulMsg":
        groupedEffects.effectfulMsgEffects.push(effect.config as EffectfulMsg);
        break;

      case "dom":
        groupedEffects.domEffects.push(effect.config as DomEffect);
        break;

      case "console":
        groupedEffects.consoleEffects.push(effect.config as ConsoleEffect);
        break;

      case "navigation":
        groupedEffects.navigationEffects.push(
          effect.config as NavigationEffect
        );
        break;

      case "localStorage":
        groupedEffects.localStorageEffects.push(
          effect.config as LocalStorageEffect
        );
        break;

      case "app":
        groupedEffects.appEffects.push(effect.config);
        break;

      case "none":
        break;

      default:
        logger.warn({
          domain: Domain.Effects,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  });

  return groupedEffects;
}

export { EffectHandler };
