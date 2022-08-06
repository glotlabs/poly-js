import { Browser, WindowSize } from "./browser";
import { CaptureType, CaptureValueFromElement } from "./rust_types";

function captureValue(browser: Browser, captureType: CaptureType): any {
  switch (captureType.type) {
    case "valueFromElement":
      return captureValueFromElement(
        browser,
        captureType.config as CaptureValueFromElement
      );

    case "windowSize":
      return captureWindowSize(browser);

    default:
      console.warn(`Unknown capture value type: ${captureType.type}`);
  }

  return `Failed to capture value of type '${captureType.type}'`;
}

function captureValueFromElement(
  browser: Browser,
  config: CaptureValueFromElement
) {
  const elem = browser.getElementById(config.elementId) as HTMLInputElement;

  if (elem && elem.value) {
    return safeJsonParse(elem.value);
  }

  return `Failed to capture element value from element with id: '${config.elementId}'`;
}

function captureWindowSize(browser: Browser): WindowSize {
  return browser.getWindowSize();
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error(e);
    return "";
  }
}

export { captureValue };
