interface ClipboardInterface {
  writeText(text: string): void;
}

class BrowserClipboard implements ClipboardInterface {
  public writeText(text: string) {
    navigator.clipboard.writeText(text);
  }
}

export { ClipboardInterface, BrowserClipboard };
