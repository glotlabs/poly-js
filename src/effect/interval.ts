import { AbortFn, Browser } from "../browser";
import { JobConfig } from "../event_queue";
import { Msg, RustInterval } from "../rust_types";

interface ActiveInterval {
  abort: AbortFn;
  interval: RustInterval;
}

interface State {
  intervals: ActiveInterval[];
}

class IntervalManager {
  private readonly state: State = {
    intervals: [],
  };

  constructor(
    private readonly browser: Browser,
    private readonly onMsg: (msg: Msg, jobConfig: JobConfig) => void
  ) {}

  public setIntervals(newIntervals: RustInterval[]) {
    const oldIntervals = [...this.state.intervals];

    const { intervalsToRemove, intervalsToKeep, intervalsToAdd } =
      prepareIntervalsDelta(oldIntervals, newIntervals);

    //this.debugLog("Updating intervals", {
    //  removing: intervalsToRemove,
    //  keeping: intervalsToKeep,
    //  adding: intervalsToAdd,
    //});

    this.stopIntervals(intervalsToRemove);

    const addedIntervals = intervalsToAdd.map((interval) =>
      this.startInterval(interval)
    );

    this.state.intervals = [...intervalsToKeep, ...addedIntervals];
  }

  private stopIntervals(intervals: ActiveInterval[]) {
    intervals.forEach((interval) => {
      interval.abort.abort();
    });
  }

  private startInterval(interval: RustInterval): ActiveInterval {
    const abort = this.browser.setInterval(() => {
      this.onMsg(interval.msg, {
        id: interval.id,
        strategy: interval.queueStrategy,
      });
    }, interval.duration);

    return {
      abort,
      interval,
    };
  }
}

interface IntervalsDelta {
  intervalsToRemove: ActiveInterval[];
  intervalsToKeep: ActiveInterval[];
  intervalsToAdd: RustInterval[];
}

function prepareIntervalsDelta(
  oldListeners: ActiveInterval[],
  newListeners: RustInterval[]
): IntervalsDelta {
  const newIds = newListeners.map((interval) => interval.id);
  const oldIds = oldListeners.map((interval) => interval.interval.id);

  const intervalsToRemove: ActiveInterval[] = [];
  const intervalsToKeep: ActiveInterval[] = [];
  const intervalsToAdd: RustInterval[] = [];

  oldListeners.forEach((interval) => {
    if (newIds.includes(interval.interval.id)) {
      intervalsToKeep.push(interval);
    } else {
      intervalsToRemove.push(interval);
    }
  });

  newListeners.forEach((interval) => {
    if (!oldIds.includes(interval.id)) {
      intervalsToAdd.push(interval);
    }
  });

  return {
    intervalsToRemove,
    intervalsToKeep,
    intervalsToAdd,
  };
}

export { IntervalManager, ActiveInterval };
