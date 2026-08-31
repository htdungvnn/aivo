/**
 * AIVO Mobile - Root Redirect
 * Redirects to the Today tab as the default screen
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/today" />;
}
