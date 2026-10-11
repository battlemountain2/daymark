"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import {
  readPersonalRecords,
  updatePersonalRecords,
} from "@/lib/personal-records";
import {
  RECOVERABLE_COLLECTIONS,
  partitionRecords,
  isTrashed,
  trashRecord,
  restoreRecord,
} from "@/lib/record-recovery";
export function usePersonalRecords<T>(key: string) {
  const revision = useCloudRevision();
  const [allRecords, setRecords] = useState<Record<string, T>>({});
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setRecords(readPersonalRecords<T>(cloudStorage, key));
      setReadError("");
    } catch {
      setReadError("Could not read saved items. The saved copy has been kept.");
    } finally {
      setLoaded(true);
    }
  }, [key, revision]);
  const { records, trash } = useMemo(
    () => partitionRecords(key, allRecords),
    [key, allRecords],
  );
  const update = useCallback(
    (id: string, change: (current: T | undefined) => T | null) => {
      try {
        const latest = updatePersonalRecords<T>(
          cloudStorage,
          key,
          (current) => {
            const previous = Object.hasOwn(current, id)
              ? current[id]
              : undefined;
            if (RECOVERABLE_COLLECTIONS.has(key) && isTrashed(previous))
              throw Error("Restore this item from Trash before editing it.");
            const changed = change(previous);
            const value =
              changed === null && RECOVERABLE_COLLECTIONS.has(key)
                ? trashRecord(previous)
                : changed;
            const next = { ...current };
            if (value === null) delete next[id];
            else
              Object.defineProperty(next, id, {
                value,
                enumerable: true,
                writable: true,
                configurable: true,
              });
            return next;
          },
        );
        setRecords(latest);
        setError("");
        window.dispatchEvent(new Event("daymark:cloud-updated"));
        return true;
      } catch {
        setError(
          "Could not save on this device. Copy your edit before leaving.",
        );
        return false;
      }
    },
    [key],
  );
  const restore = useCallback(
    (id: string) => {
      try {
        const latest = updatePersonalRecords<T>(
          cloudStorage,
          key,
          (current) => {
            const value = restoreRecord(
              Object.hasOwn(current, id) ? current[id] : undefined,
            );
            return { ...current, [id]: value };
          },
        );
        setRecords(latest);
        setError("");
        window.dispatchEvent(new Event("daymark:cloud-updated"));
        return true;
      } catch {
        setError("Could not restore this item. It is still in Trash.");
        return false;
      }
    },
    [key],
  );
  const write = useCallback(
    (id: string, value: T | null) => update(id, () => value),
    [update],
  );
  const updateAll = useCallback(
    (change: (current: Record<string, T>) => Record<string, T>) => {
      try {
        const next = updatePersonalRecords<T>(cloudStorage, key, change);
        setRecords(next);
        setError("");
        window.dispatchEvent(new Event("daymark:cloud-updated"));
        return true;
      } catch {
        setError(
          "Could not save on this device. Copy your edit before leaving.",
        );
        return false;
      }
    },
    [key],
  );
  return {
    records,
    trash,
    restore,
    write,
    update,
    updateAll,
    error: error || readError,
    loaded,
  };
}
