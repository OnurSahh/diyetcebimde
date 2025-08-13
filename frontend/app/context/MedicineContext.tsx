// MedicineContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Medicine = {
  id: string;
  name: string;
  dosageCount: number;
  times: (Date | null)[];
  stomachStatus: 'empty' | 'full' | null;
};

type UpdatedMedicineFields = {
  name?: string;
  dosageCount?: number;
  times?: (Date | null)[];
  stomachStatus?: 'empty' | 'full' | null;
};

type MedicineContextType = {
  medicines: Medicine[];
  addMedicine: (medicine: Omit<Medicine, 'id'>) => void;
  updateMedicine: (id: string, updatedFields: UpdatedMedicineFields) => void;
  removeMedicine: (id: string) => void;
  isUsingMedicine: boolean | null;
  setIsUsingMedicine: (value: boolean | null) => void;
  isReminderEnabled: boolean | null;
  setIsReminderEnabled: (value: boolean | null) => void;
};

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export const MedicineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isUsingMedicine, setIsUsingMedicine] = useState<boolean | null>(null);
  const [isReminderEnabled, setIsReminderEnabled] = useState<boolean | null>(null);

  const addMedicine = (medicine: Omit<Medicine, 'id'>) => {
    const newMedicine: Medicine = { ...medicine, id: Date.now().toString(), stomachStatus: null };
    setMedicines((prev) => [...prev, newMedicine]);
  };

  const updateMedicine = (id: string, updatedFields: UpdatedMedicineFields) => {
    setMedicines((prev) =>
      prev.map((medicine) =>
        medicine.id === id ? { ...medicine, ...updatedFields } : medicine
      )
    );
  };

  const removeMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((medicine) => medicine.id !== id));
  };

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        addMedicine,
        updateMedicine,
        removeMedicine,
        isUsingMedicine,
        setIsUsingMedicine,
        isReminderEnabled,
        setIsReminderEnabled,
      }}
    >
      {children}
    </MedicineContext.Provider>
  );
};

export const useMedicine = () => {
  const context = useContext(MedicineContext);
  if (!context) {
    throw new Error('useMedicine must be used within a MedicineProvider');
  }
  return context;
};
