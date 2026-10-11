export type RecordStorage = Pick<Storage, "getItem" | "setItem">;

/** Reject unreadable collections instead of replacing saved data with an empty map. */
export function readPersonalRecords<T>(
  storage: RecordStorage,
  key: string,
): Record<string, T> {
  const raw = storage.getItem(key);
  if (raw === null) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Error("Saved items are not a collection.");
  }
  return value as Record<string, T>;
}

export function updatePersonalRecords<T>(
  storage: RecordStorage,
  key: string,
  change: (current: Record<string, T>) => Record<string, T>,
): Record<string, T> {
  const next = change(readPersonalRecords<T>(storage, key));
  if (!next || typeof next !== "object" || Array.isArray(next)) {
    throw Error("Updated items are not a collection.");
  }
  storage.setItem(key, JSON.stringify(next));
  return next;
}

/** A remote removal must never be mistaken for a successful edit. */
export function patchExistingRecord<T extends object>(
  current: T | undefined,
  fields: Partial<T>,
): T {
  if (!current) throw Error("This item is no longer available.");
  return { ...current, ...fields };
}
