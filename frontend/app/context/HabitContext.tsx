// HabitsContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type ActivityData = {
  resting: number;
  light_acts: number;
  medium_acts: number;
  heavy_acts: number;
};

type HabitsContextType = {
  sleepTime: Date | null;
  setSleepTime: (time: Date | null) => void;
  wakeTime: Date | null;
  setWakeTime: (time: Date | null) => void;
  sleepDuration: number | null;
  setSleepDuration: (duration: number) => void;
  activityData: ActivityData;
  setActivityData: (data: ActivityData) => void;
  remainingHours: number;
  setRemainingHours: (hours: number) => void;
  totalEnergy: number | null;
  setTotalEnergy: (energy: number | null) => void;
  exerciseFrequency: string | null;
  setExerciseFrequency: (frequency: string | null) => void;
};

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export const HabitsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [wakeTime, setWakeTime] = useState<Date | null>(null);
  const [sleepDuration, setSleepDuration] = useState<number | null>(null);
  const [activityData, setActivityData] = useState<ActivityData>({
    resting: 0,
    light_acts: 0,
    medium_acts: 0,
    heavy_acts: 0,
  });
  const [remainingHours, setRemainingHours] = useState<number>(24);
  const [totalEnergy, setTotalEnergy] = useState<number | null>(null);
  const [exerciseFrequency, setExerciseFrequency] = useState<string | null>(null);

  // Example: Calculate totalEnergy based on activityData and sleepDuration
  useEffect(() => {
    // Define calorie burn rates for different activities (these are example values)
    const CALORIES_RESTING_PER_HOUR = 60;
    const CALORIES_LIGHT_PER_HOUR = 200;
    const CALORIES_MEDIUM_PER_HOUR = 300;
    const CALORIES_HEAVY_PER_HOUR = 500;

    const totalCaloriesBurned =
      (activityData.resting * CALORIES_RESTING_PER_HOUR) +
      (activityData.light_acts * CALORIES_LIGHT_PER_HOUR) +
      (activityData.medium_acts * CALORIES_MEDIUM_PER_HOUR) +
      (activityData.heavy_acts * CALORIES_HEAVY_PER_HOUR);

    // Optionally, factor in sleep duration if it affects energy
    const sleepEnergyFactor = sleepDuration ? sleepDuration * 50 : 0; // Example factor

    const calculatedTotalEnergy = totalCaloriesBurned - sleepEnergyFactor;

    setTotalEnergy(calculatedTotalEnergy);
  }, [activityData, sleepDuration]);

  // Optionally, update remainingHours based on sleepTime and wakeTime
  useEffect(() => {
    if (sleepTime && wakeTime) {
      const sleepDate = new Date(sleepTime);
      const wakeDate = new Date(wakeTime);
      
      // If wake time is before sleep time, assume wake time is on the next day
      if (wakeDate <= sleepDate) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }

      const diffMs = wakeDate.getTime() - sleepDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      setSleepDuration(diffHours);
      setRemainingHours(24 - diffHours);
    }
  }, [sleepTime, wakeTime]);

  return (
    <HabitsContext.Provider
      value={{
        sleepTime,
        setSleepTime,
        wakeTime,
        setWakeTime,
        sleepDuration,
        setSleepDuration,
        activityData,
        setActivityData,
        remainingHours,
        setRemainingHours,
        totalEnergy,
        setTotalEnergy,
        exerciseFrequency,
        setExerciseFrequency,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
};
