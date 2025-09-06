// MealPlanSurveyScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ipv4Data from '../../../assets/ipv4_address.json';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../navigation/MainNavigator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showInterstitialAd, shouldShowAd } from '../../utils/admobConfig';

// Types
type SurveyData = {
  user: number;
  first_name: string;
  last_name: string;
  age: number;
  birth_date?: string;
  weight: number;
  goal: string;
  dietary_option: string;
  disliked_and_allergies: string[];
  excluded_items?: string[];
  main_meals?: number;
  snack_meals?: number;
  meal_times?: { [key: string]: string };
  snack_times?: { [key: string]: string };
};

// Options
const dietaryOptions = [
  { title: 'Hepçil', info: 'Her türden gıdayı tüketirsiniz.' },
  { title: 'Vegan', info: 'Sadece bitkisel kaynaklı beslenirsiniz.' },
  { title: 'Vejetaryen', info: 'Hayvansal et ürünlerini tüketmezsiniz.' },
  { title: 'Pesketaryen', info: 'Et tüketmezsiniz, ancak balık tüketirsiniz.' },
  { title: 'Fleksiteryan', info: 'Çoğunlukla bitkisel beslenir, ara sıra et tüketirsiniz.' },
  { title: 'Ketojonik Diyet', info: 'Düşük karbonhidrat, yüksek yağ içeren bir diyet uygularsınız.' },
  { title: 'Akdeniz Diyeti', info: 'Sağlıklı yağlar, sebze, balık ve tahıl ağırlıklı bir diyet uygularsınız.' },
  { title: 'Dash Diyeti', info: 'Tansiyonu kontrol etmeye yönelik düşük tuz içerikli bir diyet uygularsınız.' },
  { title: 'Diğer', info: '' },
];

const goalOptions = [
  { id: 'weight_loss', label: 'Kilo Vermek', icon: 'trending-down' as const },
  { id: 'maintain', label: 'Kiloyu Korumak', icon: 'sync' as const },
  { id: 'weight_gain', label: 'Kilo Almak', icon: 'trending-up' as const },
  { id: 'muscle_gain', label: 'Kas Kazanmak', icon: 'fitness' as const },
];

const { width } = Dimensions.get('window');

const MAX_WEIGHT = 300;
const MAX_MEALS = 10;

// Time picker modal component
interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: Date) => void;
  initialTime?: Date;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelectTime,
  initialTime = new Date()
}) => {
  const [selectedTime, setSelectedTime] = useState(initialTime);
  
  // For Android specific handling
  const [androidTimePickerShown, setAndroidTimePickerShown] = useState(false);
  
  // Show Android picker directly when the modal becomes visible
  useEffect(() => {
    if (Platform.OS === 'android' && visible && !androidTimePickerShown) {
      setAndroidTimePickerShown(true);
    }
  }, [visible]);
  
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Always hide the picker after selection
      setAndroidTimePickerShown(false);
      
      if (selectedDate) {
        // If user selected a time
        onSelectTime(selectedDate);
      }
      
      // Always close modal after selection
      onClose();
    } else if (selectedDate) {
      // For iOS, just update the selected time
      setSelectedTime(selectedDate);
    }
  };

  const handleConfirm = () => {
    // For iOS
    onSelectTime(selectedTime);
    onClose();
  };

  // For Android, render the native picker directly
  if (Platform.OS === 'android') {
    return androidTimePickerShown ? (
      <DateTimePicker
        value={initialTime}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={handleTimeChange}
      />
    ) : null;
  }

  // For iOS, use the modal approach
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.timePickerOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerTitle}>Saat Seçin</Text>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(_, date) => date && setSelectedTime(date)}
                style={styles.timePicker}
              />
              <View style={styles.timePickerButtonsContainer}>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerCancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.timePickerButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerConfirmButton]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.timePickerButtonText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Date picker modal component
interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate = new Date()
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleConfirm = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.timePickerOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerTitle}>Tarih Seçin</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => date && setSelectedDate(date)}
                style={styles.timePicker}
                maximumDate={new Date()}
              />
              <View style={styles.timePickerButtonsContainer}>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerCancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.timePickerButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerButton, styles.timePickerConfirmButton]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.timePickerButtonText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Calculate age from birth date
const calculateAge = (birthDate: Date | null): string => {
  if (!birthDate) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
};

// Replace the formatTime function with this improved version
const formatTime = (timeString: string): string => {
  try {
    // If timeString is already in HH:MM format, just return it
    console.log('TimeString:', timeString);
    if (timeString && /^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's empty, return placeholder
    if (!timeString) return "Zaman seçin";
    
    const date = new Date(timeString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Zaman seçin";
    }
    
    // Format the time to HH:MM format
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch (e) {
    return "Zaman seçin";
  }
};

const MealPlanSurveyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  // Hide the bottom tab bar
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });

      return () => {
        parent?.setOptions({
          tabBarStyle: {
            backgroundColor: '#468f5d',
            borderTopWidth: 0,
            elevation: 0,
          },
        });
      };
    }, [navigation])
  );

  // States
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingMealPlan, setGeneratingMealPlan] = useState<boolean>(false);
  const [savingChanges, setSavingChanges] = useState<boolean>(false);

  // Editable states
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [editableWeight, setEditableWeight] = useState<string>('');
  const [editableGoal, setEditableGoal] = useState<string>('');
  const [editableDietaryOption, setEditableDietaryOption] = useState<string>('');
  const [customDietaryOption, setCustomDietaryOption] = useState<string>('');
  const [editableExcludedItems, setEditableExcludedItems] = useState<string[]>([]);
  const [newExcludedItem, setNewExcludedItem] = useState<string>('');
  const [editableMainMeals, setEditableMainMeals] = useState<string>('3');
  const [editableSnackMeals, setEditableSnackMeals] = useState<string>('2');
  const [mealTimes, setMealTimes] = useState<{ [key: string]: string }>({
    "Ana Öğün-1": "08:00",
    "Ana Öğün-2": "13:00", 
    "Ana Öğün-3": "19:00"
  });
  const [snackTimes, setSnackTimes] = useState<string[]>(["11:00", "16:00"]);

  const [initialState, setInitialState] = useState({
    birth_date: '',
    weight: '',
    goal: '',
    dietary_option: '',
    excluded_items: '',
    main_meals: '',
    snack_meals: '',
    meal_times: '',
    snack_times: '',
  });

  // Modal states
  const [goalModalVisible, setGoalModalVisible] = useState<boolean>(false);
  const [dietaryModalVisible, setDietaryModalVisible] = useState<boolean>(false);
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [timePickerVisible, setTimePickerVisible] = useState<boolean>(false);
  const [currentTimePickerIndex, setCurrentTimePickerIndex] = useState<string>('');
  const [currentTimePickerType, setCurrentTimePickerType] = useState<'meal' | 'snack'>('meal');

  // Other states
  const [selectedDietaryOptionInfo, setSelectedDietaryOptionInfo] = useState<string>('');

  // Fetch survey data
  const fetchSurveyData = useCallback(async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) {
        throw new Error('No access token found');
      }
      const response = await fetch(`https://${ipv4Data.ipv4_address}/api/survey/get-survey/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 404) {
        Alert.alert('Bilgi', 'Anket verilerinize ulaşamadık. Lütfen önce anket doldurun.');
        navigation.goBack();
        return;
      }

      if (!response.ok) {
        throw new Error('Sunucuya bağlanırken bir hata oluştu.');
      }

      const data: SurveyData = await response.json();
      setSurveyData(data);

      // Set birth date if available, otherwise approximate from age
      if (data.birth_date) {
        setBirthDate(new Date(data.birth_date));
      } else {
        // Approximate birth date from age
        const approxBirthDate = new Date();
        approxBirthDate.setFullYear(approxBirthDate.getFullYear() - data.age);
        setBirthDate(approxBirthDate);
      }

      // Initialize other fields
      setEditableWeight(String(data.weight));
      setEditableGoal(data.goal || '');
      setEditableDietaryOption(data.dietary_option || '');
      setEditableExcludedItems([...data.excluded_items || [], ...data.disliked_and_allergies || []]);
      setEditableMainMeals(String(data.main_meals || 3));
      setEditableSnackMeals(String(data.snack_meals !== undefined && data.snack_meals !== null ? data.snack_meals : 2));


      // Initialize meal and snack times
      if (data.meal_times) {
        setMealTimes(data.meal_times);
      } else {
        // Default meal times if not set
        const defaultMealTimes: {[key: string]: string} = {};
        for (let i = 0; i < (data.main_meals || 3); i++) {
          defaultMealTimes[i.toString()] = new Date().toISOString();
        }
        setMealTimes(defaultMealTimes);
      }

      if (data.snack_times) {
        // Convert snack_times object to array
        const snackTimesArray = Object.values(data.snack_times);
        setSnackTimes(snackTimesArray);
      } else {
        // Default snack times if not set
        const defaultSnackTimes: {[key: string]: string} = {};
        for (let i = 0; i < (data.snack_meals || 2); i++) {
          defaultSnackTimes[i.toString()] = new Date().toISOString();
        }
        // Convert defaultSnackTimes object to array
        const defaultSnackTimesArray = Object.values(defaultSnackTimes);
        setSnackTimes(defaultSnackTimesArray);
      }

      // Track initial state
      setInitialState({
        birth_date: data.birth_date || new Date().toISOString(),
        weight: String(data.weight),
        goal: data.goal || '',
        dietary_option: data.dietary_option || '',
        excluded_items: JSON.stringify([...data.excluded_items || [], ...data.disliked_and_allergies || []]),
        main_meals: String(data.main_meals || 3),
        snack_meals: String(data.snack_meals || 2),
        meal_times: JSON.stringify(data.meal_times || {}),
        snack_times: JSON.stringify(data.snack_times || {}),
      });

      // Show info if known dietary option
      if (data.dietary_option && dietaryOptions.some((option) => option.title === data.dietary_option)) {
        const selectedOption = dietaryOptions.find(
          (option) => option.title === data.dietary_option
        );
        if (selectedOption) {
          setSelectedDietaryOptionInfo(selectedOption.info);
        }
      } else if (data.dietary_option && data.dietary_option !== 'Diğer') {
        // means custom was saved
        setEditableDietaryOption('Diğer');
        setCustomDietaryOption(data.dietary_option);
        setSelectedDietaryOptionInfo('');
      } else {
        setSelectedDietaryOptionInfo('');
      }
    } catch (error) {
      console.error('Error fetching survey data:', error);
      Alert.alert('Hata', 'Anket verileri alınırken bir hata oluştu.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchSurveyData();
  }, [fetchSurveyData]);

  // Update meal times when number of meals changes
  useEffect(() => {
    const mainMealsCount = parseInt(editableMainMeals || '3');
    const newMealTimes: { [key: string]: string } = {};
    
    // Default meal times
    const defaultTimes = ["08:00", "13:00", "19:00", "21:00", "23:00", "06:00"];
    
    // Create meal times in correct format
    for (let i = 1; i <= mainMealsCount; i++) {
      const key = `Ana Öğün-${i}`;
      newMealTimes[key] = mealTimes[key] || defaultTimes[i-1] || "12:00";
    }
    
    setMealTimes(newMealTimes);
  }, [editableMainMeals]);

  // Update snack times when number of snacks changes
  useEffect(() => {
    const snackMealsCount = parseInt(editableSnackMeals || '2');
    const newSnackTimes: string[] = [];
    
    // Default snack times
    const defaultTimes = ["10:30", "15:30", "20:30", "22:00", "05:00"];
    
    // Create snack times in correct format
    for (let i = 0; i < snackMealsCount; i++) {
      newSnackTimes[i] = snackTimes[i] || defaultTimes[i] || "15:00";
    }
    
    setSnackTimes(newSnackTimes);
  }, [editableSnackMeals]);

  // Check if changes are made
  const hasChanges = (): boolean => {
    if (!surveyData || !birthDate) return false;
    
    // Compare current state with initial state
    return (
      birthDate.toISOString() !== initialState.birth_date ||
      editableWeight !== initialState.weight ||
      editableGoal !== initialState.goal ||
      editableDietaryOption !== initialState.dietary_option ||
      JSON.stringify(editableExcludedItems) !== initialState.excluded_items ||
      editableMainMeals !== initialState.main_meals ||
      editableSnackMeals !== initialState.snack_meals ||
      JSON.stringify(mealTimes) !== initialState.meal_times ||
      JSON.stringify(snackTimes) !== initialState.snack_times ||
      (editableDietaryOption === 'Diğer' && customDietaryOption.trim() !== '')
    );
  };

  // Generate meal plan
  const performMealPlanGeneration = async () => {
    try {
      setGeneratingMealPlan(true);
      
      // Show ad before generating meal plan
      if (shouldShowAd('mealplan')) {
        showInterstitialAd();
      }
      
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) {
        throw new Error('No access token found');
      }
      
      // Add delay to let ad show
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(
        `https://${ipv4Data.ipv4_address}/api/mealplan/generate-meal-plan/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: surveyData?.user,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Sunucuya bağlanırken bir hata oluştu.');
      }

      const mealPlanData = await response.json();
      await AsyncStorage.setItem('mealPlan', JSON.stringify(mealPlanData));
      
      // Redirect to Home
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Hata', 'Yemek planı oluşturulurken bir hata oluştu.');
      setGeneratingMealPlan(false);
    }
  };

  // Show confirmation dialog for meal plan generation
  const handleGenerateMealPlan = () => {
    Alert.alert(
      "Diyet Planı Oluşturma",
      "Şimdi ana sayfaya yönlendirileceksiniz. Diyet planınızın hazırlanması birkaç dakika sürebilir. Bu süreçte uygulamayı kapatabilirsiniz. İşlem tamamlandığında bildirim alacaksınız.",
      [
        {
          text: "İptal",
          style: "cancel"
        },
        { 
          text: "Devam Et", 
          onPress: performMealPlanGeneration
        }
      ]
    );
  };

  // Save updated survey data
