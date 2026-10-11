"use client";
import { longDate } from "@/lib/localtime";
import type { Trashed } from "@/lib/record-recovery";

type Props<T> = {
  items: Record<string, Trashed<T>>;
  title: (item: T) => string;
  onRestore: (id: string) => boolean;
};
export default function RecordTrash<T>({ items, title, onRestore }: Props<T>) {
  const entries = Object.entries(items).sort(([, a], [, b]) =>
    b.deletedAt.localeCompare(a.deletedAt),
  );
  if (!entries.length) return null;
  return (
    <details className="record-trash">
      <summary>
        Trash · {entries.length} {entries.length === 1 ? "item" : "items"}
      </summary>
      <p className="sub">
        Removed items stay here until you restore them, including after a
        reload.
      </p>
      {entries.map(([id, item]) => (
        <div className="record-trash-row" key={id}>
          <div>
            <strong>{title(item)}</strong>
            <span className="sub">
              Removed {longDate(item.deletedAt.slice(0, 10))}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Restore ${title(item)}`}
            onClick={() => onRestore(id)}
          >
            Restore
          </button>
        </div>
      ))}
    </details>
  );
}
