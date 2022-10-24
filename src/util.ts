function isObject(value: any): boolean {
  return value === Object(value);
}

function isArray(value: any): boolean {
  return Array.isArray(value);
}

function isString(value: any): boolean {
  return typeof value === "string";
}

export { isObject, isArray, isString };
