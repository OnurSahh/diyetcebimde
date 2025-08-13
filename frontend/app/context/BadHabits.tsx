import React, { createContext, useContext, useState, ReactNode } from 'react';

// Context türü tanımlaması
type BadHabitsContextType = {
  badHabits: Record<string, boolean>; // Alışkanlık adı ve seçimi (true/false)
  updateBadHabit: (habit: string, value: boolean) => void; // Alışkanlığı güncelleme
};

// Context oluşturma
const BadHabitsContext = createContext<BadHabitsContextType | undefined>(undefined);

// Provider bileşeni
export const BadHabitsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [badHabits, setBadHabits] = useState<Record<string, boolean>>({});

  const updateBadHabit = (habit: string, value: boolean) => {
    setBadHabits((prev) => ({ ...prev, [habit]: value }));
  };

  return (
    <BadHabitsContext.Provider value={{ badHabits, updateBadHabit }}>
      {children}
    </BadHabitsContext.Provider>
  );
};

// Context kullanma hook'u
export const useBadHabits = (): BadHabitsContextType => {
  const context = useContext(BadHabitsContext);
  if (!context) {
    throw new Error('useBadHabits must be used within a BadHabitsProvider');
  }
  return context;
};
