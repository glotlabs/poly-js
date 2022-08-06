interface Logger {
  debug(message: string, ...context: any[]): void;
  warn(message: string, ...context: any[]): void;
  error(message: string, ...context: any[]): void;
}

const PREFIX = "[ORRO]";

interface Config {
  debug: boolean;
}

class BrowserLogger implements Logger {
  constructor(private readonly config: Config) {}

  public debug(message: string, ...context: any[]): void {
    if (this.config.debug === true) {
      console.log(PREFIX, message, ...context);
    }
  }

  public warn(message: string, ...context: any[]): void {
    console.warn(PREFIX, message, ...context);
  }

  public error(message: string, ...context: any[]): void {
    console.error(PREFIX, message, ...context);
  }
}

export { Logger, BrowserLogger };
