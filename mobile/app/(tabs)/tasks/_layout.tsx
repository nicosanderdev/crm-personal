import { Stack } from "expo-router";
import { stackHeaderOptions } from "../../../lib/navigation";

export default function TasksLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: "Tasks" }} />
      <Stack.Screen name="new" options={{ title: "New task" }} />
      <Stack.Screen name="[id]" options={{ title: "Task" }} />
    </Stack>
  );
}
