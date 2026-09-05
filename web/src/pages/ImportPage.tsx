import { useState } from "react";
import { Link } from "react-router-dom";
import { CSV_COLUMNS } from "@crm/shared";
import { api } from "../api.ts";

type ImportResult = {
  created: number;
  errors: { row: number; message: string }[];
};

export function ImportPage() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const csv = await file.text();
      const data = await api<ImportResult>("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csv,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Import people</h1>
      <p className="mt-2 text-ink-soft">
        CSV only. Duplicate names are imported as separate people. No merge.
      </p>
      <a
        href="/api/import/template"
        className="mt-4 inline-block text-sm text-accent hover:underline"
      >
        Download template
      </a>
      <p className="mt-4 text-sm text-ink-soft">
        Columns: {CSV_COLUMNS.join(", ")}. Tags are pipe-separated. Social links look like{" "}
        <code>instagram:@ana;linkedin:https://…</code>.
      </p>
      <label className="mt-8 block rounded-xl border border-dashed border-line bg-card p-8 text-center">
        <span className="text-sm">{busy ? "Importing…" : "Choose a .csv file"}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-3 block w-full text-sm"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>
      {error ? <p className="mt-4 text-rose">{error}</p> : null}
      {result ? (
        <div className="mt-6 rounded-xl border border-line bg-card p-5 text-sm">
          <p>
            Created {result.created} {result.created === 1 ? "person" : "people"}.
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-rose">
              {result.errors.map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Row {item.row}: {item.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-soft">
              <Link className="text-accent underline" to="/people">
                View people
              </Link>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
