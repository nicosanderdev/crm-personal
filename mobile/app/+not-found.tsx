import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-paper px-6">
      <Stack.Screen options={{ title: "Not found", headerShown: true }} />
      <Text className="font-serif text-2xl text-ink">This screen does not exist.</Text>
      <Link href="/" className="mt-4">
        <Text className="text-accent">Back to queue</Text>
      </Link>
    </View>
  );
}
