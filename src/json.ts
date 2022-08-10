import { Logger } from "./logger";

class JsonHelper {
  constructor(private readonly logger: Logger) {}

  public parse(json: string): any {
    try {
      return JSON.parse(json);
    } catch (e) {
      this.logger.error("Failed to parse json", { string: json, exception: e });
      throw e;
    }
  }

  public stringify(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (e) {
      this.logger.error("Failed to stringify data into json", {
        data,
        exception: e,
      });
      throw e;
    }
  }
}

export { JsonHelper };
