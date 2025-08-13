import React, { createContext, useState, useContext, ReactNode } from 'react';

// WaterContext türü tanımları
type WaterContextType = {
  waterLevel: number; // 0 ile 1 arasında bir değer
  setWaterLevel: (level: number) => void;
};

const WaterContext = createContext<WaterContextType | undefined>(undefined);

export const WaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterLevel, setWaterLevel] = useState<number>(0); // Varsayılan su seviyesi

  return (
    <WaterContext.Provider value={{ waterLevel, setWaterLevel }}>
      {children}
    </WaterContext.Provider>
  );
};

// WaterContext'i kullanma hook'u
export const useWater = (): WaterContextType => {
  const context = useContext(WaterContext);
  if (!context) {
    throw new Error('useWater must be used within a WaterProvider');
  }
  return context;
};
