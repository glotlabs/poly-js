import { Browser } from "../browser";
import { Logger } from "../logger";
import { NavigationEffect } from "../rust_types";

class NavigationEffectHandler {
  constructor(
    private readonly browser: Browser,
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
        this.logger.warn("Unknown navigation effect type", {
          type: effect.type,
        });
    }
  }

  private pushUrl(url: string): void {
    this.browser.pushUrl(url);
  }

  private replaceUrl(url: string): void {
    this.browser.replaceUrl(url);
  }
}

export { NavigationEffectHandler };
