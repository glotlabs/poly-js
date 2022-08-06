import { Logger } from "./logger";
import { Effect, RustEventListener, RustInterval } from "./rust_types";

interface GroupedEffects {
  eventListeners: RustEventListener[];
  intervals: RustInterval[];
}

function groupEffects(effects: Effect[], logger: Logger): GroupedEffects {
  const groupedEffects: GroupedEffects = { eventListeners: [], intervals: [] };

  effects.forEach((effect) => {
    switch (effect.type) {
      case "eventListener":
        groupedEffects.eventListeners.push(effect.config as RustEventListener);
        break;

      case "interval":
        groupedEffects.intervals.push(effect.config as RustInterval);
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
