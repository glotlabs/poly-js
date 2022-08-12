import { Browser } from "./browser";
import { LocalStorage } from "./browser/local_storage";
import { Window, WindowSize } from "./browser/window";
import { JsonHelper } from "./json";
import { Domain, Logger, Verbosity } from "./logger";
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
        this.logger.warn({
          domain: Domain.ValueExtractor,
          message: "Unknown value extractor",
          context: { type },
        });
    }

    return null;
  }

  private fromElementValue({
    elementId,
    parseAsJson,
  }: CaptureValueFromElement): any {
    const elem = this.browser.getElementById(elementId) as HTMLInputElement;

    if (elem && elem.value !== undefined) {
      const value = parseAsJson
        ? this.jsonHelper.parse(elem.value)
        : elem.value;

      this.logger.debug({
        domain: Domain.ValueExtractor,
        verbosity: Verbosity.Normal,
        message: "Got value from element",
        context: {
          elementId,
          value,
        },
      });

      return value;
    }

    this.logger.error({
      domain: Domain.ValueExtractor,
      message: "Failed to capture value from element",
      context: {
        elementId,
      },
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
      domain: Domain.ValueExtractor,
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
