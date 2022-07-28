import morphdom from "morphdom";

const orro = {
  eventListeners: [],
  intervals: [],
  eventQueue: initEventQueue(),
  msgHandler: (msg) => {},
};

function startInterval(interval) {
  if (interval.duration < 100) {
    console.warn("Ignoring interval with low duration: ${interval.duration}ms");
    return interval;
  }

  interval.id = setInterval(() => {
    queueUpdate({
      id: getIntervalId(interval),
      strategy: interval.queueStrategy,
      msg: interval.msg,
    });
  }, interval.duration);

  return interval;
}

function getIntervalId(interval) {
  return `${interval.id}-${interval.msg}-${interval.duration}`;
}

function initEventQueue() {
  const state = {
    queue: [],
    processing: false,
  };

  function enqueue({ id, strategy, action }) {
    if (state.queue.length > 100) {
      console.warn("Event queue is full, dropping event", id);
      return;
    }

    if (strategy === "dropOlder") {
      state.queue = state.queue.filter((item) => item.id !== id);
    }

    new Promise((resolve, reject) => {
      state.queue.push({
        id,
        action,
        resolve,
        reject,
      });
    });

    if (!state.processing) {
      processNext();
    }
  }

  async function processNext() {
    const event = state.queue.shift();
    if (!event) {
      return;
    }

    state.processing = true;

    try {
      event.action();
      event.resolve();
    } catch (e) {
      event.reject();
    }

    state.processing = false;
    processNext();
  }

  return {
    enqueue,
  };
}

function prepareEventHandlers(eventListeners) {
  return eventListeners.reduce((acc, listener) => {
    const type = listener.event.type;

    if (!(type in acc)) {
      acc[type] = [];
    }

    acc[type].push({
      config: listener.event.config,
      id: listener.id,
      selector: listener.selector,
      msg: listener.msg,
      queueStrategy: listener.queueStrategy,
    });

    return acc;
  }, {});
}

function updateEventListeners(eventListeners) {
  const currentListeners = { ...orro.eventListeners };

  eventListeners.forEach((listener) => {
    removeEventListeners(currentListeners, listener.id);
  });

  // TODO: call document.addEventListener on new event types (onclick, etc)
  const handlers = prepareEventHandlers(eventListeners);
  addEventHandlers(currentListeners, handlers);

  orro.eventListeners = currentListeners;
}

function addEventHandlers(currentListeners, eventListeners) {
  Object.entries(eventListeners).forEach(([eventName, handlers]) => {
    const currentHandlers = currentListeners[eventName] || [];
    currentListeners[eventName] = currentHandlers.concat(handlers);
  });
}

function removeEventListeners(currentListeners, id) {
  Object.entries(currentListeners).forEach(([eventName, handlers]) => {
    currentListeners[eventName] = (handlers as any[]).filter((handler) => {
      return handler.id !== id;
    });
  });
}

function updateIntervals(intervals) {
  const currentIntervals = orro.intervals;

  const newIds = intervals.map(getIntervalId);
  const currentIds = currentIntervals.map(getIntervalId);

  // Stop intervals that does not exist anymore
  currentIntervals
    .filter((interval) => {
      const id = getIntervalId(interval);
      return !newIds.includes(id);
    })
    .forEach((interval) => {
      clearInterval(interval.id);
    });

  // Get existing intervals that we want to keep
  const continuingIntervals = currentIntervals.filter((interval) => {
    const id = getIntervalId(interval);
    return newIds.includes(id);
  });

  // Start new intervals
  const newIntervals = intervals
    .filter((interval) => {
      const id = getIntervalId(interval);
      return !currentIds.includes(id);
    })
    .map(startInterval);

  orro.intervals = [].concat(continuingIntervals, newIntervals);
}

function handleEvent(e, eventName) {
  const elem = e.target;
  const handlers = orro.eventListeners[eventName];

  handlers
    .filter((handler) => {
      return elem.closest(handler.selector);
    })
    .forEach((handler) => {
      if (handler.config.event.preventDefault) {
        e.preventDefault();
      }

      if (handler.config.event.stopPropagation) {
        e.stopPropagation();
      }

      const msg = replaceMsgPlaceholder(handler.msg, elem);

      queueUpdate({
        id: handler.selector,
        strategy: handler.queueStrategy,
        msg,
      });
    });
}

function replacePlaceholderValue(value) {
  if (value.startsWith("VALUE_FROM_ID:")) {
    const elemId = value.replace("VALUE_FROM_ID:", "");
    const elem = document.getElementById(elemId) as HTMLInputElement;
    if (elem && elem.value) {
      return elem.value;
    }

    return "";
  }

  return value;
}

function replaceMsgPlaceholder(msg, currentElem) {
  if (typeof msg !== "object") {
    return msg;
  }

  const entries = Object.entries(msg).map(([key, value]) => {
    const newValue = replacePlaceholderValue(value);
    return [key, newValue];
  });

  return Object.fromEntries(entries);
}

function queueUpdate({ id, strategy, msg }) {
  return orro.eventQueue.enqueue({
    id,
    strategy,

    action() {
      return update(msg);
    },
  });
}

function update(msg) {
  if (!msg) {
    return;
  }

  orro.msgHandler(msg);
}

function updateDom(targetElem, markup) {
  const focusedElement = document.activeElement;

  morphdom(targetElem, markup, {
    onBeforeElUpdated(fromElem, toElem) {
      // Skip update of focused input element, this prevents resetting the input value while the user is typing.
      const inputIsFocused =
        fromElem.nodeName === "INPUT" &&
        toElem.nodeName === "INPUT" &&
        fromElem.isSameNode(focusedElement) &&
        (fromElem as HTMLInputElement).value !== (toElem as HTMLInputElement).value;

      if (inputIsFocused) {
        return false;
      }

      // Skip elements which has the unmanaged attribute
      const isUnmanaged = fromElem.hasAttribute("unmanaged");
      if (isUnmanaged) {
        return false;
      }

      return true;
    },
  });
}

function initLogic(logic, msgHandler) {
  const eventHandlers = prepareEventHandlers(logic.eventListeners);
  const intervals = logic.intervals.map(startInterval);

  initEventHandlers(eventHandlers);

  Object.assign(orro, {
    eventListeners: eventHandlers,
    intervals,
    msgHandler,
  });
}

function updateLogic(logic) {
  updateEventListeners(logic.eventListeners);
  updateIntervals(logic.intervals);
}

function initEventHandlers(eventHandlers) {
  console.log(eventHandlers);
  Object.keys(eventHandlers).forEach((eventName) => {
    document.addEventListener(
      eventName,
      (e) => {
        handleEvent(e, eventName);
      },
      true
    );
  });
}

const rustEnum = {
  withoutValue(name) {
    return name;
  },

  tupleWithoutValue(name) {
    return { [name]: [] };
  },

  tuple(name, values) {
    if (!Array.isArray(values)) {
      throw new Error("Tuple values must be an array");
    }

    if (values.length === 0) {
      this.tupleWithoutValue(name);
    }

    if (values.length === 1) {
      return { [name]: values[0] };
    }

    return { [name]: values };
  },

  object(name, value) {
    if (typeof value !== "object") {
      throw new Error("Value must be an object");
    }

    return { [name]: value };
  },
};

export { updateDom, initLogic, updateLogic, rustEnum };
