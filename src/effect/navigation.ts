import { History } from "../browser/history";
import { Domain, Logger } from "../logger";
import { NavigationEffect } from "../rust_types";

class NavigationEffectHandler {
  constructor(
    private readonly history: History,
    private readonly logger: Logger
  ) {}

  public handle(effect: NavigationEffect): void {
    switch (effect.type) {
      case "pushUrl":
        this.pushUrl(effect.config);
        break;

      case "replaceUrl":
        this.replaceUrl(effect.config);
        break;

      default:
        this.logger.warn({
          domain: Domain.Navigation,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  }

  private pushUrl(url: string): void {
    this.history.pushUrl(url);
  }

  private replaceUrl(url: string): void {
    this.history.replaceUrl(url);
  }
}

export { NavigationEffectHandler };
