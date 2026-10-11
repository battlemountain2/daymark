export const RECOVERABLE_COLLECTIONS = new Set([
  "daymark:projects",
  "daymark:backlog",
  "daymark:workout:sessions:v1",
]);
export type Trashed<T> = T & { deletedAt: string };

export function isTrashed(value: unknown): value is { deletedAt: string } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { deletedAt?: unknown }).deletedAt === "string"
  );
}

export function partitionRecords<T>(key: string, all: Record<string, T>) {
  const activeEntries: Array<[string, T]> = [],
    trashEntries: Array<[string, Trashed<T>]> = [];
  for (const [id, value] of Object.entries(all)) {
    if (RECOVERABLE_COLLECTIONS.has(key) && isTrashed(value))
      trashEntries.push([id, value as Trashed<T>]);
    else activeEntries.push([id, value]);
  }
  const records = Object.fromEntries(activeEntries),
    trash = Object.fromEntries(trashEntries);
  return { records, trash };
}

export function trashRecord<T>(
  current: T | undefined,
  now = new Date(),
): Trashed<T> {
  if (!current || typeof current !== "object" || Array.isArray(current))
    throw Error("This item is unavailable.");
  if (isTrashed(current)) return current as Trashed<T>;
  return { ...current, deletedAt: now.toISOString() };
}

/** Restore the current saved version, never an older Undo snapshot. */
export function restoreRecord<T>(current: T | undefined): T {
  if (!current) throw Error("This item is unavailable.");
  if (!isTrashed(current)) return current;
  const restored = { ...current } as T & { deletedAt?: string };
  delete restored.deletedAt;
  return restored;
}
