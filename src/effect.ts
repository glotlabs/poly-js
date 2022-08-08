import { Browser } from "./browser";
import { NavigationEffectHandler } from "./effect/navigation";
import { Logger } from "./logger";
import { Effect, NavigationEffect } from "./rust_types";

class EffectHandler {
  private readonly navigationHandler: NavigationEffectHandler;

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
  }
}

interface GroupedEffects {
  navigationEffects: NavigationEffect[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = {
    navigationEffects: [],
  };

  effects.forEach((effect) => {
    switch (effect.type) {
      case "navigation":
        groupedEffects.navigationEffects.push(
          effect.config as NavigationEffect
        );
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
