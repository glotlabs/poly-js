import { Browser, LocalStorage } from "./browser";
import { CustomEffectHandler } from "./effect/custom";
import { LocalStorageEffectHandler } from "./effect/local_storage";
import { NavigationEffectHandler } from "./effect/navigation";
import { JobConfig } from "./event_queue";
import { Logger } from "./logger";
import {
  Effect,
  LocalStorageEffect,
  Msg,
  NavigationEffect,
} from "./rust_types";

class EffectHandler {
  private readonly navigationHandler: NavigationEffectHandler;
  private readonly localStorageHandler: LocalStorageEffectHandler;
  private readonly customHandler: CustomEffectHandler;

  constructor(
    private readonly browser: Browser,
    private readonly localStorage: LocalStorage,
    private readonly logger: Logger,
    private readonly onMsg: (msg: Msg, jobConfig: JobConfig) => void
  ) {
    this.navigationHandler = new NavigationEffectHandler(
      this.browser,
      this.logger
    );

    this.localStorageHandler = new LocalStorageEffectHandler(
      this.localStorage,
      this.logger,
      this.onMsg
    );

    this.customHandler = new CustomEffectHandler(
      { useBacklog: true },
      this.logger
    );
  }

  public handle(effects: Effect[]) {
    const groupedEffects = groupEffects(effects, this.logger);
    this.logger.debug("Handling effects", groupedEffects);

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

  public setCustomEffectHandler(handler: (effect: any) => void) {
    this.customHandler.setHandler(handler);
  }
}

interface GroupedEffects {
  navigationEffects: NavigationEffect[];
  localStorageEffects: LocalStorageEffect[];
  customEffects: any[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = {
    navigationEffects: [],
    localStorageEffects: [],
    customEffects: [],
  };

  effects.forEach((effect) => {
    switch (effect.type) {
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
        logger.warn("Unknown effect type", { type: effect.type });
    }
  });

  return groupedEffects;
}

export { EffectHandler };
