import { Browser } from "./browser";
import { LocalStorage } from "./browser/local_storage";
import { Window, WindowSize } from "./browser/window";
import { JsonHelper } from "./json";
import { DebugDomain, Logger, Verbosity } from "./logger";
import {
  CaptureType,
  CaptureValueFromElement,
  CaptureValueFromLocalStorage,
} from "./rust_types";

class ValueExtractor {
  constructor(
    private readonly browser: Browser,
    private readonly window: Window,
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

    return null;
  }

  private fromElementValue({ elementId }: CaptureValueFromElement): any {
    const elem = this.browser.getElementById(elementId) as HTMLInputElement;

    if (elem && elem.value) {
      const jsonValue = this.jsonHelper.parse(elem.value);

      this.logger.debug({
        domain: DebugDomain.ValueExtractor,
        verbosity: Verbosity.Normal,
        message: "Got value from element",
        context: {
          elementId,
          element: elem,
          value: jsonValue,
        },
      });

      return jsonValue;
    }

    this.logger.error("Failed to capture value from element", {
      elementId,
    });

    return null;
  }

  private fromLocalStorage({ key }: CaptureValueFromLocalStorage): any {
    const value = this.localStorage.getItem(key);
    if (value == null) {
      return null;
    }

    const jsonValue = this.jsonHelper.parse(value);

    this.logger.debug({
      domain: DebugDomain.ValueExtractor,
      verbosity: Verbosity.Normal,
      message: "Got value from localStorage",
      context: {
        key,
        value: jsonValue,
      },
    });

    return jsonValue;
  }

  private windowSize(): WindowSize {
    return this.window.getSize();
  }
}

export { ValueExtractor };
