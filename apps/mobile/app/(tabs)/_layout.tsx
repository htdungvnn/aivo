import { Tabs } from "expo-router";
import { Activity, Dumbbell, MessageCircle, User, BarChart2, Video } from "lucide-react-native";
import { NetworkStatusBanner } from "@/utils/error-handler";

export default function TabLayout() {
  return (
    <>
      <NetworkStatusBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#111827",
            borderTopColor: "#374151",
          },
          headerStyle: {
            backgroundColor: "#111827",
          },
          headerTintColor: "#fff",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            title: "Workouts",
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="form-analysis"
          options={{
            title: "Form",
            tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="ai-chat"
          options={{
            title: "AI Coach",
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: "Insights",
            tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
