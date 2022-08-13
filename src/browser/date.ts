interface Date {
  now(): number;
}

class BrowserDate {
  public now(): number {
    return Date.now();
  }
}

export { Date, BrowserDate };
