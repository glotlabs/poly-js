import { Browser, LocalStorage, WindowSize } from "./browser";
import { Logger } from "./logger";
import {
  CaptureType,
  CaptureValueFromElement,
  CaptureValueFromLocalStorage,
} from "./rust_types";

function captureValue(
  browser: Browser,
  localStorage: LocalStorage,
  captureType: CaptureType,
  logger: Logger
): any {
  switch (captureType.type) {
    case "valueFromElement":
      return captureValueFromElement(
        browser,
        captureType.config as CaptureValueFromElement,
        logger
      );

    case "valueFromLocalStorage":
      return captureValueFromLocalStorage(
        localStorage,
        captureType.config as CaptureValueFromLocalStorage,
        logger
      );

    case "windowSize":
      return captureWindowSize(browser);

    default:
      logger.warn("Unknown capture value type", { type: captureType.type });
  }

  return `Failed to capture value of type '${captureType.type}'`;
}

function captureValueFromElement(
  browser: Browser,
  config: CaptureValueFromElement,
  logger: Logger
) {
  const elem = browser.getElementById(config.elementId) as HTMLInputElement;

  if (elem && elem.value) {
    return safeJsonParse(elem.value, logger);
  }

  logger.error("Failed to capture value from element", {
    elementId: config.elementId,
  });

  return `Failed to capture element value from element with id: '${config.elementId}'`;
}

function captureValueFromLocalStorage(
  localStorage: LocalStorage,
  config: CaptureValueFromLocalStorage,
  logger: Logger
): any {
  const value = localStorage.getItem(config.key);
  if (value == null) {
    return null;
  }

  return safeJsonParse(value, logger);
}

function captureWindowSize(browser: Browser): WindowSize {
  return browser.getWindowSize();
}

function safeJsonParse(s: string, logger: Logger) {
  try {
    return JSON.parse(s);
  } catch (e) {
    logger.error("Failed to parse json", { string: s, exception: e });
    return "";
  }
}

export { captureValue };
