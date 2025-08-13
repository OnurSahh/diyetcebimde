{/*app/index.tsx*/}

import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from '@context/UserContext';
import { HealthProvider } from '@context/HealthContext';
import RootNavigator from './navigation/RootNavigator';
import { DietaryProvider } from '@context/DietaryContext';
import { MealsProvider } from '@context/MealsContext';
import { NutritionProvider } from '@context/NutritionContext';
import { FinalProvider } from '@context/FinalContext';
import { HabitsProvider } from '@context/HabitContext';
import { MeasurementProvider } from '@context/MeasurementContext';
import { BadHabitsProvider } from '@context/BadHabits';
import { MedicineProvider } from '@context/MedicineContext';
import { WaterProvider } from '@context/WaterContext';
import { ReminderProvider } from '@context/ReminderContext';
import setupAxiosInterceptors from './utils/axiosConfig';

// Wrapper component to access auth context
const AppWithInterceptors = () => {
  const { logout } = useAuth();
  
  useEffect(() => {
    // Set up axios interceptors with auth logout function
    setupAxiosInterceptors(logout);
  }, [logout]);
  
  return (
    <UserProvider>
      <MealsProvider>
        <HabitsProvider>
          <MeasurementProvider>
            <NutritionProvider>
              <HealthProvider>
                <DietaryProvider>
                  <BadHabitsProvider>
                    <MedicineProvider>
                      <WaterProvider>
                        <ReminderProvider>
                          <FinalProvider>
                            <RootNavigator />
                          </FinalProvider>
                        </ReminderProvider>
                      </WaterProvider>
                    </MedicineProvider>
                  </BadHabitsProvider>
                </DietaryProvider>
              </HealthProvider>
            </NutritionProvider>
          </MeasurementProvider>
        </HabitsProvider>
      </MealsProvider>
    </UserProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppWithInterceptors />
  </AuthProvider>
);

registerRootComponent(App);