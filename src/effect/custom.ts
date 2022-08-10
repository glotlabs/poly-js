interface State {
  handler: ((effect: any) => void) | null;
  effectBacklog: any[];
}

class CustomEffectHandler {
  private readonly state: State = {
    handler: null,
    effectBacklog: [],
  };

  public handle(effect: any): void {
    if (this.state.handler) {
      this.state.handler(effect);
    } else {
      this.state.effectBacklog.push(effect);
    }
  }

  public setHandler(handler: (effect: any) => void): void {
    this.state.handler = handler;
    this.handleBacklog(handler);
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
