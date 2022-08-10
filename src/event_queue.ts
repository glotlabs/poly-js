import { Domain, Logger } from "./logger";
import { QueueStrategy } from "./rust_types";

interface Job {
  config: JobConfig;
  action: () => void;
}

interface JobConfig {
  id: string;
  strategy: QueueStrategy;
}

function defaultJobConfig(): JobConfig {
  return {
    id: "anonymous",
    strategy: QueueStrategy.Fifo,
  };
}

interface Event {
  id: string;
  action: () => void;
  resolve: (value: unknown) => void;
  reject: () => void;
}

interface State {
  queue: Event[];
  isProcessing: boolean;
}

class EventQueue {
  private readonly state: State = {
    queue: [],
    isProcessing: false,
  };

  constructor(private readonly logger: Logger) {}

  public enqueue({ config: { id, strategy }, action }: Job): void {
    if (this.state.queue.length > 100) {
      this.logger.warn({
        domain: Domain.EventQueue,
        message: "Event queue is full, dropping event",
        context: { id },
      });
      return;
    }

    switch (strategy) {
      case QueueStrategy.Fifo:
        break;

      case QueueStrategy.DropOlder:
        this.state.queue = this.state.queue.filter((item) => item.id !== id);
        break;
    }

    new Promise((resolve, reject) => {
      this.state.queue.push({
        id,
        action,
        resolve,
        reject,
      });
    });

    if (!this.state.isProcessing) {
      this.processNext();
    }
  }

  private processNext(): void {
    const event = this.state.queue.shift();
    if (!event) {
      return;
    }

    this.state.isProcessing = true;

    try {
      event.action();
      event.resolve(null);
    } catch (e) {
      this.logger.error({
        domain: Domain.EventQueue,
        message: "Failed to run action",
        context: { exception: e },
      });

      event.reject();
    }

    this.state.isProcessing = false;
    this.processNext();
  }
}

function queueStrategyFromString(strategy: string, logger: Logger) {
  switch (strategy) {
    case "fifo":
      return QueueStrategy.Fifo;

    case "dropOlder":
      return QueueStrategy.DropOlder;

    default:
      logger.warn({
        domain: Domain.EventQueue,
        message: "Unknown queue strategy",
        context: { strategy },
      });
  }

  return QueueStrategy.Fifo;
}

export { EventQueue, JobConfig, defaultJobConfig, queueStrategyFromString };
