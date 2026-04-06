import type { TradingSymbol } from "../core/types.js";
import type { Orchestrator } from "./orchestrator.js";
import type { Logger } from "../infra/logger.js";

export interface SchedulerOptions {
  intervalMinutes: number;
  symbols: TradingSymbol[];
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private runCount = 0;
  private running  = false;

  constructor(
    private readonly orchestrator: Orchestrator,
    private readonly options: SchedulerOptions,
    private readonly logger: Logger,
  ) {}

  /** Runs once immediately, then repeats on the configured interval. */
  start(): void {
    if (this.timer) return;

    const { intervalMinutes, symbols } = this.options;
    const intervalMs = intervalMinutes * 60 * 1_000;

    this.logger.info("Scheduler started", {
      intervalMinutes,
      symbols: symbols.map((s) => s.ticker),
    });

    // Run once now, then on each tick
    this.tick();
    this.timer = setInterval(() => this.tick(), intervalMs);

    // Keep process alive and allow clean shutdown
    this.timer.unref();
    this.registerShutdown();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.logger.info("Scheduler stopped", { totalRuns: this.runCount });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (this.running) {
      this.logger.warn("Scheduler tick skipped — previous run still in progress");
      return;
    }

    this.running = true;
    this.runCount++;
    const run   = this.runCount;
    const start = Date.now();

    this.logger.info("Scheduled run started", { run });

    const results = await Promise.allSettled(
      this.options.symbols.map((s) => this.orchestrator.processSymbol(s)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed    = results.filter((r) => r.status === "rejected").length;

    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.error("Symbol failed", { err: String(result.reason) });
      }
    }

    this.logger.info("Scheduled run finished", {
      run,
      durationMs: Date.now() - start,
      succeeded,
      failed,
      nextRunIn: `${this.options.intervalMinutes}m`,
    });

    this.running = false;
  }

  private registerShutdown(): void {
    const shutdown = (signal: string) => {
      this.logger.info("Shutdown signal received", { signal });
      this.stop();
      process.exit(0);
    };

    process.once("SIGINT",  () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  }
}
