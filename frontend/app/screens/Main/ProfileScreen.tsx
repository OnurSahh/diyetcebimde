// app/screens/Main/ProfileScreen.tsx

import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, Alert, Platform, 
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView,
  TouchableOpacity, Modal
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import {
  HomeStackParamList,
  MainTabParamList,
} from '../../navigation/MainNavigator';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../../assets/ipv4_address.json';

// Create a proper API URL from the imported JSON
const API_URL = `https://${ipv4Data.ipv4_address}`;

type ProfileScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'ProfileScreen'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Update the SurveyDataType to include meal times
type SurveyDataType = {
  first_name: string;
  birth_date: Date | null;
  age: string;
  height_cm: string;
  height_feet: string;
  weight: string;
  weight_lbs: string;
  gender: string;
  goal: string;
  dietary_option: string;
  other_diet: string;
  main_meals: string;
  snack_meals: string;
  excluded_items: string[];
  meal_times: { [key: string]: string }; // For main meal times
  snack_times: string[]; // For snack times
};

// Time picker component for meal times
interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void;
  initialTime?: Date | string;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({ 
  visible, 
  onClose, 
  onSelectTime, 
  initialTime = new Date() 
}) => {
  const [selectedTime, setSelectedTime] = useState(
    typeof initialTime === 'string' 
      ? new Date(`2023-01-01T${initialTime}`) 
      : initialTime
  );
  
  // For Android specific handling
  const [androidTimePickerShown, setAndroidTimePickerShown] = useState(false);
  
  // For Android, show the time picker when modal becomes visible
  useEffect(() => {
    if (Platform.OS === 'android' && visible && !androidTimePickerShown) {
      setAndroidTimePickerShown(true);
    }
  }, [visible]);
  
  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // Hide the Android picker
      setAndroidTimePickerShown(false);
      
      if (date) {
        // Format time for output
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        onSelectTime(`${hours}:${minutes}`);
      }
      
      // Always close modal
      onClose();
    } else if (date) {
      // For iOS, just update the selected time
      setSelectedTime(date);
    }
  };
  
  const handleConfirm = () => {
    // For iOS only
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    onSelectTime(`${hours}:${minutes}`);
    onClose();
  };

  // For Android, render the native picker directly
  if (Platform.OS === 'android') {
    return androidTimePickerShown ? (
      <DateTimePicker
        value={typeof initialTime === 'string' 
          ? new Date(`2023-01-01T${initialTime}`) 
          : initialTime}
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
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Saat Seçin</Text>
          
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="spinner"
            onChange={(_, date) => date && setSelectedTime(date)}
          />
          
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={onClose}>
              <Text style={styles.modalButtonTextCancel}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleConfirm}>
              <Text style={styles.modalButtonTextConfirm}>Onayla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add a function to calculate age from birth date
const calculateAge = (birthDate: Date | null): string => {
  if (!birthDate) return '';
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // If birthday hasn't occurred yet this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, logout } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  // Change initial loading state to true
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newExcludedItem, setNewExcludedItem] = useState('');
  
  // For time pickers
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<string | null>(null);
  
  const [surveyData, setSurveyData] = useState<SurveyDataType>({
    first_name: user?.first_name || '',
    birth_date: null,
    age: '',
    height_cm: '',
    height_feet: '',
    weight: '',
    weight_lbs: '',
    gender: 'male',
    goal: '',
    dietary_option: '',
    other_diet: '',
    main_meals: '3',
    snack_meals: '2',
    excluded_items: [],
    meal_times: {
      "Ana Öğün-1": "08:00",
      "Ana Öğün-2": "13:00",
      "Ana Öğün-3": "19:00"
    },
    snack_times: ["11:00", "16:00"],
  });

  // Hide the bottom tab bar when ProfileScreen is focused
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });

      return () => {
        parent?.setOptions({tabBarStyle: {
          backgroundColor: '#468f5d', 
          borderTopWidth: 0,
          elevation: 0,
        }, });
      };
    }, [navigation])
  );

  // Fetch survey data when component mounts
  useEffect(() => {
    fetchSurveyData();
  }, []);

  // Update meal and snack times when their counts change
  useEffect(() => {
    updateMealTimes();
  }, [surveyData.main_meals]);

  useEffect(() => {
    updateSnackTimes();
  }, [surveyData.snack_meals]);

  // Function to update meal times based on main_meals count
  const updateMealTimes = () => {
    const mainMealsCount = parseInt(surveyData.main_meals) || 0;
    const currentMealTimes = { ...surveyData.meal_times };
    const updatedMealTimes: { [key: string]: string } = {};
    
    // Default meal times if needed
    const defaultTimes = ["08:00", "13:00", "19:00", "21:00", "23:00", "06:00"];
    
    // Keep or add meal times based on the count
    for (let i = 1; i <= mainMealsCount; i++) {
      const key = `Ana Öğün-${i}`;
      updatedMealTimes[key] = currentMealTimes[key] || defaultTimes[i-1] || "12:00";
    }
    
    setSurveyData(prev => ({
      ...prev,
      meal_times: updatedMealTimes
    }));
  };

  // Function to update snack times based on snack_meals count
  const updateSnackTimes = () => {
    const snackMealsCount = parseInt(surveyData.snack_meals) || 0;
    const currentSnackTimes = [...surveyData.snack_times];
    const updatedSnackTimes: string[] = [];
    
    // Default snack times if needed
    const defaultTimes = ["10:30", "15:30", "20:30", "22:00", "05:00"];
    
    // Keep or add snack times based on the count
    for (let i = 0; i < snackMealsCount; i++) {
      updatedSnackTimes[i] = currentSnackTimes[i] || defaultTimes[i] || "15:00";
    }
    
    setSurveyData(prev => ({
      ...prev,
      snack_times: updatedSnackTimes
    }));
  };

  // Update fetchSurveyData to include meal times and calculate age
  const fetchSurveyData = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      console.error('No access token available');
      Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/survey/get-survey/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const data = response.data;
        
        // Parse meal_times from API response (could be a string or object)
        let mealTimes = {};
        try {
          if (data.meal_times) {
            mealTimes = typeof data.meal_times === 'string' 
              ? JSON.parse(data.meal_times) 
              : data.meal_times;
          }
        } catch (e) {
          console.error('Error parsing meal times:', e);
          mealTimes = {};
        }

        // Parse snack_times from API response (could be a string or array)
        let snackTimes: string[] = [];
        try {
          if (data.snack_times) {
            // If it's stored as a string like "{11:00:00,16:00:00,21:00:00}"
            if (typeof data.snack_times === 'string') {
              // Remove braces and split by comma
              let timeStr = data.snack_times.replace('{', '').replace('}', '');
                snackTimes = timeStr.split(',').map((time: string) => {
                // Format to HH:MM if necessary
                return time.substring(0, 5);
                });
            } else {
              snackTimes = data.snack_times;
            }
          }
        } catch (e) {
          console.error('Error parsing snack times:', e);
          snackTimes = [];
        }
        
        // Parse birth_date and calculate age if birth_date exists
        const birthDate = data.birth_date ? new Date(data.birth_date) : null;
        
        setSurveyData({
          first_name: data.first_name || user?.first_name || '',
          birth_date: birthDate,
          // Calculate age based on birth date, or use API age value as fallback
          age: birthDate ? calculateAge(birthDate) : data.age?.toString() || '',
          height_cm: data.height_cm?.toString() || '',
          height_feet: data.height_feet?.toString() || '',
          weight: data.weight?.toString() || '',
          weight_lbs: data.weight_lbs?.toString() || '',
          gender: data.gender || 'male',
          goal: data.goal || '',
          dietary_option: data.dietary_option || '',
          other_diet: data.other_diet || '',
          main_meals: data.main_meals?.toString() || '3',
          snack_meals: data.snack_meals?.toString() || '2',
          excluded_items: data.excluded_items || [],
          meal_times: Object.keys(mealTimes).length > 0 ? mealTimes : {
            "Ana Öğün-1": "08:00",
            "Ana Öğün-2": "13:00",
            "Ana Öğün-3": "19:00"
          },
          snack_times: snackTimes.length > 0 ? snackTimes : ["11:00", "16:00"],
        });
      }
    } catch (error: any) {
      console.error('Error fetching survey data:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
        await logout(); // Log out the user if token is expired
      } else if (error.response?.status === 404) {
        // If no survey exists yet, just use the basic user info
      } else {
        Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Updated saveSurveyData to handle empty values for backend
  const saveSurveyData = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      console.error('No access token available');
      Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/survey/update-survey/`, {
        first_name: surveyData.first_name,
        birth_date: surveyData.birth_date ? surveyData.birth_date.toISOString().split('T')[0] : null,
        age: surveyData.age ? parseInt(surveyData.age) : null,
        height_cm: surveyData.height_cm ? parseFloat(surveyData.height_cm) : null,
        height_feet: surveyData.height_feet ? parseFloat(surveyData.height_feet) : null,
        weight: surveyData.weight ? parseFloat(surveyData.weight) : null,
        weight_lbs: surveyData.weight_lbs ? parseFloat(surveyData.weight_lbs) : null,
        gender: surveyData.gender,
        goal: surveyData.goal,
        dietary_option: surveyData.dietary_option,
        other_diet: surveyData.other_diet,
        main_meals: surveyData.main_meals ? parseInt(surveyData.main_meals) : 0,
        snack_meals: surveyData.snack_meals ? parseInt(surveyData.snack_meals) : 0,
        excluded_items: surveyData.excluded_items,
        meal_times: surveyData.meal_times,
        snack_times: surveyData.snack_times,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('Başarılı', 'Bilgileriniz başarıyla güncellendi.');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving survey data:', error);

      if (error.response?.status === 401) {
        Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
        await logout(); // Log out the user if token is expired
      } else {
        Alert.alert('Hata', 'Bilgileriniz güncellenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Modify handleBirthDateChange to also update age
  const handleBirthDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Update both birth_date and age
      setSurveyData({ 
        ...surveyData, 
        birth_date: selectedDate,
        age: calculateAge(selectedDate)
      });
    }
  };

  // Open time picker modal for meal times
  const openTimePicker = (field: string) => {
    setActiveTimeField(field);
    setShowTimePicker(true);
  };

  // Handle time selection
  const handleTimeSelection = (time: string) => {
    if (activeTimeField) {
      if (activeTimeField.startsWith('Ana Öğün')) {
        // Update main meal time
        setSurveyData({
          ...surveyData,
          meal_times: {
            ...surveyData.meal_times,
            [activeTimeField]: time
          }
        });
      } else if (activeTimeField.startsWith('Ara Öğün')) {
        // Update snack time - extract the index
        const index = parseInt(activeTimeField.split('-')[1]) - 1;
        const newSnackTimes = [...surveyData.snack_times];
        newSnackTimes[index] = time;
        
        setSurveyData({
          ...surveyData,
          snack_times: newSnackTimes
        });
      }
    }
    setActiveTimeField(null);
  };

  // Updated handleMainMealsChange function
  const handleMainMealsChange = (text: string) => {
    // Allow empty value
    if (text === '') {
      setSurveyData({
        ...surveyData,
        main_meals: ''
      });
      return;
    }
    
    // For non-empty, validate as number
    const numValue = text.replace(/[^0-9]/g, '');
    const numericValue = parseInt(numValue);
    
    // Limit to a reasonable maximum
    const finalValue = Math.min(numericValue, 6).toString();
    
    setSurveyData({
      ...surveyData,
      main_meals: finalValue
    });
  };

  // Updated handleSnackMealsChange function
  const handleSnackMealsChange = (text: string) => {
    // Allow empty value
    if (text === '') {
      setSurveyData({
        ...surveyData,
        snack_meals: ''
      });
      return;
    }
    
    // For non-empty, validate as number
    const numValue = text.replace(/[^0-9]/g, '');
    const numericValue = parseInt(numValue);
    
    // Limit to a reasonable maximum
    const finalValue = Math.min(numericValue, 5).toString();
    
    setSurveyData({
      ...surveyData,
      snack_meals: finalValue
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: () => performLogout() },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    await logout();
  };

  // Helper function to add a new excluded item
  const addExcludedItem = () => {
    if (newExcludedItem.trim()) {
      setSurveyData({
        ...surveyData,
        excluded_items: [...surveyData.excluded_items, newExcludedItem.trim()]
      });
      setNewExcludedItem('');
    }
  };

  // Helper function to remove an excluded item
  const removeExcludedItem = (index: number) => {
    const newItems = [...surveyData.excluded_items];
    newItems.splice(index, 1);
    setSurveyData({...surveyData, excluded_items: newItems});
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* Back Button */}
          <Pressable
            style={styles.leftIconContainer}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.headerText}>Profil</Text>

          {/* Edit or Save Button */}
          <Pressable
            style={styles.rightIconContainer}
            onPress={() => {
              if (isEditing) {
                saveSurveyData();
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "create-outline"} 
              size={24} 
              color="#FFFFFF" 
            />
          </Pressable>
        </View>

        {/* Header Separator */}
        <View style={styles.headerSeparator} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#468f5d" />
            <Text style={styles.loadingText}>Profil yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {/* Profile Content */}
            <View style={styles.content}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle-outline" size={100} color="#468f5d" />
              </View>

              {/* Basic Information */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
                
                {/* Email - Not Editable */}
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>

                {/* First Name */}
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Ad:</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={surveyData.first_name}
                      onChangeText={(text) => setSurveyData({...surveyData, first_name: text})}
                      placeholder="Ad"
                    />
                  ) : (
                    <Text style={styles.infoValue}>{surveyData.first_name}</Text>
                  )}
                </View>

                {/* Birth Date */}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Doğum:</Text>
                  {isEditing ? (
                    <View style={styles.datePickerContainer}>
                      <Pressable
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.datePickerText}>
                          {surveyData.birth_date 
                            ? surveyData.birth_date.toLocaleDateString() 
                            : "Tarih Seç"}
                        </Text>
                      </Pressable>
                      {showDatePicker && (
                        <DateTimePicker
                          value={surveyData.birth_date || new Date()}
                          mode="date"
                          display="default"
                          onChange={handleBirthDateChange}
                        />
                      )}
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.birth_date 
                        ? surveyData.birth_date.toLocaleDateString() 
                        : "Belirtilmemiş"}
                    </Text>
                  )}
                </View>

                {/* Age - Now read-only, auto-calculated */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Yaş:</Text>
                  <Text style={styles.infoValue}>
                    {surveyData.age || "Hesaplanmamış"}
                  </Text>
                </View>
              </View>

              {/* Physical Properties */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Fiziksel Özellikler</Text>
                
                {/* Gender */}
                <View style={styles.infoRow}>
                  <Ionicons name="body-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Cinsiyet:</Text>
                  {isEditing ? (
                    <View style={styles.pickerContainerWrapped}>
                      <Picker
                        selectedValue={surveyData.gender}
                        style={styles.picker}
                        onValueChange={(itemValue) => 
                          setSurveyData({...surveyData, gender: itemValue})
                        }
                        dropdownIconColor="#468f5d"
                      >
                        <Picker.Item label="Erkek" value="male" />
                        <Picker.Item label="Kadın" value="female" />
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.gender === 'male' ? 'Erkek' : 
                       surveyData.gender === 'female' ? 'Kadın' : ''}
                    </Text>
                  )}
                </View>

                {/* Height */}
                <View style={styles.infoRow}>
                  <Ionicons name="resize-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Boy (cm):</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={surveyData.height_cm}
                      onChangeText={(text) => setSurveyData({...surveyData, height_cm: text})}
                      placeholder="Boy (cm)"
                      keyboardType="decimal-pad"
                    />
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.height_cm ? `${surveyData.height_cm} cm` : "Belirtilmemiş"}
                    </Text>
                  )}
                </View>

                {/* Weight */}
                <View style={styles.infoRow}>
                  <Ionicons name="fitness-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Kilo (kg):</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={surveyData.weight}
                      onChangeText={(text) => setSurveyData({...surveyData, weight: text})}
                      placeholder="Kilo (kg)"
                      keyboardType="decimal-pad"
                    />
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.weight ? `${surveyData.weight} kg` : "Belirtilmemiş"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Diet Goals */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Diyet Hedefleri</Text>
                
                {/* Goal */}
                <View style={styles.infoRow}>
                  <Ionicons name="trophy-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Hedef:</Text>
                  
                  {isEditing ? (
                    <View style={styles.pickerContainerWrapped}>
                      <Picker
                        selectedValue={surveyData.goal}
                        style={styles.picker}
                        onValueChange={(itemValue) => 
                          setSurveyData({...surveyData, goal: itemValue})
                        }
                        dropdownIconColor="#468f5d"
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        <Picker.Item label="Kilo Vermek" value="weight_loss" />
                        <Picker.Item label="Kilo Almak" value="weight_gain" />
                        <Picker.Item label="Kilo Korumak" value="maintenance" />
                        <Picker.Item label="Kas Kazanmak" value="muscle_gain" />
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.goal === 'weight_loss' ? 'Kilo Vermek' : 
                       surveyData.goal === 'weight_gain' ? 'Kilo Almak' : 
                       surveyData.goal === 'maintenance' ? 'Kilo Korumak' : 
                       surveyData.goal === 'muscle_gain' ? 'Kas Kazanmak' : 'Belirtilmemiş'}
                    </Text>
                  )}
                </View>

                {/* Dietary Option */}
                <View style={styles.infoRow}>
                  <Ionicons name="nutrition-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Diyet:</Text>
                  {isEditing ? (
                    <View style={styles.pickerContainerWrapped}>
                      <Picker
                        selectedValue={surveyData.dietary_option}
                        style={styles.picker}
                        onValueChange={(itemValue) => 
                          setSurveyData({...surveyData, dietary_option: itemValue})
                        }
                        dropdownIconColor="#468f5d"
                      >
                        <Picker.Item label="Seçiniz" value="" />
                        <Picker.Item label="Hepçil" value="Hepçil" />
                        <Picker.Item label="Vegan" value="Vegan" />
                        <Picker.Item label="Vejetaryen" value="Vejetaryen" />
                        <Picker.Item label="Pesketaryen" value="Pesketaryen" />
                        <Picker.Item label="Fleksiteryan" value="Fleksiteryan" />
                        <Picker.Item label="Ketojonik Diyet" value="Ketojonik Diyet" />
                        <Picker.Item label="Akdeniz Diyeti" value="Akdeniz Diyeti" />
                        <Picker.Item label="Dash Diyeti" value="Dash Diyeti" /> 
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.dietary_option || 'Belirtilmemiş'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Meal Settings - New Section */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Öğün Ayarları</Text>

                        {/* Main Meals Count and Times */}
                        <View>
                          <View style={styles.infoRow}>
                          <Ionicons name="restaurant-outline" size={20} color="#468f5d" />
                          <Text style={styles.infoLabel}>Ana Öğün:</Text>
                          {isEditing ? (
                            <TextInput
                            style={styles.textInput}
                            value={surveyData.main_meals}
                            onChangeText={handleMainMealsChange}
                            placeholder="Ana öğün sayısı"
                            keyboardType="number-pad"
                            maxLength={1}
                            />
                          ) : (
                            <Text style={styles.infoValue}>
                            {surveyData.main_meals === '0' ? '' : surveyData.main_meals || ""}
                            </Text>
                          )}
                          </View>


                  {/* Main Meal Times */}
                  {isEditing && parseInt(surveyData.main_meals) > 0 ? (
                    <View style={styles.timesContainer}>
                      <Text style={styles.timesSectionTitle}>Ana Öğün Saatleri:</Text>
                      {Object.keys(surveyData.meal_times).map((key) => (
                        <TouchableOpacity 
                          key={key} 
                          style={styles.timePickerButton}
                          onPress={() => openTimePicker(key)}
                        >
                          <Text style={styles.timePickerLabel}>{key}:</Text>
                          <Text style={styles.timePickerValue}>
                            {surveyData.meal_times[key]}
                          </Text>
                          <Ionicons name="time-outline" size={20} color="#468f5d" style={styles.timePickerIcon} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : !isEditing && parseInt(surveyData.main_meals) > 0 ? (
                    <View style={styles.timesContainer}>
                      <Text style={styles.timesSectionTitle}>Ana Öğün Saatleri:</Text>
                      {Object.entries(surveyData.meal_times).map(([key, time]) => (
                        <View key={key} style={styles.timeDisplayRow}>
                          <Text style={styles.timeDisplayLabel}>{key}:</Text>
                          <Text style={styles.timeDisplayValue}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Snack Meals Count and Times */}
                <View style={{marginTop: 15}}>
                  <View style={styles.infoRow}>
                    <Ionicons name="cafe-outline" size={20} color="#468f5d" />
                    <Text style={styles.infoLabel}>Ara Öğün:</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={surveyData.snack_meals}
                        onChangeText={handleSnackMealsChange}
                        placeholder="Ara öğün sayısı"
                        keyboardType="number-pad"
                        maxLength={1}
                      />
                    ) : (
                      <Text style={styles.infoValue}>
                        {surveyData.snack_meals === '0' ? '' : surveyData.snack_meals || ""}
                      </Text>
                    )}
                  </View>

                  {/* Snack Times */}
                  {isEditing && parseInt(surveyData.snack_meals) > 0 ? (
                    <View style={styles.timesContainer}>
                      <Text style={styles.timesSectionTitle}>Ara Öğün Saatleri:</Text>
                      {surveyData.snack_times.map((time, index) => (
                        <TouchableOpacity 
                          key={`snack-${index}`} 
                          style={styles.timePickerButton}
                          onPress={() => openTimePicker(`Ara Öğün-${index + 1}`)}
                        >
                          <Text style={styles.timePickerLabel}>Ara Öğün-{index + 1}:</Text>
                          <Text style={styles.timePickerValue}>{time}</Text>
                          <Ionicons name="time-outline" size={20} color="#468f5d" style={styles.timePickerIcon} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : !isEditing && parseInt(surveyData.snack_meals) > 0 ? (
                    <View style={styles.timesContainer}>
                      <Text style={styles.timesSectionTitle}>Ara Öğün Saatleri:</Text>
                      {surveyData.snack_times.map((time, index) => (
                        <View key={`snack-${index}`} style={styles.timeDisplayRow}>
                          <Text style={styles.timeDisplayLabel}>Ara Öğün-{index + 1}:</Text>
                          <Text style={styles.timeDisplayValue}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Excluded Items */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Diyetten Çıkarılacaklar</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="close-circle-outline" size={20} color="#468f5d" />
                  <Text style={styles.infoLabel}>Hariç:</Text>
                  
                  {isEditing ? (
                    <View style={styles.excludedItemsContainer}>
                      {surveyData.excluded_items.map((item, index) => (
                        <View key={index} style={styles.excludedItemChip}>
                          <Text style={styles.excludedItemText}>{item}</Text>
                          <Pressable
                            onPress={() => removeExcludedItem(index)}
                            style={styles.removeItemButton}
                          >
                            <Ionicons name="close-circle" size={16} color="#FF3B30" />
                          </Pressable>
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
                        <Pressable
                          onPress={addExcludedItem}
                          style={styles.addItemButton}
                        >
                          <Ionicons name="add-circle" size={24} color="#468f5d" />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {surveyData.excluded_items.length > 0 
                        ? surveyData.excluded_items.join(', ') 
                        : "Belirtilmemiş"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Logout Button */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed ? styles.logoutButtonPressed : null,
                ]}
              >
                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* Time Picker Modal */}
        <TimePickerModal
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          onSelectTime={handleTimeSelection}
          initialTime={
            activeTimeField?.startsWith('Ana Öğün')
              ? surveyData.meal_times[activeTimeField]
              : activeTimeField?.startsWith('Ara Öğün')
                ? surveyData.snack_times[parseInt(activeTimeField.split('-')[1]) - 1]
                : new Date()
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 50, // Match HomeScreen's padding
    paddingBottom: 10,
    backgroundColor: '#468f5d', // Header color matching HomeScreen
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  headerText: {
    color: '#FFFFFF', // White text for contrast
    fontSize: 24,
    fontWeight: '700',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    backgroundColor: '#468f5d', // Same as header
    padding: 4,
    borderRadius: 20,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    backgroundColor: '#468f5d', // Same as header
    padding: 4,
    borderRadius: 20,
  },
  headerSeparator: {
    height: 2, // Thicker separator
    backgroundColor: '#468f5d', // Same as header
    width: '100%', // Full width
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#468f5d',
  },
  avatarContainer: {
    marginBottom: 20,
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
  infoContainer: {
    width: '100%',
    marginBottom: 30,
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
    color: '#333', // Darker for better readability
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#555', // Slightly lighter than label
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
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerContainerWrapped: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    height: 60,
    // justifyContent: 'center', // Removed this line
    overflow: 'hidden', // Keep this for now, it ensures content fits rounded borders
  },
  picker: {
    height: 60, // Ensure picker takes full height of container
    width: '100%',
    color: '#333', // This should make the text visible
    backgroundColor: 'transparent', // Ensure picker background doesn't clash
  },
  datePickerContainer: {
    flex: 1,
  },
  datePickerButton: {
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: '#555',
  },
  timesContainer: {
    marginLeft: 30,
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#DDD',
  },
  timesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  timePickerLabel: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
    width: 100,
  },
  timePickerValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  timePickerIcon: {
    width: 24,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  timeDisplayLabel: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
    width: 100,
  },
  timeDisplayValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#468f5d',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    backgroundColor: '#468f5d',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#444',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30', // Red background for logout
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 10, 
  },
  logoutButtonPressed: {
    backgroundColor: '#C0392B', // Darker red when pressed
  },
  logoutButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  excludedItemsContainer: {
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
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
});