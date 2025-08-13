import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUser } from './UserContext';

// Default measurements based on gender averages
const DEFAULT_MALE_MEASUREMENTS = {
  neck_size: '38', // cm
  shoulder_size: '110', // cm
  upperArm_size: '33', // cm
  chest_size: '100', // cm
  waist_size: '85', // cm
  leg_size: '55', // cm
  bodyFat: '', // Keep empty to prioritize calculation
};

const DEFAULT_FEMALE_MEASUREMENTS = {
  neck_size: '32', // cm
  shoulder_size: '95', // cm
  upperArm_size: '27', // cm
  chest_size: '88', // cm
  waist_size: '72', // cm
  leg_size: '52', // cm
  bodyFat: '', // Keep empty to prioritize calculation
};

type Measurements = {
  neck_size: string;
  shoulder_size: string;
  upperArm_size: string;
  chest_size: string;
  waist_size: string;
  leg_size: string;
  bodyFat: string;
};

type MeasurementContextType = {
  measurements: Measurements;
  updateMeasurements: (updates: Partial<Measurements>) => void;
  calculateBodyFat: () => number | null;
  calculatedBodyFat: number | null;
  getDefaultValueFor: (key: keyof Measurements) => string;
};

const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

export const MeasurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { gender, height, weight } = useUser();
  const [calculatedBodyFat, setCalculatedBodyFat] = useState<number | null>(null);
  
  // Initialize with empty values
  const [measurements, setMeasurements] = useState<Measurements>({
    neck_size: '',
    shoulder_size: '',
    upperArm_size: '',
    chest_size: '',
    waist_size: '',
    leg_size: '',
    bodyFat: '',
  });

  // Helper to get default value based on gender and measurement key
  const getDefaultValueFor = (key: keyof Measurements): string => {
    const defaults = gender === 'Erkek' ? DEFAULT_MALE_MEASUREMENTS : DEFAULT_FEMALE_MEASUREMENTS;
    return defaults[key];
  };

  // Update measurements when provided
  const updateMeasurements = (updates: Partial<Measurements>) => {
    setMeasurements((prev) => ({ ...prev, ...updates }));
  };

  // Add this improved calculateBodyFat function
  const calculateBodyFat = (): number | null => {
    // If user directly entered body fat %, use that
    if (measurements.bodyFat && measurements.bodyFat.trim() !== '') {
      const enteredValue = parseFloat(measurements.bodyFat);
      // Validate it's within reasonable range
      if (!isNaN(enteredValue) && enteredValue >= 3 && enteredValue <= 50) {

        return enteredValue;
      }
    }

    // Get default values by gender
    const defaults = gender === 'Erkek' ? DEFAULT_MALE_MEASUREMENTS : DEFAULT_FEMALE_MEASUREMENTS;
    
    // Use user-entered values when available, otherwise use defaults
    const neckSize = measurements.neck_size?.trim() ? 
      parseFloat(measurements.neck_size) : 
      parseFloat(defaults.neck_size);
      
    const waistSize = measurements.waist_size?.trim() ? 
      parseFloat(measurements.waist_size) : 
      parseFloat(defaults.waist_size);
    
    // Get user's height or default
    const userHeight = height || (gender === 'Erkek' ? 175 : 162);


    try {
      // Navy Method formula with proper validation
      if (gender === 'Erkek') {
        // For men: 495 / (1.0324 - 0.19077 * log10(waist-neck) + 0.15456 * log10(height)) - 450
        
        // Validate neck is smaller than waist
        if (neckSize >= waistSize) {

          return 15; // Default for men
        }
        
        const waistNeckDiff = waistSize - neckSize;
        const logValue = Math.log10(waistNeckDiff);
        const logHeight = Math.log10(userHeight);
        
        const result = (495 / (1.0324 - 0.19077 * logValue + 0.15456 * logHeight) - 450);
        
        // Validate result is reasonable
        if (isNaN(result) || result < 5 || result > 35) {

          return 15; // Default for men
        }
        
        const finalResult = Math.round(result * 10) / 10;

        return finalResult;
      } 
      else {
        // For women: 495 / (1.29579 - 0.35004 * log10(waist-neck) + 0.22100 * log10(height)) - 450
        
        // Validate neck is smaller than waist
        if (neckSize >= waistSize) {

          return 25; // Default for women
        }
        
        const waistNeckDiff = waistSize - neckSize;
        const logValue = Math.log10(waistNeckDiff);
        const logHeight = Math.log10(userHeight);
        
        const result = (495 / (1.29579 - 0.35004 * logValue + 0.22100 * logHeight) - 450);
        
        // Validate result is reasonable
        if (isNaN(result) || result < 15 || result > 45) {

          return 25; // Default for women
        }
        
        const finalResult = Math.round(result * 10) / 10;

        return finalResult;
      }
    } 
    catch (error) {
      console.error("Error calculating body fat:", error);
      return gender === 'Erkek' ? 15 : 25; // Default values by gender
    }
  };

  // Update calculated body fat when measurements change
  useEffect(() => {
    const bodyFatPercentage = calculateBodyFat();
    if (bodyFatPercentage !== null) {
      setCalculatedBodyFat(bodyFatPercentage);
    }
  }, [measurements, gender, height, weight]);

  return (
    <MeasurementContext.Provider value={{ 
      measurements, 
      updateMeasurements, 
      calculateBodyFat,
      calculatedBodyFat,
      getDefaultValueFor
    }}>
      {children}
    </MeasurementContext.Provider>
  );
};

export const useMeasurements = () => {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error('useMeasurements must be used within a MeasurementProvider');
  }
  return context;
};
