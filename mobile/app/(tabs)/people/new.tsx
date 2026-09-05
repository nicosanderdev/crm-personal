import type { ReactNode } from "react";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { TIERS, TIER_LABELS, type Person, type Tier } from "@crm/shared";
import { api } from "../../../lib/api";
import { emptyCreate } from "../../../lib/format";

export default function NewPersonScreen() {
  const [form, setForm] = useState(emptyCreate);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!phone) {
      setError("Phone is required so you can call or text.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const person = await api<Person>("/api/people", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          tier: form.tier,
          nextTalkingPoint: form.nextTalkingPoint.trim(),
          preferredChannel: "call",
        }),
      });
      router.replace(`/people/${person.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4 pb-12">
        <Field label="Name">
          <TextInput
            className="rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
            autoFocus
          />
        </Field>
        <Field label="Phone">
          <TextInput
            className="rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={form.phone}
            onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
            keyboardType="phone-pad"
          />
        </Field>
        <Text className="mt-4 text-sm text-ink">Cadence</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {TIERS.map((tier) => (
            <Pressable
              key={tier}
              className={`rounded-lg border px-3 py-2 ${
                form.tier === tier ? "border-ink bg-ink" : "border-line bg-card"
              }`}
              onPress={() => setForm((prev) => ({ ...prev, tier: tier as Tier }))}
            >
              <Text className={form.tier === tier ? "text-paper" : "text-ink"}>
                {TIER_LABELS[tier]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field label="Talking point">
          <TextInput
            className="min-h-[88px] rounded-lg border border-line bg-card px-3 py-3 text-ink"
            value={form.nextTalkingPoint}
            onChangeText={(nextTalkingPoint) => setForm((prev) => ({ ...prev, nextTalkingPoint }))}
            multiline
            textAlignVertical="top"
          />
        </Field>
        {error ? <Text className="mt-3 text-sm text-rose">{error}</Text> : null}
        <Pressable
          className="mt-6 rounded-lg bg-ink py-3 disabled:opacity-60"
          disabled={busy}
          onPress={() => void onSubmit()}
        >
          <Text className="text-center font-sans-medium text-paper">
            {busy ? "Saving…" : "Save person"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="mb-1 text-sm text-ink">{label}</Text>
      {children}
    </View>
  );
}
