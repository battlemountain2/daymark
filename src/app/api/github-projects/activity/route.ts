import { isSignedIn } from "@/lib/auth";
import { githubRepository } from "@/lib/github-projects";
import {
  githubChanges,
  githubWork,
  githubActivityRepository,
  type GitHubActivity,
} from "@/lib/github-activity";

export async function GET(request: Request) {
  if (!(await isSignedIn()))
    return Response.json(
      { error: "Sign in to view project activity." },
      { status: 401 },
    );
  const parsed = githubRepository(
    new URL(request.url).searchParams.get("repository") || "",
  );
  if (!parsed)
    return Response.json(
      { error: "Use a GitHub repository link." },
      { status: 400 },
    );
  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.name}`;
  const options = {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "daymark-projects",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  };
  const results = await Promise.allSettled([
    fetch(base, options),
    fetch(`${base}/commits?per_page=4`, options),
    fetch(
      `${base}/issues?state=open&sort=updated&direction=desc&per_page=6`,
      options,
    ),
  ]);
  const details = results[0];
  if (details.status !== "fulfilled" || !details.value.ok)
    return Response.json(
      {
        error:
          details.status === "fulfilled" && details.value.status === 404
            ? "This public repository was not found. Its saved link is still available."
            : "GitHub is unavailable or its request limit was reached. Try again later.",
      },
      { status: 502 },
    );
  try {
    const repository = githubActivityRepository(await details.value.json());
    if (!repository)
      return Response.json(
        { error: "Could not read public repository details." },
        { status: 502 },
      );
    const warnings: string[] = [];
    async function list(index: number, label: string) {
      const result = results[index];
      if (
        result.status === "fulfilled" &&
        result.value.status === 409 &&
        index === 1
      )
        return [];
      if (result.status !== "fulfilled" || !result.value.ok) {
        warnings.push(`${label} could not be loaded.`);
        return [];
      }
      try {
        const raw = await result.value.json();
        if (!Array.isArray(raw)) throw Error();
        return raw;
      } catch {
        warnings.push(`${label} could not be read.`);
        return [];
      }
    }
    const [changes, work] = await Promise.all([
      list(1, "Code updates"),
      list(2, "Open work"),
    ]);
    const activity: GitHubActivity = {
      repository,
      changes: githubChanges(changes, parsed.url),
      work: githubWork(work, parsed.url),
      checkedAt: new Date().toISOString(),
      warnings,
    };
    return Response.json(activity, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "Could not read GitHub activity. Try again later." },
      { status: 502 },
    );
  }
}
