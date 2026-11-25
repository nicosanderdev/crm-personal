import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ACTIVITY_PRESET_DAYS,
  addDaysYmd,
  parseActivityDay,
  rollingRange,
  todayYmd,
  type ActivityBlock,
  type ActivityBucket,
  type ActivityResponse,
  type ActivityRow,
} from "@crm/shared";
import { api } from "../api.ts";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";
import { formatDay } from "../format.ts";

const RANGE_ERROR = "Start is after end";

export function ActivityPage() {
  const [params, setSearchParams] = useSearchParams();
  const urlFrom = params.get("from") ?? "";
  const urlTo = params.get("to") ?? "";
  const urlReady = isOrderedRange(urlFrom, urlTo);
  const [draft, setDraft] = useState(() => initialDraft(urlFrom, urlTo));
  const [rangeError, setRangeError] = useState<string | null>(() =>
    isRealDay(urlFrom) && isRealDay(urlTo) && urlFrom > urlTo ? RANGE_ERROR : null,
  );
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isRealDay(urlFrom) && isRealDay(urlTo)) {
      setDraft({ from: urlFrom, to: urlTo });
      setRangeError(urlFrom > urlTo ? RANGE_ERROR : null);
      return;
    }
    const range = rollingRange(todayYmd(), 30);
    if (!range) return;
    setSearchParams({ from: range.from, to: range.to }, { replace: true });
  }, [urlFrom, urlTo, setSearchParams]);

  useEffect(() => {
    if (!urlReady) return;
    let cancelled = false;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLoadError(null);
    api<ActivityResponse>(
      `/api/activity?${new URLSearchParams({ from: urlFrom, to: urlTo, timeZone })}`,
    )
      .then((report) => {
        if (cancelled) return;
        setData(report);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setLoadError(err instanceof Error ? err.message : "Could not load activity");
      });
    return () => {
      cancelled = true;
    };
  }, [urlFrom, urlTo, urlReady]);

  function commit(nextFrom: string, nextTo: string) {
    setDraft({ from: nextFrom, to: nextTo });
    if (!isRealDay(nextFrom) || !isRealDay(nextTo)) {
      setRangeError(null);
      return;
    }
    if (nextFrom > nextTo) {
      setRangeError(RANGE_ERROR);
      return;
    }
    setRangeError(null);
    setSearchParams({ from: nextFrom, to: nextTo }, { replace: true });
  }

  function applyPreset(days: number) {
    const range = rollingRange(todayYmd(), days);
    if (!range) return;
    setDraft(range);
    setRangeError(null);
    setSearchParams({ from: range.from, to: range.to }, { replace: true });
  }

  const preset =
    rangeError || !isOrderedRange(draft.from, draft.to) ? null : matchingPreset(draft.from, draft.to);
  const reportMatches = data?.from === urlFrom && data?.to === urlTo;

  return (
    <div>
      <h1 className="font-serif text-4xl">Activity overview</h1>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_PRESET_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={preset === days}
              className={
                preset === days
                  ? "rounded-full bg-ink px-3 py-1.5 text-sm text-paper"
                  : "rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink hover:text-ink"
              }
              onClick={() => applyPreset(days)}
            >
              {days} days
            </button>
          ))}
        </div>
        <label className="text-sm text-ink-soft">
          From
          <input
            type="date"
            value={draft.from}
            aria-invalid={rangeError ? true : undefined}
            className={`mt-1 block rounded-lg border bg-card px-3 py-2 text-ink ${rangeError ? "border-rose" : "border-line"}`}
            onChange={(event) => commit(event.target.value, draft.to)}
          />
        </label>
        <label className="text-sm text-ink-soft">
          To
          <input
            type="date"
            value={draft.to}
            aria-invalid={rangeError ? true : undefined}
            className={`mt-1 block rounded-lg border bg-card px-3 py-2 text-ink ${rangeError ? "border-rose" : "border-line"}`}
            onChange={(event) => commit(draft.from, event.target.value)}
          />
        </label>
      </div>
      {rangeError ? <p className="mt-3 text-sm text-rose">{rangeError}</p> : null}

      {loadError ? <p className="mt-8 text-rose">{loadError}</p> : null}
      {urlReady && !reportMatches && !loadError ? <LoadingSpinner /> : null}
      {reportMatches && data && !loadError ? (
        <div>
          <Block title="Conversations" block={data.conversations} />
          <Block title="Tasks completed" block={data.tasks} loose={data.tasks.loose} />
        </div>
      ) : null}
    </div>
  );
}

function Block({
  title,
  block,
  loose = 0,
}: {
  title: string;
  block: ActivityBlock;
  loose?: number;
}) {
  const max = Math.max(
    0,
    ...block.people.map((row) => row.count),
    ...block.groups.map((row) => row.count),
    loose,
  );
  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-serif text-3xl">{title}</h2>
        <p className="font-serif text-5xl leading-none tabular-nums">{block.total}</p>
      </div>
      <div className="mt-6">
        <ColumnChart buckets={block.buckets} from={block.buckets[0]?.start ?? ""} to={block.buckets.at(-1)?.end ?? ""} />
      </div>
      <div className="mt-8 space-y-8">
        <Breakdown title="People" rows={block.people} kind="person" max={max} />
        <Breakdown title="Groups" rows={block.groups} kind="group" max={max} />
        {loose > 0 ? (
          <Breakdown
            title="Loose"
            rows={[{ id: null, name: "Loose", count: loose }]}
            kind="loose"
            max={max}
          />
        ) : null}
      </div>
    </section>
  );
}

