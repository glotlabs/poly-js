import { Browser, LocalStorage } from "./browser";
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

interface State {
  customEffectHandler: (effect: any) => void;
}

class EffectHandler {
  private readonly navigationHandler: NavigationEffectHandler;
  private readonly localstorageHandler: LocalStorageEffectHandler;

  private readonly state: State = {
    customEffectHandler: () => {},
  };

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

    this.localstorageHandler = new LocalStorageEffectHandler(
      this.localStorage,
      this.logger,
      this.onMsg
    );
  }

  public handle(effects: Effect[]) {
    const groupedEffects = groupEffects(effects, this.logger);
    this.logger.debug("Handling effects", groupedEffects);

    groupedEffects.navigationEffects.forEach((effect) => {
      this.navigationHandler.handle(effect);
    });

    groupedEffects.localStorageEffects.forEach((effect) => {
      this.localstorageHandler.handle(effect);
    });

    groupedEffects.customEffects.forEach((effect) => {
      this.state.customEffectHandler(effect);
    });
  }

  public setCustomEffectHandler(handler: (effect: any) => void) {
    this.state.customEffectHandler = handler;
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
