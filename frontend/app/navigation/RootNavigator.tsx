// app/navigation/RootNavigator.tsx

import React, { useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import SurveyNavigator from './SurveyNavigator';
import MainNavigator from './MainNavigator';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../assets/ipv4_address.json';

const RootNavigator = () => {
  const { user } = useContext(AuthContext);
  const [isSurveyCompleted, setIsSurveyCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (user) {
        try {
          const accessToken = await SecureStore.getItemAsync('accessToken');
          if (!accessToken) throw new Error('Access token bulunamadı.');

          const response = await axios.get(
            `https://${ipv4Data.ipv4_address}/api/survey/check-survey-status/`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          setIsSurveyCompleted(response.data.completed);
        } catch (error) {
          console.error('Error checking survey status:', error);
          setIsSurveyCompleted(false);
        }
      } else {
        setIsSurveyCompleted(null);
      }
      setIsLoading(false);
    };

    checkSurveyStatus();
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#468f5d" />
      </View>
    );
  }

  if (!user) {
    // Kullanıcı kimlik doğrulaması yapılmadı => AuthNavigator
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (isSurveyCompleted === null) {
    // Yeni kayıt vb. durum, opsiyonel bir spinner
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#468f5d" />
      </View>
    );
  }

  const NavigatorComponent = isSurveyCompleted ? MainNavigator : SurveyNavigator;

  return (
    <NavigationContainer>
      <NavigatorComponent />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;
