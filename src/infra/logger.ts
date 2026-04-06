// Logger — structured JSON logger with an optional human-readable pretty mode.
//
// JSON mode  (default)    — machine-parseable, one entry per line, suitable for log aggregators.
// Pretty mode (LOG_PRETTY=true) — coloured, aligned output for local development.

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface Logger {
  debug(msg: string, ctx?: object): void;
  info (msg: string, ctx?: object): void;
  warn (msg: string, ctx?: object): void;
  error(msg: string, ctx?: object): void;
}

export function createLogger(minLevel: Level = "info"): Logger {
  const min    = LEVELS[minLevel];
  const pretty = process.env["LOG_PRETTY"] === "true";

  function log(level: Level, msg: string, ctx?: object): void {
    if (LEVELS[level] < min) return;
    pretty ? logPretty(level, msg, ctx) : logJson(level, msg, ctx);
  }

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info:  (msg, ctx) => log("info",  msg, ctx),
    warn:  (msg, ctx) => log("warn",  msg, ctx),
    error: (msg, ctx) => log("error", msg, ctx),
  };
}

// ─── JSON format ──────────────────────────────────────────────────────────────

function logJson(level: Level, msg: string, ctx?: object): void {
  const entry = { level, msg, time: new Date().toISOString(), ...ctx };
  console.log(JSON.stringify(entry));
}

// ─── Pretty format ────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<Level, string> = {
  debug: "\x1b[90m",   // grey
  info:  "\x1b[36m",   // cyan
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";
const BOLD  = "\x1b[1m";

function logPretty(level: Level, msg: string, ctx?: object): void {
  const time  = new Date().toTimeString().slice(0, 8); // HH:MM:SS
  const color = LEVEL_COLOR[level];
  const label = level.toUpperCase().padEnd(5);

  // Extract ticker for the prefix column; format remaining fields as key=value
  const { ticker, ...rest } = (ctx ?? {}) as Record<string, unknown>;
  const tickerCol = ticker ? String(ticker).padEnd(6) : "      ";
  const fields    = formatFields(rest);

  const line = [
    `${DIM}[${time}]${RESET}`,
    `${color}${BOLD}${label}${RESET}`,
    `${DIM}${tickerCol}${RESET}`,
    msg,
    fields ? `${DIM}${fields}${RESET}` : "",
  ].filter(Boolean).join("  ");

  console.log(line);
}

function formatFields(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => {
      if (typeof v === "object" && v !== null) return `${k}=${JSON.stringify(v)}`;
      return `${k}=${String(v)}`;
    })
    .join("  ");
}
