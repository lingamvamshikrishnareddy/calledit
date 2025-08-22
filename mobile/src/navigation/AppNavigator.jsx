import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
// Import useAuth hook
import { useAuth } from '../hooks/useAuth';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import FriendsScreen from '../screens/FriendsScreen';
import EventsScreen from '../screens/EventsScreen';
import AuthScreen from '../screens/AuthScreen';
import CreatePredictionScreen from '../screens/CreatePredictionScreen';
import PredictionDetailScreen from '../screens/PredictionDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Navigation route constants
export const Routes = {
  // Auth Routes
  AUTH: 'Auth',
  MAIN: 'Main', // Main tab navigator wrapper
  
  // Tab Routes
  HOME: 'Home',
  PORTFOLIO: 'Portfolio',
  LEADERBOARD: 'Leaderboard',
  FRIENDS: 'Friends',
  EVENTS: 'Events',

  // Stack Routes
  CREATE_PREDICTION: 'CreatePrediction',
  PREDICTION_DETAIL: 'PredictionDetail',

  // Internal Stack Routes (for main screens in stacks)
  HOME_MAIN: 'HomeMain',
  PORTFOLIO_MAIN: 'PortfolioMain',
  EVENTS_MAIN: 'EventsMain',
  LEADERBOARD_MAIN: 'LeaderboardMain',
  FRIENDS_MAIN: 'FriendsMain',
};

// Theme configuration
const THEME = {
  colors: {
    primary: '#FF69B4', // Gen Z pink
    inactive: '#666',
    background: '#000', // Dark theme
    border: '#333',
  },
  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
};

// Tab icon configuration
const TAB_ICONS = {
  [Routes.HOME]: {
    focused: 'home',
    unfocused: 'home-outline',
    title: '🏠 Feed',
  },
  [Routes.EVENTS]: {
    focused: 'search',
    unfocused: 'search-outline',
    title: '🔍 Discover',
  },
  [Routes.PORTFOLIO]: {
    focused: 'briefcase',
    unfocused: 'briefcase-outline',
    title: '📊 My Bets',
  },
  [Routes.LEADERBOARD]: {
    focused: 'trophy',
    unfocused: 'trophy-outline',
    title: '🏆 Rankings',
  },
  [Routes.FRIENDS]: {
    focused: 'people',
    unfocused: 'people-outline',
    title: '👥 Squad',
  },
};

// Common stack screen options
const defaultStackOptions = {
  headerShown: false,
  gestureEnabled: true,
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
};

// Stack Navigators
const HomeStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name={Routes.HOME_MAIN} component={HomeScreen} />
    <Stack.Screen
      name={Routes.PREDICTION_DETAIL}
      component={PredictionDetailScreen}
      options={{ gestureEnabled: true }}
    />
    <Stack.Screen
      name={Routes.CREATE_PREDICTION}
      component={CreatePredictionScreen}
      options={{
        gestureEnabled: true,
        presentation: 'modal' // Modal presentation for create screen
      }}
    />
  </Stack.Navigator>
);

const PortfolioStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name={Routes.PORTFOLIO_MAIN} component={PortfolioScreen} />
    <Stack.Screen
      name={Routes.PREDICTION_DETAIL}
      component={PredictionDetailScreen}
      options={{ gestureEnabled: true }}
    />
  </Stack.Navigator>
);

const EventsStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name={Routes.EVENTS_MAIN} component={EventsScreen} />
    <Stack.Screen
      name={Routes.PREDICTION_DETAIL}
      component={PredictionDetailScreen}
      options={{ gestureEnabled: true }}
    />
    <Stack.Screen
      name={Routes.CREATE_PREDICTION}
      component={CreatePredictionScreen}
      options={{
        presentation: 'modal',
        gestureEnabled: true
      }}
    />
  </Stack.Navigator>
);

const LeaderboardStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name={Routes.LEADERBOARD_MAIN} component={LeaderboardScreen} />
    <Stack.Screen
      name={Routes.CREATE_PREDICTION}
      component={CreatePredictionScreen}
      options={{
        presentation: 'modal',
        gestureEnabled: true
      }}
    />
  </Stack.Navigator>
);

const FriendsStackNavigator = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name={Routes.FRIENDS_MAIN} component={FriendsScreen} />
  </Stack.Navigator>
);

// Tab icon renderer
const renderTabIcon = ({ route, focused, color, size }) => {
  const iconConfig = TAB_ICONS[route.name];
  if (!iconConfig) return <Ionicons name="circle" size={size} color={color} />;

  const iconName = focused ? iconConfig.focused : iconConfig.unfocused;
  return <Ionicons name={iconName} size={size} color={color} />;
};

// Tab bar options
const tabBarOptions = {
  tabBarActiveTintColor: THEME.colors.primary,
  tabBarInactiveTintColor: THEME.colors.inactive,
  headerShown: false,
  tabBarStyle: {
    backgroundColor: THEME.colors.background,
    borderTopColor: THEME.colors.border,
    height: THEME.tabBar.height,
    paddingBottom: THEME.tabBar.paddingBottom,
    paddingTop: THEME.tabBar.paddingTop,
    elevation: 0, // Remove shadow on Android
    shadowOpacity: 0, // Remove shadow on iOS
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabBarItemStyle: {
    paddingVertical: 5,
  },
};

// Main Tab Navigator (only accessible when authenticated)
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      ...tabBarOptions,
      tabBarIcon: (props) => renderTabIcon({ route, ...props }),
    })}
    initialRouteName={Routes.HOME}
  >
    <Tab.Screen
      name={Routes.HOME}
      component={HomeStackNavigator}
      options={{
        title: TAB_ICONS[Routes.HOME].title,
        tabBarTestID: 'home-tab'
      }}
    />

    <Tab.Screen
      name={Routes.EVENTS}
      component={EventsStackNavigator}
      options={{
        title: TAB_ICONS[Routes.EVENTS].title,
        tabBarTestID: 'events-tab'
      }}
    />

    <Tab.Screen
      name={Routes.PORTFOLIO}
      component={PortfolioStackNavigator}
      options={{
        title: TAB_ICONS[Routes.PORTFOLIO].title,
        tabBarTestID: 'portfolio-tab'
      }}
    />

    <Tab.Screen
      name={Routes.LEADERBOARD}
      component={LeaderboardStackNavigator}
      options={{
        title: TAB_ICONS[Routes.LEADERBOARD].title,
        tabBarTestID: 'leaderboard-tab'
      }}
    />

    <Tab.Screen
      name={Routes.FRIENDS}
      component={FriendsStackNavigator}
      options={{
        title: TAB_ICONS[Routes.FRIENDS].title,
        tabBarTestID: 'friends-tab'
      }}
    />
  </Tab.Navigator>
);

// Main App Navigator with Authentication Flow
const AppNavigator = () => {
  // The useAuth hook will be used inside a component that's wrapped by the navigator
  return <AuthenticatedAppNavigator />;
};

// Separate component that uses the useAuth hook
const AuthenticatedAppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen while checking auth status
  if (loading) {
    // You can return a loading component here
    return null; // or <LoadingScreen />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // User is authenticated, show main app
        <Stack.Screen
          name={Routes.MAIN}
          component={MainTabNavigator}
          options={{
            gestureEnabled: false, // Prevent going back to auth
          }}
        />
      ) : (
        // User is not authenticated, show auth screen
        <Stack.Screen
          name={Routes.AUTH}
          component={AuthScreen}
          options={{
            gestureEnabled: false, // Prevent dismissing auth screen
          }}
        />
      )}
    </Stack.Navigator>
  );
};

// Export the auth hook for use in other components if needed
export { useAuth } from '../hooks/useAuth';

export default AppNavigator;