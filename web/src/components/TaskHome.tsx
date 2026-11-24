import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  isTaskOverdue,
  parseTaskStatus,
  taskFormPath,
  taskSubjectLabel,
  taskSubjectPath,
  tasksForView,
  todayYmd,
  type Task,
  type TaskStatus,
} from "@crm/shared";
import { api } from "../api.ts";
import { formatDay } from "../format.ts";
import { LoadingSpinner } from "./LoadingSpinner.tsx";
import { paginate, Paginator } from "./Paginator.tsx";

type TaskHomeProps = {
  variant: "page" | "section";
  personId?: string;
  groupId?: string;
};

export function TaskHome({ variant, personId, groupId }: TaskHomeProps) {
  const isPage = variant === "page";
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localView, setLocalView] = useState<TaskStatus>("pending");
  const [localPage, setLocalPage] = useState(1);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const view = isPage ? parseTaskStatus(searchParams.get("view")) : localView;
  const query = isPage ? (searchParams.get("q") ?? "") : "";
  const page = isPage ? Math.max(1, Number(searchParams.get("page")) || 1) : localPage;
  const today = todayYmd();

  const path = personId
    ? `/api/tasks?personId=${personId}`
    : groupId
      ? `/api/tasks?groupId=${groupId}`
      : "/api/tasks";

  useEffect(() => {
    let cancelled = false;
    setTasks(null);
    setError(null);
    void api<Task[]>(path)
      .then((next) => {
        if (!cancelled) setTasks(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load tasks");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const shown = tasks ? tasksForView(tasks, view, query) : [];
  const paged = isPage ? paginate(shown, page) : null;
  const rows = paged ? paged.pageItems : shown;
  const totalPages = paged?.totalPages ?? 1;

  useEffect(() => {
    if (!isPage || !tasks || page <= totalPages) return;
    const params = new URLSearchParams();
    if (view !== "pending") params.set("view", view);
    if (query) params.set("q", query);
    if (totalPages > 1) params.set("page", String(totalPages));
    setSearchParams(params, { replace: true });
  }, [isPage, tasks, page, totalPages, view, query, setSearchParams]);

  function commit(next: { view?: TaskStatus; q?: string; page?: number }) {
    const nextView = next.view ?? view;
    const nextQuery = next.q !== undefined ? next.q : query;
    const reset = next.view !== undefined || next.q !== undefined;
    const nextPage = next.page ?? (reset ? 1 : page);
    if (!isPage) {
      if (next.view) setLocalView(next.view);
      setLocalPage(nextPage);
      return;
    }
    const params = new URLSearchParams();
    if (nextView !== "pending") params.set("view", nextView);
    if (nextQuery) params.set("q", nextQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    setSearchParams(params, { replace: true });
  }

  const origin = {
    from: personId ? "person" : groupId ? "group" : "tasks",
    personId: personId ?? null,
    groupId: groupId ?? null,
    view: isPage ? view : null,
    q: isPage ? query : null,
    page: isPage ? String(paged?.currentPage ?? page) : null,
  };

  async function complete(task: Task) {
    setCompletingId(task.id);
    setError(null);
    try {
      const next = await api<Task>(`/api/tasks/${task.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "completed" }),
      });
      setTasks((current) => current?.map((item) => (item.id === next.id ? next : item)) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
    } finally {
      setCompletingId(null);
    }
  }

  const empty = tasks ? emptyMessage(tasks.length, view, query, shown.length) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {isPage ? (
          <div>
            <h1 className="font-serif text-4xl">Tasks</h1>
            <p className="mt-1 text-ink-soft">What you mean to do.</p>
          </div>
        ) : (
          <h2 className="font-serif text-2xl">Tasks</h2>
        )}
        <Link
          to={taskFormPath(null, origin)}
          className="rounded-lg bg-ink px-3 py-2 text-sm text-paper hover:bg-ink/90"
        >
          New task
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={view === status}
            className={
              view === status
                ? "rounded-full bg-ink px-3 py-1 text-sm text-paper"
                : "rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-ink hover:text-ink"
            }
            onClick={() => commit({ view: status })}
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {isPage ? (
        <input
          className="mt-4 w-full max-w-md rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
          placeholder="Filter by task name"
          value={query}
          autoComplete="off"
          onChange={(event) => commit({ q: event.target.value })}
        />
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose">{error}</p> : null}

      {!tasks && !error ? (
        <div className="mt-4">
          <LoadingSpinner />
        </div>
      ) : empty ? (
        <p className="mt-4 text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((task) => {
            const overdue = isTaskOverdue(task, today);
            const subject = isPage ? taskSubjectLabel(task.subject) : null;
            const subjectHref = isPage ? taskSubjectPath(task.subject) : null;
            return (
              <li key={task.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={taskFormPath(task.id, origin)} className="font-medium hover:underline">
                      {task.name}
                    </Link>
                    {task.dueDate || subject ? (
                      <p className="mt-1 text-sm text-ink-soft">
                        {task.dueDate ? formatDay(task.dueDate) : null}
                        {overdue ? <span className="text-rose"> · Overdue</span> : null}
                        {subject && subjectHref ? (
                          <>
                            {task.dueDate ? " · " : null}
                            <Link
                              to={subjectHref}
                              className="text-ink underline-offset-2 hover:underline"
                            >
                              {subject}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  {task.status === "pending" ? (
                    <button
                      type="button"
                      className="shrink-0 text-sm text-accent hover:underline disabled:opacity-50"
                      disabled={completingId === task.id}
                      onClick={() => void complete(task)}
                    >
                      Complete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isPage && paged && paged.total > 0 ? (
        <Paginator
          page={paged.currentPage}
          totalPages={paged.totalPages}
          total={paged.total}
          onPageChange={(next) => commit({ page: next })}
        />
      ) : null}
    </div>
  );
}

function emptyMessage(total: number, view: TaskStatus, query: string, shown: number): string | null {
  if (shown > 0) return null;
  if (total === 0) return "No tasks yet.";
  if (query.trim()) return "No tasks with that name in this view.";
  if (view === "pending") return "No pending tasks.";
  if (view === "completed") return "No completed tasks.";
  return "No cancelled tasks.";
}
