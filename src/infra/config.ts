// Config — loads and validates environment variables at startup

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = typeof LOG_LEVELS[number];

export interface Config {
  logLevel: LogLevel;
  watchedTickers: string[];
  /** How often to run the pipeline, in minutes. */
  intervalMinutes: number;
}

export function loadConfig(): Config {
  const rawLogLevel     = process.env["LOG_LEVEL"] ?? "info";
  const watchedTickers  = (process.env["TICKERS"] ?? "").split(",").filter(Boolean);
  const intervalMinutes = parseInt(process.env["INTERVAL_MINUTES"] ?? "15", 10);

  if (!(LOG_LEVELS as readonly string[]).includes(rawLogLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(", ")}`);
  }

  if (isNaN(intervalMinutes) || intervalMinutes < 1) {
    throw new Error("INTERVAL_MINUTES must be a positive integer");
  }

  return { logLevel: rawLogLevel as LogLevel, watchedTickers, intervalMinutes };
}
