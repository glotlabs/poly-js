import { Logger } from "../logger";

interface State {
  handler: ((effect: any) => void) | null;
  effectBacklog: any[];
}

interface Config {
  useBacklog: boolean;
}

class CustomEffectHandler {
  private readonly state: State = {
    handler: null,
    effectBacklog: [],
  };

  constructor(
    private readonly config: Config,
    private readonly logger: Logger
  ) {}

  public handle(effect: any): void {
    if (this.state.handler) {
      this.state.handler(effect);
    } else {
      if (this.config.useBacklog) {
        this.addToBacklog(effect);
      }
    }
  }

  public setHandler(handler: (effect: any) => void): void {
    this.state.handler = handler;
    this.handleBacklog(handler);
  }

  private addToBacklog(effect: any) {
    if (this.state.effectBacklog.length < 100) {
      this.state.effectBacklog.push(effect);
    } else {
      this.logger.warn("The custom effect backlog is full, ignoring effect", {
        effect,
      });
    }
  }

  private handleBacklog(handler: (effect: any) => void): void {
    const effects = [...this.state.effectBacklog];
    this.state.effectBacklog = [];

    effects.forEach((effect) => {
      handler(effect);
    });
  }
}

export { CustomEffectHandler };
