type Model = any;

type Msg = PureMsg | EffectfulMsg;

interface PureMsg {
  msg: any;
}

interface SubscriptionMsg {
  type: string;
  config: EffectfulMsg | any;
}

interface Page {
  id(): string;
  init(): Model;
  update(msg: Msg, model: Model): Model;
  updateFromJs(msg: any, model: Model): Model;
  getSubscriptions(model: Model): Subscription[];
  viewBody(model: Model): string;
}

interface Effect {
  type: string;
  config:
    | DomEffect
    | TimeEffect
    | ConsoleEffect
    | NavigationEffect
    | LocalStorageEffect
    | EffectfulMsg;
}

interface NavigationEffect {
  type: string;
  config: string;
}

interface DomEffect {
  type: string;
  config:
    | DispatchEvent
    | FocusElement
    | SelectInputText
    | GetElementValue
    | GetRadioGroupValue
    | GetTargetDataValue;
}

interface ConsoleEffect {
  type: string;
  config: Log;
}

interface Log {
  message: string;
}

interface TimeEffect {
  type: string;
  config: any;
}

interface DispatchEvent {
  eventTarget: EventTarget;
  eventType: string;
  bubbles: boolean;
  cancelable: boolean;
}

interface EventTarget {
  type: string;
  config: EventTargetWindow | EventTargetDocument | EventTargetElement;
}

interface EventTargetWindow {}

interface EventTargetDocument {}

interface EventTargetElement {
  elementId: string;
}

interface FocusElement {
  elementId: string;
}

interface SelectInputText {
  elementId: string;
}

interface GetElementValue {
  elementId: string;
  parseAsJson: boolean;
}

interface GetRadioGroupValue {
  selector: string;
  parseAsJson: boolean;
}

interface GetFiles {
  elementId: string;
}

interface GetTargetDataValue {
  name: string;
  selector: string;
  parseAsJson: boolean;
}

interface LocalStorageEffect {
  type: string;
  config: LocalStorageGetItem | LocalStorageSetItem;
}

interface EffectfulMsg {
  msg: any;
  effect: Effect;
  // TODO: remove sourceEvent, the event is populated from js (not rust)
  sourceEvent: Event | null;
}

interface Subscription {
  type: string;
  config: RustEventListener | RustInterval;
}

interface RustInterval {
  id: string;
  duration: number;
  msg: SubscriptionMsg;
}

interface RustEventListener {
  id: string;
  listenTarget: string;
  eventType: string;
  matchers: EventMatcher[];
  msg: SubscriptionMsg;
  propagation: EventPropagation;
}

interface EventMatcher {
  type: string;
  config:
    | ExactSelectorMatcher
    | ClosestSelectorMatcher
    | MouseButtonMatcher
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

interface MouseButtonMatcher {
  button: string;
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

interface LocalStorageGetItem {
  key: string;
}

interface LocalStorageSetItem {
  key: string;
  value: any;
}

interface FileInfo {
  name: string;
  mime: string;
  size: number;
  lastModified: number;
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
  MouseButtonMatcher,
  KeyboardKeyMatcher,
  KeyboardComboMatcher,
  Effect,
  NavigationEffect,
  LocalStorageEffect,
  LocalStorageGetItem,
  LocalStorageSetItem,
  EffectfulMsg,
  PureMsg,
  SubscriptionMsg,
  DomEffect,
  TimeEffect,
  GetElementValue,
  GetRadioGroupValue,
  GetFiles,
  FileInfo,
  GetTargetDataValue,
  FocusElement,
  SelectInputText,
  DispatchEvent,
  EventTarget,
  EventTargetWindow,
  EventTargetDocument,
  EventTargetElement,
  ConsoleEffect,
  Log,
};
