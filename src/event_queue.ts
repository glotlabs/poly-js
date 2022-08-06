interface Job {
  config: JobConfig;
  action: () => void;
}

interface JobConfig {
  id: string;
  strategy: string;
}

function defaultJobConfig(): JobConfig {
  return {
    id: "anonymous",
    strategy: "fifo",
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

  enqueue({ config: { id, strategy }, action }: Job): void {
    if (this.state.queue.length > 100) {
      console.warn("Event queue is full, dropping event", id);
      return;
    }

    if (strategy === "dropOlder") {
      this.state.queue = this.state.queue.filter((item) => item.id !== id);
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
      console.error("Failed to run action", e);
      event.reject();
    }

    this.state.isProcessing = false;
    this.processNext();
  }
}

export { EventQueue, JobConfig, defaultJobConfig };
