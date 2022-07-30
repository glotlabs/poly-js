
const rustEnum = {
  withoutValue(name) {
    return name;
  },

  tupleWithoutValue(name) {
    return { [name]: [] };
  },

  tuple(name, values) {
    if (!Array.isArray(values)) {
      throw new Error("Tuple values must be an array");
    }

    if (values.length === 0) {
      this.tupleWithoutValue(name);
    }

    if (values.length === 1) {
      return { [name]: values[0] };
    }

    return { [name]: values };
  },

  object(name, value) {
    if (typeof value !== "object") {
      throw new Error("Value must be an object");
    }

    return { [name]: value };
  },
};


export { rustEnum }