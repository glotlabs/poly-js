import { ConsoleInterface } from "../browser/console";
import { Domain, Logger } from "../logger";
import { ConsoleEffect, Log } from "../rust_types";

class ConsoleEffectHandler {
  constructor(
    private readonly console: ConsoleInterface,
    private readonly logger: Logger
  ) {}

  public handle(effect: ConsoleEffect): any {
    switch (effect.type) {
      case "log":
        return this.log(effect.config as Log);

      default:
        this.logger.warn({
          domain: Domain.Console,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  }

  private log(config: Log): void {
    this.console.log(config.message);
  }
}

export { ConsoleEffectHandler };
