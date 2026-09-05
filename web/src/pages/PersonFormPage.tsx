import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CHANNELS,
  CHANNEL_LABELS,
  SOCIAL_LABELS,
  SOCIAL_TYPES,
  TIERS,
  TIER_LABELS,
  TIMEZONES,
  type Channel,
  type Person,
  type PersonInput,
  type SocialLink,
  type SocialType,
  type Tier,
} from "@crm/shared";
import { api } from "../api.ts";
import { emptyPerson } from "../format.ts";

export function PersonFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<PersonInput>(emptyPerson());
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    void api<Person>(`/api/people/${id}`)
      .then((person) => {
        setForm({
          name: person.name,
          organization: person.organization,
          role: person.role,
          howWeMet: person.howWeMet,
          tags: person.tags,
          tier: person.tier,
          birthday: person.birthday,
          city: person.city,
          timezone: person.timezone,
          preferredChannel: person.preferredChannel,
          phone: person.phone,
          email: person.email,
          socialLinks: person.socialLinks,
          nextTalkingPoint: person.nextTalkingPoint,
        });
        setTagText(person.tags.join(", "));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load");
      });
  }, [id]);

  function patch<K extends keyof PersonInput>(key: K, value: PersonInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: PersonInput = {
      ...form,
      tags: tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (editing && id) {
        await api(`/api/people/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        navigate(`/people/${id}`);
      } else {
        const created = await api<Person>("/api/people", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        navigate(`/people/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File) {
    if (!id) return;
    setUploading(true);
    setError(null);
    try {
      const { uploadUrl, key } = await api<{ uploadUrl: string; key: string }>(
        `/api/people/${id}/photo/presign`,
        {
          method: "POST",
          body: JSON.stringify({ contentType: file.type }),
        },
      );
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Photo upload failed");
      await api(`/api/people/${id}/photo`, {
        method: "PUT",
        body: JSON.stringify({ key }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  function updateLink(index: number, next: SocialLink) {
    patch(
      "socialLinks",
      form.socialLinks.map((link, i) => (i === index ? next : link)),
    );
  }

  return (
    <div className="max-w-3xl">
      <Link to={id ? `/people/${id}` : "/people"} className="text-sm text-ink-soft hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-4 font-serif text-4xl">{editing ? "Edit person" : "New person"}</h1>
      <form className="mt-8 space-y-6" onSubmit={(e) => void onSubmit(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
            />
          </Field>
          <Field label="Organization">
            <input
              className={inputClass}
              value={form.organization}
              onChange={(e) => patch("organization", e.target.value)}
            />
          </Field>
          <Field label="Role">
            <input
              className={inputClass}
              value={form.role}
              onChange={(e) => patch("role", e.target.value)}
            />
          </Field>
          <Field label="Tier">
            <select
              className={inputClass}
              value={form.tier}
              onChange={(e) => patch("tier", Number(e.target.value) as Tier)}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="How you met" wide>
            <textarea
              className={`${inputClass} min-h-20`}
              value={form.howWeMet}
              onChange={(e) => patch("howWeMet", e.target.value)}
            />
          </Field>
          <Field label="Next talking point" wide>
            <textarea
              className={`${inputClass} min-h-20`}
              value={form.nextTalkingPoint}
              onChange={(e) => patch("nextTalkingPoint", e.target.value)}
            />
          </Field>
          <Field label="Tags (comma-separated)" wide>
            <input
              className={inputClass}
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="climbing, design, college"
            />
          </Field>
          <Field label="Birthday">
            <input
              type="date"
              className={inputClass}
              value={form.birthday ?? ""}
              onChange={(e) => patch("birthday", e.target.value || null)}
            />
          </Field>
          <Field label="City">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => patch("city", e.target.value)}
            />
          </Field>
          <Field label="Timezone">
            <select
              className={inputClass}
              value={form.timezone}
              onChange={(e) => patch("timezone", e.target.value)}
            >
              <option value="">—</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred channel">
            <select
              className={inputClass}
              value={form.preferredChannel ?? ""}
              onChange={(e) =>
                patch("preferredChannel", (e.target.value || null) as Channel | null)
              }
            >
              <option value="">—</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => patch("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="text-sm">Social links</p>
          <div className="mt-2 space-y-2">
            {form.socialLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <select
                  className={`${inputClass} w-40`}
                  value={link.type}
                  onChange={(e) =>
                    updateLink(index, { ...link, type: e.target.value as SocialType })
                  }
                >
                  {SOCIAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SOCIAL_LABELS[type]}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  value={link.value}
                  onChange={(e) => updateLink(index, { ...link, value: e.target.value })}
                />
                <button
                  type="button"
                  className="text-sm text-ink-soft"
                  onClick={() =>
                    patch(
                      "socialLinks",
                      form.socialLinks.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              onClick={() =>
                patch("socialLinks", [...form.socialLinks, { type: "instagram", value: "" }])
              }
            >
              Add link
            </button>
          </div>
        </div>

        {editing ? (
          <Field label="Photo">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPhoto(file);
              }}
            />
            {uploading ? <p className="text-sm text-ink-soft">Uploading…</p> : null}
          </Field>
        ) : (
          <p className="text-sm text-ink-soft">Save the person first to add a photo.</p>
        )}

        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent";

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
