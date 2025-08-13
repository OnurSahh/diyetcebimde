import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Platform, Dimensions, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LineChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../../assets/ipv4_address.json';
import { HomeStackParamList, MainTabParamList } from '../../navigation/MainNavigator';
import { getPlanMode, PlanMode } from '../../utils/planModeStorage';

// Define the navigation prop types
type StatisticsNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'Statistics'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Screen dimensions for charts
const screenWidth = Dimensions.get('window').width;

// Types
type NutritionTotals = {
  calories: { goal: number; actual: number };
  protein: { goal: number; actual: number };
  carbs: { goal: number; actual: number };
  fats: { goal: number; actual: number };
  water: { goal: number; actual: number };
};

type DailyStats = {
  date: string;
  totals: NutritionTotals;
  weight?: number;
};

type WeeklyData = {
  dates: string[]; // Original date strings
  labels: string[]; // Formatted labels for display
  caloriesData: { actual: number[]; goal: number[] };
  macrosData: { protein: number[]; carbs: number[]; fats: number[] };
  waterData: { actual: number[]; goal: number[] };
  weightData: (number | null)[];
};

// Turkish day abbreviations and months
const TURKISH_DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const TURKISH_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const ENGLISH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Statistics: React.FC = () => {
  const navigation = useNavigation<StatisticsNavigationProp>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
  const [macroDetailsVisible, setMacroDetailsVisible] = useState<boolean>(false); 
  const [selectedBarModal, setSelectedBarModal] = useState<boolean>(false);
  const [selectedBar, setSelectedBar] = useState<{value: number; label: string; date: string} | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [monthlyData, setMonthlyData] = useState<WeeklyData | null>(null);
  const [planMode, setPlanMode] = useState<PlanMode>('weeklyPlan');

  // Load plan mode on component mount
  useEffect(() => {
    const loadPlanMode = async () => {
      try {
        const mode = await getPlanMode();
        setPlanMode(mode);
      } catch (error) {
        console.error("Error loading plan mode:", error);
        // Default to weekly plan if error
        setPlanMode('weeklyPlan');
      }
    };
    loadPlanMode();
  }, []);

  // Format numbers to 1 decimal place
  const formatNumber = (num: number): string => {
    if (isNaN(num) || num === undefined) return "0.0";
    return (Math.round(num * 10) / 10).toFixed(1);
  };

  // Calculate percentage
  const calculatePercentage = (actual: number, goal: number): number => {
    if (goal === 0 || isNaN(goal) || isNaN(actual)) return 0;
    return Math.min(Math.round((actual / goal) * 100), 100);
  };

  // Format date for display
  const formatDateForDisplay = (dateStr: string): string => {
    try {
      // Check if it might be a day abbreviation first
      const dayIndex = ENGLISH_DAYS.indexOf(dateStr);
      if (dayIndex !== -1) {
        return TURKISH_DAYS_SHORT[dayIndex];
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]}`;
    } catch (e) {
      return "-";
    }
  };

  // Format date labels for weekly/monthly views
  const formatDateLabel = (dateStr: string, rangeType: 'weekly' | 'monthly'): string => {
    if (!dateStr) return "-";
    
    try {
      // For weekly view, check if it's a day abbreviation
      if (rangeType === 'weekly') {
        // Check if it's a day abbreviation like "Mon", "Tue", etc.
        const dayIndex = ENGLISH_DAYS.indexOf(dateStr);
        if (dayIndex !== -1) {
          // Get current date to calculate day of month
          const today = new Date();
          const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
          const currentDate = today.getDate();
          
          // Get the day of the month for this day
          // Calculate how many days to go back/forward from today
          const dayDiff = dayIndex + 1 - (currentDay === 0 ? 7 : currentDay); // Adjust Sunday
          const targetDate = new Date(today);
          targetDate.setDate(currentDate + dayDiff);
          
          // Return day/month format
          return `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
        }
      }
      
      // For both weekly and monthly, if it's a full date string
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      
      const day = date.getDate();
      const month = date.getMonth() + 1; // JavaScript months are 0-based
      return `${day}/${month}`;
      
    } catch (e) {
      return "-";
    }
  };

  // Fetch daily statistics with retry logic
