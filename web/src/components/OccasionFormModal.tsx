import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import type { Occasion, OccasionInput } from "@crm/shared";
import { todayYmd } from "@crm/shared";
import { api } from "../api.ts";
import { TagPicker } from "./TagPicker.tsx";

type OccasionFormModalProps = {
  occasion: Occasion | null;
  suggestions: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function OccasionFormModal({
  occasion,
  suggestions,
  onClose,
  onSaved,
}: OccasionFormModalProps) {
  const editing = Boolean(occasion);
  const [title, setTitle] = useState(occasion?.title ?? "");
  const [date, setDate] = useState(occasion?.date ?? todayYmd());
  const [tags, setTags] = useState<string[]>(occasion?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: OccasionInput = { title: title.trim(), date, tags };
    const today = todayYmd();
    try {
      if (editing && occasion) {
        await api(`/api/occasions/${occasion.id}?today=${today}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/api/occasions?today=${today}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!occasion) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/occasions/${occasion.id}`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setBusy(false);
    }
  }

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-card p-6 shadow-lg"
        onClick={stop}
      >
        <h2 className="font-serif text-2xl">{editing ? "Edit occasion" : "New occasion"}</h2>
        <form className="mt-5 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block text-sm">
            Title
            <input
              required
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block text-sm">
            Date
            <input
              required
              type="date"
              min={todayYmd()}
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="text-sm">
            <p className="mb-1">Tags</p>
            <TagPicker value={tags} suggestions={suggestions} onChange={setTags} />
          </div>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {editing ? (
              <button
                type="button"
                className="text-sm text-rose hover:underline"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                {confirmDelete ? "Click again to delete" : "Delete"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-4 py-2 text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent";
