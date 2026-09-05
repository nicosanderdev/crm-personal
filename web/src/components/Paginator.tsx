export const PAGE_SIZE = 20;

export function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  return {
    currentPage,
    totalPages,
    total: items.length,
    pageItems: items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
  };
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    const prev = sorted[i - 1];
    if (n === undefined) continue;
    if (prev !== undefined && n - prev > 1) items.push("ellipsis");
    items.push(n);
  }
  return items;
}

export function Paginator({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const btnClass =
    "min-w-8 rounded-md border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft";

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-ink-soft">
        {start}–{end} of {total}
      </p>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={btnClass}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          {pageNumbers(page, totalPages).map((item, i) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-ink-soft">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={
                  item === page
                    ? "min-w-8 rounded-md border border-ink bg-ink px-2.5 py-1 text-sm text-paper"
                    : btnClass
                }
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={btnClass}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </nav>
  );
}
