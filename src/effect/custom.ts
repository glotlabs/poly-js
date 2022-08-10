import { DebugDomain, Logger, Verbosity } from "../logger";

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

    if (this.state.effectBacklog.length > 0) {
      this.handleBacklog(handler);
    }
  }

  private addToBacklog(effect: any) {
    if (this.state.effectBacklog.length < 100) {
      this.state.effectBacklog.push(effect);

      this.logger.debug({
        domain: DebugDomain.CustomEffect,
        verbosity: Verbosity.Normal,
        message: "Added effect to backlog",
        context: {
          effect,
        },
      });
    } else {
      this.logger.warn("The custom effect backlog is full, ignoring effect", {
        effect,
      });
    }
  }

  private handleBacklog(handler: (effect: any) => void): void {
    this.logger.debug({
      domain: DebugDomain.CustomEffect,
      verbosity: Verbosity.Normal,
      message: "Handling backlog",
      context: {
        count: this.state.effectBacklog.length,
      },
    });

    const effects = [...this.state.effectBacklog];
    this.state.effectBacklog = [];

    effects.forEach((effect) => {
      handler(effect);
    });
  }
}

export { CustomEffectHandler };
