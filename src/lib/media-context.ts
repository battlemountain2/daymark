import type { Pick } from "./entertainment";
export type SavedMedia = Pick & {
  shelf?: string;
  minutes?: number;
  company?: "solo" | "friends" | "either";
  finished?: string;
  added?: string;
  note?: string;
};
export function contextPool(
  items: SavedMedia[],
  options: { kind: string; budget: number; company: string; shelf: string },
) {
  const seen = new Set<string>();
  return items.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return (
      !p.finished &&
      p.kind === options.kind &&
      (!options.shelf || p.shelf === options.shelf) &&
      (!options.budget || (!!p.minutes && p.minutes <= options.budget)) &&
      (options.company === "either" ||
        p.company === "either" ||
        p.company === options.company)
    );
  });
}
export function inPastWeek(date: string | undefined, now = Date.now()) {
  if (!date) return false;
  const time = Date.parse(date);
  return Number.isFinite(time) && time <= now && time >= now - 7 * 86400000;
}
