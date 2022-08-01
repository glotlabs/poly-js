type Model = any;

type Msg = any;

interface Page {
  initialModel(): Model;
  update(msg: Msg, model: Model): Model;
  getLogic(model: Model): Logic;
  viewBody(model: Model): string;
}

interface Logic {
  eventListeners: RustEventListener[];
  intervals: RustInterval[];
}

interface RustInterval {
  id: string;
  duration: number;
  msg: Msg;
  queueStrategy: string;
}

interface RustEvent {
  type: string;
  config: EventConfig | KeyboardEventConfig;
}

interface RustEventListener {
  id: string;
  selector: string;
  event: RustEvent;
  msg: Msg;
  queueStrategy: string;
}

interface EventConfig {
  stopPropagation: boolean;
  preventDefault: boolean;
  matchParentElements: boolean;
}

interface KeyboardEventConfig {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  debounce: DebounceConfig;
  event: EventConfig;
}

interface DebounceConfig {
  delay: number;
  leading: boolean;
  trailing: boolean;
}

export {
  Page,
  Model,
  Msg,
  Logic,
  RustInterval,
  RustEventListener,
  EventConfig,
  KeyboardEventConfig,
  DebounceConfig,
};
