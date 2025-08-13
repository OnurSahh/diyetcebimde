// HealthContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type HealthConditions = { [key: string]: boolean };

type HealthContextType = {
  healthConditions: HealthConditions;
  updateHealthConditions: (condition: string, value: boolean) => void;
  setHealthConditions: (conditions: HealthConditions) => void;
};

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [healthConditions, setHealthConditions] = useState<HealthConditions>({});

  const updateHealthConditions = (condition: string, value: boolean) => {
    setHealthConditions((prevConditions) => ({
      ...prevConditions,
      [condition]: value,
    }));
  };

  return (
    <HealthContext.Provider value={{ healthConditions, updateHealthConditions, setHealthConditions }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
