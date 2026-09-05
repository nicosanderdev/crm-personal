import "../global.css";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  useFonts as useFigtree,
} from "@expo-google-fonts/figtree";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider } from "../lib/auth";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const circleTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#9a3412",
    background: "#f3eee4",
    card: "#fffaf2",
    text: "#1c1612",
    border: "#d7cfc2",
    notification: "#9a3412",
  },
};

export default function RootLayout() {
  const [figtreeLoaded, figtreeError] = useFigtree({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
  const [frauncesLoaded, frauncesError] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const loaded = figtreeLoaded && frauncesLoaded;
  const error = figtreeError ?? frauncesError;

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={circleTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f3eee4" } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
