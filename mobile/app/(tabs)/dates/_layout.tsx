import { Stack } from "expo-router";
import { stackHeaderOptions } from "../../../lib/navigation";

export default function DatesLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: "Dates" }} />
      <Stack.Screen name="new" options={{ title: "New occasion" }} />
      <Stack.Screen name="[id]" options={{ title: "Edit occasion" }} />
    </Stack>
  );
}
