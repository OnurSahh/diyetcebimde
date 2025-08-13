import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  DevSettings,
} from 'react-native';
import { useFinal } from '@context/FinalContext';
import { AuthContext } from '@context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import ipv4Data from '../../../assets/ipv4_address.json';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define navigation types like in Z_Contract
type SurveyCompletionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SurveyCompletion'>;
type SurveyCompletionRouteProp = RouteProp<RootStackParamList, 'SurveyCompletion'>;

type Props = {
  navigation: SurveyCompletionNavigationProp;
  route: SurveyCompletionRouteProp;
};

const SurveyCompletionScreen: React.FC<Props> = ({ navigation }) => {
  const { submitFinalData } = useFinal();
  const { setUser, user } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit the survey data
      await submitFinalData();
      
      // After successfully submitting the survey
      await AsyncStorage.setItem('justCompletedSurvey', 'true');
      
      // 2. Mark survey as completed on server and update local state
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        if (accessToken) {
          // Force the survey completed flag to true locally, even if API call fails
          if (user) {
            setUser({
              ...user,
              survey_completed: true
            });
          }
          
          // Try to update on server, but don't block completion if it fails
          try {
            await axios.post(
              `http://${ipv4Data.ipv4_address}:8000/api/users/mark-survey-completed/`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
          } catch (apiError) {
            console.log('API endpoint for marking survey not found, continuing anyway');
          }
        }
      } catch (error) {
        console.log('Error updating user state, continuing anyway:', error);
        // Don't block completion if this fails
      }
      
      Alert.alert(
        "Başarılı!",
        "Anket başarıyla tamamlandı. Ana sayfaya yönlendiriliyorsunuz.",
        [
          { 
            text: "Tamam", 
            onPress: () => {
              // Force app reload
              DevSettings.reload();
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Error completing survey:', error);
      Alert.alert(
        'Hata',
        'Anketi tamamlarken bir sorun oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.completionContainer}>
          <Text style={styles.congratsText}>Tebrikler!</Text>
          <Text style={styles.completionText}>
            Anket tamamlandı.
          </Text>
          
          <View style={styles.checkmarkContainer}>
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>
          
            <Text style={styles.descriptionText}>
          Size özel <Text style={{ fontWeight: 'bold' }}>haftalık yemek listesi</Text> oluşturalım mı? 
          {"\n"}
          Ya da yapay zeka ile <Text style={{ fontWeight: 'bold' }}>kalori takibi</Text> yapın!
            </Text>
        </View>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.completeButtonText}>Başla!</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#468f5d',
    marginBottom: 20,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
  },
  checkmarkContainer: {
    marginVertical: 30,
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#468f5d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  descriptionText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default SurveyCompletionScreen;