// Replace the handleSaveChanges function with this fixed version
const handleSaveChanges = async () => {
  if (!surveyData || !birthDate) return;
  setSavingChanges(true);
  try {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    if (!accessToken) {
      throw new Error('No access token found');
    }

    // If 'Diğer' is selected but custom is typed
    let dietaryOptionToSave = editableDietaryOption;
    if (editableDietaryOption === 'Diğer' && customDietaryOption.trim() !== '') {
      dietaryOptionToSave = customDietaryOption.trim();
    }

    // Format birth date correctly as YYYY-MM-DD
    const formattedBirthDate = birthDate.toISOString().split('T')[0];

    // For snack_times, server expects an array not an object
    // Only include times for the actual number of snack meals
    const snackTimesArray = snackTimes.slice(0, parseInt(editableSnackMeals));

    const updatedData = {
      birth_date: formattedBirthDate,
      age: parseInt(calculateAge(birthDate)),
      weight: Number(editableWeight),
      goal: editableGoal,
      dietary_option: dietaryOptionToSave,
      excluded_items: editableExcludedItems,
      disliked_and_allergies: [], // Moving everything to excluded_items
      main_meals: Number(editableMainMeals),
      snack_meals: Number(editableSnackMeals),
      meal_times: mealTimes,
      snack_times: snackTimesArray, // Send as array, not object
    };

    console.log("Sending data:", JSON.stringify(updatedData));

    const response = await fetch(
      `https://${ipv4Data.ipv4_address}/api/survey/update-survey/`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updatedData),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Server response:", errorData);
      throw new Error('Sunucuya bağlanırken bir hata oluştu.');
    }

      const newSurvey = await response.json();
      setSurveyData(newSurvey);

      // Refresh initial states
      setInitialState({
        birth_date: birthDate.toISOString(),
        weight: String(newSurvey.weight),
        goal: newSurvey.goal || '',
        dietary_option: newSurvey.dietary_option || '',
        excluded_items: JSON.stringify(newSurvey.excluded_items || []),
        main_meals: String(newSurvey.main_meals || 3),
        snack_meals: String(newSurvey.snack_meals || 2),
        meal_times: JSON.stringify(newSurvey.meal_times || {}),
        snack_times: JSON.stringify(newSurvey.snack_times || {}),
      });

      // Evaluate dietary info
      if (
        newSurvey.dietary_option &&
        dietaryOptions.some((option) => option.title === newSurvey.dietary_option)
      ) {
        const selectedOption = dietaryOptions.find(
          (option) => option.title === newSurvey.dietary_option
        );
        if (selectedOption) {
          setSelectedDietaryOptionInfo(selectedOption.info);
          setEditableDietaryOption(newSurvey.dietary_option);
          setCustomDietaryOption('');
        }
      } else if (
        newSurvey.dietary_option &&
        newSurvey.dietary_option !== 'Diğer'
      ) {
        // means custom was saved
        setEditableDietaryOption('Diğer');
        setCustomDietaryOption(newSurvey.dietary_option);
        setSelectedDietaryOptionInfo('');
      } else {
        setSelectedDietaryOptionInfo('');
      }

      Alert.alert('Başarılı 🌟', 'Değişiklikler başarıyla kaydedildi!');
    } catch (error) {
      console.error('Error updating survey data:', error);
      Alert.alert('Hata ❌', 'Değişiklikler kaydedilirken bir hata oluştu.');
    } finally {
      setSavingChanges(false);
    }
  };

  // Excluded items handlers
  const addExcludedItem = () => {
    if (newExcludedItem.trim()) {
      setEditableExcludedItems([...editableExcludedItems, newExcludedItem.trim()]);
      setNewExcludedItem('');
    }
  };

  const removeExcludedItem = (index: number) => {
    const newItems = [...editableExcludedItems];
    newItems.splice(index, 1);
    setEditableExcludedItems(newItems);
  };

  // Validate meals
  const validateMeals = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, type: string) => {
    if (value === '') return;
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0 || numValue > MAX_MEALS) {
      Alert.alert('Hata ❌', `Lütfen geçerli bir ${type} sayısı giriniz (0-${MAX_MEALS}).`);
      setter('');
    }
  };

  // Validate weight
  const validateWeight = () => {
    if (editableWeight === '') return;
    const numWeight = Number(editableWeight);
    if (isNaN(numWeight) || numWeight < 0 || numWeight > MAX_WEIGHT) {
      Alert.alert('Hata ❌', 'Lütfen geçerli bir kilo giriniz.');
      setEditableWeight('');
    }
  };

  // Open time picker for meals
  const handleOpenTimePicker = (index: string, type: 'meal' | 'snack') => {
    setCurrentTimePickerIndex(index);
    setCurrentTimePickerType(type);
    setTimePickerVisible(true);
  };

  // Handle time selection
  const handleTimeSelected = (time: Date) => {
    // Format time as HH:MM
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    if (currentTimePickerType === 'meal') {
      const newMealTimes = {...mealTimes};
      const key = `Ana Öğün-${parseInt(currentTimePickerIndex) + 1}`;
      newMealTimes[key] = formattedTime;
      setMealTimes(newMealTimes);
    } else {
      const newSnackTimes = [...snackTimes];
      newSnackTimes[parseInt(currentTimePickerIndex)] = formattedTime;
      setSnackTimes(newSnackTimes);
    }
  };

  // Render dietary option
  const renderDietaryOption = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.modalOption}
      onPress={() => {
        setEditableDietaryOption(item.title);
        if (item.title !== 'Diğer') {
          setSelectedDietaryOptionInfo(item.info);
          setCustomDietaryOption('');
        } else {
          setSelectedDietaryOptionInfo('');
        }
        setDietaryModalVisible(false);
      }}
      accessibilityLabel={`Diyet seçeneği: ${item.title}`}
    >
      <View style={styles.radioCircle}>
        {editableDietaryOption === item.title && <View style={styles.selectedRb} />}
      </View>
      <Text style={styles.modalOptionText}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Render goal option
  const renderGoalOption = ({ item }: { item: typeof goalOptions[0] }) => (
    <TouchableOpacity
      style={styles.modalOption}
      onPress={() => {
        setEditableGoal(item.id);
        setGoalModalVisible(false);
      }}
      accessibilityLabel={`Hedef seçeneği: ${item.label}`}
    >
      <View style={styles.radioCircle}>
        {editableGoal === item.id && <View style={styles.selectedRb} />}
      </View>
      <Text style={styles.modalOptionText}>{item.label}</Text>
      <Ionicons name={item.icon} size={20} color="#468f5d" style={styles.optionIcon} />
    </TouchableOpacity>
  );

  // Format date string to display
  const formatDateString = (date: Date | null): string => {
    if (!date) return 'Seçilmedi';
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#468f5d" />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
      </View>
    );
  }

  if (!surveyData) {
    return (
      <View style={styles.noSurveyContainer}>
        <Text style={styles.noSurveyText}>Anket verileri bulunamadı.</Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.navigate('Home')}
          accessibilityLabel="Geri Dön"
        >
          <Text style={styles.goBackButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.leftIconContainer}
          accessibilityLabel="Geri Dön"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Diyet Anketi 🍏</Text>
        <View style={styles.rightIconContainer} />
      </View>

      {/* Header Separator */}
      <View style={styles.headerSeparator} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Generate Meal Plan Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Yemek Planı Oluştur 🍽️</Text>
          <Text style={styles.helpText}>
            Kişisel bilgilerinize göre özel bir yemek planı oluşturmak için aşağıdaki butona tıklayın!
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, generatingMealPlan && styles.buttonDisabled]}
            onPress={handleGenerateMealPlan}
            disabled={generatingMealPlan}
            accessibilityLabel="Yemek Planı Oluştur"
          >
            {generatingMealPlan ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Planı Oluştur 🥗</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          
          {/* Birth Date */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Doğum Tarihi:</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setDatePickerVisible(true)}
              accessibilityLabel="Doğum Tarihi Seçin"
            >
              <Text style={birthDate ? styles.selectedText : styles.placeholderText}>
                {birthDate ? formatDateString(birthDate) : 'Tarih seçin'}
              </Text>
              <Ionicons name="calendar" size={20} color="#555" />
            </TouchableOpacity>
          </View>
          
          {/* Age (Calculated, not editable) */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Yaşınız:</Text>
            <View style={styles.calculatedField}>
              <Text style={styles.calculatedText}>
                {birthDate ? calculateAge(birthDate) : ''}
              </Text>
            </View>
          </View>
          
          {/* Weight */}
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Kilonuz (kg):</Text>
            <TextInput
              style={styles.textInput}
              value={editableWeight}
              onChangeText={setEditableWeight}
              onBlur={validateWeight}
              keyboardType="decimal-pad"
              placeholder="Kilo giriniz"
              placeholderTextColor="#555"
              accessibilityLabel="Kilonuz"
              maxLength={5}
            />
          </View>
        </View>

        {/* Meal Settings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Öğün Ayarları</Text>
          
          {/* Main Meals */}
          <View style={styles.infoRow}>
            <Ionicons name="restaurant-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Ana Öğün Sayısı:</Text>
            <TextInput
              style={styles.textInput}
              value={editableMainMeals}
              onChangeText={setEditableMainMeals}
              onBlur={() => validateMeals(editableMainMeals, setEditableMainMeals, 'ana öğün')}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor="#555"
              accessibilityLabel="Ana Öğün Sayısı"
              maxLength={2}
            />
          </View>
          
          {/* Main Meal Times */}
          {Array.from({ length: parseInt(editableMainMeals) }).map((_, i) => (
            <View key={`meal-${i}`} style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#468f5d" />
              <Text style={styles.infoLabel}>Ana Öğün {i + 1}:</Text>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => handleOpenTimePicker(i.toString(), 'meal')}
                accessibilityLabel={`Ana Öğün ${i + 1} Saati`}
              >
                <Text style={styles.selectedText}>
                  {mealTimes[`Ana Öğün-${i + 1}`] || "Zaman seçin"}
                </Text>
                <Ionicons name="time" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Snack Meals */}
          <View style={styles.infoRow}>
            <Ionicons name="cafe-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Ara Öğün Sayısı:</Text>
            <TextInput
              style={styles.textInput}
              value={editableSnackMeals}
              onChangeText={setEditableSnackMeals}
              onBlur={() => validateMeals(editableSnackMeals, setEditableSnackMeals, 'ara öğün')}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor="#555"
              accessibilityLabel="Ara Öğün Sayısı"
              maxLength={2}
            />
          </View>
          
          {/* Snack Meal Times */}
          {Array.from({ length: parseInt(editableSnackMeals) }).map((_, i) => (
            <View key={`snack-${i}`} style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#468f5d" />
              <Text style={styles.infoLabel}>Ara Öğün {i + 1}:</Text>
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => handleOpenTimePicker(i.toString(), 'snack')}
                accessibilityLabel={`Ara Öğün ${i + 1} Saati`}
              >
                <Text style={styles.selectedText}>
                  {snackTimes[i] || "Zaman seçin"}
                </Text>
                <Ionicons name="time" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Diet Goals */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Diyet Hedefleri</Text>
          
          {/* Goal */}
          <View style={styles.infoRow}>
            <Ionicons name="trophy-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Hedefiniz:</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setGoalModalVisible(true)}
              accessibilityLabel="Hedefinizi Seçin"
            >
              <Text style={editableGoal ? styles.selectedText : styles.placeholderText}>
                {editableGoal ? goalOptions.find(g => g.id === editableGoal)?.label || editableGoal : 'Hedefinizi seçin 🎯'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </TouchableOpacity>
          </View>
          
          {/* Dietary Option */}
          <View style={styles.infoRow}>
            <Ionicons name="nutrition-outline" size={20} color="#468f5d" />
            <Text style={styles.infoLabel}>Diyet Seçeneği:</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setDietaryModalVisible(true)}
              accessibilityLabel="Diyet Seçeneğinizi Belirleyin"
            >
              <Text
                style={
                  editableDietaryOption && editableDietaryOption !== 'Diğer'
                    ? styles.selectedText
                    : styles.placeholderText
                }
              >
                {editableDietaryOption && editableDietaryOption !== 'Diğer'
                  ? editableDietaryOption
                  : 'Diyet seçeneğinizi belirleyin 🥗'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Display info if known dietary option */}
          {editableDietaryOption && editableDietaryOption !== 'Diğer' && (
            <View style={styles.dietaryInfoContainer}>
              <Text style={styles.dietaryInfoText}>{selectedDietaryOptionInfo}</Text>
            </View>
          )}

          {/* Custom input if 'Diğer' */}
          {editableDietaryOption === 'Diğer' && (
            <View style={styles.customDietaryContainer}>
              <Text style={styles.customDietaryLabel}>Lütfen diyetinizi yazınız:</Text>
              <TextInput
                style={styles.customTextInput}
                value={customDietaryOption}
                onChangeText={setCustomDietaryOption}
                placeholder="Örneğin: Paleo, Gluten-Free"
                placeholderTextColor="#555"
                accessibilityLabel="Diğer Diyet Seçeneğiniz"
              />
            </View>
          )}
        </View>

        {/* Food Preferences */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Hariç Tutulacak Besinler</Text>
          <Text style={styles.helpText}>
            Sevmediğiniz, alerjiniz olan veya diyetinizde yer almasını istemediğiniz besinleri ekleyin.
          </Text>
          
          <View style={styles.excludedItemsContainer}>
            {editableExcludedItems.map((item, index) => (
              <View key={index} style={styles.excludedItemChip}>
                <Text style={styles.excludedItemText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => removeExcludedItem(index)}
                  style={styles.removeItemButton}
                >
                  <Ionicons name="close-circle" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={styles.addExcludedItemRow}>
              <TextInput
                style={styles.excludedItemInput}
                value={newExcludedItem}
                onChangeText={setNewExcludedItem}
                placeholder="Yeni öğe ekle"
                onSubmitEditing={addExcludedItem}
              />
              <TouchableOpacity
                onPress={addExcludedItem}
                style={styles.addItemButton}
              >
                <Ionicons name="add-circle" size={24} color="#468f5d" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button (only if changes) */}
        {hasChanges() && (
          <TouchableOpacity
            style={[styles.saveButton, savingChanges && styles.buttonDisabled]}
            onPress={handleSaveChanges}
            disabled={savingChanges}
            accessibilityLabel="Değişiklikleri Kaydet"
          >
            {savingChanges ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet 💾</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGoalModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Hedefinizi Seçin 🎯</Text>
              <FlatList
                data={goalOptions}
                keyExtractor={(item) => item.id}
                renderItem={renderGoalOption}
                contentContainerStyle={styles.modalList}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setGoalModalVisible(false)}
                accessibilityLabel="Modal Kapat"
              >
                <Text style={styles.modalCloseButtonText}>Kapat 🛑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Dietary Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dietaryModalVisible}
        onRequestClose={() => setDietaryModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDietaryModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Diyet Seçeneğinizi Belirleyin 🥗</Text>
              <FlatList
                data={dietaryOptions}
                keyExtractor={(item) => item.title}
                renderItem={renderDietaryOption}
                contentContainerStyle={styles.modalList}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDietaryModalVisible(false)}
                accessibilityLabel="Modal Kapat"
              >
                <Text style={styles.modalCloseButtonText}>Kapat 🛑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={(date) => {
          setBirthDate(date);
          setDatePickerVisible(false);
        }}
        initialDate={birthDate || new Date()}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        onSelectTime={handleTimeSelected}
        initialTime={
          currentTimePickerType === 'meal'
            ? new Date(`2023-01-01T${mealTimes[`Ana Öğün-${parseInt(currentTimePickerIndex) + 1}`] || '12:00'}:00`)
            : new Date(`2023-01-01T${snackTimes[parseInt(currentTimePickerIndex)] || '15:00'}:00`)
        }
      />
    </KeyboardAvoidingView>
  );
};

export default MealPlanSurveyScreen;

// ----- Styles -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingBottom: 10,
    backgroundColor: '#468f5d',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? 25 : 60,
    backgroundColor: '#468f5d',
    padding: 4,
    borderRadius: 20,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android' ? 25 : 60,
  },
  headerSeparator: {
    height: 2,
    backgroundColor: '#468f5d',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf3ea',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#468f5d',
  },
  noSurveyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 20,
    marginTop: 20,
  },
  noSurveyText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  goBackButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#468f5d',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 5,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLabel: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#555',
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F5F5F5',
    fontSize: 16,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
  },
  calculatedField: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
  },
  calculatedText: {
    fontSize: 16,
    color: '#555',
  },
  selectInput: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    justifyContent: 'space-between',
  },
  placeholderText: {
    color: '#777',
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dietaryInfoContainer: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e6ffe6',
    borderRadius: 10,
  },
  dietaryInfoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
  },
  customDietaryContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  customDietaryLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  customTextInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F5F5F5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalList: {
    paddingBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#468f5d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#468f5d',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionIcon: {
    marginLeft: 10,
  },
  excludedItemsContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginTop: 5,
  },
  excludedItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  excludedItemText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  removeItemButton: {
    padding: 2,
  },
  addExcludedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  excludedItemInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F5F5F5',
    fontSize: 14,
    marginRight: 8,
  },
  addItemButton: {
    padding: 4,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
  timePicker: {
    width: 260,
    height: 180,
  },
  timePickerButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  timePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  timePickerCancelButton: {
    backgroundColor: '#FF3B30',
  },
  timePickerConfirmButton: {
    backgroundColor: '#468f5d',
  },
  timePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});