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
  ) { }

  public handle(effect: LocalStorageEffect): Promise<any> {
    switch (effect.type) {
      case "getItem":
        const getItemResult = this.handleGetItem(effect.config as LocalStorageGetItem);
        return Promise.resolve(getItemResult);

      case "setItem":
        const setItemResult = this.handleSetItem(effect.config as LocalStorageSetItem);
        return Promise.resolve(setItemResult);

      default:
        this.logger.warn({
          domain: Domain.LocalStorage,
          message: "Unknown localStorage effect",
          context: { type: effect.type },
        });
    }

    return Promise.resolve();
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

  private handleSetItem({ key, value }: LocalStorageSetItem): boolean {
    const jsonValue = this.jsonHelper.stringify(value);

    try {
      this.localStorage.setItem(key, jsonValue);
    } catch (e) {
      this.logger.warn({
        domain: Domain.LocalStorage,
        message: "Failed to save value to localStorage",
        context: {
          key,
          value: jsonValue,
          exception: e,
        },
      });

      return false;
    }

    this.logger.debug({
      domain: Domain.LocalStorage,
      verbosity: Verbosity.Normal,
      message: "Saved value to localStorage",
      context: {
        key,
        value: value,
      },
    });

    return true;
  }
}

export { LocalStorageEffectHandler };
