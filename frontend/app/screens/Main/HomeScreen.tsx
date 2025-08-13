// app/screens/Main/HomeScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CircularProgress from 'react-native-circular-progress-indicator';
import {
  useNavigation,
  CompositeNavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { HomeStackParamList, MainTabParamList } from '../../navigation/MainNavigator';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ipv4Data from '../../../assets/ipv4_address.json';
import { getPlanMode, savePlanMode, PlanMode } from '../../utils/planModeStorage';
import axios from 'axios';

// ---------------------
// Type Definitions (copied from MealChooseScreen)
type Food = {
  id: number;
  name: string;
  portion_type: string;
  portion_count: number;
  portion_metric_unit: string;
  portion_metric: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  consumed: boolean;
  tarif?: string;
  ana_bilesenler?: string;
};

type Meal = {
  id: number;
  name: string;
  displayed_name: string;
  order: number;
  meal_time: string;
  consumed: boolean;
  foods: Food[];
};

type DailyTotal = {
  calorie: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

type Day = {
  id: number;
  day_number: number;
  date: string;
  meals: Meal[];
  daily_total: DailyTotal;
};

type MealPlan = {
  id: number;
  user: number;
  week_start_date: string;
  created_at: string;
  days: Day[];
};

type KcalEntry = {
  id: number;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

// ---------------------
// Navigation type
type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'Home'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// ---------------------
// HomeScreen Component
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Global states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Mode: 'mealPlan' OR 'kcalTracking'
  const [selectedMode, setSelectedMode] = useState<'mealPlan' | 'kcalTracking'>('mealPlan');
  const [planMode, setPlanMode] = useState<PlanMode>('weeklyPlan');

  // Add modal visibility state
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // MealPlan mode states
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [displayDays, setDisplayDays] = useState<Day[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Manuel tracking mode states
  const [kcalByDate, setKcalByDate] = useState<Record<string, KcalEntry[]>>({});
  const [kcalSelectedDayIndex, setKcalSelectedDayIndex] = useState<number>(0);

  // User goals
  const [calorieGoal, setCalorieGoal] = useState<number>(2000);
  const [proteinGoal, setProteinGoal] = useState<number>(100);
  const [carbsGoal, setCarbsGoal] = useState<number>(250);
  const [fatsGoal, setFatsGoal] = useState<number>(70);
  const [waterGoal, setWaterGoal] = useState<number>(2500);

  // Add survey completion state
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  // ---------------------
  // Load manual tracking data
  const loadStoredKcal = async () => {
    try {
      const storedJson = await AsyncStorage.getItem('kcalByDate');
      if (storedJson) {
        setKcalByDate(JSON.parse(storedJson));
      }
    } catch (err) {
      console.log('loadStoredKcal error:', err);
    }
  };

  // ---------------------
  // Load entries from backend
  const loadEntriesFromBackend = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;

      const response = await axios.get(`http://${ipv4Data.ipv4_address}:8000/api/mealgpt/manual-entries/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setKcalByDate(response.data.entries);
        // Also update AsyncStorage
        await AsyncStorage.setItem('kcalByDate', JSON.stringify(response.data.entries));
      }
    } catch (error) {
      console.error('Load entries error:', error);
      // Fallback to AsyncStorage if API fails
      loadStoredKcal();
    }
  };

  // ---------------------
  // Fetch user goals
  const fetchUserGoals = async (retryCount = 0) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        console.error('No token found');
        return null;
      }

      const response = await axios.get(
        `http://${ipv4Data.ipv4_address}:8000/api/tracker/goals/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log("Goals data received:", JSON.stringify(response.data));

      // Check if we received proper data or if it's still default values
      const customGoals = response.data.custom;
      const recommendedGoals = response.data.recommended;
      
      // If we got default values and we haven't retried too many times, retry
      if (retryCount < 3 && 
          customGoals.daily_calorie === 2000 && 
          customGoals.protein === 100 && 
          customGoals.carbs === 250 && 
          customGoals.fats === 70) {
        console.log(`Got default values, retrying... (${retryCount + 1})`);
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchUserGoals(retryCount + 1);
      }
      
      // Determine which goals to use - custom if manually set, otherwise recommended
      const goalsToUse = customGoals;
      
      return {
        calories: goalsToUse.daily_calorie,
        protein: goalsToUse.protein,
        carbs: goalsToUse.carbs,
        fats: goalsToUse.fats,
        water: goalsToUse.water_goal
      };
    } catch (error) {
      console.error('Error fetching goals:', error);
      // Return default values if there's an error
      return {
        calories: 2000,
        protein: 100,
        carbs: 250,
        fats: 70,
        water: 2500
      };
    }
  };

  // ---------------------
  // Fetch mealPlan from backend
  const fetchMealPlan = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('No token');
      const resp = await fetch(`http://${ipv4Data.ipv4_address}:8000/api/mealplan/get-meal-plan/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 404) {
        setMealPlan(null);
      } else if (!resp.ok) {
        throw new Error('MealPlan fetch error');
      } else {
        const data: MealPlan = await resp.json();
        setMealPlan(data);
      }
    } catch (err) {
      console.log('fetchMealPlan error:', err);
      setMealPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------
  // Sort days and auto-select the current day
  useEffect(() => {
    if (!mealPlan) return;
    const sorted = [...mealPlan.days].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setDisplayDays(sorted);
    let autoIndex = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].date >= todayStr) {
        autoIndex = i;
        break;
      }
    }
    setSelectedDayIndex(autoIndex);
    setKcalSelectedDayIndex(autoIndex);
  }, [mealPlan]);

  // ---------------------
  // Helper: Calculate consumed macros (for mealPlan mode)
  const getConsumedMacros = (dayObj: Day) => {
    let cal = 0, pr = 0, cb = 0, ft = 0;
    dayObj.meals.forEach((m) => {
      m.foods.forEach((f) => {
        if (f.consumed) {
          cal += f.calories;
          pr += f.protein;
          cb += f.carbs;
          ft += f.fats;
        }
      });
    });
    return { cal, pr, cb, ft };
  };

  // ---------------------
  // Compute sums for manual tracking mode
  const activeKcalDayObj = useMemo(() => {
    if (mealPlan && displayDays.length > 0) return displayDays[kcalSelectedDayIndex];
    // Fallback: create 7 days from today
    const arr: Day[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date();
      dd.setDate(dd.getDate() + i);
      arr.push({
        id: 50000 + i,
        day_number: i + 1,
        date: dd.toISOString().split('T')[0],
        meals: [],
        daily_total: { calorie: 0, protein: 0, carbohydrate: 0, fat: 0 },
      });
    }
    return arr[kcalSelectedDayIndex];
  }, [mealPlan, displayDays, kcalSelectedDayIndex]);

  const activeDate = activeKcalDayObj ? activeKcalDayObj.date : '';
  const currentKcalList = kcalByDate[activeDate] || [];
  const sumCalories = currentKcalList.reduce((acc, e) => acc + e.calories, 0);
  const sumProtein = currentKcalList.reduce((acc, e) => acc + e.protein, 0);
  const sumCarbs = currentKcalList.reduce((acc, e) => acc + e.carbs, 0);
  const sumFats = currentKcalList.reduce((acc, e) => acc + e.fats, 0);

  // ---------------------
  // Auto-refresh when screen regains focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        // Load plan mode
        const mode = await getPlanMode();
        setPlanMode(mode);
        setSelectedMode(mode === 'weeklyPlan' ? 'mealPlan' : 'kcalTracking');
        
        // Fetch custom goals on every screen focus
        const userGoals = await fetchUserGoals();
        if (userGoals) {
          setCalorieGoal(userGoals.calories);
          setProteinGoal(userGoals.protein);
          setCarbsGoal(userGoals.carbs);
          setFatsGoal(userGoals.fats);
          setWaterGoal(userGoals.water);
        }

        // Load data based on selected mode
        if (mode === 'weeklyPlan') {
          fetchMealPlan();
        } else {
          loadEntriesFromBackend();
        }
      };

      loadData();
    }, [])
  );

  // ---------------------
  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    if (selectedMode === 'mealPlan') {
      fetchMealPlan().then(() => setRefreshing(false));
    } else {
      loadEntriesFromBackend().then(() => setRefreshing(false));
    }
  };

  // ---------------------
  // Call fetchUserGoals in useEffect
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const userGoals = await fetchUserGoals();
        if (userGoals) {
          setCalorieGoal(userGoals.calories);
          setProteinGoal(userGoals.protein);
          setCarbsGoal(userGoals.carbs);
          setFatsGoal(userGoals.fats);
          setWaterGoal(userGoals.water);
        }
        // Fetch other data...
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // ---------------------
  // Detect survey completion and refresh goals
  useEffect(() => {
    // Create a focus listener to detect when user returns from survey
    const unsubscribe = navigation.addListener('focus', async () => {
      // Check for a flag indicating survey was just completed
      const justCompletedSurvey = await AsyncStorage.getItem('justCompletedSurvey');
      if (justCompletedSurvey === 'true') {
        console.log('Survey was just completed, refreshing goals...');
        setSurveyCompleted(true);
        
        // Clear the flag
        await AsyncStorage.setItem('justCompletedSurvey', 'false');
        
        // Wait a moment to ensure backend has processed the survey
        setTimeout(async () => {
          const userGoals = await fetchUserGoals();
          if (userGoals) {
            setCalorieGoal(userGoals.calories);
            setProteinGoal(userGoals.protein);
            setCarbsGoal(userGoals.carbs);
            setFatsGoal(userGoals.fats);
            setWaterGoal(userGoals.water);
          }
          setSurveyCompleted(false);
        }, 1500);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // ---------------------
  // Render Kcal Bar for mealPlan mode
  const renderKcalBarMealPlan = (dayObj: Day, dt: DailyTotal, consumedDay: any) => {
    const ratio = dt.calorie ? consumedDay.cal / dt.calorie : 0;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const barWidth = clamped * 100;
    return (
      <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <Text style={styles.kcalLabel}>
          {Math.round(consumedDay.cal)} / {Math.round(dt.calorie)} kcal{'  '}
          <MaterialCommunityIcons name="fire" size={16} color="#f44336" />
        </Text>
        <View style={styles.kcalBarBackground}>
          <View style={[styles.kcalBarFill, { width: `${barWidth}%` }]} />
        </View>
      </View>
    );
  };

  // Render Kcal Bar for manual tracking mode
  const renderKcalBarManualTracking = (totalCals: number) => {
    // Use the dynamic calorieGoal instead of hardcoded value
    const ratio = totalCals / calorieGoal;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const barWidth = clamped * 100;
    return (
      <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <Text style={styles.kcalLabel}>
          {Math.round(totalCals)} / {calorieGoal} kcal{'  '}
          <MaterialCommunityIcons name="fire" size={16} color="#f44336" />
        </Text>
        <View style={styles.kcalBarBackground}>
          <View style={[styles.kcalBarFill, { width: `${barWidth}%` }]} />
        </View>
      </View>
    );
  };

  // ---------------------
  // If mealPlan is missing in mealPlan mode, show a button to create one.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#468f5d" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {surveyCompleted ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#468f5d" />
          <Text style={{ marginTop: 10 }}>Güncel hedefler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Mode Selection Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Takip Modu Seçin</Text>
                
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    planMode === 'weeklyPlan' && styles.modalOptionSelected
                  ]}
                  onPress={async () => {
                    setPlanMode('weeklyPlan');
                    setSelectedMode('mealPlan');
                    setIsLoading(true);
                    await fetchMealPlan();
                    setModalVisible(false);
                    await savePlanMode('weeklyPlan');
                  }}
                >
                  <Text style={styles.modalOptionText}>Haftalık Plan</Text>
                  {planMode === 'weeklyPlan' && (
                    <Ionicons name="checkmark-circle" size={24} color="#468f5d" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    planMode === 'manualTracking' && styles.modalOptionSelected
                  ]}
                  onPress={async () => {
                    setPlanMode('manualTracking');
                    setSelectedMode('kcalTracking');
                    await loadEntriesFromBackend();
                    setModalVisible(false);
                    await savePlanMode('manualTracking');
                  }}
                >
                  <Text style={styles.modalOptionText}>Manuel Takip</Text>
                  {planMode === 'manualTracking' && (
                    <Ionicons name="checkmark-circle" size={24} color="#468f5d" />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Header with right icon */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.leftIconContainer}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Ana Sayfa</Text>
            
            {/* Add new right icon for mode toggle */}
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="options-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerSeparator} />

          {selectedMode === 'mealPlan' ? (
            // MealPlan Mode
            mealPlan && displayDays.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Günlük Besin Özeti</Text>
                {(() => {
                  const dayObj = displayDays[selectedDayIndex];
                  const consumedDay = getConsumedMacros(dayObj);
                  const dt = dayObj.daily_total;
                  return (
                    <>
                      <View style={styles.nutrientSummaryContainer}>
                        <View style={styles.nutrientItem}>
                          <CircularProgress
                            radius={50}
                            value={consumedDay.pr}
                            maxValue={dt.protein}
                            title="Protein"
                            titleStyle={styles.nutrientTitle}
                            activeStrokeColor="#4caf50"
                            inActiveStrokeColor="#c8e6c9"
                            inActiveStrokeWidth={10}
                            activeStrokeWidth={10}
                            duration={1000}
                            progressValueStyle={styles.circularProgressText}
                            progressValueColor="#000"
                          />
                          <Text style={styles.nutrientValue}>
                            {consumedDay.pr.toFixed(1)} / {dt.protein.toFixed(1)} g
                          </Text>
                        </View>
                        <View style={styles.nutrientItem}>
                          <CircularProgress
                            radius={50}
                            value={consumedDay.cb}
                            maxValue={dt.carbohydrate}
                            title="Karbon"
                            titleStyle={styles.nutrientTitle}
                            activeStrokeColor="#2196f3"
                            inActiveStrokeColor="#bbdefb"
                            inActiveStrokeWidth={10}
                            activeStrokeWidth={10}
                            duration={1000}
                            progressValueStyle={styles.circularProgressText}
                            progressValueColor="#000"
                          />
                          <Text style={styles.nutrientValue}>
                            {consumedDay.cb.toFixed(1)} / {dt.carbohydrate.toFixed(1)} g
                          </Text>
                        </View>
                      </View>
                      <View style={styles.nutrientSummaryContainer}>
                        <View style={styles.nutrientItem}>
                          <CircularProgress
                            radius={50}
                            value={consumedDay.ft}
                            maxValue={dt.fat}
                            title="Yağ"
                            titleStyle={styles.nutrientTitle}
                            activeStrokeColor="#ff9800"
                            inActiveStrokeColor="#ffe0b2"
                            inActiveStrokeWidth={10}
                            activeStrokeWidth={10}
                            duration={1000}
                            progressValueStyle={styles.circularProgressText}
                            progressValueColor="#000"
                          />
                          <Text style={styles.nutrientValue}>
                            {consumedDay.ft.toFixed(1)} / {dt.fat.toFixed(1)} g
                          </Text>
                        </View>
                        <View style={styles.nutrientItem}>
                          <CircularProgress
                            radius={50}
                            value={consumedDay.cal}
                            maxValue={dt.calorie}
                            title="Kalori"
                            titleStyle={styles.nutrientTitle}
                            activeStrokeColor="#468f5d"
                            inActiveStrokeColor="#c8e6c9"
                            inActiveStrokeWidth={10}
                            activeStrokeWidth={10}
                            duration={1000}
                            progressValueStyle={styles.circularProgressText}
                            progressValueColor="#000"
                          />
                          <Text style={styles.nutrientValue}>
                            {consumedDay.cal.toFixed(0)} / {dt.calorie.toFixed(0)} kcal
                          </Text>
                        </View>
                      </View>
                      {renderKcalBarMealPlan(dayObj, dt, consumedDay)}
                    </>
                  );
                })()}
              </View>
            ) : (
              
              <View style={styles.card}>
                <TouchableOpacity onPress={() => navigation.navigate('MealPlanSurveyScreen')}>
                <Text style={styles.cardTitle}>Haftalık Plan Oluştur</Text>
                <Text style={{ textAlign: 'center', padding: 12, color: '#468f5d', fontWeight: '600' }}>
                Size özel haftalık diyet planı oluşturabiliriz veya sağ üst köşedeki seçeneklerden Manuel Takip moduna geçebilirsiniz.
                </Text>
                </TouchableOpacity>
              </View>
            )
          ) : (


          <View style={styles.card}>
            <Text style={styles.cardTitle}>Günlük Besin Özeti (Manuel Takip)</Text>
            <View style={styles.nutrientSummaryContainer}>
              <View style={styles.nutrientItem}>
                <CircularProgress
                  radius={50}
                  value={sumProtein}
                  maxValue={proteinGoal}
                  title="Protein"
                  titleStyle={styles.nutrientTitle}
                  activeStrokeColor="#4caf5d"
                  inActiveStrokeColor="#c8e6c9"
                  inActiveStrokeWidth={10}
                  activeStrokeWidth={10}
                  duration={1000}
                  progressValueStyle={styles.circularProgressText}
                  progressValueColor="#000"
                />
                <Text style={styles.nutrientValue}>
                  {sumProtein.toFixed(1)} / {proteinGoal.toFixed(1)} g
                </Text>
              </View>
              <View style={styles.nutrientItem}>
                <CircularProgress
                  radius={50}
                  value={sumCarbs}
                  maxValue={carbsGoal}
                  title="Karb"
                  titleStyle={styles.nutrientTitle}
                  activeStrokeColor="#2196f3"
                  inActiveStrokeColor="#bbdefb"
                  inActiveStrokeWidth={10}
                  activeStrokeWidth={10}
                  duration={1000}
                  progressValueStyle={styles.circularProgressText}
                  progressValueColor="#000"
                />
                <Text style={styles.nutrientValue}>
                  {sumCarbs.toFixed(1)} / {carbsGoal.toFixed(1)} g
                </Text>
              </View>
            </View>
            <View style={styles.nutrientSummaryContainer}>
              <View style={styles.nutrientItem}>
                <CircularProgress
                  radius={50}
                  value={sumFats}
                  maxValue={fatsGoal}
                  title="Yağ"
                  titleStyle={styles.nutrientTitle}
                  activeStrokeColor="#ff9800"
                  inActiveStrokeColor="#ffe0b2"
                  inActiveStrokeWidth={10}
                  activeStrokeWidth={10}
                  duration={1000}
                  progressValueStyle={styles.circularProgressText}
                  progressValueColor="#000"
                />
                <Text style={styles.nutrientValue}>
                  {sumFats.toFixed(1)} / {fatsGoal.toFixed(1)} g
                </Text>
              </View>
              <View style={styles.nutrientItem}>
                <CircularProgress
                  radius={50}
                  value={sumCalories}
                  maxValue={calorieGoal}
                  title="Kalori"
                  titleStyle={styles.nutrientTitle}
                  activeStrokeColor="#468f5d"
                  inActiveStrokeColor="#c8e6c9"
                  inActiveStrokeWidth={10}
                  activeStrokeWidth={10}
                  duration={1000}
                  progressValueStyle={styles.circularProgressText}
                  progressValueColor="#000"
                />
                <Text style={styles.nutrientValue}>
                  {sumCalories.toFixed(0)} / {calorieGoal.toFixed(0)} kcal
                </Text>
              </View>
            </View>
            {renderKcalBarManualTracking(sumCalories)}
          </View>
          )}

          {/* Quick Actions Card */}
          <View style={styles.card}>
    <Text style={styles.cardTitle}>Hızlı İşlemler</Text>
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={styles.quickActionItem}
        onPress={() => navigation.navigate('ChatStack', { screen: 'Chat' })}
        activeOpacity={0.8}
      >
        <View style={styles.quickActionIcon}>
          <Ionicons name="chatbubbles" size={24} color="#faf3ea" />
        </View>
        <Text style={styles.quickActionText}>Sohbet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionItem}
        onPress={() => navigation.navigate('WeightTracker')}
        activeOpacity={0.8}
      >
        <View style={styles.quickActionIcon}>
          <Ionicons name="scale-outline" size={24} color="#faf3ea" />
        </View>
        <Text style={styles.quickActionText}>Kilo Takibi</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionItem}
        onPress={() => navigation.navigate('WaterTracker')}
        activeOpacity={0.8}
      >
        <View style={styles.quickActionIcon}>
          <Ionicons name="water-outline" size={24} color="#faf3ea" />
        </View>
        <Text style={styles.quickActionText}>Su Takibi</Text>
      </TouchableOpacity>



    <TouchableOpacity
      style={styles.quickActionItem}
      onPress={() => {
        if (planMode === 'manualTracking') {
          // Navigate to ManuelTakipScreen with param to auto-open camera
          navigation.navigate('ManuelTakipScreen', { autoOpenCamera: true });
        } else {
          // Weekly plan mode - Navigate to ChatStack/Chat with params to auto-open camera for food analysis
          navigation.navigate('ChatStack', {
            screen: 'Chat',
            params: { 
              openCamera: true,
              photoPurpose: 'analyze_food' 
            }
          });
        }
      }}
      activeOpacity={0.8}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name="camera" size={24} color="#faf3ea" />
      </View>
      <Text style={styles.quickActionText}>Foto Çek</Text>
    </TouchableOpacity>
          

    </View>
  </View>
        </ScrollView>
      )}
    </View>
  );
};

export default HomeScreen;

// ---------------------
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  contentContainer: {
    paddingBottom: 30,
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
  headerSeparator: {
    height: 2,
    backgroundColor: '#468f5d',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  nutrientSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  nutrientItem: {
    alignItems: 'center',
  },
  nutrientTitle: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  nutrientValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  circularProgressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    backgroundColor: '#468f5d',
    padding: 12,
    borderRadius: 50,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  kcalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  kcalBarBackground: {
    width: '100%',
    height: 14,
    backgroundColor: '#eee',
    borderRadius: 7,
    overflow: 'hidden',
  },
  kcalBarFill: {
    height: '100%',
    backgroundColor: '#f44336',
    borderRadius: 7,
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorText: { 
    fontSize: 18, 
    color: 'red' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#468f5d',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionSelected: {
    backgroundColor: '#f5f9f6',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});


