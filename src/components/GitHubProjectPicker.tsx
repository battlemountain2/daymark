"use client";

import { useEffect, useRef, useState } from "react";
import { githubRepository, type GitHubRepository } from "@/lib/github-projects";

type Props = {
  onAdd: (repo: GitHubRepository) => boolean;
  existing: string[];
};

export default function GitHubProjectPicker({ onAdd, existing }: Props) {
  const [owner, setOwner] = useState("battlemountain2");
  const [url, setUrl] = useState("");
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const addCurrent = useRef(onAdd);

  // Use the shelf's current draft/save state when a delayed request completes.
  useEffect(() => {
    addCurrent.current = onAdd;
  }, [onAdd]);
  useEffect(() => () => request.current?.abort(), []);

  async function load(repository?: string) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams(
        repository ? { repository } : { owner: owner.trim() },
      );
      const response = await fetch(`/api/github-projects?${query}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok)
        throw Error(data.error || "Could not load GitHub projects.");
      if (!Array.isArray(data.repositories))
        throw Error("GitHub returned an unreadable list. Try again.");
      if (repository) {
        const repo = data.repositories[0];
        if (!repo)
          throw Error(
            "No public repository was found. You can still save its link.",
          );
        if (addCurrent.current(repo)) setUrl("");
      } else {
        setRepos(data.repositories);
        if (!data.repositories.length)
          setError("No public repositories found for this username.");
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not load GitHub projects.",
        );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function addLink() {
    const parsed = githubRepository(url);
    if (!parsed) {
      setError(
        "Use a repository link such as https://github.com/battlemountain2/daymark.",
      );
      return;
    }
    if (
      onAdd({
        ...parsed,
        description: "",
        language: null,
        updatedAt: "",
        defaultBranch: "",
        openItems: 0,
      })
    ) {
      setUrl("");
      setError("");
    }
  }

  return (
    <details className="github-project-picker">
      <summary>Add a GitHub project</summary>
      <p className="sub">
        Choose a public repository, or paste a link. Your notes and tasks stay
        in Daymark.
      </p>
      <form
        className="github-project-form"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          GitHub username
          <input
            value={owner}
            disabled={busy}
            onChange={(e) => {
              setOwner(e.target.value);
              setRepos([]);
              setError("");
            }}
            required
            maxLength={39}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Loading…" : "Find repositories"}
        </button>
      </form>
      <div className="github-repository-list">
        {repos.map((repo) => {
          const added = existing.includes(repo.fullName.toLowerCase());
          return (
            <div key={repo.fullName}>
              <strong>{repo.fullName.split("/")[1]}</strong>
              <p className="sub">
                {repo.description || repo.language || "GitHub repository"}
              </p>
              <button
                type="button"
                disabled={busy || added}
                onClick={() => onAdd(repo)}
              >
                {added ? "Added" : "Add project"}
              </button>
            </div>
          );
        })}
      </div>
      <form
        className="github-project-form"
        onSubmit={(e) => {
          e.preventDefault();
          void load(url);
        }}
      >
        <label>
          Repository link
          <input
            type="url"
            value={url}
            disabled={busy}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            required
            placeholder="https://github.com/owner/repository"
          />
        </label>
        <button type="submit" disabled={busy}>
          Add repository
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {url && (
        <button type="button" disabled={busy} onClick={addLink}>
          Save link without fetching details
        </button>
      )}
    </details>
  );
}
