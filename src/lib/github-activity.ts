import {
  githubRepository,
  repositoryDetails,
  type GitHubRepository,
} from "./github-projects";
export type GitHubChange = {
  id: string;
  title: string;
  url: string;
  date: string;
};
export type GitHubWork = {
  id: number;
  title: string;
  url: string;
  kind: "issue" | "pull";
  updatedAt: string;
};
export type GitHubActivity = {
  repository: GitHubRepository;
  changes: GitHubChange[];
  work: GitHubWork[];
  checkedAt: string;
  warnings: string[];
};
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function repositoryLink(value: unknown, repository: string, section: string) {
  try {
    const link = new URL(String(value));
    const repo = githubRepository(repository);
    if (
      !repo ||
      link.origin !== "https://github.com" ||
      link.username ||
      link.password ||
      !link.pathname
        .toLowerCase()
        .startsWith(`/${repo.fullName}/${section}/`.toLowerCase())
    )
      return null;
    return link.href;
  } catch {
    return null;
  }
}
export function githubChanges(
  raw: unknown,
  repository: string,
): GitHubChange[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((value) => {
      const item = object(value),
        commit = object(item.commit),
        url = repositoryLink(item.html_url, repository, "commit");
      if (
        !url ||
        typeof item.sha !== "string" ||
        typeof commit.message !== "string"
      )
        return [];
      return [
        {
          id: item.sha,
          title: commit.message.split("\n")[0].slice(0, 240),
          url,
          date: String(
            object(commit.committer).date || object(commit.author).date || "",
          ),
        },
      ];
    })
    .slice(0, 4);
}
export function githubWork(raw: unknown, repository: string): GitHubWork[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((value) => {
      const item = object(value),
        kind = item.pull_request ? ("pull" as const) : ("issue" as const),
        url = repositoryLink(
          item.html_url,
          repository,
          kind === "pull" ? "pull" : "issues",
        );
      if (
        !url ||
        !Number.isSafeInteger(item.number) ||
        typeof item.title !== "string" ||
        item.state !== "open"
      )
        return [];
      return [
        {
          id: item.number as number,
          title: item.title.slice(0, 240),
          url,
          kind,
          updatedAt: String(item.updated_at || ""),
        },
      ];
    })
    .slice(0, 6);
}
export function githubActivityRepository(raw: unknown) {
  return repositoryDetails(object(raw));
}
