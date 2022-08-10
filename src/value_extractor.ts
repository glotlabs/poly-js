import { Browser, LocalStorage, WindowSize } from "./browser";
import { Logger } from "./logger";
import {
  CaptureType,
  CaptureValueFromElement,
  CaptureValueFromLocalStorage,
} from "./rust_types";

class ValueExtractor {
  constructor(
    private readonly browser: Browser,
    private readonly localStorage: LocalStorage,
    private readonly logger: Logger
  ) {}

  public extract({ type, config }: CaptureType): any {
    switch (type) {
      case "valueFromElement":
        return this.fromElementValue(config as CaptureValueFromElement);

      case "valueFromLocalStorage":
        return this.fromLocalStorage(config as CaptureValueFromLocalStorage);

      case "windowSize":
        return this.windowSize();

      default:
        this.logger.error("Unknown value capture type", { type });
    }

    return "";
  }

  private fromElementValue({ elementId }: CaptureValueFromElement): any {
    const elem = this.browser.getElementById(elementId) as HTMLInputElement;

    if (elem && elem.value) {
      return safeJsonParse(elem.value, this.logger);
    }

    this.logger.error("Failed to capture value from element", {
      elementId,
    });

    return "";
  }

  private fromLocalStorage({ key }: CaptureValueFromLocalStorage): any {
    const value = this.localStorage.getItem(key);
    if (value == null) {
      return null;
    }

    return safeJsonParse(value, this.logger);
  }

  private windowSize(): WindowSize {
    return this.browser.getWindowSize();
  }
}

function safeJsonParse(s: string, logger: Logger) {
  try {
    return JSON.parse(s);
  } catch (e) {
    logger.error("Failed to parse json", { string: s, exception: e });
    return "";
  }
}

export { ValueExtractor };
