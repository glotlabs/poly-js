import { Browser } from "./browser";
import { NavigationEffectHandler } from "./effect/navigation";
import { Logger } from "./logger";
import { Effect, NavigationEffect } from "./rust_types";

interface State {
  customEffectHandler: (effect: any) => void;
}

class EffectHandler {
  private readonly navigationHandler: NavigationEffectHandler;

  private readonly state: State = {
    customEffectHandler: () => {},
  };

  constructor(
    private readonly browser: Browser,
    private readonly logger: Logger
  ) {
    this.navigationHandler = new NavigationEffectHandler(
      this.browser,
      this.logger
    );
  }

  public handle(effects: Effect[]) {
    const groupedEffects = groupEffects(effects, this.logger);

    groupedEffects.navigationEffects.forEach((effect) => {
      this.navigationHandler.handle(effect);
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
  customEffects: any[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = {
    navigationEffects: [],
    customEffects: [],
  };

  effects.forEach((effect) => {
    switch (effect.type) {
      case "navigation":
        groupedEffects.navigationEffects.push(
          effect.config as NavigationEffect
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
