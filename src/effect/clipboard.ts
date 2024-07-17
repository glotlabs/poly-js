import { ClipboardInterface } from "../browser/clipboard";
import { Domain, Logger } from "../logger";
import { ClipboardEffect, WriteText, WriteTextResult } from "../rust_types";

class ClipboardEffectHandler {
  constructor(
    private readonly console: ClipboardInterface,
    private readonly logger: Logger
  ) { }

  public handle(effect: ClipboardEffect): Promise<WriteTextResult | void> {
    switch (effect.type) {
      case "writeText":
        const result = this.writeText(effect.config as WriteText);
        return Promise.resolve(result);

      default:
        this.logger.warn({
          domain: Domain.Clipboard,
          message: "Unknown effect type",
          context: { type: effect.type },
        });

        return Promise.resolve();
    }
  }

  private writeText(config: WriteText): WriteTextResult {
    try {
      this.console.writeText(config.text);

      return {
        success: true,
        error: null,
      };
    } catch (e: any) {
      this.logger.error({
        domain: Domain.Clipboard,
        message: "Failed to write text to clipboard",
        context: { error: e },
      });

      return {
        success: false,
        error: e.message,
      };
    }
  }
}

export { ClipboardEffectHandler };
