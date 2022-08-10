interface LocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

class BrowserLocalStorage implements LocalStorage {
  public getItem(key: string) {
    return localStorage.getItem(key);
  }

  public setItem(key: string, value: string) {
    return localStorage.setItem(key, value);
  }
}

export { LocalStorage, BrowserLocalStorage };
