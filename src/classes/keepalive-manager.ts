export class KeepaliveManager {

  private timeoutSeconds: number | undefined;

  private timeoutClearToken: ReturnType<typeof setTimeout> | undefined;

  private onTimeout: VoidFunction | undefined;

  constructor(
    /**
     * Human-readable label for logging purposes
     */
    private label: string,
    /**
     * Additional time to wait past the timeout before calling the handler
     */
    private gracePeriodMs: number) {}

  startTimeout(timeoutSeconds: number, onTimeout: VoidFunction) {
    this.timeoutSeconds = timeoutSeconds;
    this.onTimeout = onTimeout;
    this.resetTimer();
  }

  resetTimer() {
    if (this.timeoutClearToken !== null) {
      clearTimeout(this.timeoutClearToken);
    }
    if (this.timeoutSeconds !== undefined && this.onTimeout) {
      this.timeoutClearToken = setTimeout(() => {
        console.warn(`[KeepaliveManager:${this.label}] Timeout handler triggered`);
        this.onTimeout?.();
        this.timeoutClearToken = undefined;
        this.onTimeout = undefined;
      }, (this.timeoutSeconds * 1e3) + this.gracePeriodMs);
    }
  }
}
