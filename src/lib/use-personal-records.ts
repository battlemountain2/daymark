"use client";
import { useCallback, useEffect, useState } from "react";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";
import {
  readPersonalRecords,
  updatePersonalRecords,
} from "@/lib/personal-records";
export function usePersonalRecords<T>(key: string) {
  const revision = useCloudRevision();
  const [records, setRecords] = useState<Record<string, T>>({});
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
  const update = useCallback(
    (id: string, change: (current: T | undefined) => T | null) => {
      try {
        const latest = updatePersonalRecords<T>(
          cloudStorage,
          key,
          (current) => {
            const value = change(
              Object.hasOwn(current, id) ? current[id] : undefined,
            );
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
    write,
    update,
    updateAll,
    error: error || readError,
    loaded,
  };
}
