interface Logger {
  warn(message: string, ...context: any[]): void;
  error(message: string, ...context: any[]): void;
  debug(entry: DebugEntry): void;
}

const PREFIX = "Polyester";

interface Config {
  debugDomains: DebugDomain[];
  debugLogger: DebugLogger;
  debugVerbosity: Verbosity;
}

interface DebugEntry {
  domain: DebugDomain;
  verbosity: Verbosity;
  message: string;
  context: any;
}

class BrowserLogger implements Logger {
  constructor(private readonly config: Config) {}

  public warn(message: string, context: object): void {
    console.warn(`[${PREFIX}]`, message, context);
  }

  public error(message: string, context: object): void {
    console.error(`[${PREFIX}]`, message, context);
  }

  public debug({ domain, verbosity, message, context }: DebugEntry): void {
    if (this.validDomain(domain) && this.validVerbosity(verbosity)) {
      const logger = this.getDebugLogger();
      logger(`[${PREFIX}::${domainToString(domain)}]`, message, context);
    }
  }

  private getDebugLogger(): (...data: any[]) => void {
    switch (this.config.debugLogger) {
      case DebugLogger.Log:
        return console.log;

      case DebugLogger.Trace:
        return console.trace;
    }
  }

  private validDomain(domain: DebugDomain): boolean {
    if (this.config.debugDomains.length === 0) {
      return false;
    }

    return (
      this.config.debugDomains.includes(domain) ||
      this.config.debugDomains.includes(DebugDomain.All)
    );
  }

  private validVerbosity(verbosity: Verbosity): boolean {
    switch (this.config.debugVerbosity) {
      case Verbosity.Normal:
        return verbosity === Verbosity.Normal;

      case Verbosity.Verbose:
        return true;
    }
  }
}

enum DebugDomain {
  All,
  Core,
  Subscriptions,
  EventListener,
  Interval,
  Effects,
  LocalStorage,
  CustomEffect,
  ValueExtractor,
}

function domainToString(domain: DebugDomain): string {
  return DebugDomain[domain];
}

enum DebugLogger {
  Log,
  Trace,
}

enum Verbosity {
  Normal,
  Verbose,
}

function defaultLoggerConfig(): Config {
  return {
    debugDomains: [],
    debugLogger: DebugLogger.Log,
    debugVerbosity: Verbosity.Normal,
  };
}

function defaultDebugConfig(): Config {
  return {
    debugDomains: [
      DebugDomain.Core,
      DebugDomain.Subscriptions,
      DebugDomain.Effects,
    ],
    debugLogger: DebugLogger.Trace,
    debugVerbosity: Verbosity.Verbose,
  };
}

function fullDebugConfig(): Config {
  return {
    debugDomains: [DebugDomain.All],
    debugLogger: DebugLogger.Trace,
    debugVerbosity: Verbosity.Verbose,
  };
}

export {
  Logger,
  BrowserLogger,
  DebugDomain,
  DebugLogger,
  Config,
  Verbosity,
  defaultLoggerConfig,
  defaultDebugConfig,
  fullDebugConfig,
};
