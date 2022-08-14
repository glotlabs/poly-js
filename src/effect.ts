import { History } from "./browser/history";
import { LocalStorage } from "./browser/local_storage";
import { CustomEffectHandler } from "./effect/custom";
import { LocalStorageEffectHandler } from "./effect/local_storage";
import { NavigationEffectHandler } from "./effect/navigation";
import { JsonHelper } from "./json";
import { Domain, Logger, Verbosity } from "./logger";
import { Config as CustomEffectConfig } from "./effect/custom";
import {
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

class EffectHandler {
  private readonly domHandler: DomEffectHandler;
  private readonly timeHandler: TimeEffectHandler;
  private readonly navigationHandler: NavigationEffectHandler;
  private readonly localStorageHandler: LocalStorageEffectHandler;
  private readonly customHandler: CustomEffectHandler;

  constructor(
    private readonly customEffectConfig: CustomEffectConfig,
    private readonly browser: Browser,
    private readonly window: Window,
    private readonly date: Date,
    private readonly history: History,
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

    this.timeHandler = new TimeEffectHandler(this.date, this.logger);

    this.navigationHandler = new NavigationEffectHandler(
      this.history,
      this.logger
    );

    this.localStorageHandler = new LocalStorageEffectHandler(
      this.localStorage,
      this.jsonHelper,
      this.logger
    );

    this.customHandler = new CustomEffectHandler(
      this.customEffectConfig,
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

    groupedEffects.navigationEffects.forEach((effect) => {
      this.navigationHandler.handle(effect);
    });

    groupedEffects.localStorageEffects.forEach((effect) => {
      this.localStorageHandler.handle(effect);
    });

    groupedEffects.customEffects.forEach((effect) => {
      this.customHandler.handle(effect);
    });
  }

  public run(effect: Effect): any {
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
        return this.domHandler.handle(effect.config as DomEffect);

      case "time":
        return this.timeHandler.handle(effect.config as TimeEffect);

      case "custom":
        return this.customHandler.handle(effect.config);

      default:
        this.logger.error({
          domain: Domain.Effects,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }

    throw new Error(`Unknown effect type: ${effect.type}`);
  }

  public setCustomEffectHandler(handler: (effect: any) => void) {
    this.customHandler.setHandler(handler);
  }

  private handleEffectfulMsg({ msg, effect }: EffectfulMsg): void {
    this.onMsg({ msg, effect });
  }
}

interface GroupedEffects {
  effectfulMsgEffects: EffectfulMsg[];
  navigationEffects: NavigationEffect[];
  localStorageEffects: LocalStorageEffect[];
  customEffects: any[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = {
    effectfulMsgEffects: [],
    navigationEffects: [],
    localStorageEffects: [],
    customEffects: [],
  };

  effects.forEach((effect) => {
    switch (effect.type) {
      case "effectfulMsg":
        groupedEffects.effectfulMsgEffects.push(effect.config as EffectfulMsg);
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

      case "custom":
        groupedEffects.customEffects.push(effect.config);
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
