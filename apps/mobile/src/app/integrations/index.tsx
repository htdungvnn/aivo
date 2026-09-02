/**
 * Integrations Screen
 * Connect third-party apps and devices
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  connected: boolean;
}

const mockIntegrations: Integration[] = [
  { id: 'apple-health', name: 'Apple Health', description: 'Sync health data with Apple Health', icon: 'heart', connected: true },
  { id: 'google-fit', name: 'Google Fit', description: 'Connect to Google Fit', icon: 'fitness', connected: false },
  { id: 'strava', name: 'Strava', description: 'Import workout data from Strava', icon: 'navigate', connected: false },
  { id: 'fitbit', name: 'Fitbit', description: 'Connect your Fitbit device', icon: 'watch', connected: false },
  { id: 'garmin', name: 'Garmin', description: 'Sync with Garmin Connect', icon: 'compass', connected: false },
];

export default function IntegrationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [integrations, setIntegrations] = React.useState(mockIntegrations);

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => 
      prev.map(int => int.id === id ? { ...int, connected: !int.connected } : int)
    );
  };

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Integrations', 
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CONNECTED APPS
          </Text>
          
          {integrations.map((integration) => (
            <View key={integration.id} style={[styles.integrationItem, { backgroundColor: colors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name={integration.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{integration.name}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{integration.description}</Text>
              </View>
              <Switch
                value={integration.connected}
                onValueChange={() => toggleIntegration(integration.id)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  integrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
});
