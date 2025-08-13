// UserContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';

type UserContextType = {
  firstName: string;
  setFirstName: (name: string) => void;
  birthDate: Date | null;
  setBirthDate: (date: Date | null) => void;
  age: number | null;
  setAge: (age: number | null) => void;

  height: number;
  setHeight: (cm: number) => void;
  selectedHeightUnit: 'cm' | 'ft';
  setSelectedHeightUnit: (unit: 'cm' | 'ft') => void;
  feet: number;
  setFeet: (feet: number) => void;
  inches: number;
  setInches: (inches: number) => void;

  weight: number;
  setWeight: (kg: number) => void;
  selectedWeightUnit: 'kg' | 'lbs';
  setSelectedWeightUnit: (unit: 'kg' | 'lbs') => void;
  lbs: number;
  setLbs: (lbs: number) => void;

  gender: 'Erkek' | 'Kadın' | null;
  setGender: (gender: 'Erkek' | 'Kadın' | null) => void;
  
  activityLevel: 'low' | 'medium' | 'high' | null;
  setActivityLevel: (level: 'low' | 'medium' | 'high' | null) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firstName, setFirstName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [age, setAge] = useState<number | null>(null);

  const [height, setHeight] = useState<number>(170);
  const [selectedHeightUnit, setSelectedHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [feet, setFeet] = useState<number>(5);
  const [inches, setInches] = useState<number>(7);

  const [weight, setWeight] = useState<number>(70);
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [lbs, setLbs] = useState<number>(Math.round(70 * 2.20462));

  const [gender, setGender] = useState<'Erkek' | 'Kadın' | null>(null);
  const [activityLevel, setActivityLevel] = useState<'low' | 'medium' | 'high' | null>(null);

  return (
    <UserContext.Provider
      value={{
        firstName,
        setFirstName,
        birthDate,
        setBirthDate,
        age,
        setAge,
        height,
        setHeight,
        selectedHeightUnit,
        setSelectedHeightUnit,
        feet,
        setFeet,
        inches,
        setInches,
        weight,
        setWeight,
        selectedWeightUnit,
        setSelectedWeightUnit,
        lbs,
        setLbs,
        gender,
        setGender,
        activityLevel,
        setActivityLevel
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};