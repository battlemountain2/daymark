"use client";
import { useCallback, useEffect, useState } from "react";
import { cloudStorage } from "@/lib/cloud-storage";
import { useCloudRevision } from "@/lib/use-cloud-revision";
export function usePersonalRecords<T>(key: string) {
  const revision = useCloudRevision();
  const [records, setRecords] = useState<Record<string, T>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setRecords(JSON.parse(cloudStorage.getItem(key) || "{}"));
    } catch {
      setError("Could not read saved items.");
    }
  }, [key, revision]);
  const update = useCallback(
    (id: string, change: (current: T | undefined) => T | null) => {
      try {
        const latest = JSON.parse(cloudStorage.getItem(key) || "{}");
        const value = change(latest[id]);
        if (value === null) delete latest[id];
        else latest[id] = value;
        cloudStorage.setItem(key, JSON.stringify(latest));
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
        const latest = JSON.parse(cloudStorage.getItem(key) || "{}");
        const next = change(latest);
        cloudStorage.setItem(key, JSON.stringify(next));
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
  return { records, write, update, updateAll, error };
}
