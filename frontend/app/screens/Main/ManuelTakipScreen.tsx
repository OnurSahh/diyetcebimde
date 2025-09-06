import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, 
  ActivityIndicator, Alert, TextInput, SafeAreaView, 
  Dimensions, KeyboardAvoidingView, Animated, Modal as RNModal, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CircularProgress from 'react-native-circular-progress-indicator';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import ipv4Data from '../../../assets/ipv4_address.json';
import { showInterstitialAd, shouldShowAd } from '../../utils/admobConfig';

const API_URL = `https://${ipv4Data.ipv4_address}`;
const { width } = Dimensions.get('window');

// Type definitions
type Day = {
  id: number;
  day_number: number;
  date: string;
  meals: any[];
  daily_total: {
    calorie: number;
    protein: number;
    carbohydrate: number;
    fat: number;
  };
};

type KcalEntry = {
  id: number;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type PhotoMealItem = {
  name: string;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFats: number;
  baseGrams: number;
  grams: number;
  calcCalories: number;
  calcProtein: number;
  calcCarbs: number;
  calcFats: number;
};

type UserGoals = {
  daily_calorie: number;
  protein: number;
  carbs: number;
  fats: number;
  water_goal: number;
  is_custom: boolean;
};

// Helper functions
const formatDate = (dateStr: string) => {
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

const formatNumber = (num: number) => parseFloat(num.toFixed(1));

const ManuelTakipScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  // States
  const [isGptLoading, setIsGptLoading] = useState(false);
  const [kcalByDate, setKcalByDate] = useState<Record<string, KcalEntry[]>>({});
  const [kcalSelectedDayIndex, setKcalSelectedDayIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [trackingDays, setTrackingDays] = useState<Day[]>([]);
  const [planMode, setPlanMode] = useState('manualTracking');
  const [goalEditModalVisible, setGoalEditModalVisible] = useState(false);
  const [userGoals, setUserGoals] = useState<UserGoals>({
    daily_calorie: 0, protein: 0, carbs: 0, fats: 0, water_goal: 0, is_custom: false
  });
  
  // Modal states
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [gptModalVisible, setGptModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingFoods, setPendingFoods] = useState<PhotoMealItem[]>([]);
  
  // Form states
  const [title, setTitle] = useState('');
  const [calorieStr, setCalorieStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [gptFoodName, setGptFoodName] = useState('');
  const [gptGramsStr, setGptGramsStr] = useState('');

  // Goal edit form states
  const [dailyCalorieStr, setDailyCalorieStr] = useState('');
  const [proteinGoalStr, setProteinGoalStr] = useState('');
  const [carbsGoalStr, setCarbsGoalStr] = useState('');
  const [fatsGoalStr, setFatsGoalStr] = useState('');
  const [waterGoalStr, setWaterGoalStr] = useState('');

  // New modal states
  const [modalRecommendedGoals, setModalRecommendedGoals] = useState<UserGoals | null>(null);
  const [modalIsCustom, setModalIsCustom] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Ref for container
  const containerRef = useRef(null);

  // Generate fallback 7 days for tracking
  useEffect(() => {
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
    setTrackingDays(arr);
    
    // Auto-select today
    const todayStr = new Date().toISOString().split('T')[0];
    const autoIndex = arr.findIndex((d) => d.date >= todayStr);
    setKcalSelectedDayIndex(autoIndex >= 0 ? autoIndex : 0);
  }, []);

  useEffect(() => {
    if (goalEditModalVisible) {
      // When modal opens, fetch the latest survey and goal data
      const fetchModalData = async () => {
        try {
          const token = await SecureStore.getItemAsync('accessToken');
          if (!token) return;
          
          // Get goals data
          const goalsResponse = await axios.get(
            `${API_URL}/api/tracker/goals/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Get survey data
          const surveyResponse = await axios.get(
            `${API_URL}/api/survey/get-survey/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Start with base recommended goals
          let recommendedGoals = goalsResponse.data.recommended;
          
          // Override with survey data if available
          if (surveyResponse.data && surveyResponse.data.calorie_intake) {
            recommendedGoals = {
              ...recommendedGoals,
              daily_calorie: surveyResponse.data.calorie_intake
            };
          }
          
          // Process macros from survey
          if (surveyResponse.data && surveyResponse.data.macros) {
            const macros = typeof surveyResponse.data.macros === 'string' 
              ? JSON.parse(surveyResponse.data.macros) 
              : surveyResponse.data.macros;
              
            recommendedGoals = {
              ...recommendedGoals,
              protein: macros.protein || recommendedGoals.protein,
              carbs: macros.carbs || recommendedGoals.carbs,
              fats: macros.fats || recommendedGoals.fats
            };
          }
          
          // Store the complete recommended goals
          setModalRecommendedGoals(recommendedGoals);
          
          // Set initial mode based on current user goals
          setModalIsCustom(userGoals.is_custom);
          
          // Initialize form fields based on whether user has custom goals
          if (userGoals.is_custom) {
            // If user has custom goals, show those
            setDailyCalorieStr(userGoals.daily_calorie.toString());
            setProteinGoalStr(userGoals.protein.toString());
            setCarbsGoalStr(userGoals.carbs.toString());
            setFatsGoalStr(userGoals.fats.toString());
            setWaterGoalStr(userGoals.water_goal.toString());
          } else {
            // If user uses recommended, show the recommended
            setDailyCalorieStr(recommendedGoals.daily_calorie.toString());
            setProteinGoalStr(recommendedGoals.protein.toString());
            setCarbsGoalStr(recommendedGoals.carbs.toString());
            setFatsGoalStr(recommendedGoals.fats.toString());
            setWaterGoalStr(recommendedGoals.water_goal.toString());
          }
          
          setInitialLoadDone(true);
        } catch (error) {
          console.error('Error fetching modal data:', error);
        }
      };
      
      fetchModalData();
    } else {
      setInitialLoadDone(false);
    }
  }, [goalEditModalVisible]);

  const uploadImage = useCallback(async (imageUri: string) => {
    if (!imageUri || isUploading) return;
    
    const dateObj = trackingDays[kcalSelectedDayIndex];
    if (!dateObj) return;
    
    try {
      setIsUploading(true);
      
      // Show ad before uploading photo
      if (shouldShowAd('photo')) {
        showInterstitialAd();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) throw new Error('No token');
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'meal_photo.jpg',
        type: 'image/jpeg',
      } as any);
      
      const response = await axios.post(
        `${API_URL}/api/mealphoto/send_photo/`, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      
      if (response.data.photo_meal?.meal_data?.foodItems) {
        const pm = response.data.photo_meal;
        const newItems: PhotoMealItem[] = pm.meal_data.foodItems.map((item: any) => {
          const bGrams = item.grams && item.grams > 0 ? item.grams : 100;
          return {
            name: item.name,
            baseCalories: item.calories || 0,
            baseProtein: item.protein || 0,
            baseCarbs: item.carbs || 0,
            baseFats: item.fats || 0,
            baseGrams: bGrams,  // Change from 100 to bGrams
            grams: bGrams,
            // Remove the scaling factor since backend already did this
            calcCalories: Math.round(item.calories || 0),
            calcProtein: Math.round((item.protein || 0) * 10) / 10,
            calcCarbs: Math.round((item.carbs || 0) * 10) / 10,
            calcFats: Math.round((item.fats || 0) * 10) / 10, // Fix typo: baseFats → fats
          };
        });
        setPendingFoods(newItems);
        setConfirmModalVisible(true);
      }
    } catch (error: any) {
      console.log('uploadImage error:', error);
      
      if (error.response?.data) {
        if (error.response.data.message?.includes('No food detected')) {
          Alert.alert(
            'Yemek Tespit Edilemedi',
            'Fotoğrafta yemek tespit edilemedi. Lütfen daha iyi ışık koşullarında veya farklı bir açıdan tekrar deneyin.'
          );
          return;
        }
        
        Alert.alert(
          'İşlem Tamamlanamadı',
          'Fotoğraf işlenirken bir sorun oluştu. Lütfen tekrar deneyin.',
          [
            { text: 'Tamam' },
          ]
        );
      } else {
        Alert.alert(
          'Bağlantı Hatası', 
          'Sunucuya bağlanırken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
        );
      }
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, kcalSelectedDayIndex, trackingDays]);

  const handleTakeMealPhoto = useCallback(async () => {
    try {
      const dateObj = trackingDays[kcalSelectedDayIndex];
      if (!dateObj) return;
      
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateObj.date !== todayStr) {
        Alert.alert('Uyarı', 'Yalnızca bugünün tarihine foto ekleyebilirsiniz.');
        return;
      }
      
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'İzin Gerekli', 
          'Kamera izni verilmedi. Ayarlardan uygulamaya kamera izni vermeniz gerekiyor.'
        );
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets?.[0]?.uri) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('handleTakeMealPhoto error:', err);
      Alert.alert('Hata', 'Kamera açılırken bir hata oluştu: ' + err.message);
    }
  }, [kcalSelectedDayIndex, trackingDays, uploadImage]);

  // Auto-open camera if navigated with param
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = navigation.getState().routes.find(r => r.name === 'ManuelTakipScreen')?.params;
      if (params && (params as any).autoOpenCamera) {
        // Small delay to ensure screen is fully loaded
        setTimeout(() => {
          handleTakeMealPhoto();
          // Reset the param so it doesn't trigger again on next focus
          navigation.setParams({ autoOpenCamera: undefined });
        }, 300);
      }
    });

    return unsubscribe;
  }, [navigation, handleTakeMealPhoto]);

  const updateKcalByDate = (newData: Record<string, KcalEntry[]>) => {
    setKcalByDate(newData);
    AsyncStorage.setItem('kcalByDate', JSON.stringify(newData)).catch(err => 
      console.log('storeKcalData error:', err)
    );
  };

  const loadStoredKcal = async () => {
    try {
      const stored = await AsyncStorage.getItem('kcalByDate');
      if (stored) setKcalByDate(JSON.parse(stored));
    } catch (err) {
      console.log('loadStoredKcal error:', err);
    }
  };

  const fetchUserGoals = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;

      // First get the goals as usual
      const goalsResponse = await axios.get(
        `${API_URL}/api/tracker/goals/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Original goals data:", goalsResponse.data);
      console.log("Recommended goals before survey data:", goalsResponse.data.recommended);

      // Now get the survey data for calorie_intake and macros
      const surveyResponse = await axios.get(
        `${API_URL}/api/survey/get-survey/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Survey data retrieved:", surveyResponse.data);
      console.log("Survey calorie_intake:", surveyResponse.data?.calorie_intake);
      console.log("Survey macros:", surveyResponse.data?.macros);

      // Use custom goals if available, otherwise prioritize survey data, then fall back to recommended
      let recommendedGoals = goalsResponse.data.recommended;
      
      // If survey data is available, override the recommended values with survey data
      if (surveyResponse.data && surveyResponse.data.calorie_intake) {
        console.log("Using survey calorie_intake:", surveyResponse.data.calorie_intake);
        recommendedGoals = {
          ...recommendedGoals,
          daily_calorie: surveyResponse.data.calorie_intake
        };
      }
      
      // If macros data is available from survey, use those values
      if (surveyResponse.data && surveyResponse.data.macros) {
        const macros = typeof surveyResponse.data.macros === 'string' 
          ? JSON.parse(surveyResponse.data.macros) 
          : surveyResponse.data.macros;
        
        console.log("Parsed macros from survey:", macros);
        
        recommendedGoals = {
          ...recommendedGoals,
          protein: macros.protein || recommendedGoals.protein,
          carbs: macros.carbs || recommendedGoals.carbs,
          fats: macros.fats || recommendedGoals.fats
        };
      }
      
      console.log("Final recommended goals after survey data:", recommendedGoals);
      
      // Set either custom goals or survey-enhanced recommended goals
      const finalGoals = !userGoals.is_custom 
        ? recommendedGoals
        : goalsResponse.data.custom.is_custom 
          ? goalsResponse.data.custom 
          : recommendedGoals;
        
      console.log("Setting user goals to:", finalGoals);
      setUserGoals(finalGoals);
      
    } catch (error) {
      console.error('Error fetching goals:', error);
      // If fetching survey fails, still try to use the goals data
      try {
        if ((error as any).response && (error as any).response.status !== 404) {
          const token = await SecureStore.getItemAsync('accessToken');
          const response = await axios.get(
            `${API_URL}/api/tracker/goals/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Fallback goals data:", response.data);
          setUserGoals(response.data.custom.is_custom
            ? response.data.custom
            : response.data.recommended);
        }
      } catch (e) {
        console.error('Error in fallback goals fetch:', e);
      }
    }
  };

  const handleSaveGoals = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert("Hata", "Oturum açmanız gerekiyor");
        return;
      }
      
      // Values to be saved depend on which tab is active
      const payload = modalIsCustom 
        ? {
            daily_calorie: parseFloat(dailyCalorieStr) || 0,
            protein: parseFloat(proteinGoalStr) || 0,
            carbs: parseFloat(carbsGoalStr) || 0,
            fats: parseFloat(fatsGoalStr) || 0,
            water_goal: parseFloat(waterGoalStr) || 0,
            is_custom: true
          }
        : {
            ...modalRecommendedGoals,
            is_custom: false
          };
      
      const response = await axios.post(
        `${API_URL}/api/tracker/goals/update/`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data) {
        // Update the actual user goals to match what was saved
        setUserGoals({
          daily_calorie: payload.daily_calorie || 0,
          protein: payload.protein || 0,
          carbs: payload.carbs || 0,
          fats: payload.fats || 0,
          water_goal: payload.water_goal || 0,
          is_custom: payload.is_custom,
        });
        setGoalEditModalVisible(false);
        Alert.alert("Başarılı", "Hedefleriniz güncellendi");
      }
    } catch (error) {
      console.error("Save goals error:", error);
      Alert.alert("Hata", "Hedefler kaydedilirken bir hata oluştu");
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await fetchUserGoals();
        await loadEntriesFromBackend();
      };
      loadData();
    }, [])
  );

  const handleAddEntry = async () => {
    const dateObj = trackingDays[kcalSelectedDayIndex];
    if (!dateObj) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateObj.date !== todayStr) {
      Alert.alert('Uyarı', 'Yalnızca bugünün tarihine manuel giriş ekleyebilirsiniz.');
      return;
    }
    
    if (!title.trim()) {
      Alert.alert('Uyarı', 'Lütfen yemek / öğün adı girin.');
      return;
    }
    
    // Parse values with better validation
    const calories = calorieStr ? parseFloat(calorieStr) : null;
    const protein = proteinStr ? parseFloat(proteinStr) : null;
    const carbs = carbsStr ? parseFloat(carbsStr) : null;
    const fats = fatStr ? parseFloat(fatStr) : null;
    
    // Validate that we have numeric values
    if (calories === null || isNaN(calories)) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir kalori değeri girin.');
      return;
    }
    
    // At least one macro value should be provided
    if ((protein === null || isNaN(protein)) && 
        (carbs === null || isNaN(carbs)) && 
        (fats === null || isNaN(fats))) {
      Alert.alert('Uyarı', 'Lütfen en az bir makro besin değeri girin.');
      return;
    }
    
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert("Hata", "Oturum açmanız gerekiyor");
        return;
      }
      
      // Log values to verify what's being sent
      console.log("Sending manual values:", {
        name: title.trim(),
        calories,
        protein: protein || 0,
        carbs: carbs || 0,
        fats: fats || 0
      });
      
      const response = await axios.post(
        `${API_URL}/api/mealgpt/manual-add/`,
        {
          name: title.trim(),
          date: dateObj.date,
          calories: calories,
          protein: protein || 0,
          carbs: carbs || 0,
          fats: fats || 0,
          grams: 100,
          calculate_nutrients: false // Explicitly tell backend NOT to use GPT
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        await loadEntriesFromBackend();
        setTitle('');
        setCalorieStr('');
        setProteinStr('');
        setCarbsStr('');
        setFatStr('');
        setManualModalVisible(false);
        Alert.alert('Başarılı', 'Yemek eklendi');
      } else {
        Alert.alert('Uyarı', response.data.message || 'Yemek eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Manual add error:', error);
      Alert.alert('Hata', 'Yemek eklenirken bir hata oluştu');
    }
  };

  const removeEntry = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert("Hata", "Oturum açmanız gerekiyor");
        return;
      }
      
      const response = await axios.delete(
        `${API_URL}/api/mealgpt/manual-entry/${id}/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        await loadEntriesFromBackend();
      } else {
        Alert.alert("Uyarı", "Kayıt silinirken bir hata oluştu");
      }
    } catch (error) {
      console.error("Delete entry error:", error);
      Alert.alert("Hata", "Kayıt silinirken bir hata oluştu");
    }
  };

  const handleManualGptAdd = async () => {
    try {
      setIsGptLoading(true);
      
      // Show ad before GPT processing
      if (shouldShowAd('gpt')) {
        showInterstitialAd();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert("Hata", "Oturum açmanız gerekiyor");
        return;
      }
      
      if (!gptFoodName.trim()) {
        Alert.alert("Uyarı", "Lütfen yemek adı girin");
        return;
      }
      
      const grams = parseFloat(gptGramsStr);
      if (isNaN(grams) || grams <= 0) {
        Alert.alert("Uyarı", "Lütfen geçerli bir gram değeri girin");
        return;
      }
      
      const activeDate = activeKcalDayObj?.date || new Date().toISOString().split('T')[0];
      
      const response = await axios.post(
        `${API_URL}/api/mealgpt/manual-add/`,
        {
          name: gptFoodName,
          grams: grams,
          date: activeDate,
          calculate_nutrients: true
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        await loadEntriesFromBackend();
        setGptFoodName('');
        setGptGramsStr('');
        setGptModalVisible(false);
        Alert.alert("Başarılı", "Yemek eklendi");
      } else {
        Alert.alert("Uyarı", response.data.message || "Yemek eklenirken bir hata oluştu");
      }
    } catch (error) {
      console.error("Manual GPT add error:", error);
      Alert.alert("Hata", "Yemek eklenirken bir hata oluştu");
    } finally {
      setIsGptLoading(false);
    }
  };

  const loadEntriesFromBackend = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;
      
      const response = await axios.get(
        `${API_URL}/api/mealgpt/manual-entries/`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setKcalByDate(response.data.entries);
        await AsyncStorage.setItem('kcalByDate', JSON.stringify(response.data.entries));
      }
    } catch (error) {
      console.error("Load entries error:", error);
    }
  };

  const activeKcalDayObj = trackingDays[kcalSelectedDayIndex];
  const activeDate = activeKcalDayObj?.date || '';
  const currentKcalList = kcalByDate[activeDate] || [];
  const sumCalories = currentKcalList.reduce((acc, e) => acc + e.calories, 0);
  const sumProtein = currentKcalList.reduce((acc, e) => acc + e.protein, 0);
  const sumCarbs = currentKcalList.reduce((acc, e) => acc + e.carbs, 0);
  const sumFats = currentKcalList.reduce((acc, e) => acc + e.fats, 0);

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

  return (
    <View ref={containerRef} style={styles.container}>
      {/* Header */}
      <View style={styles.simpleHeader}>
        <Text style={styles.simpleHeaderTitle}>Manuel Takip</Text>
      </View>

      {/* Days Row */}
      <View style={styles.daysRow}>
        {trackingDays.map((d, idx) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.dayBtn, idx === kcalSelectedDayIndex && styles.dayBtnSelected]}
            onPress={() => setKcalSelectedDayIndex(idx)}
          >
            <Text style={[styles.dayBtnText, idx === kcalSelectedDayIndex && styles.dayBtnTextSelected]}>
              {formatDate(d.date)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Update the CircularProgress components in the macroRow */}

<View style={styles.macroRow}>
  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={sumProtein || 0}
      maxValue={userGoals.protein || 1}
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
    <Text style={styles.macroRatio}>{Math.round(sumProtein)}/{userGoals.protein}g</Text>
  </View>

  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={sumCarbs || 0}
      maxValue={userGoals.carbs || 1}
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
    <Text style={styles.macroRatio}>{Math.round(sumCarbs)}/{userGoals.carbs}g</Text>
  </View>

  <View style={styles.macroItem}>
    <CircularProgress
      radius={40}
      value={sumFats || 0}
      maxValue={userGoals.fats || 1}
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
    <Text style={styles.macroRatio}>{Math.round(sumFats)}/{userGoals.fats}g</Text>
  </View>
</View>
      {/* Calorie Bar */}
      {renderKcalBar(sumCalories, userGoals.daily_calorie)}

      {/* Goal Edit Button */}
      <TouchableOpacity 
        style={styles.goalEditButton}
        onPress={() => setGoalEditModalVisible(true)}
      >
        <Ionicons name="pencil" size={16} color="#fff" />
        <Text style={styles.goalEditButtonText}>Hedeflerimi Düzenle</Text>
      </TouchableOpacity>
      
      {/* Complete replacement for your goal edit modal */}
{goalEditModalVisible && (
  <View style={styles.popupOverlay}>
    <TouchableWithoutFeedback onPress={() => setGoalEditModalVisible(false)}>
      <View style={styles.modalBackdrop} />
    </TouchableWithoutFeedback>
    
    <View style={styles.goalEditContainer}>
      {/* Custom Header with Frosted Glass Effect */}
      <View style={styles.goalEditHeader}>
        <Text style={styles.goalEditTitle}>Beslenme Hedeflerim</Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => setGoalEditModalVisible(false)}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity 
          style={[
            styles.segmentButton, 
            !modalIsCustom && styles.segmentButtonActive
          ]}
          onPress={() => {
            if (modalRecommendedGoals && initialLoadDone) {
              setModalIsCustom(false);
              // Just update form fields, don't set userGoals yet
              setDailyCalorieStr(modalRecommendedGoals.daily_calorie.toString());
              setProteinGoalStr(modalRecommendedGoals.protein.toString());
              setCarbsGoalStr(modalRecommendedGoals.carbs.toString());
              setFatsGoalStr(modalRecommendedGoals.fats.toString());
              setWaterGoalStr(modalRecommendedGoals.water_goal.toString());
            }
          }}
        >
          <Text style={[
            styles.segmentText, 
            !modalIsCustom && styles.segmentTextActive
          ]}>
            Önerilen
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.segmentButton, 
            modalIsCustom && styles.segmentButtonActive
          ]}
          onPress={() => {
            if (initialLoadDone) {
              setModalIsCustom(true);
              // Use current custom goals if they exist
              if (userGoals.is_custom) {
                setDailyCalorieStr(userGoals.daily_calorie.toString());
                setProteinGoalStr(userGoals.protein.toString());
                setCarbsGoalStr(userGoals.carbs.toString());
                setFatsGoalStr(userGoals.fats.toString());
                setWaterGoalStr(userGoals.water_goal.toString());
              }
            }
          }}
        >
          <Text style={[
            styles.segmentText, 
            modalIsCustom && styles.segmentTextActive
          ]}>
            Özel
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.goalContentScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Recommended Values Section */}
        {!modalIsCustom ? (
          <View style={styles.recommendedGoalsCard}>
            <Text style={styles.recommendedInfo}>
              Beslenme uzmanlarımızın önerdiği, size özel hedefler.
            </Text>
            
            <View style={styles.macroCard}>
              <View style={styles.macroIconContainer}>
                <MaterialCommunityIcons name="fire" size={24} color="#fff" />
              </View>
              <View style={styles.macroContent}>
                <Text style={styles.macroLabel}>Günlük Kalori Hedefi</Text>
                <Text style={styles.macroValue}>{modalRecommendedGoals?.daily_calorie || 0} <Text style={styles.macroUnit}>kcal</Text></Text>
              </View>
            </View>
            
            <View style={styles.macroRow}>
              <View style={[styles.macroSquare, {backgroundColor: '#4caf5030'}]}>
                <MaterialCommunityIcons name="food-steak" size={22} color="#4caf50" />
                <Text style={styles.macroSquareValue}>{modalRecommendedGoals?.protein || 0}</Text>
                <Text style={styles.macroSquareLabel}>Protein</Text>
                <Text style={styles.macroSquareUnit}>gram</Text>
              </View>
              
              <View style={[styles.macroSquare, {backgroundColor: '#2196f330'}]}>
                <MaterialCommunityIcons name="bread-slice" size={22} color="#2196f3" />
                <Text style={styles.macroSquareValue}>{modalRecommendedGoals?.carbs || 0}</Text>
                <Text style={styles.macroSquareLabel}>Karbonhidrat</Text>
                <Text style={styles.macroSquareUnit}>gram</Text>
              </View>
              
              <View style={[styles.macroSquare, {backgroundColor: '#ff980030'}]}>
                <MaterialCommunityIcons name="oil" size={22} color="#ff9800" />
                <Text style={styles.macroSquareValue}>{modalRecommendedGoals?.fats || 0}</Text>
                <Text style={styles.macroSquareLabel}>Yağ</Text>
                <Text style={styles.macroSquareUnit}>gram</Text>
              </View>
            </View>
            
            <View style={styles.waterCard}>
              <View style={styles.waterIconContainer}>
                <MaterialCommunityIcons name="cup-water" size={24} color="#fff" />
              </View>
              <View style={styles.waterContent}>
                <Text style={styles.waterLabel}>Günlük Su Hedefi</Text>
                <Text style={styles.waterValue}>{modalRecommendedGoals?.water_goal || 0} <Text style={styles.waterUnit}>ml</Text></Text>
              </View>
            </View>
          </View>
        ) : (
          /* Custom Values Section */
          <View style={styles.customGoalsSection}>
            <Text style={styles.customInfo}>
              Kendi beslenme hedeflerinizi özelleştirin.
            </Text>
            
            <View style={styles.customField}>
              <View style={styles.customIconContainer}>
                <MaterialCommunityIcons name="fire" size={22} color="#fff" />
              </View>
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Günlük Kalori (kcal)</Text>
                <TextInput
                  style={styles.customInput}

                  onChangeText={setDailyCalorieStr}
                  keyboardType="numeric"
                  placeholder="Örn. 2000"
                />
              </View>
            </View>
            
            <View style={styles.customField}>
              <View style={[styles.customIconContainer, {backgroundColor: '#4caf50'}]}>
                <MaterialCommunityIcons name="food-steak" size={22} color="#fff" />
              </View>
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.customInput}

                  onChangeText={setProteinGoalStr}
                  keyboardType="numeric"
                  placeholder="Örn. 120"
                />
              </View>
            </View>
            
            <View style={styles.customField}>
              <View style={[styles.customIconContainer, {backgroundColor: '#2196f3'}]}>
                <MaterialCommunityIcons name="bread-slice" size={22} color="#fff" />
              </View>
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Karbonhidrat (g)</Text>
                <TextInput
                  style={styles.customInput}

                  onChangeText={setCarbsGoalStr}
                  keyboardType="numeric"
                  placeholder="Örn. 200"
                />
              </View>
            </View>
            
            <View style={styles.customField}>
              <View style={[styles.customIconContainer, {backgroundColor: '#ff9800'}]}>
                <MaterialCommunityIcons name="oil" size={22} color="#fff" />
              </View>
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Yağ (g)</Text>
                <TextInput
                  style={styles.customInput}

                  onChangeText={setFatsGoalStr}
                  keyboardType="numeric"
                  placeholder="Örn. 70"
                />
              </View>
            </View>
            
            <View style={styles.customField}>
              <View style={[styles.customIconContainer, {backgroundColor: '#03a9f4'}]}>
                <MaterialCommunityIcons name="cup-water" size={22} color="#fff" />
              </View>
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Su (ml)</Text>
                <TextInput
                  style={styles.customInput}

                  onChangeText={setWaterGoalStr}
                  keyboardType="numeric"
                  placeholder="Örn. 2500"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.goalEditActions}>
        <TouchableOpacity
          style={styles.goalCancelButton}
          onPress={() => setGoalEditModalVisible(false)}
        >
          <Text style={styles.goalCancelButtonText}>Vazgeç</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.goalSaveButton}
          onPress={handleSaveGoals}
        >
          <Text style={styles.goalSaveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
      
      {/* Action Buttons */}
      <View style={styles.manualExtraBox}>
        <Text style={styles.manualExtraLabel}>İşlemler</Text>
        <View style={styles.manualButtonsRow}>
          <TouchableOpacity style={styles.photoButton} onPress={handleTakeMealPhoto}>
            {isUploading ? (
              <ActivityIndicator color="#fff" style={{ marginBottom: 4 }} />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" style={{ marginBottom: 4 }} />
            )}
            <Text style={styles.photoButtonText}>Foto Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoButton} onPress={() => setGptModalVisible(true)}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" style={{ marginBottom: 4 }} />
            <Text style={styles.photoButtonText}>Nobi ile Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoButton} onPress={() => setManualModalVisible(true)}>
            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginBottom: 4 }} />
            <Text style={styles.photoButtonText}>Manuel Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Entry List */}
      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Kayıtlı Girdiler</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {currentKcalList.map((ent) => (
          <View key={ent.id} style={styles.entryItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryTitle}>
                {toTitleCase(ent.title)} - {formatNumber(ent.calories)} kcal
              </Text>
              <Text style={styles.entryMacros}>
                P:{formatNumber(ent.protein)} / K:{formatNumber(ent.carbs)} / Y:{formatNumber(ent.fats)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeEntry(ent.id)}>
              <Ionicons name="trash" size={20} color="#ff5252" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      
      {/* POPUPS - replacing modals */}
      
      {/* Manual Entry Popup */}
      {manualModalVisible && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manuel Giriş Ekle</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>Yemek / Öğün Adı</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Örn. Tavuk Göğsü"
              />
              
              <Text style={styles.inputLabel}>Kalori (kcal)</Text>
              <TextInput
                style={styles.input}
                value={calorieStr}
                onChangeText={setCalorieStr}
                keyboardType="numeric"
                placeholder="Örn. 250"
              />
              
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={proteinStr}
                    onChangeText={setProteinStr}
                    keyboardType="numeric"
                    placeholder="Örn. 25"
                  />
                </View>
                
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>Karb (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={carbsStr}
                    onChangeText={setCarbsStr}
                    keyboardType="numeric"
                    placeholder="Örn. 30"
                  />
                </View>
              </View>
              
              <Text style={styles.inputLabel}>Yağ (g)</Text>
              <TextInput
                style={styles.input}
                value={fatStr}
                onChangeText={setFatStr}
                keyboardType="numeric"
                placeholder="Örn. 10"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setManualModalVisible(false)}
                >
                  <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.addButton]}
                  onPress={handleAddEntry}
                >
                  <Text style={styles.addText}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* GPT Entry Popup */}
      {gptModalVisible && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nobi ile Yemek Ekle</Text>
              <TouchableOpacity onPress={() => setGptModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>              
              <Text style={styles.inputLabel}>Yemek Adı</Text>
              <TextInput
                style={styles.input}
                value={gptFoodName}
                onChangeText={setGptFoodName}
                placeholder="Örn. Izgara Köfte"
              />
              
              <Text style={styles.inputLabel}>Gram Miktarı</Text>
              <TextInput
                style={styles.input}
                value={gptGramsStr}
                onChangeText={setGptGramsStr}
                keyboardType="numeric"
                placeholder="Örn. 150"
              />
              
              <Text style={styles.infoText}>
                Nobi ile yemek eklerken, yapay zeka otomatik olarak besin değerlerini hesaplar.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setGptModalVisible(false)}
                >
                  <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.addButton]}
                  onPress={handleManualGptAdd}
                  disabled={isGptLoading}
                >
                  {isGptLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.addText}>Nobi ile Ekle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Confirm Foods Popup */}
      {confirmModalVisible && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fotoğraftaki Yemekler</Text>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              {pendingFoods.map((food, index) => (
                <View key={index} style={styles.foodItem}>
                  <View style={styles.foodItemHeader}>
                    <Text style={styles.foodName}>{toTitleCase(food.name)}</Text>
                  </View>
                  <View style={styles.foodDetails}>
                    <Text style={{marginRight: 10}}>Kalori: {food.calcCalories} kcal</Text>
                    <Text style={{marginRight: 10}}>P: {formatNumber(food.calcProtein)}g</Text>
                    <Text style={{marginRight: 10}}>K: {formatNumber(food.calcCarbs)}g</Text>
                    <Text>Y: {formatNumber(food.calcFats)}g</Text>
                  </View>
                  <View style={styles.gramInput}>
                    <Text>Miktar:</Text>
                    <TextInput
                      style={styles.gramValueInput}
                      value={food.grams.toString()}
                      onChangeText={(text) => {
                        const newGrams = parseFloat(text) || 0;
                        const updatedFoods = [...pendingFoods];
                        const scalingFactor = newGrams / food.baseGrams;
                        updatedFoods[index] = {
                          ...food,
                          grams: newGrams,
                          calcCalories: Math.round(food.baseCalories * scalingFactor),
                          calcProtein: Math.round((food.baseProtein * scalingFactor) * 10) / 10,
                          calcCarbs: Math.round((food.baseCarbs * scalingFactor) * 10) / 10,
                          calcFats: Math.round((food.baseFats * scalingFactor) * 10) / 10,
                        };
                        setPendingFoods(updatedFoods);
                      }}
                      keyboardType="numeric"
                    />
                    <Text style={{marginLeft: 5}}>g</Text>
                  </View>
                </View>
              ))}
              
              {pendingFoods.length === 0 && (
                <Text style={styles.infoText}>Yemek listesi boş</Text>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setPendingFoods([]);
                    setConfirmModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.addButton]}
                  onPress={async () => {
                    try {
                      const token = await SecureStore.getItemAsync('accessToken');
                      if (!token) throw new Error('No token');
                      
                      const activeDate = activeKcalDayObj?.date || new Date().toISOString().split('T')[0];
                      
                      for (const food of pendingFoods) {
                        await axios.post(
                          `${API_URL}/api/mealgpt/manual-add/`,
                          {
                            name: food.name,
                            date: activeDate,
                            calories: food.calcCalories,
                            protein: food.calcProtein,
                            carbs: food.calcCarbs,
                            fats: food.calcFats,
                            grams: food.grams
                          },
                          { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                      }
                      
                      await loadEntriesFromBackend();
                      setPendingFoods([]);
                      setConfirmModalVisible(false);
                      
                      Alert.alert('Başarılı', 'Yemekler eklendi');
                    } catch (error) {
                      console.error('Error saving foods:', error);
                      Alert.alert('Hata', 'Yemekler eklenirken bir sorun oluştu');
                    }
                  }}
                  disabled={pendingFoods.length === 0}
                >
                  <Text style={styles.addText}>Onayla ve Ekle</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '80%',
  },
  modalScrollContent: {
    maxHeight: 400,
    width: '100%',
  },
  simpleHeader: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingBottom: 10,
    backgroundColor: '#468f5d',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  simpleHeaderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
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
    marginHorizontal: 5,
    width: width / 3.5,
  },
  circularTitle: {
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
  },
  kcalBarFill: {
    height: '100%',
    backgroundColor: '#f44336',
    borderRadius: 7,
  },
  manualExtraBox: {
    backgroundColor: '#FFF',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginVertical: 8,
  },
  manualExtraLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  manualButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007aff',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 5.5,
    marginHorizontal: 4,
  },
  photoButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 10,
    textAlign: 'center',
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    justifyContent: 'space-between',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  entryMacros: {
    fontSize: 14,
    color: '#000000',
    marginTop: 2,
  },
  
  // Standard Modal Styles
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#468f5d',
    marginLeft: 8,
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  addText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 15,
  },
  
  // Food Item Styles
  foodItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  foodDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  gramInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  gramValueInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    width: 80,
    marginLeft: 8,
  },
  
  // Other
  goalEditButton: {
    flexDirection: 'row',
    backgroundColor: '#468f5d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 10,
  },
  goalEditButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Modal styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  goalEditContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  goalEditHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#468f5d',
  },
  goalEditTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#777',
  },
  segmentTextActive: {
    color: '#468f5d',
    fontWeight: '600',
  },
  goalContentScroll: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  recommendedGoalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  recommendedInfo: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  macroCard: {
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  macroIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f44336',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  macroContent: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  macroUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  macroSquare: {
    width: '31%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroSquareValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 2,
  },
  macroSquareLabel: {
    fontSize: 13,
    color: '#666',
  },
  macroSquareUnit: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  waterCard: {
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  waterIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#03a9f4',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waterContent: {
    flex: 1,
  },
  waterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  waterValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  waterUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  customGoalsSection: {
    padding: 4,
  },
  customInfo: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
    textAlign: 'center',
  },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  customIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f44336',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  customInputContainer: {
    flex: 1,
  },
  customInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  customInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 3,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  goalEditActions: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  goalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  goalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  goalSaveButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#468f5d',
    marginLeft: 8,
  },
  goalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  macroRatio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  macroItemUnit: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontWeight: '400',
  },
  circularValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default ManuelTakipScreen;
