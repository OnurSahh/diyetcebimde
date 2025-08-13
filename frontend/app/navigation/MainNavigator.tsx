import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { NavigatorScreenParams } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getPlanMode } from '../utils/planModeStorage';

// Import screen components
import HomeScreen from '../screens/Main/HomeScreen';
import ChatScreen from '../screens/Main/ChatScreen';
import MealChooseScreen from '../screens/Main/MealChooseScreen';
import Statistics from '../screens/Main/Statistics';
import WaterTracker from '../screens/Main/WaterTracker';
import ProfileScreen from '../screens/Main/ProfileScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import MealPlanSurveyScreen from '../screens/Main/MealPlanSurveyScreen';
import ManuelTakipScreen from '../screens/Main/ManuelTakipScreen';
import WeightTracker from '../screens/Main/WeightTracker';

// Define parameter lists
export type HomeStackParamList = {
  Home: undefined;
  WaterTracker: undefined;
  ProfileScreen: undefined;
  SettingsScreen: undefined;
  MealPlanSurveyScreen: undefined;
  WeightTracker: undefined;
  Statistics: undefined;
};

export type ChatStackParamList = {
  Chat: undefined;
  ResponseScreen: { responseData: any };
};

export type PhotoStackParamList = {
  MealChooseScreen: { checkPlanMode?: boolean } | undefined;
  TakeMealPhoto: undefined;
  ResponseScreen: { responseData: any };
  ManuelTakipScreen: undefined;
};

export type MainTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  ChatStack: NavigatorScreenParams<ChatStackParamList>;
  PhotoStack: NavigatorScreenParams<PhotoStackParamList>;
  İstatistikler: undefined;
};

// Create stack navigators
const HomeStack = createStackNavigator<HomeStackParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();
const PhotoStack = createStackNavigator<PhotoStackParamList>();

// HomeStackNavigator
const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="WaterTracker" component={WaterTracker} />
    <HomeStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <HomeStack.Screen name="SettingsScreen" component={SettingsScreen} />
    <HomeStack.Screen name="MealPlanSurveyScreen" component={MealPlanSurveyScreen} />
    <HomeStack.Screen name="WeightTracker" component={WeightTracker} />
  </HomeStack.Navigator>
);

// ChatStackNavigator
const ChatStackNavigator = () => (
  <ChatStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatStack.Screen name="Chat" component={ChatScreen} />
  </ChatStack.Navigator>
);

// PhotoStackNavigator - Now with plan mode check
const PhotoStackNavigator = () => {
  const navigation = useNavigation();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  // Check plan mode on mount and set the initial route
  useEffect(() => {
    const checkPlanMode = async () => {
      const mode = await getPlanMode();
      setInitialRoute(mode === 'weeklyPlan' ? 'MealChooseScreen' : 'ManuelTakipScreen');
    };
    
    checkPlanMode();
  }, []);

  // If initialRoute is still loading, return null or a loading component
  if (!initialRoute) {
    return null; // Or return a loading spinner
  }

  return (
    <PhotoStack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute as 'MealChooseScreen' | 'ManuelTakipScreen'}
    >
      <PhotoStack.Screen 
        name="MealChooseScreen" 
        component={MealChooseScreen} 
        initialParams={{ checkPlanMode: true }}
      />
      <PhotoStack.Screen name="ManuelTakipScreen" component={ManuelTakipScreen} />
    </PhotoStack.Navigator>
  );
};

// Bottom Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator = () => {
  const navigation = useNavigation<any>();

  return (
    <Tab.Navigator
      initialRouteName="HomeStack"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#468f5d',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: '#132064',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeStack':
              iconName = 'home-outline';
              break;
            case 'ChatStack':
              iconName = 'chatbubbles-outline';
              break;
            case 'PhotoStack':
              iconName = 'albums-outline';
              break;
            case 'İstatistikler':
              iconName = 'stats-chart-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarShowLabel: true,
        detachInactiveScreens: true,
      })}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="ChatStack"
        component={ChatStackNavigator}
        options={{ title: 'Sohbet' }}
      />
      <Tab.Screen
        name="PhotoStack"
        component={PhotoStackNavigator}
        options={{ 
          title: 'Yemek Planı',
          // Check plan mode when tab is pressed and navigate accordingly
          tabBarButton: (props) => {
            return (
              <TouchableOpacity 
                {...props} 
                onPress={async (e) => {
                  const mode = await getPlanMode();
                  
                  // First navigate to the stack
                  props.onPress?.(e);
                  
                  // Then immediately navigate to the correct screen inside the stack
                  setTimeout(() => {
                    navigation.navigate('PhotoStack', {
                      screen: mode === 'weeklyPlan' ? 'MealChooseScreen' : 'ManuelTakipScreen'
                    });
                  }, 0);
                }} 
              />
            );
          }
        }}
      />
      <Tab.Screen
        name="İstatistikler"
        component={Statistics}
        options={{ title: 'İstatistikler' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;