// App.js - FIXED: Proper AuthProvider integration with react-native-paper
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';

// Import AuthProvider and AppNavigator
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Constants.deviceId has been deprecated',
    'Warning: React.createElement: type is invalid',
  ]);
}

// Paper theme configuration for dark mode
const paperTheme = {
  dark: true,
  colors: {
    primary: '#FF69B4',
    accent: '#8A2BE2',
    background: '#000000',
    surface: '#111111',
    text: '#FFFFFF',
    disabled: '#666666',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: '#FFFFFF',
    notification: '#FF69B4',
  },
};

// Navigation theme for dark mode
const navigationTheme = {
  dark: true,
  colors: {
    primary: '#FF69B4',
    background: '#000000',
    card: '#111111',
    text: '#FFFFFF',
    border: '#333333',
    notification: '#FF69B4',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="light" backgroundColor="#000000" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}