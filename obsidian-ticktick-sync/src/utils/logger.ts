export class Logger {
  private static enabled = true;

  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  static log(...args: unknown[]): void {
    if (this.enabled) {
      console.log("[TickTick Sync]", ...args);
    }
  }

  static error(...args: unknown[]): void {
    if (this.enabled) {
      console.error("[TickTick Sync]", ...args);
    }
  }

  static warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn("[TickTick Sync]", ...args);
    }
  }

  static debug(...args: unknown[]): void {
    if (this.enabled) {
      console.debug("[TickTick Sync]", ...args);
    }
  }
}
