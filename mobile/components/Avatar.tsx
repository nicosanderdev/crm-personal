import { Image, Text, View } from "react-native";
import { initials } from "../lib/format";

type Props = {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md";
};

export function Avatar({ name, photoUrl, size = "sm" }: Props) {
  const dim = size === "md" ? "h-16 w-16" : "h-10 w-10";
  const text = size === "md" ? "text-lg" : "text-xs";
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} className={`${dim} rounded-full`} />;
  }
  return (
    <View className={`${dim} items-center justify-center rounded-full bg-paper-2`}>
      <Text className={`${text} font-sans-medium text-ink`}>{initials(name)}</Text>
    </View>
  );
}
