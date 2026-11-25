import { Stack } from "expo-router";
import { stackHeaderOptions } from "../../../lib/navigation";

export default function PeopleLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: "People" }} />
      <Stack.Screen name="new" options={{ title: "Add person" }} />
      <Stack.Screen name="[id]" options={{ title: "Person" }} />
    </Stack>
  );
}
