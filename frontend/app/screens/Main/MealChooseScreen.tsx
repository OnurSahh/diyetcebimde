// app/screens/Main/MealChooseScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import CircularProgress from 'react-native-circular-progress-indicator';
import ipv4Data from '../../../assets/ipv4_address.json';
import { useRoute, RouteProp } from '@react-navigation/native';
import { getPlanMode, savePlanMode, PlanMode } from '../../utils/planModeStorage';
import { showInterstitialAd, shouldShowAd } from '../../utils/admobConfig';

type MealChooseScreenRouteProp = RouteProp<
  { params: { openCamera?: boolean } },
  'params'
>;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* =======================
   Type Definitions
========================== */
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

type SurveyData = {
  wake_time?: string;
  sleep_time?: string;
};

/* =======================
   Helper Functions
========================== */
const formatDate = (dateStr: string) => {
  // Convert "YYYY-MM-DD" to "DD/MM"
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatNumber = (num: number) => {
  return parseFloat(num.toFixed(1));
};

const colorForMealName = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('ana öğün-1')) return '#ef6c00';
  if (n.includes('ana öğün-2')) return '#8e24aa';
  if (n.includes('ana öğün-3')) return '#ec407a';
  if (n.includes('ara öğün')) return '#4caf50';
  return '#007aff';
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  return `${hours}:${minutes}`;
};

// Function to generate meaningful meal names based on time
const getMealNameByTime = (mealTime: string, originalName: string): string => {
  if (!mealTime) return toTitleCase(originalName);
  
  const [hours, minutes] = mealTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  // Check if it's a main meal (Ana Öğün) or snack (Ara Öğün)
  const isMainMeal = originalName.toLowerCase().includes('ana öğün');
  const isSnack = originalName.toLowerCase().includes('ara öğün');
  
  // For main meals
  if (isMainMeal) {
    if (timeInMinutes < 10 * 60) return 'Kahvaltı';               // Before 10:00
    else if (timeInMinutes < 14 * 60) return 'Öğle Yemeği';       // 10:00 - 14:00
    else if (timeInMinutes < 18 * 60) return 'İkindi Yemeği';     // 14:00 - 18:00
    else return 'Akşam Yemeği';                                   // After 18:00
  }
  // For snacks
  else if (isSnack) {
    if (timeInMinutes < 10 * 60) return 'Sabah Atıştırması';      // Before 10:00
    else if (timeInMinutes < 14 * 60) return 'Atıştırma';            // 10:00 - 14:00
    else if (timeInMinutes < 18 * 60) return 'İkindi Atıştırması';            // 14:00 - 18:00
    else if (timeInMinutes < 22 * 60) return 'Akşam Atıştırması'; // 18:00 - 22:00
    else return 'Gece Atıştırması';                               // After 22:00
  }
  
  // Fallback to original name
  return toTitleCase(originalName);
};

