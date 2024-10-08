import { Domain, Logger, Verbosity } from "../logger";

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
  ) { }

  public handle(effect: any): Promise<any> {
    if (this.state.handler) {
      const result = this.safeHandle(this.state.handler, effect);
      return Promise.resolve(result);
    } else {
      if (this.config.useBacklog) {
        this.addToBacklog(effect);
      }
    }

    return Promise.resolve();
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
        domain: Domain.CustomEffect,
        verbosity: Verbosity.Normal,
        message: "Added effect to backlog",
        context: {
          effect,
        },
      });
    } else {
      this.logger.warn({
        domain: Domain.CustomEffect,
        message: "The custom effect backlog is full, ignoring effect",
        context: { effect },
      });
    }
  }

  private handleBacklog(handler: (effect: any) => void): void {
    this.logger.debug({
      domain: Domain.CustomEffect,
      verbosity: Verbosity.Normal,
      message: "Handling backlog",
      context: {
        count: this.state.effectBacklog.length,
      },
    });

    const effects = [...this.state.effectBacklog];
    this.state.effectBacklog = [];

    effects.forEach((effect) => {
      this.safeHandle(handler, effect);
    });
  }

  private safeHandle(handler: (effect: any) => any, effect: any): any {
    try {
      return handler(effect);
    } catch (e) {
      this.logger.error({
        domain: Domain.CustomEffect,
        message: "Error while handling app effect",
        context: { effect, exception: e },
      });
    }
  }
}

function defaultCustomEffectConfig(): Config {
  return {
    useBacklog: true,
  };
}

export { CustomEffectHandler, Config, defaultCustomEffectConfig };
