export type DashboardTab = "main" | "school" | "media";
export type PanelId =
  | "gmail"
  | "weather"
  | "schedule"
  | "study"
  | "semester"
  | "fitness"
  | "todo"
  | "shuffle"
  | "music"
  | "entertainment"
  | "releases"
  | "news"
  | "projects"
  | "readings"
  | "youtube";
export type PanelPreference = {
  hidden: boolean;
  collapsed: boolean;
  pinned: boolean;
  order?: number;
};
export type DashboardLayout = Record<string, unknown>;
export const LAYOUT_KEY = "daymark:layout";
export const PANELS: {
  id: PanelId;
  title: string;
  tabs: DashboardTab[];
  collapsed?: boolean;
}[] = [
  { id: "schedule", title: "On your schedule", tabs: ["main", "school"] },
  { id: "gmail", title: "Worth opening", tabs: ["main"] },
  { id: "weather", title: "Weather", tabs: ["main"] },
  { id: "music", title: "Listening Corner", tabs: ["main", "media"] },
  { id: "projects", title: "On your desk", tabs: ["main"] },
  { id: "study", title: "Study Hub", tabs: ["school"] },
  { id: "semester", title: "Semester", tabs: ["school"], collapsed: true },
  { id: "todo", title: "Assignments & tasks", tabs: ["school"] },
  { id: "readings", title: "Course library", tabs: ["school"], collapsed: true },
  {
    id: "fitness",
    title: "Today's Workout",
    tabs: ["main"],
    collapsed: true,
  },
  { id: "shuffle", title: "Daily shuffle", tabs: ["media"] },
  { id: "entertainment", title: "Media room", tabs: ["media"] },
  { id: "youtube", title: "From your channels", tabs: ["media"] },
  {
    id: "releases",
    title: "Release radar",
    tabs: ["main", "media"],
    collapsed: true,
  },
  { id: "news", title: "What's new", tabs: ["main", "media"], collapsed: true },
];
export function cohesiveLayout(layout: DashboardLayout): DashboardLayout {
  if (layout.cohesionVersion === 1) return layout;
  const reading = (layout["panel:school:readings"] ?? layout["panel:readings"] ?? {}) as Partial<PanelPreference>;
  const lastOrder=Math.max(...PANELS.filter(p=>p.tabs.includes("school")&&p.id!=="readings").map(p=>{
    const preference=(layout[`panel:school:${p.id}`]??layout[`panel:${p.id}`]) as Partial<PanelPreference>|undefined;
    return Number.isFinite(preference?.order)?preference!.order!:PANELS.indexOf(p);
  }));
  return {...layout, cohesionVersion: 1, "panel:school:readings": {...reading, collapsed: true, order: lastOrder+1}};
}
export function panelPreference(
  layout: DashboardLayout,
  tab: DashboardTab,
  id: PanelId,
): PanelPreference {
  layout = cohesiveLayout(layout);
  const saved = (layout[`panel:${tab}:${id}`] ?? layout[`panel:${id}`]) as
    | Partial<PanelPreference>
    | undefined;
  return {
    hidden: saved?.hidden === true,
    pinned: typeof saved?.pinned === 'boolean' ? saved.pinned : DEFAULT_PINS[tab].includes(id),
    collapsed:
      typeof saved?.collapsed === "boolean"
        ? saved.collapsed
        : PANELS.find((p) => p.id === id)?.collapsed === true,
    order: Number.isFinite(saved?.order) ? saved?.order : undefined,
  };
}
const DEFAULT_PINS: Record<DashboardTab, PanelId[]> = {
  main: ['gmail', 'music', 'projects'],
  school: ['readings', 'study', 'todo'],
  media: ['music', 'entertainment', 'releases'],
};
export function pinnedPanels(layout: DashboardLayout, tab: DashboardTab) {
  return PANELS.filter(p => p.tabs.includes(tab) && panelPreference(layout,tab,p.id).pinned && !panelPreference(layout,tab,p.id).hidden)
    .sort((a,b) => (panelPreference(layout,tab,a.id).order ?? PANELS.indexOf(a)) - (panelPreference(layout,tab,b.id).order ?? PANELS.indexOf(b)));
}
export function dashboardTab(value: unknown): DashboardTab {
  return value === "school" || value === "media" ? value : "main";
}
export function dashboardSpaceUrl(current: string, tab: DashboardTab) {
  const url = new URL(current);
  url.searchParams.set('space', tab);
  return `${url.pathname}${url.search}${url.hash}`;
}
export const PALETTES = ["forest", "dusk", "ash", "sandia", "paper", "yharnam"] as const;
export function validPalette(value: unknown): value is typeof PALETTES[number] {
  return typeof value === "string" && PALETTES.includes(value as typeof PALETTES[number]);
}
export const ACCENTS = {
  sage: "#687556",
  terracotta: "#995a42",
  dusk: "#6d6685",
};
export function spacePreference(layout: DashboardLayout, tab: DashboardTab) {
  const raw = layout[`space:${tab}`] as
    | { accent?: string; density?: string; palette?: string }
    | undefined;
  return {
    palette: "shared",
    accent: typeof layout.accent === "string" && layout.accent in ACCENTS ? layout.accent : "palette",
    density: ["compact", "comfortable", "airy"].includes(raw?.density || "")
      ? raw!.density!
      : "comfortable",
  };
}
