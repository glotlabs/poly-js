import { Browser } from "./browser";
import { JobConfig } from "./event_queue";
import { DebugDomain, Logger, Verbosity } from "./logger";
import {
  Subscription,
  RustEventListener,
  RustInterval,
  Msg,
} from "./rust_types";
import { EventListenerManager } from "./subscription/event_listener";
import { IntervalManager } from "./subscription/interval";

class SubscriptionManager {
  private readonly eventListenerManager: EventListenerManager;
  private readonly intervalManager: IntervalManager;

  constructor(
    private readonly browser: Browser,
    private readonly logger: Logger,
    private readonly onMsg: (msg: Msg, jobConfig: JobConfig) => void
  ) {
    this.eventListenerManager = new EventListenerManager(
      this.browser,
      this.logger,
      this.onMsg
    );

    this.intervalManager = new IntervalManager(
      this.browser,
      this.logger,
      this.onMsg
    );
  }

  public handle(subscriptions: Subscription[]) {
    const groupedSubscriptions = groupSubscriptions(subscriptions, this.logger);

    this.logger.debug({
      domain: DebugDomain.Subscriptions,
      verbosity: Verbosity.Normal,
      message: "Handling subscriptions",
      context: groupedSubscriptions,
    });

    this.eventListenerManager.setEventListeners(
      groupedSubscriptions.eventListeners
    );

    this.intervalManager.setIntervals(groupedSubscriptions.intervals);
  }
}

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

export { SubscriptionManager };