// Function to log all meal times for debugging
const logMealTimes = (mealPlan: MealPlan | null) => {
  if (!mealPlan) {
    console.log('No meal plan available to log times');
    return;
  }
  
  console.log('========== MEAL TIMES LOG ==========');
  mealPlan.days.forEach(day => {
    console.log(`\nDAY: ${day.date}`);
    
    // Sort meals by time for readability
    const sortedMeals = [...day.meals].sort((a, b) => {
      const [aH, aM] = a.meal_time.split(':').map(Number);
      const [bH, bM] = b.meal_time.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
    
    sortedMeals.forEach(meal => {
      console.log(
        `Meal: ${meal.name} | ` +
        `Original Display: ${toTitleCase(meal.name)} | ` +
        `Time: ${meal.meal_time} | ` +
        `Renamed As: ${getMealNameByTime(meal.meal_time, meal.name)}`
      );
    });
  });
  console.log('===================================');
};

/* =======================
   Main Component
========================== */
const MealChooseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<MealChooseScreenRouteProp>();
  
  // Meal Plan states
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Survey states for timeline times
  const [wakeHour, setWakeHour] = useState<number>(8);
  const [sleepHour, setSleepHour] = useState<number>(23);

  // Modal for food details
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [infoFood, setInfoFood] = useState<Food | null>(null);

  // Expanded meals tracking
  const [expandedMealIds, setExpandedMealIds] = useState<number[]>([]);

  // Day index for weekly plan
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // For timeline calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Plan mode state
  const [planMode, setPlanMode] = useState<PlanMode>('weeklyPlan');

  /* =======================
     API Calls
  ========================== */
  const fetchSurvey = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;
      const res = await fetch(
        `https://${ipv4Data.ipv4_address}/api/survey/get-survey/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data: SurveyData = await res.json();
      if (data.wake_time) setWakeHour(Number(data.wake_time.split(':')[0]) || 8);
      if (data.sleep_time) setSleepHour(Number(data.sleep_time.split(':')[0]) || 23);
    } catch (err) {
      console.log('fetchSurvey error:', err);
    }
  };

  const fetchMealPlan = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('No token');
      const res = await fetch(
        `https://${ipv4Data.ipv4_address}/api/mealplan/get-meal-plan/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 404) {
        setMealPlan(null);
      } else if (!res.ok) {
        throw new Error('MealPlan fetch error');
      } else {
        const data: MealPlan = await res.json();
        setMealPlan(data);
      }
    } catch (err) {
      console.log('fetchMealPlan error:', err);
      setMealPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadPlanMode = async () => {
        const mode = await getPlanMode();
        setPlanMode(mode);
        
        // If we're in manual tracking mode, navigate to that screen
        if (mode === 'manualTracking') {
          navigation.navigate('ManuelTakipScreen');
        }
      };
      
      loadPlanMode();
      fetchSurvey();
      fetchMealPlan();
    }, [])
  );

  useEffect(() => {
    if (!isLoading && !mealPlan) {
      Alert.alert(
        'Uyarı', 
        'Haftalık plan bulunamadı. Plan oluşturmak için anket sayfasına gitmek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { 
            text: 'Evet', 
            onPress: () => navigation.navigate('HomeStack', { screen: 'MealPlanSurveyScreen' })
          }
        ]
      );
    }
  }, [isLoading, mealPlan]);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      
      // Show ad before regenerating plan
      if (shouldShowAd('mealplan')) {
        showInterstitialAd();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('No token');
      const res = await fetch(
        `https://${ipv4Data.ipv4_address}/api/mealplan/generate-meal-plan/`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Plan generate error');
      const data: MealPlan = await res.json();
      setMealPlan(data);
      Alert.alert('Başarılı', 'Yeni plan oluşturuldu');
    } catch (err) {
      console.log('handleGeneratePlan error:', err);
      Alert.alert('Hata', 'Plan oluşturulurken hata oluştu.');
    } finally {
      setIsGenerating(false);
    }
  };

  /* =======================
     Days Sorting & Fallback
  ========================== */
  const [displayDaysSorted, setDisplayDaysSorted] = useState<Day[]>([]);
  useEffect(() => {
    if (mealPlan) {
      const sorted = [...mealPlan.days].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setDisplayDaysSorted(sorted);
      const autoIndex = sorted.findIndex((d) => d.date >= todayStr);
      setSelectedDayIndex(autoIndex >= 0 ? autoIndex : sorted.length - 1);
      
      // Log all meal times after meal plan is loaded
      logMealTimes(mealPlan);
    }
  }, [mealPlan]);

  const fallback7Days: Day[] = useMemo(() => {
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
    return arr;
  }, []);
  
  const trackingDays = mealPlan ? displayDaysSorted : fallback7Days;

  /* =======================
     Navigation for Days
  ========================== */
  const goPrevDay = () => {
    LayoutAnimation.easeInEaseOut();
    setSelectedDayIndex((prev) => Math.max(prev - 1, 0));
  };
  
  const goNextDay = () => {
    LayoutAnimation.easeInEaseOut();
    setSelectedDayIndex((prev) => Math.min(prev + 1, trackingDays.length - 1));
  };

  /* =======================
     Consumption Toggles (Direct API Update)
  ========================== */
  const toggleMealConsumed = async (dayIndex: number, mealId: number) => {
    if (!mealPlan) return;
    const copy = JSON.parse(JSON.stringify(mealPlan)) as MealPlan;
    const day = copy.days.find((d) => d.id === trackingDays[dayIndex].id);
    if (!day || day.date !== todayStr) {
      Alert.alert('Uyarı', 'Sadece bugünün öğünlerini değiştirebilirsiniz.');
      return;
    }
    const meal = day.meals.find((m) => m.id === mealId);
    if (!meal) return;
    meal.consumed = !meal.consumed;
    meal.foods.forEach((f) => (f.consumed = meal.consumed));
    setMealPlan(copy);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('Token not found');
      await fetch(`https://${ipv4Data.ipv4_address}/api/mealplan/mark-meal-consumed/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meal_id: meal.id, is_eaten: meal.consumed }),
      });
    } catch (err) {
      console.log('toggleMealConsumed error:', err);
      Alert.alert('Hata', 'Öğün durumu kaydedilemedi.');
    }
  };

  const toggleFoodConsumed = async (dayIndex: number, mealId: number, foodId: number) => {
    if (!mealPlan) return;
    const copy = JSON.parse(JSON.stringify(mealPlan)) as MealPlan;
    const day = copy.days.find((d) => d.id === trackingDays[dayIndex].id);
    if (!day || day.date !== todayStr) {
      Alert.alert('Uyarı', 'Sadece bugünün öğünlerini değiştirebilirsiniz.');
      return;
    }
    const meal = day.meals.find((m) => m.id === mealId);
    if (!meal) return;
    const food = meal.foods.find((f) => f.id === foodId);
    if (!food) return;
    food.consumed = !food.consumed;
    if (meal.consumed && !food.consumed) meal.consumed = false;
    setMealPlan(copy);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('Token not found');
      await fetch(`https://${ipv4Data.ipv4_address}/api/mealplan/mark-food-consumed/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ food_id: food.id, is_eaten: food.consumed }),
      });
    } catch (err) {
      console.log('toggleFoodConsumed error:', err);
      Alert.alert('Hata', 'Yemek durumu kaydedilemedi.');
    }
  };

  /* =======================
     Info Modal
  ========================== */
  const openInfo = (food: Food) => {
    setInfoFood(food);
    setInfoVisible(true);
  };
  
  const closeInfo = () => {
    setInfoFood(null);
    setInfoVisible(false);
  };

  /* =======================
     Macro Calculation Helpers
  ========================== */
  const getConsumedMacros = (day: Day) =>
    day.meals.reduce(
      (acc, m) => {
        m.foods.forEach((f) => {
          if (f.consumed) {
            acc.cal += f.calories;
            acc.pr += f.protein;
            acc.cb += f.carbs;
            acc.ft += f.fats;
          }
        });
        return acc;
      },
      { cal: 0, pr: 0, cb: 0, ft: 0 }
    );

  const getMealTotalMacros = (meal: Meal) =>
    meal.foods.reduce(
      (acc, f) => ({
        totalCal: acc.totalCal + f.calories,
        totalP: acc.totalP + f.protein,
        totalC: acc.totalC + f.carbs,
        totalF: acc.totalF + f.fats,
      }),
      { totalCal: 0, totalP: 0, totalC: 0, totalF: 0 }
    );

  /* =======================
     Render Kcal Bar
  ========================== */
  const renderKcalBar = (cal: number, max: number) => {
    const ratio = max ? cal / max : 0;
    const barWidth = Math.min(Math.max(ratio, 0), 1) * 100;
    return (
      <View style={styles.kcalBarContainer}>
        <Text style={styles.kcalLabel}>
          {Math.round(cal)} / {max} kcal{'  '}
          <MaterialCommunityIcons name="fire" size={16} color="#f44336" />
        </Text>
        <View style={styles.kcalBarBackground}>
          <View style={[styles.kcalBarFill, { width: `${barWidth}%` }]} />
        </View>
      </View>
    );
  };

  /* =======================
     Render
  ========================== */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>


          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Haftalık Plan</Text>
          </View>
          
          <View style={styles.headerRightButtons}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Haftalık Planı Yenile",
                  "1 haftalık yemek planını tekrar baştan yaratmak istediğine emin misin?",
                  [
                    { text: "İptal", style: "cancel" },
                    { text: "Evet", onPress: handleGeneratePlan, style: "destructive" }
                  ]
                );
              }}
              style={styles.resetButton}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="refresh" size={24} color="#fff" />
              )}
            </TouchableOpacity>


          </View>
        </View>


        {/* Days Row */}
        <View style={styles.daysRow}>
          {trackingDays.map((d, idx) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.dayBtn, idx === selectedDayIndex && styles.dayBtnSelected]}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text style={[styles.dayBtnText, idx === selectedDayIndex && styles.dayBtnTextSelected]}>
                {formatDate(d.date)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Macro Summary */}
        {trackingDays[selectedDayIndex] && trackingDays[selectedDayIndex].meals.length > 0 && (
          <>
            {(() => {
              const dayObj = trackingDays[selectedDayIndex];
              const consumedDay = getConsumedMacros(dayObj);
              const dt = dayObj.daily_total;
              return (
                <>
<View style={styles.macroRow}>
  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={consumedDay.pr || 0}
      maxValue={dt.protein || 1}
      title="Protein"
      titleStyle={styles.circularTitle}
      activeStrokeColor="#4caf50"
      inActiveStrokeColor="#c8e6c9"
      inActiveStrokeWidth={6}
      activeStrokeWidth={8}
      valueSuffix="g"
      showProgressValue={true}
      progressValueColor="#333"
      progressValueStyle={{ fontSize: 14, fontWeight: 'bold' }}
      progressValueFontSize={14}
      titleFontSize={14}
      titleColor="#333"
    />
    <Text style={styles.macroRatio}>{Math.round(consumedDay.pr)}/{Math.round(dt.protein)}g</Text>
  </View>
  
  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={consumedDay.cb || 0}
      maxValue={dt.carbohydrate || 1}
      title="Karbon"
      titleStyle={styles.circularTitle}
      activeStrokeColor="#2196f3"
      inActiveStrokeColor="#bbdefb"
      inActiveStrokeWidth={6}
      activeStrokeWidth={8}
      valueSuffix="g"
      showProgressValue={true}
      progressValueColor="#333"
      progressValueStyle={{ fontSize: 14, fontWeight: 'bold' }}
      progressValueFontSize={14}
      titleFontSize={14}
      titleColor="#333"
    />
    <Text style={styles.macroRatio}>{Math.round(consumedDay.cb)}/{Math.round(dt.carbohydrate)}g</Text>
  </View>
  
  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={consumedDay.ft || 0}
      maxValue={dt.fat || 1}
      title="Yağ"
      titleStyle={styles.circularTitle}
      activeStrokeColor="#ff9800"
      inActiveStrokeColor="#ffe0b2"
      inActiveStrokeWidth={6}
      activeStrokeWidth={8}
      valueSuffix="g"
      showProgressValue={true}
      progressValueColor="#333"
      progressValueStyle={{ fontSize: 14, fontWeight: 'bold' }}
      progressValueFontSize={14}
      titleFontSize={14}
      titleColor="#333"
    />
    <Text style={styles.macroRatio}>{Math.round(consumedDay.ft)}/{Math.round(dt.fat)}g</Text>
  </View>
</View>
                  {renderKcalBar(consumedDay.cal, dt.calorie)}
                </>
              );
            })()}
          </>
        )}

        {/* Meals List */}
        <ScrollView style={styles.mealsPane} contentContainerStyle={{ paddingBottom: 30 }}>
          {[...(trackingDays[selectedDayIndex]?.meals || [])]
            .sort((a, b) => {
              // First prioritize unconsumed meals
              if (a.consumed !== b.consumed) {
                return a.consumed ? 1 : -1;
              }
              
              // Then sort by time of day
              const [aH, aM] = a.meal_time.split(':').map(Number);
              const [bH, bM] = b.meal_time.split(':').map(Number);
              return (aH * 60 + aM) - (bH * 60 + bM); // Earlier time first
            })
            .map((meal) => {
              const isExpanded = expandedMealIds.includes(meal.id);
              const { totalCal, totalP, totalC, totalF } = getMealTotalMacros(meal);
              return (
                <View key={meal.id} style={[styles.mealCard, { opacity: meal.consumed ? 0.6 : 1 }]}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealHeaderLeft}>
                      <View style={[styles.smallBullet, { backgroundColor: colorForMealName(meal.name) }]} />
                      <View style={styles.mealTitleContainer}>
                        <Text style={styles.mealTitle}>{getMealNameByTime(meal.meal_time, meal.name)}</Text>
                        <View style={styles.mealTimeContainer}>
                          <Ionicons name="time-outline" size={12} color="#666" style={{marginRight: 4}} />
                          <Text style={styles.mealTimeText}>{formatTime(meal.meal_time)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.mealHeaderRight}>
                      <TouchableOpacity style={styles.toggleButton} onPress={() => toggleMealConsumed(selectedDayIndex, meal.id)}>
                        {meal.consumed ? (
                          <Ionicons name="checkbox" size={24} color="#4caf50" />
                        ) : (
                          <Ionicons name="checkbox-outline" size={24} color="#999" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() =>
                          setExpandedMealIds((prev) =>
                            prev.includes(meal.id) ? prev.filter((id) => id !== meal.id) : [...prev, meal.id]
                          )
                        }
                      >
                        <Ionicons name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={24} color="#444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  {meal.foods.map((f, idx) => (
                    <View key={f.id}>
                      <View style={[styles.foodRow, { opacity: f.consumed ? 0.4 : 1 }]}>
                        <TouchableOpacity style={styles.foodToggle} onPress={() => toggleFoodConsumed(selectedDayIndex, meal.id, f.id)}>
                          {f.consumed ? (
                            <Ionicons name="checkmark-circle" size={22} color="#4caf50" />
                          ) : (
                            <Ionicons name="checkmark-circle-outline" size={22} color="#aaa" />
                          )}
                        </TouchableOpacity>
                        <View style={styles.foodDetails}>
                          <Text style={styles.foodName}>{toTitleCase(f.name)}</Text>
                          <Text style={styles.foodMeta}>
                            ({f.portion_count.toFixed(1)} {f.portion_type}) | {Math.round(f.calories)} kcal | P:{formatNumber(f.protein)} K:{formatNumber(f.carbs)} Y:{formatNumber(f.fats)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openInfo(f)}>
                          <MaterialCommunityIcons name="information-outline" size={24} color="#007aff" />
                        </TouchableOpacity>
                      </View>
                      {idx < meal.foods.length - 1 && <View style={[styles.divider, { marginVertical: 4, opacity: 0.2 }]} />}
                    </View>
                  ))}
                  {isExpanded && (
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacrosText}>
                        Bu Öğünün Toplamı: {Math.round(totalCal)} kcal | P:{formatNumber(totalP)} | K:{formatNumber(totalC)} | Y:{formatNumber(totalF)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
        </ScrollView>
        
        {/* Fixed Info Modal */}
        {infoVisible && (
          <View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <View 
              style={{
                backgroundColor: '#FFF',
                borderRadius: 10,
                padding: 16,
                width: '90%',
                maxWidth: 400,
                maxHeight: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 10,
                margin: 20,
              }}
            >
              <TouchableOpacity 
                style={{ alignSelf: 'flex-end', padding: 4 }} 
                onPress={closeInfo}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              {infoFood && (
                <>
                  <Text style={styles.infoTitle}>{toTitleCase(infoFood.name)}</Text>
                  <Text style={styles.infoText}>
                    Kalori: {Math.round(infoFood.calories)} | Protein: {formatNumber(infoFood.protein)} | Karbonhidrat: {formatNumber(infoFood.carbs)} | Yağ: {formatNumber(infoFood.fats)}
                  </Text>
                  {infoFood.tarif && <Text style={styles.infoText}>Tarif: {infoFood.tarif}</Text>}
                  {infoFood.ana_bilesenler && <Text style={styles.infoText}>Bileşenler: {infoFood.ana_bilesenler}</Text>}
                </>
              )}
            </View>
          </View>
        )}
        

      </View>
    </View>
  );
};

export default MealChooseScreen;

/* =======================
   Styles
========================== */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingBottom: 10,
    backgroundColor: '#468f5d',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  navButton: {
    padding: 8,
  },
headerTitleContainer: {
  position: 'absolute',
  left: 0,
  right: 0,
  top: Platform.OS === 'android' ? 20 : 50,
  bottom: 10,
  alignItems: 'center',
  justifyContent: 'center',
},
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    padding: 8,
    marginLeft: 4,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#777',
  },
  modeToggleTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007aff',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 8,
  },
  dayBtn: {
    backgroundColor: '#ECECEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    margin: 4,
  },
  dayBtnSelected: {
    backgroundColor: '#007aff',
  },
  dayBtnText: {
    fontSize: 14,
    color: '#333',
  },
  dayBtnTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  macroItem: {
    alignItems: 'center',
  },
  circularTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  circularValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  kcalBarContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
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
    backgroundColor: '#EDEDED',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  kcalBarFill: {
    height: '100%',
    backgroundColor: '#f44336',
    borderRadius: 7,
  },
  mealsPane: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  mealCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    margin: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007aff',
  },
mealTitleContainer: {
  flex: 1,
},
mealTimeContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 2,
},
mealTimeText: {
  fontSize: 12,
  color: '#666',
},
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -70,
  },
  toggleButton: {
    marginRight: 0,
    padding: 0,
  },
  expandButton: {
    padding: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 6,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  foodToggle: {
    marginRight: 8,
    padding: 4,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  foodMeta: {
    fontSize: 13,
    color: '#666',
  },
  mealMacros: {
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: '#F0F0F0',
    padding: 6,
    borderRadius: 6,
  },
  mealMacrosText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007aff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  toManualButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#468f5d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toManualButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  macroRatio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});