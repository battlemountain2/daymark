"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  PROJECT_DRAFTS_KEY,
  readProjectDrafts,
  saveProjectDrafts,
  type ProjectDrafts,
} from "./project-drafts";

export function useProjectDrafts() {
  const [drafts, setState] = useState<ProjectDrafts>({}),
    [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<ProjectDrafts>({});
  const volatile = useRef(false);
  useEffect(() => {
    function load() {
      try {
        const saved = readProjectDrafts(localStorage);
        latest.current = saved;
        setState(saved);
        setError("");
      } catch {
        setError(
          "Could not read recovered project edits. The saved copy has been kept.",
        );
      } finally {
        setLoaded(true);
      }
    }
    load();
    const changed = (e: StorageEvent) => {
      if (e.key === PROJECT_DRAFTS_KEY && !volatile.current) load();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  const setDrafts = useCallback((action: SetStateAction<ProjectDrafts>) => {
    let current = latest.current,
      readable = true;
    try {
      const saved = readProjectDrafts(localStorage);
      if (!volatile.current) current = saved;
    } catch {
      readable = false;
    }
    const next = typeof action === "function" ? action(current) : action;
    latest.current = next;
    setState(next);
    try {
      if (!readable) throw Error();
      saveProjectDrafts(localStorage, next);
      volatile.current = false;
      setError("");
    } catch {
      volatile.current = true;
      setError(
        "Could not keep a recovery copy on this device. Copy unsaved edits before leaving.",
      );
    }
  }, []);
  return { drafts, setDrafts, error, loaded };
}
