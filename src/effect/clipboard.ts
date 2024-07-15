import { ClipboardInterface } from "../browser/clipboard";
import { Domain, Logger } from "../logger";
import { ClipboardEffect, WriteText } from "../rust_types";

class ClipboardEffectHandler {
  constructor(
    private readonly console: ClipboardInterface,
    private readonly logger: Logger
  ) { }

  public handle(effect: ClipboardEffect): any {
    switch (effect.type) {
      case "writeText":
        return this.writeText(effect.config as WriteText);

      default:
        this.logger.warn({
          domain: Domain.Clipboard,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  }

  private writeText(config: WriteText): void {
    this.console.writeText(config.text);
  }
}

export { ClipboardEffectHandler };
