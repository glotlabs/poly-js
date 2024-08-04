interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class BrowserSessionStorage implements SessionStorage {
  public getItem(key: string) {
    return sessionStorage.getItem(key);
  }

  public setItem(key: string, value: string) {
    return sessionStorage.setItem(key, value);
  }
}

export { SessionStorage, BrowserSessionStorage };
