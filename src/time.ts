interface Posix {
  milliseconds: number;
}

function posixFromMilliseconds(milliseconds: number): Posix {
  return {
    milliseconds,
  };
}

export { Posix, posixFromMilliseconds };
