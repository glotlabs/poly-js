import { Date } from "../browser/date";
import { Domain, Logger } from "../logger";
import { TimeEffect } from "../rust_types";
import { Posix, posixFromMilliseconds } from "../time";

class TimeEffectHandler {
  constructor(private readonly date: Date, private readonly logger: Logger) {}

  public handle(effect: TimeEffect): any {
    switch (effect.type) {
      case "currentTime":
        return this.currentTime();

      default:
        this.logger.warn({
          domain: Domain.Time,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  }

  private currentTime(): Posix {
    const now = this.date.now();
    return posixFromMilliseconds(now);
  }
}

export { TimeEffectHandler };
