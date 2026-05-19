import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Adjust these paths if your files are in different folders
import HomeScreen from './screens/HomeScreen'; 
import ReaderScreen from './screens/ReaderScreen';
import { COLORS } from './utils/theme';

const Stack = createNativeStackNavigator();

// 1. Create a custom navigation theme to prevent white flashes
const DarkNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
  },
};

export default function App() {
  return (
    <>
      {/* Keeps the time/battery icons visible on the dark background */}
      <StatusBar style="light" />
      
      <NavigationContainer theme={DarkNavTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false, // You built custom headers, so we hide the default ones
            contentStyle: { backgroundColor: COLORS.bg }, // 2. Force stack background to dark
            animation: 'fade_from_bottom', // Smooth transition matching the new UI
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}