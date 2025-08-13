// Create this new file

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mode types
export type PlanMode = 'weeklyPlan' | 'manualTracking';

// Storage key
const PLAN_MODE_KEY = '@diet_app_plan_mode';

// Save the selected mode
export const savePlanMode = async (mode: PlanMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(PLAN_MODE_KEY, mode);
  } catch (error) {
    console.error('Error saving plan mode:', error);
  }
};

// Get the current mode (with default)
export const getPlanMode = async (): Promise<PlanMode> => {
  try {
    const value = await AsyncStorage.getItem(PLAN_MODE_KEY);
    return (value as PlanMode) || 'weeklyPlan';
  } catch (error) {
    console.error('Error getting plan mode:', error);
    return 'weeklyPlan';
  }
};

// Toggle between modes
export const togglePlanMode = async (): Promise<PlanMode> => {
  const currentMode = await getPlanMode();
  const newMode: PlanMode = currentMode === 'weeklyPlan' ? 'manualTracking' : 'weeklyPlan';
  await savePlanMode(newMode);
  return newMode;
};