import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './UserContext';
import { useHabits } from './HabitContext';
import { useMeasurements } from './MeasurementContext';

// Define macronutrient type
type Macros = {
  protein: number;
  fats: number;
  carbs: number;
};

// Define the context type
type NutritionContextType = {
  bmr: number;
  tdee: number;
  bmi: number;
  bmiCategory: string;
  idealWeightRange: { min: number; max: number };
  bodyFatPercentage: number | null;
  idealBodyFatRange: { min: number; max: number };
  goal: string;
  setGoal: (goal: string) => void;
  calorieDeficitSurplus: number;
  setCalorieDeficitSurplus: (value: number) => void;
  calorieIntake: number;
  macros: Macros;
  calculateNutrition: () => void;
  updateBodyFatPercentage: (bodyFat: number) => void;
};

// Create the context
const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

// Provider component
export const NutritionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get data from other contexts
  const { gender, age, height, weight, activityLevel } = useUser();
  const { activityData } = useHabits();
  const { measurements, calculatedBodyFat } = useMeasurements();
  // User-adjustable parameters
  const [goal, setGoal] = useState<string>('maintain');

  // State for calculated values with sensible defaults
  const [bmr, setBmr] = useState<number>(1800);
  const [tdee, setTdee] = useState<number>(2200);
  const [bmi, setBmi] = useState<number>(22);
  const [bmiCategory, setBmiCategory] = useState<string>('Normal');
  const [idealWeightRange, setIdealWeightRange] = useState<{ min: number; max: number }>({ min: 60, max: 75 });
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | null>(null);
  const [idealBodyFatRange, setIdealBodyFatRange] = useState<{ min: number; max: number }>({ min: 15, max: 25 });
  const [calorieDeficitSurplus, setCalorieDeficitSurplus] = useState<number>(15);
  const [calorieIntake, setCalorieIntake] = useState<number>(2200);
  const [macros, setMacros] = useState<Macros>({ protein: 100, fats: 60, carbs: 220 });

  // Main calculation function
  const calculateNutrition = () => {
    // Validate and provide defaults for all inputs
    const validGender = gender || 'Erkek';
    const validAge = age ? Number(age) : 30;
    const validHeight = height ? Number(height) : 170;
    const validWeight = weight ? Number(weight) : 70;
    const validActivityLevel = activityLevel || 'medium';
    
    // 1. Calculate BMI
    const heightInMeters = validHeight / 100;
    const calculatedBmi = validWeight / (heightInMeters * heightInMeters);
    const localBmi = Math.round(calculatedBmi * 10) / 10; // Round to 1 decimal place
    
    // Determine BMI category
    let localBmiCategory: string;
    if (localBmi < 18.5) {
      localBmiCategory = 'Zayıf';
    } else if (localBmi < 25) {
      localBmiCategory = 'Normal';
    } else if (localBmi < 30) {
      localBmiCategory = 'Fazla Kilolu';
    } else {
      localBmiCategory = 'Obez';
    }
    
    // Calculate ideal weight range based on BMI range of 18.5-24.9
    const minWeight = Math.round(18.5 * heightInMeters * heightInMeters);
    const maxWeight = Math.round(24.9 * heightInMeters * heightInMeters);
    const localIdealWeightRange = { min: minWeight, max: maxWeight };
    
    // 2. Calculate Body Fat Percentage - simplified approach
    let localBodyFatPercentage: number;
    
    if (validGender === 'Erkek') {
      localBodyFatPercentage = Math.round((1.20 * localBmi + 0.23 * validAge - 16.2) * 10) / 10;
    } else {
      localBodyFatPercentage = Math.round((1.20 * localBmi + 0.23 * validAge - 5.4) * 10) / 10;
    }
    
    // Ensure body fat is in realistic range
    const minBf = validGender === 'Erkek' ? 5 : 10;
    const maxBf = validGender === 'Erkek' ? 35 : 45;
    localBodyFatPercentage = Math.max(minBf, Math.min(maxBf, localBodyFatPercentage));
    
    // 3. Calculate BMR (Basal Metabolic Rate)
    let localBmr: number;
    
    // Mifflin-St Jeor Formula
    if (validGender === 'Erkek') {
      localBmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge + 5;
    } else {
      localBmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge - 161;
    }
    
    localBmr = Math.round(localBmr);
    
    // 4. Calculate TDEE (Total Daily Energy Expenditure)
    let localTdee: number;
    
    // Map activity level to multiplier
    let activityMultiplier: number;
    
    switch (validActivityLevel) {
      case 'low':
        activityMultiplier = 1.375; // Sedentary to light activity
        break;
      case 'high':
        activityMultiplier = 1.725; // Very active
        break;
      case 'medium':
      default:
        activityMultiplier = 1.55;  // Moderately active
        break;
    }
    
    localTdee = Math.round(localBmr * activityMultiplier);
    
    // 5. Calculate Calorie Target based on goal
    let localCalorieIntake: number;
    const validGoal = goal || 'maintain';
    
    // Make the deficit/surplus percentage reasonable (between 5-30%)
    const deficitSurplus = Math.min(Math.max(calorieDeficitSurplus, 5), 30) / 100;
    
    // Different calculations based on goal
    switch (validGoal) {
      case 'weight_loss':
        // Deficit for weight loss
        localCalorieIntake = Math.round(localTdee * (1 - deficitSurplus));
        // Ensure minimum safe calories
        localCalorieIntake = Math.max(localCalorieIntake, validGender === 'Erkek' ? 1500 : 1200);
        break;
        
      case 'weight_gain':
        // Surplus for weight gain
        localCalorieIntake = Math.round(localTdee * (1 + deficitSurplus));
        break;
        
      case 'muscle_gain':
        // Slight surplus for muscle gain
        localCalorieIntake = Math.round(localTdee * (1 + deficitSurplus/2));
        break;
        
      case 'maintain':
      default:
        // Maintenance
        localCalorieIntake = localTdee;
        break;
    }
    
    // 6. Calculate Macronutrients
    let localMacros: Macros;
    
    // Protein based on goal and weight
    let proteinPerKg: number;
    
    switch (validGoal) {
      case 'weight_loss':
        proteinPerKg = 2.0; // Higher protein for weight loss
        break;
      case 'weight_gain':
        proteinPerKg = 1.6; // Moderate protein for weight gain
        break;
      case 'muscle_gain':
        proteinPerKg = 1.8; // Higher protein for muscle gain
        break;
      case 'maintain':
      default:
        proteinPerKg = 1.6; // Moderate protein for maintenance
        break;
    }
    
    const proteinGrams = Math.round(validWeight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;
    
    // Fat calculation (25-35% of calories based on goal)
    let fatPercentage: number;
    
    switch (validGoal) {
      case 'weight_loss':
        fatPercentage = 0.30; // Moderate fat for weight loss
        break;
      case 'weight_gain':
        fatPercentage = 0.30; // Moderate fat for weight gain
        break;
      case 'muscle_gain':
        fatPercentage = 0.25; // Lower fat for muscle gain
        break;
      case 'maintain':
      default:
        fatPercentage = 0.30; // Moderate fat for maintenance
        break;
    }
    
    const fatCalories = localCalorieIntake * fatPercentage;
    const fatGrams = Math.round(fatCalories / 9);
    
    // Remaining calories go to carbs
    const carbCalories = localCalorieIntake - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbCalories / 4);
    
    localMacros = {
      protein: proteinGrams,
      fats: fatGrams,
      carbs: carbGrams,
    };
    
    // Update all state values
    setBmr(localBmr);
    setTdee(localTdee);
    setBmi(localBmi);
    setBmiCategory(localBmiCategory);
    setIdealWeightRange(localIdealWeightRange);
    setBodyFatPercentage(localBodyFatPercentage);
    setCalorieIntake(localCalorieIntake);
    setMacros(localMacros);
  };

  // New method to update body fat and recalculate relevant values
  const updateBodyFatPercentage = (bodyFat: number) => {
    setBodyFatPercentage(bodyFat);
    
    // Update ideal body fat range based on gender
    const idealRange = calculateIdealBodyFatRange(gender, bodyFat);
    setIdealBodyFatRange(idealRange);
  };
  
  // Helper function to calculate ideal body fat range
  const calculateIdealBodyFatRange = (gender: 'Erkek' | 'Kadın' | null, currentBodyFat: number) => {
    if (gender === 'Erkek') {
      return { min: 10, max: 20 }; // Healthy range for men
    } else if (gender === 'Kadın') {
      return { min: 18, max: 28 }; // Healthy range for women
    }
    return { min: 15, max: 25 }; // Default range
  };

  // Calculate nutrition when relevant inputs change
  useEffect(() => {
    calculateNutrition();
  }, [gender, age, height, weight, activityLevel, activityData, goal, calorieDeficitSurplus]);

  // Also calculate once on component mount
  useEffect(() => {
    calculateNutrition();
  }, []);

  // Add this effect to watch for body fat changes
  useEffect(() => {
    if (calculatedBodyFat !== null) {
      // Update your nutrition context with the calculated body fat
      updateBodyFatPercentage(calculatedBodyFat);
    }
  }, [calculatedBodyFat]);

  // Provide context value
  return (
    <NutritionContext.Provider
      value={{
        bmr,
        tdee,
        bmi,
        bmiCategory,
        idealWeightRange,
        bodyFatPercentage,
        idealBodyFatRange,
        goal,
        setGoal,
        calorieDeficitSurplus,
        setCalorieDeficitSurplus,
        calorieIntake,
        macros,
        calculateNutrition,
        updateBodyFatPercentage,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};

// Hook to use the NutritionContext
export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (context === undefined) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};