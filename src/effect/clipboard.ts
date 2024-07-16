import { ClipboardInterface } from "../browser/clipboard";
import { Domain, Logger } from "../logger";
import { ClipboardEffect, JsMsg, WriteText } from "../rust_types";

class ClipboardEffectHandler {
  constructor(
    private readonly console: ClipboardInterface,
    private readonly logger: Logger
  ) { }

  public handle(effect: ClipboardEffect): JsMsg | null {
    switch (effect.type) {
      case "writeText":
        return this.writeText(effect.config as WriteText);

      default:
        this.logger.warn({
          domain: Domain.Clipboard,
          message: "Unknown effect type",
          context: { type: effect.type },
        });

        return null;
    }
  }

  private writeText(config: WriteText): JsMsg {
    try {
      this.console.writeText(config.text);
      return {
        type: config.successMsgName,
        data: null,
      };

    } catch (e: any) {
      this.logger.error({
        domain: Domain.Clipboard,
        message: "Failed to write text to clipboard",
        context: { error: e },
      });

      return {
        type: config.failureMsgName,
        data: e.message,
      };
    }
  }
}

export { ClipboardEffectHandler };
