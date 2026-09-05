import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";
import { useAuth } from "../../lib/auth";

export default function TabLayout() {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="font-serif text-2xl text-ink">Circle</Text>
      </View>
    );
  }
  if (!me) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#f3eee4" },
        headerTintColor: "#1c1612",
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 22 },
        tabBarActiveTintColor: "#1c1612",
        tabBarInactiveTintColor: "#5c534a",
        tabBarStyle: {
          backgroundColor: "#fffaf2",
          borderTopColor: "#d7cfc2",
        },
        sceneStyle: { backgroundColor: "#f3eee4" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Queue",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "list.bullet", android: "format_list_bulleted", web: "list" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "person.2", android: "groups", web: "groups" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
