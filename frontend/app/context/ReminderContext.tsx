//ReminderContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

type Reminder = {
  medicineId: string;
  times: string[];
};

type ReminderContextType = {
  reminders: Reminder[];
  addReminder: (medicineId: string, times: string[]) => void;
  updateReminder: (medicineId: string, times: string[]) => void;
  deleteReminder: (medicineId: string) => void;
};

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const addReminder = (medicineId: string, times: string[]) => {
    setReminders((prev) => [...prev, { medicineId, times }]);
  };

  const updateReminder = (medicineId: string, times: string[]) => {
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.medicineId === medicineId ? { ...reminder, times } : reminder
      )
    );
  };

  const deleteReminder = (medicineId: string) => {
    setReminders((prev) => prev.filter((reminder) => reminder.medicineId !== medicineId));
  };

  return (
    <ReminderContext.Provider value={{ reminders, addReminder, updateReminder, deleteReminder }}>
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminder = () => {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminder must be used within a ReminderProvider');
  }
  return context;
};
