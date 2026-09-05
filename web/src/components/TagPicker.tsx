import { useState, type KeyboardEvent } from "react";
import { normalizeTags } from "@crm/shared";

type TagPickerProps = {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
};

export function TagPicker({ value, suggestions, onChange }: TagPickerProps) {
  const [draft, setDraft] = useState("");

  const available = suggestions.filter((tag) => !value.includes(tag));
  const filtered = draft
    ? available.filter((tag) => tag.includes(draft.trim().toLowerCase()))
    : available;
  const normalizedDraft = normalizeTags([draft])[0];
  const canCreate = Boolean(normalizedDraft) && !value.includes(normalizedDraft);

  function add(tag: string) {
    onChange(normalizeTags([...value, tag]));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (normalizedDraft) add(normalizedDraft);
  }

  return (
    <div>
      {value.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5 text-sm"
            >
              {tag}
              <button
                type="button"
                className="text-ink-soft hover:text-ink"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        className="w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add a tag"
      />
      {filtered.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filtered.slice(0, 20).map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full border border-line px-2.5 py-0.5 text-sm text-ink-soft hover:border-ink hover:text-ink"
              onClick={() => add(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : canCreate ? (
        <button
          type="button"
          className="mt-2 text-sm text-accent hover:underline"
          onClick={() => add(normalizedDraft)}
        >
          Create “{normalizedDraft}”
        </button>
      ) : null}
    </div>
  );
}
