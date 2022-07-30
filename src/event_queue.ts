class EventQueue {
  private readonly state = {
    queue: [],
    processing: false,
  };

  enqueue({ id, strategy, action }) {
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

    if (!this.state.processing) {
      this.processNext();
    }
  }

  private async processNext() {
    const event = this.state.queue.shift();
    if (!event) {
      return;
    }

    this.state.processing = true;

    try {
      event.action();
      event.resolve();
    } catch (e) {
      console.error("Failed to run action", e);
      event.reject();
    }

    this.state.processing = false;
    this.processNext();
  }
}

export { EventQueue };
