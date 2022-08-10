import { Domain, Logger } from "./logger";

class JsonHelper {
  constructor(private readonly logger: Logger) {}

  public parse(json: string): any {
    try {
      return JSON.parse(json);
    } catch (e) {
      this.logger.error({
        domain: Domain.Core,
        message: "Failed to parse json",
        context: { string: json, exception: e },
      });

      throw e;
    }
  }

  public stringify(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (e) {
      this.logger.error({
        domain: Domain.Core,
        message: "Failed to stringify data into json",
        context: { data, exception: e },
      });

      throw e;
    }
  }
}

export { JsonHelper };
