// Generic append-only JSON file store.
// Each file holds a JSON array; records are appended and the file is rewritten.
// Date strings are revived to Date objects on read.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Revives ISO-8601 date strings back to Date objects.
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}

export class JsonStore<T> {
  private cache: T[] | null = null;

  constructor(private readonly filePath: string) {}

  async append(record: T): Promise<void> {
    const all = await this.readAll();
    all.push(record);
    this.cache = all;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(all, null, 2), "utf-8");
  }

  async readAll(): Promise<T[]> {
    if (this.cache !== null) return [...this.cache];
    try {
      const raw  = await readFile(this.filePath, "utf-8");
      this.cache = JSON.parse(raw, dateReviver) as T[];
    } catch {
      this.cache = [];
    }
    return [...this.cache];
  }

  async findWhere(predicate: (record: T) => boolean): Promise<T[]> {
    const all = await this.readAll();
    return all.filter(predicate);
  }
}
