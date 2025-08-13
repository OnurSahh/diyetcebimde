// app/navigation/SurveyNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import only the screens we're keeping (with correct paths)
import NameScreen from '@screens/Survey/A_NameScreen';
import BirthDateScreen from '@screens/Survey/B_BirthDateScreen';
import HeightScreen from '@screens/Survey/C_HeightScreen';
import WeightScreen from '@screens/Survey/D_WeightScreen';
import GenderScreen from '@screens/Survey/E_GenderScreen';
import BodyMeasures from '@screens/Survey/F_BodyMeasures';
import ActivityLevelScreen from '@screens/Survey/H_ActivityLevel';
import GoalScreen from '@screens/Survey/H1_GoalScreen';
import HealthStatuesScreen from '@screens/Survey/I_HealthStatues';
import DietaryTypeScreen from '@screens/Survey/N_DietaryType'; // Changed from L_DietaryScreen
import HMTEatingScreen from '@screens/Survey/K_HMTEating';
import SurveyCompletionScreen from '@screens/Survey/SurveyCompletionScreen';
import SnackMeals from '@screens/Survey/K1_SnackMeals';
import AdditionalEating from '@screens/Survey/M_AdditionalEating';

export type SurveyStackParamList = {
  NameScreen: undefined;
  BirthDateScreen: undefined;
  HeightScreen: undefined;
  WeightScreen: undefined;
  GenderScreen: undefined;
  BodyMeasures: undefined;
  ActivityLevel: undefined;
  Goal: undefined;
  HealthStatues: undefined;
  Diet: undefined;
  HMTEating: undefined;
  SnackMeals: undefined;
  AdditionalEating: undefined;
  SurveyCompletion: undefined;
};

const Stack = createStackNavigator<SurveyStackParamList>();

const SurveyNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="NameScreen"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="NameScreen" component={NameScreen} />
      <Stack.Screen name="BirthDateScreen" component={BirthDateScreen} />
      <Stack.Screen name="HeightScreen" component={HeightScreen} />
      <Stack.Screen name="WeightScreen" component={WeightScreen} />
      <Stack.Screen name="GenderScreen" component={GenderScreen} />
      <Stack.Screen name="BodyMeasures" component={BodyMeasures} />
      <Stack.Screen name="ActivityLevel" component={ActivityLevelScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="HealthStatues" component={HealthStatuesScreen} />
      <Stack.Screen name="Diet" component={DietaryTypeScreen} />
      <Stack.Screen name="HMTEating" component={HMTEatingScreen} />
      <Stack.Screen name="SnackMeals" component={SnackMeals} />
      <Stack.Screen name="AdditionalEating" component={AdditionalEating} />
      <Stack.Screen name="SurveyCompletion" component={SurveyCompletionScreen} />
    </Stack.Navigator>
  );
};

export default SurveyNavigator;