function Breakdown({
  title,
  rows,
  kind,
  max,
}: {
  title: string;
  rows: ActivityRow[];
  kind: "person" | "group" | "loose";
  max: number;
}) {
  const subtotal = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section>
      <h3 className="flex items-baseline justify-between gap-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        <span>{title}</span>
        <span className="font-sans tabular-nums">{subtotal}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-ink-soft">None in this period</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const width = max === 0 ? 0 : (row.count / max) * 100;
            const path = row.id
              ? kind === "person"
                ? `/people/${row.id}`
                : kind === "group"
                  ? `/groups/${row.id}`
                  : null
              : null;
            return (
              <li
                key={row.id ?? row.name}
                className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3"
              >
                {path ? (
                  <Link to={path} className="truncate text-sm underline-offset-2 hover:underline">
                    {row.name}
                  </Link>
                ) : (
                  <span className="truncate text-sm">{row.name}</span>
                )}
                <div className="h-2.5 rounded-full bg-line">
                  <div className="h-2.5 rounded-full bg-ink" style={{ width: `${width}%` }} />
                </div>
                <span className="w-8 text-right text-sm tabular-nums">{row.count}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ColumnChart({
  buckets,
  from,
  to,
}: {
  buckets: ActivityBucket[];
  from: string;
  to: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...buckets.map((bucket) => bucket.count));
  const step = buckets.length <= 16 ? 1 : Math.ceil(buckets.length / 8);
  const withYear = from.slice(0, 4) !== to.slice(0, 4);
  const current = active == null ? null : buckets[active];

  return (
    <figure>
      <div className="pt-5" role="list" aria-label="Counts over time">
        <div className="flex h-36 items-end gap-px border-b border-line">
          {buckets.map((bucket, index) => {
            const height = max === 0 || bucket.count === 0 ? 0 : (bucket.count / max) * 100;
            const label = `${bucketTitle(bucket.start, bucket.end)}: ${bucket.count}`;
            return (
              <div
                key={bucket.start}
                role="listitem"
                tabIndex={0}
                aria-label={label}
                className="relative flex h-full min-w-0 flex-1 items-end outline-none focus-visible:bg-accent/10"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onMouseLeave={(event) => {
                  if (document.activeElement === event.currentTarget) return;
                  setActive((currentIndex) => (currentIndex === index ? null : currentIndex));
                }}
                onBlur={() => setActive((currentIndex) => (currentIndex === index ? null : currentIndex))}
              >
                {bucket.count >= 1 ? (
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1 text-[11px] leading-none"
                    style={{ bottom: `${height}%` }}
                  >
                    {bucket.count}
                  </span>
                ) : null}
                <div
                  className="w-full rounded-t bg-ink"
                  style={{ height: bucket.count === 0 ? 0 : `max(${height}%, 2px)` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 h-5 text-center text-xs text-ink-soft" aria-hidden>
        {current ? `${bucketTitle(current.start, current.end)} · ${current.count}` : "\u00a0"}
      </p>
      <div className="flex gap-px">
        {buckets.map((bucket, index) => (
          <div
            key={bucket.start}
            className="min-w-0 flex-1 text-center text-[10px] leading-tight text-ink-soft"
          >
            {showTick(index, buckets.length, step) ? (
              <AxisTick start={bucket.start} end={bucket.end} withYear={withYear} />
            ) : (
              "\u00a0"
            )}
          </div>
        ))}
      </div>
    </figure>
  );
}

function bucketTitle(start: string, end: string): string {
  const first = formatDay(`${start}T12:00:00.000Z`);
  if (start === end) return first;
  return `${first} – ${formatDay(`${end}T12:00:00.000Z`)}`;
}

function showTick(index: number, total: number, step: number): boolean {
  if (step === 1) return true;
  if (index % step === 0) return true;
  return index === total - 1 && (total - 1) % step >= Math.ceil(step / 2);
}

function AxisTick({ start, end, withYear }: { start: string; end: string; withYear: boolean }) {
  const next = addDaysYmd(end, 1);
  if (start.endsWith("-01") && next?.endsWith("-01")) {
    return <span className="block">{calendarLabel(start, withYear, false)}</span>;
  }
  if (start === end) return <span className="block">{calendarLabel(start, withYear, true)}</span>;
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return (
      <span className="block">
        <span className="block">
          {Number(start.slice(8, 10))}–{Number(end.slice(8, 10))}
        </span>
        <span className="block">{calendarLabel(start, withYear, false)}</span>
      </span>
    );
  }
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (
    <span className="block">
      <span className="block">{calendarLabel(start, withYear || crossYear, true)}</span>
      <span className="block">{calendarLabel(end, withYear || crossYear, true)}</span>
    </span>
  );
}

function calendarLabel(ymd: string, withYear: boolean, withDay: boolean): string {
  return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString(undefined, {
    ...(withDay ? { day: "numeric" } : {}),
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function isRealDay(value: string): boolean {
  return parseActivityDay(value) != null;
}

function isOrderedRange(from: string, to: string): boolean {
  return isRealDay(from) && isRealDay(to) && from <= to;
}

function initialDraft(from: string, to: string): { from: string; to: string } {
  if (isRealDay(from) && isRealDay(to)) return { from, to };
  return rollingRange(todayYmd(), 30) ?? { from: "", to: "" };
}

function matchingPreset(from: string, to: string): number | null {
  const today = todayYmd();
  for (const days of ACTIVITY_PRESET_DAYS) {
    const range = rollingRange(today, days);
    if (range && range.from === from && range.to === to) return days;
  }
  return null;
}
