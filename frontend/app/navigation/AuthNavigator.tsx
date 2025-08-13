// app/navigation/AuthNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import { AuthStackParamList } from '../../types';

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator initialRouteName="SignInAuth">
    <AuthStack.Screen
      name="SignInAuth"
      component={SignInScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen
      name="SignUpAuth"
      component={SignUpScreen}
      options={{ headerShown: false }}
    />
  </AuthStack.Navigator>
);

export default AuthNavigator;
