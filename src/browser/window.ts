interface Window {
  getSize(): WindowSize;
}

interface WindowSize {
  width: number;
  height: number;
}

class BrowserWindow implements Window {
  public getSize(): WindowSize {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
}

export { Window, WindowSize, BrowserWindow };
