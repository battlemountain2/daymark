import type { State } from "@/lib/db";

/**
 * The same mutations the server performs, applied locally.
 *
 * This exists so a tick registers instantly instead of waiting for a round
 * trip, and so it still registers when there is no round trip to be had. It
 * must mirror `src/app/api/state/route.ts` exactly — if the two drift, an
 * offline edit will show one thing and then silently change to another when it
 * syncs, which is worse than not applying it at all.
 *
 * Pure and total: never mutates its input, and an unknown action is a no-op
 * rather than a throw, because this runs on the optimistic path where breaking
 * would lose the user's edit.
 */

/**
 * Prefix for ids minted on the client.
 *
 * These are not temporary — the server accepts them verbatim, which is what
 * makes a replayed create idempotent. The prefix only marks provenance, so a
 * delete of something that never synced can cancel its queued creation.
 */
export const TEMP_PREFIX = "local-";

export const isTemp = (id: string): boolean => id.startsWith(TEMP_PREFIX);

export function applyLocal(state: State, body: Record<string, unknown>): State {
  const action = String(body.action ?? "");

  switch (action) {
    case "tick": {
      const key = String(body.key ?? "");
      if (!key) return state;
      return { ...state, ticks: { ...state.ticks, [key]: !!body.done } };
    }

    case "dismiss": {
      const key = String(body.key ?? "");
      if (!key) return state;
      const hidden = !!body.hidden;
      const has = state.dismissed.includes(key);
      if (hidden === has) return state;
      return {
        ...state,
        dismissed: hidden
          ? [...state.dismissed, key]
          : state.dismissed.filter((k) => k !== key),
      };
    }

    case "addTodo": {
      const title = String(body.title ?? "").trim();
      const due = String(body.due ?? "");
      // Same validation the route applies, so an edit that would be rejected
      // never appears locally in the first place.
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return state;
      const id = String(body.id ?? body.__localId ?? "");
      if (!id) return state;
      if (state.todos.some((t) => t.id === id)) return state;
      return {
        ...state,
        todos: [...state.todos, { id, title: title.slice(0, 200), due, done: false }]
          .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0)),
      };
    }

    case "todoDone": {
      const id = String(body.id ?? "");
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === id ? { ...t, done: !!body.done } : t)),
      };
    }

    case "deleteTodo": {
      const id = String(body.id ?? "");
      return { ...state, todos: state.todos.filter((t) => t.id !== id) };
    }

    default:
      return state;
  }
}
