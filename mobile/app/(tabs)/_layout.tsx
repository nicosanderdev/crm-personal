import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import { stackHeaderOptions } from "../../lib/navigation";

const TAB_ICON = 22;

function TabGlyph({
  focused,
  color,
  name,
}: {
  focused: boolean;
  color: string;
  name: { ios: string; android: string; web: string };
}) {
  return (
    <View
      style={{
        minWidth: 48,
        alignItems: "center",
        borderRadius: 14,
        paddingVertical: 4,
        backgroundColor: focused ? "#f6e4d6" : "transparent",
      }}
    >
      <SymbolView name={name} tintColor={color} size={TAB_ICON} />
    </View>
  );
}

export default function TabLayout() {
  const { me, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBottom = Math.max(insets.bottom, 14);

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
        ...stackHeaderOptions,
        headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 22 },
        tabBarActiveTintColor: "#9a3412",
        tabBarInactiveTintColor: "#5c534a",
        tabBarLabelStyle: {
          fontFamily: "Figtree_600SemiBold",
          fontSize: 12,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: "#fffaf2",
          borderTopColor: "#d7cfc2",
          height: 62 + tabBottom,
          paddingTop: 8,
          paddingBottom: tabBottom,
        },
        sceneStyle: { backgroundColor: "#f3eee4" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Queue",
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              focused={focused}
              color={color}
              name={{ ios: "list.bullet", android: "format_list_bulleted", web: "list" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dates"
        options={{
          title: "Dates",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              focused={focused}
              color={color}
              name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              focused={focused}
              color={color}
              name={{ ios: "checklist", android: "checklist", web: "checklist" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              focused={focused}
              color={color}
              name={{ ios: "person.2", android: "groups", web: "groups" }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph
              focused={focused}
              color={color}
              name={{ ios: "person.3", android: "group", web: "group" }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
