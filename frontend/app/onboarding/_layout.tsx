import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="guest" />
      <Stack.Screen name="questionnaire" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="skills" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="time" />
      <Stack.Screen name="location" />
    </Stack>
  );
}
