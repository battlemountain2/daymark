"use client";
import { useEffect, useState } from "react";
export function useCloudRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision(v => v + 1);
    window.addEventListener("daymark:cloud-updated", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("daymark:cloud-updated", update); window.removeEventListener("storage", update); };
  }, []);
  return revision;
}
