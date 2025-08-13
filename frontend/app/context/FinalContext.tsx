// app/context/FinalContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import ipv4Data from '../../assets/ipv4_address.json';

// Import all the contexts
import { useUser } from './UserContext';
import { useBadHabits } from './BadHabits';
import { useDietary } from './DietaryContext';
import { useHabits } from './HabitContext';
import { useHealth } from './HealthContext';
import { useMeals } from './MealsContext';
import { useMeasurements } from './MeasurementContext';
import { useMedicine } from './MedicineContext';
import { useWater } from './WaterContext';
import { useNutrition } from './NutritionContext'; // Import the NutritionContext
import { useReminder } from './ReminderContext'; // Import the ReminderContext

// Define the type for the context
type FinalContextType = {
  submitFinalData: () => Promise<void>;
  dislikedAndAllergies: string[];
  setDislikedAndAllergies: (foods: string[]) => void;
};

// Create the context
const FinalContext = createContext<FinalContextType | undefined>(undefined);

// Provider component
export const FinalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get data from all contexts
  const userContext = useUser();
  const badHabitsContext = useBadHabits();
  const dietaryContext = useDietary();
  const habitsContext = useHabits();
  const healthContext = useHealth();
  const mealsContext = useMeals();
  const measurementsContext = useMeasurements();
  const medicineContext = useMedicine();
  const waterContext = useWater();
  const nutritionContext = useNutrition(); // Access NutritionContext
  const reminderContext = useReminder(); // Access ReminderContext

  // State variables for disliked foods and allergies
  const [dislikedAndAllergies, setDislikedAndAllergies] = React.useState<string[]>([]);

  // Helper function to format time
  const formatTime = (time: Date | string | null): string | null => {
    if (!time) return null;
    if (typeof time === 'string') {
      if (time.length === 5) {
        return `${time}:00`;
      }
      return time; // Assume it's already in correct format
    } else {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const seconds = time.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  };

  // Helper function to format Date objects to strings
  const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  };

  const submitFinalData = async () => {
    try {
      let accessToken = await SecureStore.getItemAsync('accessToken');

      if (!accessToken) {
        throw new Error('User is not authenticated');
      }

      console.log('=== PREPARING DATA FOR SUBMISSION ===');
      console.log('Nutrition context:', nutritionContext);
      console.log('Meals context:', mealsContext);
      console.log('Habits context:', habitsContext);

      // Prepare the data to match the backend's expected format
      const finalData: any = {
        // User data
        first_name: userContext.firstName || "Kullanıcı",
        last_name: "Kullanıcı", // Use a default value
        birth_date: formatDate(userContext.birthDate),
        age: userContext.age,
        height_cm: userContext.height,
        height_feet: userContext.feet,
        weight: userContext.weight,
        weight_lbs: userContext.lbs,
        gender: userContext.gender,

        // Goal data - ensure string format
        goal: nutritionContext.goal || 'maintain',

        // Activity level (simplified)
        activity_level: userContext.activityLevel || 'medium',

        // Dietary data
        dietary_option: dietaryContext.selectedOption || 'Hepçil',
        other_diet: dietaryContext.otherDiet || '',

        // Meals data
        main_full: mealsContext.mainFull || 'no',
        main_meals: mealsContext.mainMeals || 0,
        meal_times: mealsContext.mealTimes || {},
        meal_types: mealsContext.mealTypes || {},
        excluded_items: mealsContext.excludedItems || [],

        // Convert snack_meals to integer (required by backend)
        snack_meals: mealsContext.snackMeals?.preference === 'yes' ? (mealsContext.snackMeals?.count || 0) : 0,
        snack_count: mealsContext.snackMeals?.count || 0,
        snack_times: mealsContext.snackMeals?.times || [],
        snacks_full: mealsContext.snackMeals?.preference === 'yes' ? 'yes' : 'no',

        // Health data
        health_conditions: healthContext.healthConditions || {},

        // Disliked foods and allergies
        disliked_and_allergies: dislikedAndAllergies || [],

        // Add activity data with validation
        activity_data: habitsContext.activityData || {
          resting: 12,
          light_acts: 8,
          medium_acts: 3,
          heavy_acts: 1
        },

        // Nutrition data with validation - force to numeric values
        bmr: nutritionContext.bmr ? Number(nutritionContext.bmr) : 0,
        tdee: nutritionContext.tdee ? Number(nutritionContext.tdee) : 0,
        bmi: nutritionContext.bmi ? Number(nutritionContext.bmi) : 0,
        bmi_category: nutritionContext.bmiCategory || 'Normal',
        ideal_weight_range: nutritionContext.idealWeightRange || { min: 0, max: 0 },
        body_fat_percentage: nutritionContext.bodyFatPercentage ? Number(nutritionContext.bodyFatPercentage) : 0,
        ideal_body_fat_range: nutritionContext.idealBodyFatRange || { min: 0, max: 0 },
        calorie_deficit_surplus: nutritionContext.calorieDeficitSurplus || 15,
        calorie_intake: nutritionContext.calorieIntake ? Number(nutritionContext.calorieIntake) : 
          (nutritionContext.tdee ? Number(nutritionContext.tdee) : 2000),
        macros: nutritionContext.macros || { protein: 0, fats: 0, carbs: 0 },
      };

      console.log('FINAL DATA TO BE SUBMITTED:', finalData);
      console.log('Critical fields check:');
      console.log('- snack_meals (should be integer):', finalData.snack_meals, typeof finalData.snack_meals);
      console.log('- activity_data:', finalData.activity_data);
      console.log('- calorie_intake:', finalData.calorie_intake, typeof finalData.calorie_intake);
      console.log('- tdee:', finalData.tdee, typeof finalData.tdee);
      console.log('- bmr:', finalData.bmr, typeof finalData.bmr);

      // Send POST request to the backend
      let response;

      try {
        response = await axios.post(
          `https://${ipv4Data.ipv4_address}/api/survey/submit-data/`,
          finalData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        // After successful survey submission, log the weight to the weight tracker
        if (userContext.weight) {
          const today = new Date().toISOString().split('T')[0];
          const weightValue = parseFloat(userContext.weight.toString());
          
          if (!isNaN(weightValue) && weightValue > 0) {
            console.log('Logging initial weight to weight tracker:', weightValue);
            
            await axios.post(
              `https://${ipv4Data.ipv4_address}/api/tracker/weight/`,
              {
                weight: weightValue,
                date: today,
                notes: "Ankette belirttiğiniz ilk kilo",
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            console.log('Weight successfully logged to tracker');
          }
        }
        
      } catch (error: any) {
        // Check if the error is due to an expired token
        if (error.response && error.response.status === 401) {
          // Refresh the access token
          accessToken = await refreshAccessToken();

          // Retry the request with the new access token
          response = await axios.post(
            `https://${ipv4Data.ipv4_address}/api/survey/submit-data/`,
            finalData,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
        } else {
          throw error;
        }
      }

      console.log('Final data submitted successfully:', response.data);

    } catch (error: any) {
      console.error('Error submitting final data:', error.response || error.message);
      if (error.response && error.response.data) {
        Alert.alert(
          'Hata',
          `Veriler gönderilirken bir hata oluştu: ${JSON.stringify(error.response.data)}`
        );
      } else {
        Alert.alert('Hata', 'Veriler gönderilirken bir hata oluştu.');
      }
    }
  };

  const refreshAccessToken = async (): Promise<string> => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `https://${ipv4Data.ipv4_address}/api/token/refresh/`,
        { refresh: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const newAccessToken = response.data.access;
      await SecureStore.setItemAsync('accessToken', newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  return (
    <FinalContext.Provider
      value={{
        submitFinalData,
        dislikedAndAllergies,
        setDislikedAndAllergies,
      }}
    >
      {children}
    </FinalContext.Provider>
  );
};

// Hook to use the FinalContext
export const useFinal = () => {
  const context = useContext(FinalContext);
  if (!context) {
    throw new Error('useFinal must be used within a FinalProvider');
  }
  return context;
};
