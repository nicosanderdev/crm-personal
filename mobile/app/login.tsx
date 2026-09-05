import { Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";

export default function LoginScreen() {
  const { me, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && me) {
    return <Redirect href="/" />;
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="font-serif text-4xl text-ink">Circle</Text>
        <Text className="mt-2 text-ink-soft">Your people, and when you last reached them.</Text>
        <View className="mt-8 gap-4">
          <View>
            <Text className="text-sm text-ink">Email</Text>
            <TextInput
              className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View>
            <Text className="text-sm text-ink">Password</Text>
            <TextInput
              className="mt-1 rounded-lg border border-line bg-card px-3 py-3 text-ink"
              autoComplete="password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          {error ? <Text className="text-sm text-rose">{error}</Text> : null}
          <Pressable
            className="rounded-lg bg-ink py-3 disabled:opacity-60"
            disabled={busy}
            onPress={() => void onSubmit()}
          >
            <Text className="text-center font-sans-medium text-paper">
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
