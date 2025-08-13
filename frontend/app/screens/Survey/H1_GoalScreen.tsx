// app/screens/Survey/H1_GoalScreen.tsx

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition } from '@context/NutritionContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';

const totalSteps = 13;
const currentStep = 8;
const { width: screenWidth } = Dimensions.get('window');

type H1_GoalScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Goal'>;

interface H1_GoalScreenProps {
  navigation: H1_GoalScreenNavigationProp;
}

const H1_GoalScreen: React.FC<H1_GoalScreenProps> = ({ navigation }) => {
  const { goal, setGoal, calculateNutrition } = useNutrition();
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // Set default value and log current goal when component mounts
  useEffect(() => {
    console.log("Current goal in Goal Screen:", goal);
    
    // Force setting weight_loss as default
    setGoal('weight_loss');
    
    // Trigger recalculation after state update
    setTimeout(() => {
      calculateNutrition();
    }, 100);
  }, []);  // Empty dependency array ensures this only runs once on mount

  const handleBack = () => {
    navigation.navigate('ActivityLevel');
  };

  const handleNext = () => {
    navigation.navigate('HealthStatues');
  };

  // Handle goal selection and trigger recalculation
  const handleGoalSelection = (goalId: string) => {
    console.log("Goal selected:", goalId);
    
    // Set the goal
    setGoal(goalId);
    
    // Trigger recalculation after state update
    setTimeout(() => {
      console.log("Triggering nutrition recalculation with goal:", goalId);
      calculateNutrition();
    }, 100);
  };

  const goalOptions = [
    { id: 'weight_loss', label: 'Kilo Vermek', icon: 'trending-down' as const },
    { id: 'maintain', label: 'Kiloyu Korumak', icon: 'sync' as const },
    { id: 'weight_gain', label: 'Kilo Almak', icon: 'trending-up' as const },
    { id: 'muscle_gain', label: 'Kas Kazanmak', icon: 'fitness' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header: Back Arrow + Progress Bar */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Hedefiniz</Text>
          <Text style={styles.mainTitle}>Beslenme hedefinizi seçin</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.goalGrid}>
            {goalOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.goalCard,
                  goal === option.id && styles.selectedGoalCard
                ]}
                onPress={() => handleGoalSelection(option.id)}
              >
                <View style={[
                  styles.iconContainer,
                  goal === option.id && styles.selectedIconContainer
                ]}>
                  <Ionicons 
                    name={option.icon} 
                    size={32} 
                    color={goal === option.id ? '#FFF' : '#468f5d'} 
                  />
                </View>
                <Text style={[
                  styles.goalText,
                  goal === option.id && styles.selectedGoalText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer: Next Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !goal && styles.disabledNextButton]}
            onPress={handleNext}
            disabled={!goal}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default H1_GoalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  /***** Header: Back Arrow + Progress Bar *****/
  headerContainer: {
    marginTop: 30,
    marginBottom: 20,
    height: 10, // Fixed height for arrow + progress bar
    position: 'relative',
  },
  backArrow: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#468f5d',
    borderRadius: 5,
  },
  /***** Title Area *****/
  titleContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  /***** Body *****/
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  goalCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  selectedGoalCard: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  iconContainer: {
    marginBottom: 15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconContainer: {
    backgroundColor: '#3a7a4d',
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedGoalText: {
    color: '#fff',
  },
  /***** Footer: Next Button *****/
  footerContainer: {
    paddingVertical: 10,
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledNextButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});
