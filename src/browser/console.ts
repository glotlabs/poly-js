interface ConsoleInterface {
  log(...data: any[]): void;
}

class BrowserConsole implements ConsoleInterface {
  public log(...data: any[]) {
    console.log(...data);
  }
}

export { ConsoleInterface, BrowserConsole };
