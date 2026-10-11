type StorageTarget = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** No events fire mid-write; a failed import rolls back visible values and its outbox. */
export function writeStorageBatch(storage: StorageTarget, values: Record<string, string>) {
  const before = Object.entries(values).map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of Object.entries(values)) storage.setItem(key, value);
  } catch (error) {
    // Free the partial batch first so a larger old value can fit again.
    for (const [key] of before) storage.removeItem(key);
    for (const [key, value] of before) if (value !== null) storage.setItem(key, value);
    throw error;
  }
}
