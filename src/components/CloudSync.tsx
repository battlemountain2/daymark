"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncCloud } from "@/lib/cloud-storage";
export default function CloudSync() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login") return;
    const run = () => { if (document.visibilityState === "visible") void syncCloud(); };
    run();
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    const interval = setInterval(run, 30000);
    return () => { clearInterval(interval); window.removeEventListener("online", run); window.removeEventListener("focus", run); document.removeEventListener("visibilitychange", run); };
  }, [pathname]);
  return null;
}
