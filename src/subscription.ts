import { Browser } from "./browser";
import { Domain, Logger, Verbosity } from "./logger";
import {
  Subscription,
  RustEventListener,
  RustInterval,
  Msg,
  SubscriptionMsg,
  EffectfulMsg,
} from "./rust_types";
import { EventListenerManager } from "./subscription/event_listener";
import { IntervalManager } from "./subscription/interval";

class SubscriptionManager {
  private readonly eventListenerManager: EventListenerManager;
  private readonly intervalManager: IntervalManager;

  constructor(
    private readonly browser: Browser,
    private readonly logger: Logger,
    private readonly onMsg: (msg: Msg) => void
  ) {
    this.eventListenerManager = new EventListenerManager(
      this.browser,
      this.logger,
      (msg, event) => this.onSubscriptionMsg(msg, event)
    );

    this.intervalManager = new IntervalManager(
      this.browser,
      this.logger,
      (msg) => this.onSubscriptionMsg(msg, null)
    );
  }

  public handle(subscriptions: Subscription[]) {
    const groupedSubscriptions = groupSubscriptions(subscriptions, this.logger);

    this.logger.debug({
      domain: Domain.Subscriptions,
      verbosity: Verbosity.Normal,
      message: "Handling subscriptions",
      context: groupedSubscriptions,
    });

    this.eventListenerManager.setEventListeners(
      groupedSubscriptions.eventListeners
    );

    this.intervalManager.setIntervals(groupedSubscriptions.intervals);
  }

  private onSubscriptionMsg(subMsg: SubscriptionMsg, event: Event | null) {
    const msg = this.prepareMsg(subMsg, event);
    this.onMsg(msg);
  }

  private prepareMsg(subMsg: SubscriptionMsg, event: Event | null): Msg {
    switch (subMsg.type) {
      case "pure":
        return {
          msg: subMsg.config as any,
        };

      case "effectful":
        return {
          ...(subMsg.config as EffectfulMsg),
          sourceEvent: event,
        };

      default:
        this.logger.warn({
          domain: Domain.Subscriptions,
          message: "Unknown subscription msg type",
          context: { type: subMsg.type },
        });
    }

    throw new Error(`Unknown subscription msg type: ${subMsg.type}`);
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
        logger.warn({
          domain: Domain.Subscriptions,
          message: "Unknown subscription type",
          context: { type: subscription.type },
        });
    }
  });

  return groupedSubscriptions;
}

export { SubscriptionManager };
