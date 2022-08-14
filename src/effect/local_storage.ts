import { LocalStorage } from "../browser/local_storage";
import { JsonHelper } from "../json";
import { Domain, Logger, Verbosity } from "../logger";
import {
  LocalStorageEffect,
  LocalStorageGetItem,
  LocalStorageSetItem,
} from "../rust_types";

class LocalStorageEffectHandler {
  constructor(
    private readonly localStorage: LocalStorage,
    private readonly jsonHelper: JsonHelper,
    private readonly logger: Logger
  ) {}

  public handle(effect: LocalStorageEffect): any {
    switch (effect.type) {
      case "getItem":
        return this.handleGetItem(effect.config as LocalStorageGetItem);

      case "setItem":
        return this.handleSetItem(effect.config as LocalStorageSetItem);

      default:
        this.logger.warn({
          domain: Domain.LocalStorage,
          message: "Unknown localStorage effect",
          context: { type: effect.type },
        });
    }
  }

  private handleGetItem({ key }: LocalStorageGetItem): any {
    const value = this.localStorage.getItem(key);
    if (value == null) {
      return null;
    }

    const jsonValue = this.jsonHelper.parse(value);

    this.logger.debug({
      domain: Domain.LocalStorage,
      verbosity: Verbosity.Normal,
      message: "Read value from localStorage",
      context: {
        key,
        value: jsonValue,
      },
    });

    return jsonValue;
  }

  private handleSetItem({ key, value }: LocalStorageSetItem): void {
    const jsonValue = this.jsonHelper.stringify(value);
    this.localStorage.setItem(key, jsonValue);

    this.logger.debug({
      domain: Domain.LocalStorage,
      verbosity: Verbosity.Normal,
      message: "Saved value to localStorage",
      context: {
        key,
        value: value,
      },
    });
  }
}

export { LocalStorageEffectHandler };
