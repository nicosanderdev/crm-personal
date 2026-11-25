import { Stack } from "expo-router";
import { stackHeaderOptions } from "../../../lib/navigation";

export default function GroupsLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: "Groups" }} />
      <Stack.Screen name="new" options={{ title: "New group" }} />
      <Stack.Screen name="[id]" options={{ title: "Group" }} />
    </Stack>
  );
}
