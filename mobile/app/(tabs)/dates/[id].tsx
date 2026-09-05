import { useLocalSearchParams } from "expo-router";
import { OccasionForm } from "../../../components/OccasionForm";

export default function EditOccasionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OccasionForm occasionId={id} />;
}
