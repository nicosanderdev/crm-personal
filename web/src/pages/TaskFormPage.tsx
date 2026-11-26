import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_TEMPLATES,
  formatCreatedAt,
  includesFold,
  isTaskOverdue,
  taskListPath,
  todayYmd,
  type GroupSummary,
  type Person,
  type Task,
  type TaskCreateInput,
  type TaskInput,
  type TaskStatus,
  type TaskSubjectRef,
  type TaskTemplate,
} from "@crm/shared";
import { api } from "../api.ts";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

type Kind = TaskSubjectRef["kind"];

export function TaskFormPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const origin = {
    from: params.get("from"),
    personId: params.get("personId"),
    groupId: params.get("groupId"),
    view: params.get("view"),
    q: params.get("q"),
    page: params.get("page"),
  };
  const back = taskListPath(origin);

  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [kind, setKind] = useState<Kind>(
    params.get("personId") ? "person" : params.get("groupId") ? "group" : "loose",
  );
  const [personId, setPersonId] = useState(params.get("personId") ?? "");
  const [groupId, setGroupId] = useState(params.get("groupId") ?? "");
  const [personQuery, setPersonQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [ready, setReady] = useState(!editing);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (id) setReady(false);
    void Promise.all([
      api<Person[]>("/api/people"),
      api<GroupSummary[]>("/api/groups"),
      id ? api<Task>(`/api/tasks/${id}`) : Promise.resolve(null),
    ])
      .then(([nextPeople, nextGroups, task]) => {
        if (cancelled) return;
        setPeople(nextPeople);
        setGroups(nextGroups);
        if (task) applyTask(task);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load task");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function applyTask(task: Task) {
    setName(task.name);
    setDescription(task.description);
    setDueDate(task.dueDate ?? "");
    setStatus(task.status);
    setKind(task.subject.kind);
    setCreatedAt(task.createdAt);
    if (task.subject.kind === "person") setPersonId(task.subject.id);
    if (task.subject.kind === "group") setGroupId(task.subject.id);
  }

  function subject(): TaskSubjectRef | null {
    if (kind === "loose") return { kind: "loose" };
    if (kind === "person") {
      if (!personId) return null;
      return { kind: "person", id: personId };
    }
    if (!groupId) return null;
    return { kind: "group", id: groupId };
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const nextSubject = subject();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!nextSubject) {
      setError(kind === "person" ? "Choose a person." : "Choose a group.");
      return;
    }
    const fields: TaskCreateInput = {
      name: name.trim(),
      description,
      dueDate: dueDate || null,
      subject: nextSubject,
    };
    setBusy(true);
    setError(null);
    try {
      if (editing && id) {
        const body: TaskInput = { ...fields, status };
        const saved = await api<Task>(`/api/tasks/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        applyTask(saved);
      } else {
        await api<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        navigate(origin.from === "tasks" || !origin.from ? "/tasks" : back);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!window.confirm("Delete this task?")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      navigate(back);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
      setBusy(false);
    }
  }

  const selectedPerson = people.find((person) => person.id === personId);
  const selectedGroup = groups.find((group) => group.id === groupId);
  const personRows = people.filter((person) => includesFold(person.name, personQuery));
  const groupRows = groups.filter((group) => includesFold(group.name, groupQuery));
  const overdue = isTaskOverdue({ status, dueDate: dueDate || null }, todayYmd());
  const backLabel = origin.from === "person" ? "Person" : origin.from === "group" ? "Group" : "Tasks";
  const selectedTemplateId =
    TASK_TEMPLATES.find((template) => template.name === name && template.description === description)?.id ??
    null;

  function applyTemplate(template: TaskTemplate) {
    if (template.id === selectedTemplateId) {
      setName("");
      setDescription("");
      return;
    }
    setName(template.name);
    setDescription(template.description);
  }

  if (!ready && !error) return <LoadingSpinner />;

  return (
    <div className="max-w-xl">
      <Link to={back} className="text-sm text-ink-soft hover:text-ink">
        ← {backLabel}
      </Link>
      <h1 className="mt-4 font-serif text-4xl">{editing ? "Task" : "New task"}</h1>
      {createdAt ? (
        <p className="mt-2 text-sm text-ink-soft">Created {formatCreatedAt(createdAt)}</p>
      ) : null}

      <form onSubmit={(event) => void save(event)} className="mt-6 space-y-4">
        {editing ? null : (
          <fieldset>
            <legend className="text-sm">Templates</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TASK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={
                    template.id === selectedTemplateId
                      ? "rounded-full bg-ink px-3 py-1 text-sm text-paper"
                      : "rounded-full border border-line px-3 py-1 text-sm"
                  }
                  onClick={() => applyTemplate(template)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label className="block text-sm">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            required
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            className="mt-1 min-h-28 w-full rounded-lg border border-line bg-card px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
          />
        </label>
        <label className="block text-sm">
          Due date
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        {dueDate ? (
          <button
            type="button"
            className="text-sm text-ink-soft hover:text-ink"
            onClick={() => setDueDate("")}
          >
            Clear date
          </button>
        ) : null}
        {overdue ? <p className="text-sm text-rose">Overdue</p> : null}

        {editing ? (
          <label className="block text-sm">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {TASK_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-ink-soft">Starts as pending.</p>
        )}

        <fieldset>
          <legend className="text-sm">About</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["loose", "No one"],
                ["person", "Person"],
                ["group", "Group"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={
                  kind === value
                    ? "rounded-full bg-ink px-3 py-1 text-sm text-paper"
                    : "rounded-full border border-line px-3 py-1 text-sm"
                }
              >
                <input
                  type="radio"
                  name="subject"
                  className="sr-only"
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "person" ? (
          <div>
            <p className="text-sm">
              {selectedPerson
                ? `Selected: ${selectedPerson.name}${selectedPerson.pausedAt ? " · paused" : ""}`
                : "Choose a person."}
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2"
              placeholder="Filter people"
              value={personQuery}
              autoComplete="off"
              onChange={(event) => setPersonQuery(event.target.value)}
            />
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line">
              {personRows.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-soft">
                  {people.length === 0 ? "No people yet." : "No people match."}
                </li>
              ) : (
                personRows.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={
                        person.id === personId
                          ? "w-full bg-ink px-3 py-2 text-left text-sm text-paper"
                          : "w-full px-3 py-2 text-left text-sm hover:bg-paper"
                      }
                      onClick={() => setPersonId(person.id)}
                    >
                      {person.name}
                      {person.pausedAt ? " · paused" : ""}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {kind === "group" ? (
          <div>
            <p className="text-sm">
              {selectedGroup ? `Selected: ${selectedGroup.name}` : "Choose a group."}
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2"
              placeholder="Filter groups"
              value={groupQuery}
              autoComplete="off"
              onChange={(event) => setGroupQuery(event.target.value)}
            />
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line">
              {groupRows.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-soft">
                  {groups.length === 0 ? "No groups yet." : "No groups match."}
                </li>
              ) : (
                groupRows.map((group) => (
                  <li key={group.id}>
                    <button
                      type="button"
                      className={
                        group.id === groupId
                          ? "w-full bg-ink px-3 py-2 text-left text-sm text-paper"
                          : "w-full px-3 py-2 text-left text-sm hover:bg-paper"
                      }
                      onClick={() => setGroupId(group.id)}
                    >
                      {group.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {editing ? (
            <button
              type="button"
              disabled={busy}
              className="text-sm text-rose disabled:opacity-60"
              onClick={() => void remove()}
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
