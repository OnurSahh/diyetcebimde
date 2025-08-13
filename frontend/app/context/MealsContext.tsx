// MealsContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

type MealTimes = {
  [mealId: string]: string;
};

type MealTypes = {
  [mealId: string]: 'breakfast' | 'lunch' | 'dinner';
};

type SnackMeals = {
  preference: 'yes' | 'no' | null;
  count: number | null;
  times: (string | null)[];
};

type MealsContextType = {
  mainFull: 'yes' | 'no' | null;
  setMainFull: (status: 'yes' | 'no' | null) => void;
  mainMeals: number | null;
  setMainMeals: (count: number | null) => void;
  mealTimes: MealTimes;
  setMealTimes: React.Dispatch<React.SetStateAction<MealTimes>>;
  setMealTime: (mealId: string, time: string) => void;
  mealTypes: MealTypes;
  setMealTypes: React.Dispatch<React.SetStateAction<MealTypes>>;
  setMealType: (mealId: string, type: 'breakfast' | 'lunch' | 'dinner') => void;
  snackMeals: SnackMeals;
  setSnackMeals: React.Dispatch<React.SetStateAction<SnackMeals>>;
  excludedItems: string[];
  setExcludedItems: React.Dispatch<React.SetStateAction<string[]>>;
};

const MealsContext = createContext<MealsContextType | undefined>(undefined);

export const MealsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mainFull, setMainFull] = useState<'yes' | 'no' | null>(null);
  const [mainMeals, setMainMeals] = useState<number | null>(null);
  const [mealTimes, setMealTimes] = useState<MealTimes>({});
  const [mealTypes, setMealTypes] = useState<MealTypes>({});
  const [snackMeals, setSnackMeals] = useState<SnackMeals>({
    preference: null,
    count: null,
    times: [],
  });
  const [excludedItems, setExcludedItems] = useState<string[]>([]);

  const setMealTime = (mealId: string, time: string) => {
    setMealTimes((prev) => ({
      ...prev,
      [mealId]: time,
    }));
  };

  const setMealType = (mealId: string, type: 'breakfast' | 'lunch' | 'dinner') => {
    setMealTypes((prev) => ({
      ...prev,
      [mealId]: type,
    }));
  };

  return (
    <MealsContext.Provider
      value={{
        mainFull,
        setMainFull,
        mainMeals,
        setMainMeals,
        mealTimes,
        setMealTimes,
        setMealTime,
        mealTypes,
        setMealTypes,
        setMealType,
        snackMeals,
        setSnackMeals,
        excludedItems,
        setExcludedItems,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
};

export const useMeals = () => {
  const context = useContext(MealsContext);
  if (!context) {
    throw new Error('useMeals must be used within a MealsProvider');
  }
  return context;
};
