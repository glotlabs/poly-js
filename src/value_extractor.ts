import { Browser, LocalStorage, WindowSize } from "./browser";
import { JsonHelper } from "./json";
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
    private readonly jsonHelper: JsonHelper,
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
      return this.jsonHelper.parse(elem.value);
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

    return this.jsonHelper.parse(value);
  }

  private windowSize(): WindowSize {
    return this.browser.getWindowSize();
  }
}

export { ValueExtractor };
