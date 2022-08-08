import { Logger } from "./logger";
import { Effect, NavigationEffect } from "./rust_types";

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

export { GroupedEffects, groupEffects };
