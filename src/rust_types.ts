type Model = any;

type Msg = any;

interface Page {
  id(): string;
  initialModel(): Model;
  update(msg: Msg, model: Model): Model;
  getEffects(model: Model): Effect[];
  viewBody(model: Model): string;
}

interface Effect {
  type: string;
  config: RustEventListener | RustInterval;
}

interface RustInterval {
  id: string;
  duration: number;
  msg: Msg;
  queueStrategy: string;
}

interface RustEventListener {
  id: string;
  listenTarget: string;
  eventType: string;
  matchers: EventMatcher[];
  selector: string;
  msg: Msg;
  propagation: EventPropagation;
  queueStrategy: string;
}

interface EventMatcher {
  type: string;
  config:
    | ExactSelectorMatcher
    | ClosestSelectorMatcher
    | KeyboardKeyMatcher
    | KeyboardComboMatcher;
}

interface ExactSelectorMatcher {
  selector: string;
}

interface ClosestSelectorMatcher {
  selector: string;
}

interface KeyboardKeyMatcher {
  key: string;
}

interface KeyboardComboMatcher {
  combo: KeyboardCombo;
}

interface EventPropagation {
  stopPropagation: boolean;
  preventDefault: boolean;
}

interface KeyboardCombo {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface DebounceConfig {
  delay: number;
  leading: boolean;
  trailing: boolean;
}

interface CaptureType {
  type: string;
  config: CaptureValueFromElement;
}

interface CaptureValueFromElement {
  elementId: string;
}

export {
  Page,
  Model,
  Msg,
  Effect,
  RustInterval,
  RustEventListener,
  KeyboardCombo,
  DebounceConfig,
  EventMatcher,
  ExactSelectorMatcher,
  ClosestSelectorMatcher,
  KeyboardKeyMatcher,
  KeyboardComboMatcher,
  CaptureType,
  CaptureValueFromElement,
};
