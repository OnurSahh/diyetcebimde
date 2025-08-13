// app/screens/Survey/K_HMTEating.tsx

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { useMeals } from '../../context/MealsContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Default meal times
const DEFAULT_MEAL_TIMES = {
  breakfast: '08:00',
  brunch: '10:30',
  lunch: '13:00',
  afternoon: '16:00',
  dinner: '19:00',
};

const totalSteps = 13;
const currentStep = 11;

type K_HMTEatingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HMTEating'>;

type Props = {
  navigation: K_HMTEatingNavigationProp;
};

const K_HMTEating: React.FC<Props> = ({ navigation }) => {
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  const {
    mainMeals,
    setMainMeals,
    mealTimes,
    setMealTimes,
    setMealTime,
    mealTypes,
    setMealTypes,
    setMealType,
  } = useMeals();

  // Time Picker state
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [currentMealIndex, setCurrentMealIndex] = useState<number | null>(null);

  // Ref for scrolling if needed
  const scrollViewRef = useRef<ScrollView>(null);

  // Set default value of 3 when component mounts
  useEffect(() => {
    if (mainMeals === null) {
      handleMainMealsChange('3');
    }
  }, []);

  // Navigation handlers  
  const handleBack = () => {
    navigation.navigate('Diet'); // Navigate back to DietaryType
  };
  const handleNext = () => {
    navigation.navigate('SnackMeals'); // Go to SnackMeals instead of skipping it
  };

  // Render dynamic meal pickers based on the number of main meals
  const renderMealPickers = () => {
    if (!mainMeals || mainMeals <= 0) return null;

    return Array.from({ length: mainMeals }).map((_, index) => {
      const mealId = `Ana Öğün-${index + 1}`;
      const selectedTime = mealTimes[mealId] || '';
      const selectedType = (mealTypes[mealId] || '') as 'breakfast' | 'brunch' | 'lunch' | 'afternoon' | 'dinner' | '';

      return (
        <View key={index} style={styles.mealContainer}>
          {/* Time Picker */}
          <View style={styles.timePickerContainer}>
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => {
              setCurrentMealIndex(index);
              setTimePickerVisible(true);
            }}
          >
            <Ionicons name="time-outline" size={28} color="#468f5d" />
          </TouchableOpacity>
            <Text style={styles.timePickerLabel}>
              {`${index + 1}. Ana Öğün: ${selectedTime || 'Saat Seçin'}`}
            </Text>
          </View>

          {/* Meal Type Selection */}
          <View style={styles.mealTypeQuestion}>
            <Text style={styles.mealTypeQuestionText}>
              Bu öğünü ne olarak yapıyorsunuz?
            </Text>
            
            <View style={styles.mealTypeGrid}>
              <TouchableOpacity
                style={[
                  styles.mealTypeButton,
                  selectedType === 'breakfast' && styles.mealTypeSelected,
                ]}
                onPress={() => handleMealTypeSelection(mealId, 'breakfast')}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selectedType === 'breakfast' && styles.mealTypeTextSelected,
                  ]}
                >
                  Kahvaltı
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mealTypeButton,
                  selectedType === 'brunch' && styles.mealTypeSelected,
                ]}
                onPress={() => handleMealTypeSelection(mealId, 'brunch')}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selectedType === 'brunch' && styles.mealTypeTextSelected,
                  ]}
                >
                  Geç Kahvaltı
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mealTypeButton,
                  selectedType === 'lunch' && styles.mealTypeSelected,
                ]}
                onPress={() => handleMealTypeSelection(mealId, 'lunch')}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selectedType === 'lunch' && styles.mealTypeTextSelected,
                  ]}
                >
                  Öğle Yemeği
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mealTypeButton,
                  selectedType === 'afternoon' && styles.mealTypeSelected,
                ]}
                onPress={() => handleMealTypeSelection(mealId, 'afternoon')}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selectedType === 'afternoon' && styles.mealTypeTextSelected,
                  ]}
                >
                  İkindi Yemeği
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mealTypeButton,
                  selectedType === 'dinner' && styles.mealTypeSelected,
                ]}
                onPress={() => handleMealTypeSelection(mealId, 'dinner')}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    selectedType === 'dinner' && styles.mealTypeTextSelected,
                  ]}
                >
                  Akşam Yemeği
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    });
  };

  // Fix the meal type selection handler
  const handleMealTypeSelection = (mealId: string, type: 'breakfast' | 'brunch' | 'lunch' | 'afternoon' | 'dinner') => {
    // Set the meal type directly without filtering
    // Type assertion to match what setMealType expects
    setMealType(mealId, type as any);
    
    // Update the time to match the meal type's default time
    setMealTime(mealId, DEFAULT_MEAL_TIMES[type]);
  };

  // Confirm the selected time
  const handleTimeConfirm = (time: Date) => {
    if (currentMealIndex !== null && mainMeals !== null) {
      const mealId = `Ana Öğün-${currentMealIndex + 1}`;
      const formattedTime = `${time.getHours().toString().padStart(2, '0')}:${time
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      setMealTime(mealId, formattedTime);
      setCurrentMealIndex(null);
      setTimePickerVisible(false);
    }
  };

  // Check if all meals have both a time and a meal type selected
  const areAllMealsFilled = () => {
    if (!mainMeals || mainMeals <= 0) return false;
    for (let i = 1; i <= mainMeals; i++) {
      const mealId = `Ana Öğün-${i}`;
      if (!mealTimes[mealId] || mealTimes[mealId].trim() === '') return false;
      if (!mealTypes[mealId] || mealTypes[mealId].trim() === '') return false;
    }
    return true;
  };

  // Updated onChangeText for mainMeals: Prepopulate defaults if not already set
  const handleMainMealsChange = (text: string) => {
    const count = parseInt(text, 10);
    if (isNaN(count)) {
      setMainMeals(null);
      setMealTimes({});
      setMealTypes({});
    } else {
      setMainMeals(count);
      // Create fresh objects instead of copying existing ones
      const newMealTimes: Record<string, string> = {};
      const newMealTypes: Record<string, string> = {};

      // Default meal distribution for convenience
      let mealDefaults;

      switch (count) {
        case 1:
          mealDefaults = ['dinner'];
          break;
        case 2:
          mealDefaults = ['breakfast', 'dinner'];
          break;
        case 3:
          mealDefaults = ['breakfast', 'lunch', 'dinner'];
          break;
        case 4:
          mealDefaults = ['breakfast', 'lunch', 'afternoon', 'dinner'];
          break;
        case 5:
          mealDefaults = ['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner'];
          break;
        default:
          mealDefaults = ['breakfast', 'lunch', 'dinner'];
      }

      // Apply defaults only for the current count
      for (let i = 1; i <= count; i++) {
        const mealId = `Ana Öğün-${i}`;
        const defaultType = mealDefaults[i - 1] || 'lunch';

        // Preserve existing values if they exist, otherwise use defaults
        if (mealId in mealTimes && mealTimes[mealId] !== '00:00') {
          newMealTimes[mealId] = mealTimes[mealId];
        } else {
          newMealTimes[mealId] = DEFAULT_MEAL_TIMES[defaultType as keyof typeof DEFAULT_MEAL_TIMES];
        }

        if (mealId in mealTypes) {
          newMealTypes[mealId] = mealTypes[mealId];
        } else {
          newMealTypes[mealId] = defaultType;
        }
      }

      setMealTimes(newMealTimes);
      setMealTypes(newMealTypes as any);
    }
  };

  // isNextEnabled: Check if all main meals have both a time and a meal type
  const isNextEnabled = mainMeals !== null && mainMeals > 0 && areAllMealsFilled();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
            <Text style={styles.backButtonText}>{"<"}</Text>
          </TouchableOpacity>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Section Titles */}
        <Text style={styles.sectionTitle}>Öğünler</Text>
        <Text style={styles.mainTitle}>Ana Öğünlerinizi Belirleyin</Text>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.questionText}>Günde kaç ana öğün yapıyorsunuz?</Text>

          {/* Number selection buttons */}
          <View style={styles.numberButtonsContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.numberButton,
                  mainMeals === num && styles.selectedNumberButton,
                ]}
                onPress={() => handleMainMealsChange(num.toString())}
              >
                <Text
                  style={[
                    styles.numberButtonText,
                    mainMeals === num && styles.selectedNumberButtonText,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderMealPickers()}
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !isNextEnabled && styles.disabledNextButton]}
            onPress={handleNext}
            disabled={!isNextEnabled}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export default K_HMTEating;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  /***** Header: Back Arrow + Progress Bar *****/
  headerContainer: {
    marginTop: 30,
    marginBottom: 20,
    height: 10, // Fixed height for arrow + progress bar
    position: 'relative',
  },
  backArrow: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#468f5d',
    borderRadius: 5,
  },
  /***** Section Titles *****/
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  /***** Body *****/
  body: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 18,
    color: '#333',
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  /***** Meal Pickers *****/
  mealContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  timePickerButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: '20%',
    height: 50,
    justifyContent: 'center',
    marginHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  icon: {
    width: '90%',
    resizeMode: 'contain',
  },
  timePickerLabel: {
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
    color: '#333',
  },
  mealTypeQuestion: {
    marginTop: 10,
  },
  mealTypeQuestionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  mealTypeGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: 5,
  },
  mealTypeScrollContainer: {
    marginTop: 10,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
    gap: 5,
  },
mealTypeButton: {
  width: '48%', // Two buttons per row
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#4CAF50',
  borderRadius: 10,
  backgroundColor: '#f8f8f8',
},
  mealTypeSelected: {
    backgroundColor: '#4CAF50',
  },
mealTypeText: {
  fontSize: 14,
  textAlign: 'center',
  color: '#4CAF50',
},
mealTypeTextSelected: {
  color: '#fff',
  fontWeight: '500',
},
  /***** Footer: Next Button *****/
  footerContainer: {
    paddingVertical: 10,
  },
  nextButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledNextButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  numberButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    gap: 10,
  },
  numberButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedNumberButton: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedNumberButtonText: {
    color: '#fff',
  },
});
