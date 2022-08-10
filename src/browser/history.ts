interface History {
  pushUrl(url: string): void;
  replaceUrl(url: string): void;
}

class BrowserHistory implements History {
  public pushUrl(url: string): void {
    history.pushState({}, "", url);
  }

  public replaceUrl(url: string): void {
    history.replaceState({}, "", url);
  }
}

export { History, BrowserHistory };
