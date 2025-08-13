// contexts/QuizContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type QuizAnswers = {
  [key: string]: string;
};

type QuizMetrics = {
  startTime: Date | null;
  endTime: Date | null;
};

type QuizContextType = {
  answers: QuizAnswers;
  metrics: QuizMetrics;
  setAnswer: (questionId: string, answer: string) => void;
  resetAnswers: () => void;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  resetMetrics: () => void;
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [metrics, setMetrics] = useState<QuizMetrics>({
    startTime: null,
    endTime: null,
  });

  const setAnswer = (questionId: string, answer: string) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answer,
    }));
  };

  const resetAnswers = () => {
    setAnswers({});
  };

  const setStartTime = (time: Date) => {
    setMetrics((prevMetrics) => ({
      ...prevMetrics,
      startTime: time,
    }));
  };

  const setEndTime = (time: Date) => {
    setMetrics((prevMetrics) => ({
      ...prevMetrics,
      endTime: time,
    }));
  };

  const resetMetrics = () => {
    setMetrics({
      startTime: null,
      endTime: null,
    });
  };

  return (
    <QuizContext.Provider
      value={{
        answers,
        metrics,
        setAnswer,
        resetAnswers,
        setStartTime,
        setEndTime,
        resetMetrics,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
