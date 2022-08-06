import { Logger } from "./logger";
import { Subscription, RustEventListener, RustInterval } from "./rust_types";

interface GroupedSubscriptions {
  eventListeners: RustEventListener[];
  intervals: RustInterval[];
}

function groupSubscriptions(
  subscriptions: Subscription[],
  logger: Logger
): GroupedSubscriptions {
  const groupedSubscriptions: GroupedSubscriptions = {
    eventListeners: [],
    intervals: [],
  };

  subscriptions.forEach((subscription) => {
    switch (subscription.type) {
      case "eventListener":
        groupedSubscriptions.eventListeners.push(
          subscription.config as RustEventListener
        );
        break;

      case "interval":
        groupedSubscriptions.intervals.push(
          subscription.config as RustInterval
        );
        break;

      case "none":
        break;

      default:
        logger.warn("Unknown subscription type", { type: subscription.type });
    }
  });

  return groupedSubscriptions;
}

export { GroupedSubscriptions, groupSubscriptions };
