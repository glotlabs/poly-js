import { Effect, RustEventListener, RustInterval } from "./rust_types";

interface GroupedEffects {
  eventListeners: RustEventListener[];
  intervals: RustInterval[];
}

function groupEffects(effects: Effect[]): GroupedEffects {
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
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  });

  return groupedEffects;
}

export { GroupedEffects, groupEffects };
