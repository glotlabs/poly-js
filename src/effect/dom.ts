import { Browser } from "../browser";
import { Window, WindowSize } from "../browser/window";
import { JsonHelper } from "../json";
import { Domain, Logger, Verbosity } from "../logger";
import { DomEffect, GetElementValue, GetRadioGroupValue } from "../rust_types";

class DomEffectHandler {
  constructor(
    private readonly browser: Browser,
    private readonly window: Window,
    private readonly jsonHelper: JsonHelper,
    private readonly logger: Logger
  ) {}

  public handle(effect: DomEffect): any {
    switch (effect.type) {
      case "getWindowSize":
        return this.getWindowSize();

      case "getElementValue":
        return this.getElementValue(effect.config as GetElementValue);

      case "getRadioGroupValue":
        return this.getRadioGroupValue(effect.config as GetRadioGroupValue);

      default:
        this.logger.warn({
          domain: Domain.Dom,
          message: "Unknown effect type",
          context: { type: effect.type },
        });
    }
  }

  private getWindowSize(): WindowSize {
    return this.window.getSize();
  }

  private getElementValue({ elementId, parseAsJson }: GetElementValue): any {
    const elem = this.browser.getElementById(elementId) as HTMLInputElement;
    const stringValue = elem?.value;

    if (isString(stringValue)) {
      const value = parseAsJson
        ? this.jsonHelper.parse(stringValue)
        : stringValue;

      this.logger.debug({
        domain: Domain.Dom,
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
      domain: Domain.Dom,
      message: "Failed to get value from element",
      context: {
        elementId,
      },
    });

    return null;
  }

  private getRadioGroupValue({
    selector,
    parseAsJson,
  }: GetRadioGroupValue): any {
    const nodeList = document.querySelectorAll<HTMLInputElement>(selector);
    const checkedElems = Array.from(nodeList).filter((elem) => elem.checked);

    if (checkedElems.length === 0) {
      return null;
    }

    const stringValue = checkedElems[0].value;

    if (isString(stringValue)) {
      const value = parseAsJson
        ? this.jsonHelper.parse(stringValue)
        : stringValue;

      this.logger.debug({
        domain: Domain.Dom,
        verbosity: Verbosity.Normal,
        message: "Got value from radio group",
        context: {
          selector,
          value,
        },
      });

      return value;
    }

    this.logger.error({
      domain: Domain.Dom,
      message: "Failed to get value from radio group",
      context: {
        selector,
      },
    });

    return null;
  }
}

function isString(value: any): boolean {
  return typeof value === "string";
}

export { DomEffectHandler };
