import React, { createContext, useContext, useState } from 'react';

type DietaryContextType = {
  selectedOption: string | null;
  otherDiet: string;
  setSelectedOption: (option: string | null) => void;
  setOtherDiet: (diet: string) => void;
};

const DietaryContext = createContext<DietaryContextType | undefined>(undefined);

export const DietaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [otherDiet, setOtherDiet] = useState<string>('');

  return (
    <DietaryContext.Provider
      value={{
        selectedOption,
        otherDiet,
        setSelectedOption,
        setOtherDiet,
      }}
    >
      {children}
    </DietaryContext.Provider>
  );
};

export const useDietary = () => {
  const context = useContext(DietaryContext);
  if (!context) {
    throw new Error('useDietary must be used within a DietaryProvider');
  }
  return context;
};
