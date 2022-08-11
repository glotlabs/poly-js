type Model = any;

type Msg = any;

interface Page {
  id(): string;
  init(): Model;
  update(msg: Msg, model: Model): Model;
  getSubscriptions(model: Model): Subscription[];
  viewBody(model: Model): string;
}

interface ModelAndEffects {
  model: Model;
  effects: Effect[];
}

interface Effect {
  type: string;
  config: NavigationEffect | LocalStorageEffect;
}

interface NavigationEffect {
  type: string;
  config: string;
}

interface LocalStorageEffect {
  type: string;
  config: LocalStorageGetItem | LocalStorageSetItem;
}

interface Subscription {
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
  msg: Msg;
  propagation: EventPropagation;
  queueStrategy: string;
}

enum QueueStrategy {
  Fifo,
  DropOlder,
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
  config: CaptureValueFromElement | CaptureValueFromLocalStorage;
}

interface CaptureValueFromElement {
  elementId: string;
}

interface CaptureValueFromLocalStorage {
  key: string;
}

interface LocalStorageGetItem {
  key: string;
  msg: Msg;
}

interface LocalStorageSetItem {
  key: string;
  value: any;
}

export {
  Page,
  Model,
  Msg,
  Subscription,
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
  CaptureValueFromLocalStorage,
  QueueStrategy,
  Effect,
  NavigationEffect,
  LocalStorageEffect,
  LocalStorageGetItem,
  LocalStorageSetItem,
};
