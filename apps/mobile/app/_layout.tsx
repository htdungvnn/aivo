import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: "Workout" }} />
        <Stack.Screen name="ai-chat" options={{ headerShown: true, title: "AI Coach" }} />
      </Stack>
    </>
  );
}
