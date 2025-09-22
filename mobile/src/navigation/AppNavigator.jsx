import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  Dimensions, 
  StatusBar,
  StyleSheet,
  Easing 
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Import useAuth hook
import { useAuth } from '../hooks/useAuth';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import EventsScreen from '../screens/EventsScreen';
import AuthScreen from '../screens/AuthScreen';
import CreatePredictionScreen from '../screens/CreatePredictionScreen';
import PredictionDetailScreen from '../screens/PredictionDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width, height } = Dimensions.get('window');

// Navigation route constants
export const Routes = {
  // Auth Routes
  AUTH: 'Auth',
  MAIN: 'Main', // Main tab navigator wrapper
  
  // Tab Routes
  HOME: 'Home',
  PORTFOLIO: 'Portfolio',
  LEADERBOARD: 'Leaderboard',
  EVENTS: 'Events',

  // Stack Routes
  CREATE_PREDICTION: 'CreatePrediction',
  PREDICTION_DETAIL: 'PredictionDetail',

  // Internal Stack Routes (for main screens in stacks)
  HOME_MAIN: 'HomeMain',
  PORTFOLIO_MAIN: 'PortfolioMain',
  EVENTS_MAIN: 'EventsMain',
  LEADERBOARD_MAIN: 'LeaderboardMain',
};

// Theme configuration
const THEME = {
  colors: {
    primary: '#FF69B4', // Gen Z pink
    inactive: '#666',
    background: '#000', // Dark theme
    border: '#333',
    gradientStart: '#FF1744',
    gradientMid: '#FF69B4',
    gradientEnd: '#E91E63',
    white: '#FFFFFF',
    // Splash specific colors
    splashPrimary: '#FF69B4',
    splashSecondary: '#000000',
    splashAccent: '#FF1744',
    // Letter color - changed to black
    letterColor: '#000000',
  },
  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
};


// Splash Screen Component
const SplashScreen = ({ onAnimationComplete }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const gradientOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  
  // Letter animations for "CalledIt"
  const letterAnimations = useRef(
    'CALLEDIT'.split('').map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    StatusBar.setHidden(true);
    
    // Start animation sequence
    const startAnimations = () => {
      // Gradient fade in
      Animated.timing(gradientOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Logo entrance with bounce
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);

      // Staggered letter animations
      setTimeout(() => {
        const letterStagger = letterAnimations.map((anim, index) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay: index * 80,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          })
        );
        
        Animated.parallel(letterStagger).start();
      }, 800);

      // Pulsing effect
      const createPulse = () => {
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(createPulse);
      };
      
      setTimeout(createPulse, 1600);

      // Complete animation and transition
      setTimeout(() => {
        StatusBar.setHidden(false);
        onAnimationComplete();
      }, 3500);
    };

    startAnimations();
  }, []);

  const renderLetter = (letter, index) => {
    const animation = letterAnimations[index];
    
    return (
      <Animated.Text
        key={index}
        style={[
          styles.letter,
          {
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: animation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.2, 1],
                }),
              },
            ],
          },
        ]}
      >
        {letter}
      </Animated.Text>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.gradientContainer,
          { opacity: gradientOpacity }
        ]}
      >
        <LinearGradient
          colors={[THEME.colors.gradientStart, THEME.colors.gradientMid, THEME.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo/Icon */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, pulseScale) },
              ],
            },
          ]}
        >
          <View style={styles.logoBackground}>
            <Ionicons 
              name="flash" 
              size={80} 
              color={THEME.colors.splashPrimary} 
            />
          </View>
        </Animated.View>

        {/* Animated Title */}
        <View style={styles.titleContainer}>
          {'CALLEDIT'.split('').map((letter, index) => renderLetter(letter, index))}
        </View>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: logoOpacity }
          ]}
        >
          Predict • Compete • Win
        </Animated.Text>

        {/* Loading indicator */}
        <Animated.View 
          style={[
            styles.loadingContainer,
            { opacity: logoOpacity }
          ]}
        >
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  transform: [{ scaleX: pulseScale }]
                }
              ]}
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

// Styles for Splash Screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.colors.splashSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.splashPrimary,
    shadowColor: THEME.colors.splashPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 25,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  letter: {
    fontSize: 42,
    fontWeight: 'bold',
    color: THEME.colors.letterColor, // Changed to use black color
    marginHorizontal: 1,
    textShadowColor: THEME.colors.splashAccent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.splashPrimary,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: THEME.colors.splashSecondary,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    width: 200,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 3,
    backgroundColor: THEME.colors.splashSecondary,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.splashPrimary,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: THEME.colors.splashPrimary,
    borderRadius: 2,
    width: '100%',
  },
});

// Tab icon configuration (without emojis)
const TAB_ICONS = {
  [Routes.HOME]: {
    focused: 'home',
    unfocused: 'home-outline',
    title: 'Feed',
  },
  [Routes.EVENTS]: {
    focused: 'search',
    unfocused: 'search-outline',
    title: 'Discover',
  },
  [Routes.PORTFOLIO]: {
    focused: 'briefcase',
    unfocused: 'briefcase-outline',
    title: 'My Bets',
  },
  [Routes.LEADERBOARD]: {
    focused: 'trophy',
    unfocused: 'trophy-outline',
    title: 'Rankings',
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
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FF69B4', fontSize: 16 }}>Loading...</Text>
      </View>
    );
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