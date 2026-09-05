import { Stack } from "expo-router";

export default function DatesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f3eee4" },
        headerTintColor: "#1c1612",
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 20 },
        contentStyle: { backgroundColor: "#f3eee4" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dates" }} />
      <Stack.Screen name="new" options={{ title: "New occasion" }} />
      <Stack.Screen name="[id]" options={{ title: "Edit occasion" }} />
    </Stack>
  );
}