// Fetch daily statistics with retry logic
const fetchDailyStats = useCallback(async (retryCount = 0) => {
  try {
    setIsLoading(true);
    const token = await SecureStore.getItemAsync('accessToken');
    
    if (!token) {
      Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
      return;
    }
    
    if (planMode === 'weeklyPlan') {
      // For weekly plan mode, get the values from the meal plan
      try {
        const mealPlanResponse = await axios.get(
          `https://${ipv4Data.ipv4_address}/api/mealplan/get-meal-plan/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Get today's date to find the current day's totals
        const today = new Date().toISOString().split('T')[0];
        const days = mealPlanResponse.data.days || [];
        let currentDay = days.find((day: any) => day.date === today);
        
        // If today not found, get the first day
        if (!currentDay && days.length > 0) {
          currentDay = days[0];
        }
        
        if (currentDay) {
          const dt = currentDay.daily_total;
          
          // Get stats for calories, protein, etc.
          const statsResponse = await axios.get(
            `https://${ipv4Data.ipv4_address}/api/tracker/statistics/daily/`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          // Create the sanitized data with goals from meal plan
          const sanitizedData = {
            ...statsResponse.data,
            totals: {
              calories: {
                actual: Number(statsResponse.data.totals?.calories?.actual || 0),
                goal: Number(dt.calorie || 0)
              },
              protein: {
                actual: Number(statsResponse.data.totals?.protein?.actual || 0),
                goal: Number(dt.protein || 0)
              },
              carbs: {
                actual: Number(statsResponse.data.totals?.carbs?.actual || 0),
                goal: Number(dt.carbohydrate || 0)
              },
              fats: {
                actual: Number(statsResponse.data.totals?.fats?.actual || 0),
                goal: Number(dt.fat || 0)
              },
              water: {
                actual: Number(statsResponse.data.totals?.water?.actual || 0),
                goal: 2500 // Fixed water goal
              }
            }
          };
          
          console.log("Statistics: Weekly plan goals being used:", 
            dt.calorie, 
            dt.protein,
            dt.carbohydrate,
            dt.fat);
          
          setDailyStats(sanitizedData);
        }
      } catch (error) {
        console.error('Error fetching meal plan for goals:', error);
        // Fall back to using custom goals
        fetchManualGoals();
      }
    } else {
      // For manual tracking mode, get goals from the API
      fetchManualGoals();
    }
  } catch (error) {
    console.error('Günlük istatistikler alınırken hata oluştu:', error);
    Alert.alert('Hata', 'İstatistikler alınamadı. Lütfen internet bağlantınızı kontrol edin.');
  } finally {
    setIsLoading(false);
  }
  
  // Helper function to fetch manual mode goals
  async function fetchManualGoals() {
    const token = await SecureStore.getItemAsync('accessToken');
    
    // Get user goals from goals endpoint
    const goalsResponse = await axios.get(
      `https://${ipv4Data.ipv4_address}/api/tracker/goals/`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const customGoals = goalsResponse.data.custom;
    
    // Get daily stats
    const statsResponse = await axios.get(
      `https://${ipv4Data.ipv4_address}/api/tracker/statistics/daily/manual/`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    // Create sanitized data with custom goals
    const sanitizedData = {
      ...statsResponse.data,
      totals: {
        calories: {
          actual: Number(statsResponse.data.totals?.calories?.actual || 0),
          goal: Number(customGoals.daily_calorie || 0)
        },
        protein: {
          actual: Number(statsResponse.data.totals?.protein?.actual || 0),
          goal: Number(customGoals.protein || 0)
        },
        carbs: {
          actual: Number(statsResponse.data.totals?.carbs?.actual || 0),
          goal: Number(customGoals.carbs || 0)
        },
        fats: {
          actual: Number(statsResponse.data.totals?.fats?.actual || 0),
          goal: Number(customGoals.fats || 0)
        },
        water: {
          actual: Number(statsResponse.data.totals?.water?.actual || 0),
          goal: Number(customGoals.water_goal || 0)
        }
      }
    };
    
    console.log("Statistics: Manual goals being used:", 
      customGoals.daily_calorie, 
      customGoals.protein,
      customGoals.carbs,
      customGoals.fats);
    
    setDailyStats(sanitizedData);
  }
}, [planMode]);

  // Process time-based statistics data (weekly or monthly)
// Update this function to correctly process time-based data with proper date ordering
const processTimeRangeData = (responseData: any, rangeType: 'weekly' | 'monthly'): WeeklyData => {
  // Ensure data exists
  if (!responseData || !responseData.dates) {
    return {
      dates: [],
      labels: [],
      caloriesData: { actual: [], goal: [] },
      macrosData: { protein: [], carbs: [], fats: [] },
      waterData: { actual: [], goal: [] },
      weightData: []
    };
  }
  
  // For weekly data, ensure days are in correct order (Monday to Sunday)
  if (rangeType === 'weekly' && responseData.dates.some((date: string) => ENGLISH_DAYS.includes(date))) {
    // Create a map of day abbreviations to their correct index in the week
    const dayOrder: {[key: string]: number} = {
      'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
    };
    
    // Get all data fields with their indices
    let combinedData: {index: number; date: string; values: {[key: string]: any}}[] = 
      responseData.dates.map((date: string, index: number) => ({
        index,
        date,
        values: {
          calActual: responseData.calories?.actual?.[index] || 0,
          calGoal: responseData.calories?.goal?.[index] || 0,
          protein: responseData.macros?.protein?.[index] || 0,
          carbs: responseData.macros?.carbs?.[index] || 0,
          fats: responseData.macros?.fats?.[index] || 0,
          waterActual: responseData.water?.actual?.[index] || 0,
          waterGoal: responseData.water?.goal?.[index] || 0,
          weight: responseData.weight?.[index] || null
        }
      }));
    
    // Sort by day order for day abbreviations
    combinedData = combinedData.sort((a, b) => {
      // If both are day abbreviations, sort by day order
      if (ENGLISH_DAYS.includes(a.date) && ENGLISH_DAYS.includes(b.date)) {
        return dayOrder[a.date] - dayOrder[b.date];
      }
      
      // If they're proper dates, sort chronologically
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA.getTime() - dateB.getTime();
      }
      
      return a.index - b.index;
    });
    
    // Recreate all arrays in the sorted order
    const dates = combinedData.map(item => item.date);
    const labels = dates.map((date: string) => formatDateLabel(date, rangeType));
    
    return {
      dates,
      labels,
      caloriesData: {
        actual: combinedData.map(item => item.values.calActual),
        goal: combinedData.map(item => item.values.calGoal)
      },
      macrosData: {
        protein: combinedData.map(item => item.values.protein),
        carbs: combinedData.map(item => item.values.carbs),
        fats: combinedData.map(item => item.values.fats)
      },
      waterData: {
        actual: combinedData.map(item => item.values.waterActual),
        goal: combinedData.map(item => item.values.waterGoal)
      },
      weightData: combinedData.map(item => item.values.weight)
    };
  }
  
  // Define type for date objects
  type DateObject = {
    date: string;
    index: number;
    values: {
      calActual: number;
      calGoal: number;
      protein: number;
      carbs: number;
      fats: number;
      waterActual: number;
      waterGoal: number;
      weight: number | null;
    }
  };
  
  // For non-weekly data or when dates are not day abbreviations
  // Sort dates in chronological order
  const dateObjects = responseData.dates.map((date: string, index: number) => ({
    date,
    index,
    values: {
      calActual: responseData.calories?.actual?.[index] || 0,
      calGoal: responseData.calories?.goal?.[index] || 0,
      protein: responseData.macros?.protein?.[index] || 0,
      carbs: responseData.macros?.carbs?.[index] || 0,
      fats: responseData.macros?.fats?.[index] || 0,
      waterActual: responseData.water?.actual?.[index] || 0,
      waterGoal: responseData.water?.goal?.[index] || 0,
      weight: responseData.weight?.[index] || null
    }
  }));
  
  dateObjects.sort((a: DateObject, b: DateObject) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return dateA.getTime() - dateB.getTime();
    }
    
    return a.index - b.index;
  });
  
  const dates = dateObjects.map((obj: DateObject) => obj.date);
  const labels = dates.map((date: string) => formatDateLabel(date, rangeType));
  
  return {
    dates,
    labels,
    caloriesData: {
      actual: dateObjects.map((obj: DateObject) => obj.values.calActual),
      goal: dateObjects.map((obj: DateObject) => obj.values.calGoal)
    },
    macrosData: {
      protein: dateObjects.map((obj: DateObject) => obj.values.protein),
      carbs: dateObjects.map((obj: DateObject) => obj.values.carbs),
      fats: dateObjects.map((obj: DateObject) => obj.values.fats)
    },
    waterData: {
      actual: dateObjects.map((obj: DateObject) => obj.values.waterActual),
      goal: dateObjects.map((obj: DateObject) => obj.values.waterGoal)
    },
    weightData: dateObjects.map((obj: DateObject) => obj.values.weight)
  };
};

  // Fetch weekly statistics
  const fetchWeeklyStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }
      
      const endpoint = planMode === 'weeklyPlan' 
        ? `https://${ipv4Data.ipv4_address}/api/tracker/statistics/weekly/`
        : `https://${ipv4Data.ipv4_address}/api/tracker/statistics/weekly/manual/`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWeeklyData(processTimeRangeData(response.data, 'weekly'));
    } catch (error) {
      console.error('Haftalık istatistikler alınırken hata oluştu:', error);
      Alert.alert('Hata', 'İstatistikler alınamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  }, [planMode]);

  // Fetch monthly statistics
  const fetchMonthlyStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }
      
      try {
        const endpoint = planMode === 'weeklyPlan' 
          ? `https://${ipv4Data.ipv4_address}/api/tracker/statistics/monthly/`
          : `https://${ipv4Data.ipv4_address}/api/tracker/statistics/monthly/manual/`;
        
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setMonthlyData(processTimeRangeData(response.data, 'monthly'));
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          Alert.alert('Bilgi', 'Aylık istatistik özelliği henüz hazır değil. Çok yakında eklenecektir.');
        } else {
          throw error;
        }
        
        // Set empty data for monthly view to prevent crashes
        setMonthlyData({
          dates: [],
          labels: [],
          caloriesData: { actual: [], goal: [] },
          macrosData: { protein: [], carbs: [], fats: [] },
          waterData: { actual: [], goal: [] },
          weightData: []
        });
      }
    } catch (error) {
      console.error('Aylık istatistikler alınırken hata oluştu:', error);
      Alert.alert('Hata', 'İstatistikler alınamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  }, [planMode]);

  // Fetch data based on selected time range
  const fetchData = useCallback(() => {
    switch (timeRange) {
      case 'daily': fetchDailyStats(); break;
      case 'weekly': fetchWeeklyStats(); break;
      case 'monthly': fetchMonthlyStats(); break;
    }
  }, [timeRange, fetchDailyStats, fetchWeeklyStats, fetchMonthlyStats]);

  // Load data when component mounts or time range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data on navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Also refresh plan mode on focus
      const refreshPlanMode = async () => {
        const mode = await getPlanMode();
        if (mode !== planMode) {
          setPlanMode(mode);
        }
      };
      
      refreshPlanMode();
      fetchData();
    });
    
    return unsubscribe;
  }, [navigation, fetchData, planMode]);

  // Prepare macros data for pie chart
  const prepareMacrosData = () => {
    if (!dailyStats || !dailyStats.totals) return [];
    
    const proteinValue = dailyStats.totals.protein.actual || 0;
    const carbsValue = dailyStats.totals.carbs.actual || 0;
    const fatsValue = dailyStats.totals.fats.actual || 0;
    
    // Default data if all values are 0
    if (proteinValue === 0 && carbsValue === 0 && fatsValue === 0) {
      return [
        { name: 'Protein', value: 1, color: '#468f5d', legendFontColor: '#212529', legendFontSize: 15 },
        { name: 'Karbonhidrat', value: 1, color: '#ff9e43', legendFontColor: '#212529', legendFontSize: 15 },
        { name: 'Yağ', value: 1, color: '#4e73df', legendFontColor: '#212529', legendFontSize: 15 }
      ];
    }
    
    return [
      { name: 'Protein', value: proteinValue, color: '#468f5d', legendFontColor: '#212529', legendFontSize: 15 },
      { name: 'Karbonhidrat', value: carbsValue, color: '#ff9e43', legendFontColor: '#212529', legendFontSize: 15 },
      { name: 'Yağ', value: fatsValue, color: '#4e73df', legendFontColor: '#212529', legendFontSize: 15 }
    ];
  };

  // Prepare calories data for custom bar chart
  const prepareCaloriesChartData = () => {
    const data = timeRange === 'monthly' ? monthlyData : weeklyData;
    
    if (!data || !data.labels || data.labels.length === 0) {
      return { 
        dates: [],
        labels: ['Veri Yok'],
        datasets: [{ data: [0] }],
        colors: ['#468f5d']
      };
    }
    
    // Process values
    const actualValues = data.caloriesData.actual.map(val => 
      isNaN(val) ? 0 : Math.round(val * 10) / 10
    );
    
    const goalValues = data.caloriesData.goal.map(val => 
      isNaN(val) ? 0 : Math.round(val * 10) / 10
    );
    
    // Colors based on goal comparison
    const colors = actualValues.map((val, index) => 
      val > goalValues[index] ? '#f44336' : '#468f5d'
    );
    
    return {
      dates: data.dates,
      labels: data.labels,
      datasets: [{ data: actualValues }],
      colors: colors
    };
  };

  // Prepare water data for custom bar chart
  const prepareWaterChartData = () => {
    const data = timeRange === 'monthly' ? monthlyData : weeklyData;
    
    if (!data || !data.waterData || !data.labels || data.labels.length === 0) {
      return { 
        dates: [],
        labels: ['Veri Yok'],
        datasets: [{ data: [0] }],
        colors: ['#A5D8FF']
      };
    }
    
    // Process values
    const actualValues = data.waterData.actual.map(val => 
      isNaN(val) ? 0 : Math.round(val * 10) / 10
    );
    
    // Highlight days with good water intake
    const colors = actualValues.map(val => 
      val >= 2000 ? '#2196F3' : '#A5D8FF'
    );
    
    return {
      dates: data.dates,
      labels: data.labels,
      datasets: [{ data: actualValues }],
      colors: colors
    };
  };

  // Prepare weight data for line chart
  const prepareWeightChartData = () => {
    const data = timeRange === 'monthly' ? monthlyData : weeklyData;
    
    if (!data || !data.weightData || !data.labels) {
      return { 
        labels: ['Veri Yok'],
        datasets: [{ data: [0] }]
      };
    }
    
    // Filter out null values
    const validWeights: number[] = [];
    const validLabels: string[] = [];
    
    data.weightData.forEach((weight, index) => {
      if (weight !== null && !isNaN(Number(weight)) && index < data.labels.length) {
        validWeights.push(Math.round(Number(weight) * 10) / 10);
        validLabels.push(data.labels[index]);
      }
    });
    
    if (validWeights.length === 0) {
      return {
        labels: ['Veri Yok'],
        datasets: [{ data: [0] }]
      };
    }
    
    return {
      labels: validLabels,
      datasets: [{
        data: validWeights,
        color: (opacity = 1) => `rgba(70, 143, 93, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Get total values for each macro to calculate percentages
  const getMacroPercentages = () => {
    if (!dailyStats || !dailyStats.totals) {
      return { protein: 0, carbs: 0, fat: 0 };
    }
    
    const protein = dailyStats.totals.protein.actual || 0;
    const carbs = dailyStats.totals.carbs.actual || 0;
    const fat = dailyStats.totals.fats.actual || 0;
    
    const total = protein + carbs + fat;
    
    if (total === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }
    
    return {
      protein: Math.round((protein / total) * 100),
      carbs: Math.round((carbs / total) * 100),
      fat: Math.round((fat / total) * 100)
    };
  };

  // Info modal component
  const InfoModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={infoModalVisible}
      onRequestClose={() => setInfoModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>İstatistikler Hakkında</Text>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.tipContainer}>
              <Ionicons name="time-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Günlük, haftalık ve aylık görünümler arasında geçiş yapabilirsiniz
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="stats-chart-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Kalori takibi, besin değerleri ve makro dağılımını görüntüleyebilirsiniz
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="trending-up-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Grafikler ile zaman içindeki değişimi kolayca takip edebilirsiniz
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="nutrition-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Makro besin dağılımınızı pasta grafiği ile analiz edebilirsiniz
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="water-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Su tüketim takibinizi günlük ve haftalık olarak inceleyebilirsiniz
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="fitness-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Tüm verilerinizi bir arada görerek beslenme alışkanlıklarınızı iyileştirebilirsiniz
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setInfoModalVisible(false)}
          >
            <Text style={styles.modalCloseButtonText}>Anladım</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Selected bar value modal
  const SelectedBarModal = () => {
    if (!selectedBar) return null;
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedBarModal}
        onRequestClose={() => setSelectedBarModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setSelectedBarModal(false)}
        >
          <View style={styles.barValueModal}>
            <Text style={styles.barValueDate}>{formatDateForDisplay(selectedBar.date)}</Text>
            <Text style={styles.barValueTitle}>{selectedBar.label}</Text>
            <Text style={styles.barValueAmount}>
              {selectedBar.value} {selectedBar.label === 'Su' ? 'ml' : 'kcal'}
            </Text>
            <TouchableOpacity 
              style={styles.barValueCloseButton}
              onPress={() => setSelectedBarModal(false)}
            >
              <Text style={styles.barValueCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Macro details modal component
  const MacroDetailsModal = () => {
    const percentages = getMacroPercentages();
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={macroDetailsVisible}
        onRequestClose={() => setMacroDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Makro Besinler</Text>
            
            <View style={styles.macroDetailsContainer}>
              {/* Protein */}
              <View style={styles.macroDetailItem}>
                <View style={[styles.macroDetailIcon, { backgroundColor: '#468f5d' }]} />
                <View style={styles.macroDetailInfo}>
                  <Text style={styles.macroDetailTitle}>Protein</Text>
                  <Text style={styles.macroDetailValue}>
                    {formatNumber(dailyStats?.totals.protein.actual || 0)}g/{formatNumber(dailyStats?.totals.protein.goal || 0)}g
                  </Text>
                  <View style={styles.macroProgressBar}>
                    <View style={[
                      styles.macroProgressFill,
                      { 
                        width: `${calculatePercentage(
                          dailyStats?.totals.protein.actual || 0, 
                          dailyStats?.totals.protein.goal || 0
                        )}%`,
                        backgroundColor: '#468f5d'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroDetailPercent}>{percentages.protein}% toplam makrodan</Text>
                </View>
              </View>
              
              {/* Carbs */}
              <View style={styles.macroDetailItem}>
                <View style={[styles.macroDetailIcon, { backgroundColor: '#ff9e43' }]} />
                <View style={styles.macroDetailInfo}>
                  <Text style={styles.macroDetailTitle}>Karbonhidrat</Text>
                  <Text style={styles.macroDetailValue}>
                    {formatNumber(dailyStats?.totals.carbs.actual || 0)}g/{formatNumber(dailyStats?.totals.carbs.goal || 0)}g
                  </Text>
                  <View style={styles.macroProgressBar}>
                    <View style={[
                      styles.macroProgressFill,
                      { 
                        width: `${calculatePercentage(
                          dailyStats?.totals.carbs.actual || 0, 
                          dailyStats?.totals.carbs.goal || 0
                        )}%`,
                        backgroundColor: '#ff9e43'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroDetailPercent}>{percentages.carbs}% toplam makrodan</Text>
                </View>
              </View>
              
              {/* Fat */}
              <View style={styles.macroDetailItem}>
                <View style={[styles.macroDetailIcon, { backgroundColor: '#4e73df' }]} />
                <View style={styles.macroDetailInfo}>
                  <Text style={styles.macroDetailTitle}>Yağ</Text>
                  <Text style={styles.macroDetailValue}>
                    {formatNumber(dailyStats?.totals.fats.actual || 0)}g/{formatNumber(dailyStats?.totals.fats.goal || 0)}g
                  </Text>
                  <View style={styles.macroProgressBar}>
                    <View style={[
                      styles.macroProgressFill,
                      { 
                        width: `${calculatePercentage(
                          dailyStats?.totals.fats.actual || 0, 
                          dailyStats?.totals.fats.goal || 0
                        )}%`,
                        backgroundColor: '#4e73df'
                      }
                    ]} />
                  </View>
                  <Text style={styles.macroDetailPercent}>{percentages.fat}% toplam makrodan</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMacroDetailsVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const getCurrentData = () => {
    switch(timeRange) {
      case 'daily': return dailyStats;
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      default: return null;
    }
  };

  const hasData = () => {
    const data = getCurrentData();
    return data !== null && Object.keys(data || {}).length > 0;
  };

  // Render custom bar chart for calories or water
  const renderCustomBarChart = (chartData: any, title: string, unit: string, isWater: boolean = false) => {
    if (!chartData || !chartData.labels || !chartData.datasets) {
      return <View style={styles.noDataChart}><Text>Veri yok</Text></View>;
    }

    const { dates, labels, datasets, colors } = chartData;
    const data = datasets[0].data;
    const barColors = colors || Array(data.length).fill('#468f5d');
    
    // Find max value for scaling
    const maxValue = Math.max(...data) * 1.1 || 1; // Avoid division by zero
    
    // Handle bar tap
    const handleBarTap = (value: number, label: string, index: number) => {
      setSelectedBar({
        value: value,
        label: isWater ? 'Su' : 'Kalori',
        date: dates[index] || ''
      });
      setSelectedBarModal(true);
    };
    
    return (
      <View style={styles.customChartContainer}>
        {/* Y-axis labels - Highest value at TOP */}
        <View style={styles.yAxisContainer}>
          <Text style={styles.yAxisLabel}>{Math.round(maxValue)} {unit}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxValue/2)} {unit}</Text>
          <Text style={styles.yAxisLabel}>0 {unit}</Text>
        </View>
        
        {/* Bars container */}
        <View style={styles.barsContainer}>
          {data.map((value: number, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.barColumn}
              activeOpacity={0.7}
              onPress={() => handleBarTap(value, isWater ? 'Su' : 'Kalori', index)}
            >
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${(value / maxValue) * 100}%`,
                      backgroundColor: barColors[index]
                    }
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{labels[index]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Plan mode indicator component
  const PlanModeIndicator = () => (
    <View style={styles.planModeIndicator}>
      <Text style={styles.planModeText}>
        {planMode === 'weeklyPlan' ? 'Haftalık Plan Modu' : 'Manuel Takip Modu'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <InfoModal />
      <MacroDetailsModal />
      <SelectedBarModal />
      
      <View style={styles.header}>

        <Text style={styles.headerText}>İstatistikler</Text>
        <TouchableOpacity 
          style={styles.rightIconContainer}
          onPress={() => setInfoModalVisible(true)}
        >
          <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Plan Mode Indicator */}
      <PlanModeIndicator />

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
            style={[
          styles.timeRangeButton, 
          timeRange === 'daily' && styles.activeTimeRangeButton
            ]}
            onPress={() => setTimeRange('daily')}
          >
            <Text style={[
          styles.timeRangeButtonText,
          timeRange === 'daily' && styles.activeTimeRangeButtonText
            ]}>Günlük</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
          styles.timeRangeButton, 
          timeRange === 'weekly' && styles.activeTimeRangeButton
            ]}
            onPress={() => setTimeRange('weekly')}
          >
            <Text style={[
          styles.timeRangeButtonText,
          timeRange === 'weekly' && styles.activeTimeRangeButtonText
            ]}>Haftalık</Text>
          </TouchableOpacity>
        </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#468f5d" />
          <Text style={styles.loaderText}>İstatistikler yükleniyor...</Text>
        </View>
      ) : !hasData() ? (
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={60} color="#a9a9a9" />
          <Text style={styles.noDataText}>Bu dönem için veri bulunmuyor</Text>
          <Text style={styles.noDataSubText}>Daha fazla takip yapmanız halinde istatistikleriniz burada gösterilecektir</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {/* Daily View */}
          {timeRange === 'daily' && dailyStats && (
            <>
              {/* Calories Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Günlük Kalori</Text>
                
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Alınan</Text>
                    <Text style={styles.statValue}>{formatNumber(dailyStats.totals.calories.actual)}</Text>
                    <Text style={styles.statUnit}>kcal</Text>
                  </View>
                  
                  <View style={styles.verticalDivider} />
                  
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Hedef</Text>
                    <Text style={styles.statValue}>{formatNumber(dailyStats.totals.calories.goal)}</Text>
                    <Text style={styles.statUnit}>kcal</Text>
                  </View>
                  
                  <View style={styles.verticalDivider} />
                  
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Kalan</Text>
                    <Text style={styles.statValue}>
                      {formatNumber(Math.max(0, dailyStats.totals.calories.goal - dailyStats.totals.calories.actual))}
                    </Text>
                    <Text style={styles.statUnit}>kcal</Text>
                  </View>
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${calculatePercentage(
                            dailyStats.totals.calories.actual, 
                            dailyStats.totals.calories.goal
                          )}%` 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {calculatePercentage(
                      dailyStats.totals.calories.actual, 
                      dailyStats.totals.calories.goal
                    )}% Tamamlandı
                  </Text>
                </View>
              </View>
              
              {/* Simplified Macro Nutrients Card - Clickable */}
              <TouchableOpacity 
                style={styles.card}
                onPress={() => setMacroDetailsVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>Makro Besinler</Text>
                
                <View style={styles.compactMacroContainer}>
                  {/* Pie Chart with no legend - fixed positioning */}
                  <View style={styles.compactPieContainer}>
                    <PieChart
                      data={prepareMacrosData()}
                      width={screenWidth * 0.4}
                      height={130}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      }}
                      accessor="value"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      center={[15, 0]}
                      absolute={false}
                      hasLegend={false}
                    />
                  </View>
                  
                  <View style={styles.macroIndicators}>
                    <View style={styles.macroIndicator}>
                      <View style={[styles.indicatorDot, { backgroundColor: '#468f5d' }]} />
                      <Text style={styles.indicatorLabel}>Protein</Text>
                      <Text style={styles.indicatorValue}>{getMacroPercentages().protein}%</Text>
                    </View>
                    
                    <View style={styles.macroIndicator}>
                      <View style={[styles.indicatorDot, { backgroundColor: '#ff9e43' }]} />
                      <Text style={styles.indicatorLabel}>Karbonhidrat</Text>
                      <Text style={styles.indicatorValue}>{getMacroPercentages().carbs}%</Text>
                    </View>
                    
                    <View style={styles.macroIndicator}>
                      <View style={[styles.indicatorDot, { backgroundColor: '#4e73df' }]} />
                      <Text style={styles.indicatorLabel}>Yağ</Text>
                      <Text style={styles.indicatorValue}>{getMacroPercentages().fat}%</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.tapForDetails}>Detaylar için dokun</Text>
              </TouchableOpacity>
              
              {/* Water Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Su Tüketimi</Text>
                
                <View style={styles.waterStatsContainer}>
                  <View style={styles.waterIconContainer}>
                    <Ionicons name="water" size={50} color="#7cccff" />
                  </View>
                  
                  <View style={styles.waterStats}>
                    <Text style={styles.waterStatsText}>
                      <Text style={styles.waterValue}>{formatNumber(dailyStats.totals.water.actual)}</Text>
                      <Text style={styles.waterUnit}> ml</Text>
                    </Text>
                    
                    <Text style={styles.waterGoalText}>
                      Hedef: {formatNumber(dailyStats.totals.water.goal)} ml
                    </Text>
                    
                    <View style={styles.waterProgressContainer}>
                      <View style={styles.waterProgressBar}>
                        <View 
                          style={[
                            styles.waterProgressFill, 
                            { 
                              width: `${calculatePercentage(
                                dailyStats.totals.water.actual, 
                                dailyStats.totals.water.goal
                              )}%` 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.waterProgressText}>
                        {calculatePercentage(
                          dailyStats.totals.water.actual, 
                          dailyStats.totals.water.goal
                        )}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
          
          {/* Weekly/Monthly View */}
          {(timeRange === 'weekly' || timeRange === 'monthly') && (
            <>
              {/* Custom Bar Chart for Calories */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {timeRange === 'weekly' ? 'Haftalık' : 'Aylık'} Kalori Takibi
                </Text>
                
                {renderCustomBarChart(
                  prepareCaloriesChartData(), 
                  '', 
                  'kcal'
                )}
              </View>
              
              {/* Custom Bar Chart for Water */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {timeRange === 'weekly' ? 'Haftalık' : 'Aylık'} Su Takibi
                </Text>
                
                {renderCustomBarChart(
                  prepareWaterChartData(), 
                  '', 
                  'L',
                  true
                )}
              </View>
              
              {/* Weight Chart Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {timeRange === 'weekly' ? 'Haftalık' : 'Aylık'} Kilo Takibi
                </Text>
                
                <View style={styles.chartContainer}>
                  {((timeRange === 'weekly' ? weeklyData : monthlyData)?.weightData || []).some(w => w !== null) ? (
                    <LineChart
                      data={prepareWeightChartData()}
                      width={screenWidth - 40}
                      height={180}
                      chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(70, 143, 93, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                          borderRadius: 16
                        },
                        propsForDots: {
                          r: '5',
                          strokeWidth: '2',
                          stroke: '#468f5d'
                        }
                      }}
                      bezier
                      style={styles.chart}
                      yAxisSuffix=" kg"
                      withInnerLines={false}
                    />
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Ionicons name="scale-outline" size={40} color="#a9a9a9" />
                      <Text style={styles.noDataText}>
                        Henüz kilo verisi bulunmuyor
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingBottom: 10,
    backgroundColor: '#468f5d',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    padding: 4,
    borderRadius: 20,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    padding: 4,
    borderRadius: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 5,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTimeRangeButton: {
    backgroundColor: '#e9f5ee',
  },
  timeRangeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeTimeRangeButtonText: {
    color: '#468f5d',
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#212529',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#468f5d',
  },
  statUnit: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#dee2e6',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#468f5d',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
  },
  compactMacroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  compactPieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth * 0.38,
  },
  macroIndicators: {
    flex: 1,
    marginLeft: -10,
  },
  macroIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  indicatorLabel: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  tapForDetails: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  waterStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterIconContainer: {
    backgroundColor: '#e9f5ee',
    padding: 15,
    borderRadius: 50,
    marginRight: 16,
  },
  waterStats: { flex: 1 },
  waterStatsText: { marginBottom: 4 },
  waterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#468f5d',
  },
  waterUnit: {
    fontSize: 16,
    color: '#468f5d',
  },
  waterGoalText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  waterProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: '#7cccff',
    borderRadius: 4,
  },
  waterProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#468f5d',
    width: 40,
    textAlign: 'right',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  customChartContainer: {
    flexDirection: 'row',
    height: 220,
    marginVertical: 10,
    paddingRight: 10,
    paddingLeft: 5,
  },
  yAxisContainer: {
    width: 60,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  yAxisLabel: {
    color: '#6c757d',
    fontSize: 12,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    position: 'relative',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  barWrapper: {
    height: 180,
    justifyContent: 'flex-end',
    width: '100%',
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 5,
    alignSelf: 'center',
  },
  barLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#6c757d',
  },
  noDataChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  noDataSubText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  barValueModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    minWidth: 200,
  },
  barValueDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  barValueTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  barValueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#468f5d',
    marginBottom: 15,
  },
  barValueCloseButton: {
    backgroundColor: '#468f5d',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  barValueCloseText: {
    color: 'white',
    fontWeight: '600',
  },
  macroDetailsContainer: {
    marginVertical: 10,
  },
  macroDetailItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  macroDetailIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
    marginTop: 3,
  },
  macroDetailInfo: {
    flex: 1,
  },
  macroDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  macroDetailValue: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
  },
  macroProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroDetailPercent: {
    fontSize: 12,
    color: '#6c757d',
  },
  planModeIndicator: {
    backgroundColor: '#e9f5ee',
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  planModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#468f5d',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#468f5d',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 5,
  },
  tipText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#468f5d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default Statistics;