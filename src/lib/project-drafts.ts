import type { Project } from "./github-projects";
import type { RecordStorage } from "./personal-records";
export const PROJECT_DRAFTS_KEY = "daymark:project-drafts:v1";
export type ProjectDrafts = Record<
  string,
  Partial<Pick<Project, "title" | "next" | "note">>
>;

export function readProjectDrafts(storage: RecordStorage): ProjectDrafts {
  const raw = storage.getItem(PROJECT_DRAFTS_KEY);
  if (raw === null) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Unreadable project drafts.");
  for (const fields of Object.values(value)) {
    if (
      !fields ||
      typeof fields !== "object" ||
      Array.isArray(fields) ||
      Object.entries(fields).some(
        ([key, text]) =>
          !["title", "next", "note"].includes(key) || typeof text !== "string",
      )
    )
      throw Error("Unreadable project draft fields.");
  }
  return value as ProjectDrafts;
}
export function saveProjectDrafts(
  storage: RecordStorage,
  drafts: ProjectDrafts,
) {
  storage.setItem(PROJECT_DRAFTS_KEY, JSON.stringify(drafts));
}
