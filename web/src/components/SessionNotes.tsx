import { useEffect, useState, type MouseEvent } from "react";

export function SessionNotes() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const preview = text.trim();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div className="shrink-0 lg:border-t lg:border-white/10 lg:pt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="session-notes-dialog"
        className={`relative rounded-md border border-white/15 px-2 py-1.5 text-sm hover:text-white ${
          open ? "z-[60] bg-white/10 text-white" : "text-paper-2"
        }`}
        onClick={() => setOpen((value) => !value)}
      >
        Notes
      </button>
      {!open && preview ? (
        <p className="mt-1 max-w-16 truncate text-xs text-paper-2 lg:max-w-full">{preview}</p>
      ) : null}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            id="session-notes-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-notes-title"
            className="w-full max-w-md rounded-xl border border-line bg-card p-6 text-ink shadow-lg"
            onClick={stop}
          >
            <h2 id="session-notes-title" className="font-serif text-2xl">
              Notes
            </h2>
            <label className="mt-5 block text-sm">
              Session notes
              <textarea
                className="mt-1 min-h-48 w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
