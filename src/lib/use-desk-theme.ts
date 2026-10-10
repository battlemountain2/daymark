"use client";
import { useEffect, useState } from "react";
import { spacePreference, validPalette, type DashboardLayout, type DashboardTab } from "./dashboard-layout";
/** A shared palette and accent, with independent spacing for each space. */
export function useDeskTheme(tab: DashboardTab, layout: DashboardLayout) {
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    try { const p = localStorage.getItem("hb:pal") || localStorage.getItem("palette");
      setSaved(validPalette(p) ? p : "forest");
    } catch { setSaved("forest"); }
  }, []);
  const shared = validPalette(layout.palette) ? layout.palette : saved || "forest";
  const accent = spacePreference(layout, tab).accent;
  const appearance = ["light", "dark"].includes(String(layout.appearance)) ? String(layout.appearance) : "system";
  useEffect(() => {
    if (saved === null) return;
    if (shared === "forest") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.dataset.palette = shared;
    if (accent === "palette") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.dataset.accent = accent;
    if (appearance === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = appearance;
    try {
      localStorage.setItem("hb:pal", shared);
      localStorage.setItem("palette", shared);
    } catch {}
  }, [shared, appearance, accent, saved]);
  const prefs = spacePreference(layout, tab);
  return { palette: saved === null && !validPalette(layout.palette) ? undefined : shared, accent: prefs.accent, appearance, density: prefs.density };
}
