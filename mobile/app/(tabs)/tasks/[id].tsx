import { useLocalSearchParams } from "expo-router";
import { TaskForm } from "../../../components/TaskForm";

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : undefined;
  if (!taskId) return null;
  return <TaskForm taskId={taskId} />;
}
