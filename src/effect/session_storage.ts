import { SessionStorage } from "../browser/session_storage";
import { JsonHelper } from "../json";
import { Domain, Logger, Verbosity } from "../logger";
import {
  SessionStorageEffect,
  SessionStorageGetItem,
  SessionStorageSetItem,
} from "../rust_types";

class SessionStorageEffectHandler {
  constructor(
    private readonly sessionStorage: SessionStorage,
    private readonly jsonHelper: JsonHelper,
    private readonly logger: Logger
  ) { }

  public handle(effect: SessionStorageEffect): Promise<any> {
    switch (effect.type) {
      case "getItem":
        const getItemResult = this.handleGetItem(effect.config as SessionStorageGetItem);
        return Promise.resolve(getItemResult);

      case "setItem":
        const setItemResult = this.handleSetItem(effect.config as SessionStorageSetItem);
        return Promise.resolve(setItemResult);

      default:
        this.logger.warn({
          domain: Domain.SessionStorage,
          message: "Unknown sessionStorage effect",
          context: { type: effect.type },
        });
    }

    return Promise.resolve();
  }

  private handleGetItem({ key }: SessionStorageGetItem): any {
    const value = this.sessionStorage.getItem(key);
    if (value == null) {
      return null;
    }

    const jsonValue = this.jsonHelper.parse(value);

    this.logger.debug({
      domain: Domain.SessionStorage,
      verbosity: Verbosity.Normal,
      message: "Read value from sessionStorage",
      context: {
        key,
        value: jsonValue,
      },
    });

    return jsonValue;
  }

  private handleSetItem({ key, value }: SessionStorageSetItem): boolean {
    const jsonValue = this.jsonHelper.stringify(value);

    try {
      this.sessionStorage.setItem(key, jsonValue);
    } catch (e) {
      this.logger.warn({
        domain: Domain.SessionStorage,
        message: "Failed to save value to sessionStorage",
        context: {
          key,
          value: jsonValue,
          exception: e,
        },
      });

      return false;
    }

    this.logger.debug({
      domain: Domain.SessionStorage,
      verbosity: Verbosity.Normal,
      message: "Saved value to sessionStorage",
      context: {
        key,
        value: value,
      },
    });

    return true;
  }
}

export { SessionStorageEffectHandler };
