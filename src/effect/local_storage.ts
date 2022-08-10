import { LocalStorage } from "../browser";
import { JobConfig } from "../event_queue";
import { JsonHelper } from "../json";
import { Logger } from "../logger";
import {
  LocalStorageEffect,
  LocalStorageGetItem,
  LocalStorageSetItem,
  Msg,
  QueueStrategy,
} from "../rust_types";

class LocalStorageEffectHandler {
  constructor(
    private readonly localStorage: LocalStorage,
    private readonly jsonHelper: JsonHelper,
    private readonly logger: Logger,
    private readonly onMsg: (msg: Msg, jobConfig: JobConfig) => void
  ) {}

  public handle(effect: LocalStorageEffect): void {
    switch (effect.type) {
      case "getItem":
        this.handleGetItem(effect.config as LocalStorageGetItem);
        break;

      case "setItem":
        this.handleSetItem(effect.config as LocalStorageSetItem);
        break;

      default:
        this.logger.warn("Unknown navigation effect type", {
          type: effect.type,
        });
    }
  }

  private handleGetItem({ key, msg }: LocalStorageGetItem): void {
    this.onMsg(msg, {
      id: `localstorage-get-${key}`,
      strategy: QueueStrategy.DropOlder,
    });
  }

  private handleSetItem({ key, value }: LocalStorageSetItem): void {
    const jsonValue = this.jsonHelper.stringify(value);
    this.localStorage.setItem(key, jsonValue);
  }
}

export { LocalStorageEffectHandler };
