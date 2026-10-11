"use client";
import { useEffect, useRef, useState } from "react";
import type { GitHubActivity } from "@/lib/github-activity";
import { projectTaskId, type GitHubRepository } from "@/lib/github-projects";

type Props = {
  repository: GitHubRepository;
  projectId: string;
  disabled?: boolean;
  onTask?: (id: string, title: string) => Promise<boolean>;
  onDetails: (repository: GitHubRepository) => boolean;
};
export default function GitHubProjectActivity({
  repository,
  projectId,
  disabled,
  onTask,
  onDetails,
}: Props) {
  const [activity, setActivity] = useState<GitHubActivity | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [task, setTask] = useState<number | null>(null),
    [saved, setSaved] = useState<number[]>([]);
  const request = useRef<AbortController | null>(null),
    saveDetails = useRef(onDetails);
  useEffect(() => {
    saveDetails.current = onDetails;
  }, [onDetails]);
  useEffect(() => () => request.current?.abort(), []);
  async function refresh() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/github-projects/activity?${new URLSearchParams({ repository: repository.url })}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok)
        throw Error(data.error || "Could not load project activity.");
      setActivity(data);
      saveDetails.current(data.repository);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not load project activity.",
        );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="project-activity" aria-label="GitHub project activity">
      <div className="project-activity-head">
        <h3>From GitHub</h3>
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => void refresh()}
        >
          {busy ? "Checking…" : activity ? "Refresh activity" : "Show activity"}
        </button>
      </div>
      {!activity && (
        <p className="sub">
          Recent code updates and open issues or pull requests, without needing
          project notes.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {activity && (
        <>
          <p className="sub">
            {activity.repository.openItems} open{" "}
            {activity.repository.openItems === 1 ? "item" : "items"} ·{" "}
            {activity.repository.defaultBranch} · checked{" "}
            {new Date(activity.checkedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {activity.warnings.map((warning) => (
            <p className="sub" key={warning}>
              {warning}
            </p>
          ))}
          <div className="project-activity-columns">
            <div>
              <h4>Recent updates</h4>
              {activity.changes.map((change) => (
                <a
                  className="project-activity-item"
                  href={change.url}
                  target="_blank"
                  rel="noreferrer"
                  key={change.id}
                >
                  <strong>{change.title} ↗</strong>
                  <span className="sub">
                    {change.date
                      ? new Date(change.date).toLocaleDateString("en-US")
                      : "GitHub update"}
                  </span>
                </a>
              ))}
              {!activity.changes.length &&
                !activity.warnings.some((w) =>
                  w.startsWith("Code updates"),
                ) && <p className="sub">No code updates yet.</p>}
            </div>
            <div>
              <h4>Open work</h4>
              {activity.work.map((item) => (
                <div className="project-activity-item" key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <span className="mono sub">
                      {item.kind === "pull" ? "Pull request" : "Issue"} #
                      {item.id}
                    </span>
                    <strong>{item.title} ↗</strong>
                  </a>
                  {onTask && (
                    <button
                      type="button"
                      disabled={
                        disabled || task !== null || saved.includes(item.id)
                      }
                      onClick={async () => {
                        setTask(item.id);
                        setError("");
                        try {
                          if (
                            await onTask(
                              projectTaskId(projectId, item.url),
                              `${repository.fullName.split("/")[1]}: ${item.title}`,
                            )
                          )
                            setSaved((old) => [...old, item.id]);
                          else setError("Could not save this task. Try again.");
                        } catch {
                          setError("Could not save this task. Try again.");
                        } finally {
                          setTask(null);
                        }
                      }}
                    >
                      {saved.includes(item.id)
                        ? "Added to tasks"
                        : task === item.id
                          ? "Saving…"
                          : "Add to tasks"}
                    </button>
                  )}
                </div>
              ))}
              {!activity.work.length &&
                !activity.warnings.some((w) => w.startsWith("Open work")) && (
                  <p className="sub">No open issues or pull requests.</p>
                )}
              <a
                href={`${repository.url}/issues`}
                target="_blank"
                rel="noreferrer"
              >
                All open work on GitHub ↗
              </a>
            </div>
          </div>
          <p className="sub">
            Showing recent public activity. GitHub updates may take a few
            minutes to appear.
          </p>
        </>
      )}
    </section>
  );
}
