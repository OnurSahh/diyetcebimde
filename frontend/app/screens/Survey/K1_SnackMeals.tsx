// app/screens/Survey/SnackMeals.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import { useMeals } from '../../context/MealsContext';
import { useHabits } from '../../context/HabitContext';
import Ionicons from 'react-native-vector-icons/Ionicons';


const totalSteps = 13;
const currentStep = 12;

type SnackMealsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SnackMeals'>;
type SnackMealsRouteProp = RouteProp<RootStackParamList, 'SnackMeals'>;

type Props = {
  navigation: SnackMealsNavigationProp;
  route: SnackMealsRouteProp;
};

// Default snack times positioned between main meals
const DEFAULT_SNACK_TIMES = [
  '11:00', // Mid-morning (between breakfast 09:00 and lunch 13:00)
  '16:00', // Afternoon (between lunch 13:00 and dinner 19:00)
  '21:00'  // Evening (after dinner 19:00)
];

const SnackMeals: React.FC<Props> = ({ navigation }) => {
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;
  // Handle totalEnergy which may be null
  const { totalEnergy } = useHabits();
  const energy = totalEnergy ?? 0;
  
  const { snackMeals, setSnackMeals } = useMeals();

  const [isDatePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [selectedSnackIndex, setSelectedSnackIndex] = useState<number | null>(null);
  const [isNextEnabled, setIsNextEnabled] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

// Add this useEffect right after the state declarations
useEffect(() => {
  // Set default preference to 'no' when component first loads
  if (!snackMeals.preference) {
    setSnackMeals(prev => ({
      ...prev,
      preference: 'no',
      count: null,
      times: []
    }));
  }
}, []); // Empty dependency array ensures this only runs once on mount

  // Update next button state based on snack preference and snack times
  useEffect(() => {
    if (snackMeals.preference === 'no') {
      setIsNextEnabled(true);
    } else if (snackMeals.preference === 'yes' && snackMeals.count !== null) {
      const allTimesSet =
        snackMeals.times.length === snackMeals.count &&
        snackMeals.times.every((time) => time && time !== '');
      setIsNextEnabled(allTimesSet);
    } else {
      setIsNextEnabled(false);
    }
  }, [snackMeals]);

  useEffect(() => {
    console.log('Snack meals count updated:', snackMeals.count);
    console.log('Snack meals times:', snackMeals.times.length, snackMeals.times);
  }, [snackMeals.count, snackMeals.times]);

  const handleBack = () => {
    navigation.navigate('HMTEating');
  };

  const handleNext = () => {
    navigation.navigate('AdditionalEating');
  };

  const handleSetPreference = (preference: 'yes' | 'no') => {
    if (preference === 'yes') {
      // Update state without setting a default count
      setSnackMeals((prev) => {
        return {
          ...prev,
          preference,
          // Keep existing count if it exists, otherwise set to null
          count: prev.count,
          // Keep existing times if they exist
          times: prev.times,
        };
      });
    } else {
      // If user selects "No", clear count and times
      setSnackMeals((prev) => ({
        ...prev,
        preference,
        count: null,
        times: [],
      }));
    }
  };

const handleSetCount = (count: number | null) => {
  if (count === null) {
    setSnackMeals((prev) => ({
      ...prev,
      count,
      times: [],
    }));
    return;
  }
  
  setSnackMeals((prev) => {
    // Create a fresh times array of exactly the right length
    const newTimes = Array(count).fill('');
    
    // Preserve existing times where possible
    for (let i = 0; i < count; i++) {
      if (i < prev.times.length && prev.times[i] && prev.times[i] !== '') {
        newTimes[i] = prev.times[i];
      } else {
        // Use default times for new slots
        newTimes[i] = DEFAULT_SNACK_TIMES[i] || '';
      }
    }
    
    return {
      ...prev,
      count: count, // Explicitly ensure count is updated with the new value
      times: newTimes, // This array will have exactly 'count' elements
    };
  });
};

  // Update the handleTimeConfirm function to ensure minutes are in 15-minute intervals
  const handleTimeConfirm = (date: Date) => {
    if (selectedSnackIndex !== null) {
      // Ensure minutes are at 15-minute intervals (0, 15, 30, 45)
      const minutes = date.getMinutes();
      const roundedMinutes = Math.round(minutes / 15) * 15 % 60;
      
      date.setMinutes(roundedMinutes);
      
      const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
        
      setSnackMeals((prev) => {
        const updatedTimes = [...prev.times];
        updatedTimes[selectedSnackIndex] = formattedTime;
        return { ...prev, times: updatedTimes };
      });
      
      setSelectedSnackIndex(null);
      setDatePickerVisible(false);
    }
  };

  // Update the showTimePicker function to round minutes to the nearest 15-minute interval
  const showTimePicker = (index: number) => {
    setSelectedSnackIndex(index);
    
    // If there's already a time set for this index, use it as starting value
    if (snackMeals.times[index] && snackMeals.times[index] !== '') {
      const [hours, minutes] = snackMeals.times[index].split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      setCurrentTime(date);
    } else {
      // Otherwise use current time, but round minutes to nearest 15-minute interval
      const date = new Date();
      const mins = date.getMinutes();
      const roundedMins = Math.round(mins / 15) * 15 % 60;
      date.setMinutes(roundedMins);
      setCurrentTime(date);
    }
    
    setDatePickerVisible(true);
  };

  const renderSnackTimeInputs = (count: number) => (
    <View style={styles.snackTimesContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.snackTimeRow}>
          <Text style={styles.snackTimeLabel}>Ara Öğün {index + 1}:</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => showTimePicker(index)}>
            <Ionicons name="time-outline" size={22} color="#468f5d" />
            <Text style={styles.timeText}>
              {snackMeals.times[index] ? snackMeals.times[index] : 'Seç'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderSnackSuggestion = () => {
    let message = '';
    if (energy >= 2300) {
      message = 'Enerji harcamanız yüksek. Beslenmenizi desteklemek için 2 ara öğün önerilir.';
    } else if (energy >= 1500 && energy < 2300) {
      message = 'Orta seviyede enerji harcıyorsunuz. 1 ara öğün denge sağlayabilir.';
    } else {
      message = 'Enerji harcamanız düşük. Ara öğün gerekmeyebilir, ancak ekleyebilirsiniz.';
    }
    
    return (
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionText}>{message}</Text>
        <View style={styles.preferenceContainer}>
          <TouchableOpacity
            style={[
              styles.prefButton,
              snackMeals.preference === 'yes' && styles.prefSelected,
            ]}
            onPress={() => handleSetPreference('yes')}
          >
            <Text
              style={[
                styles.prefText,
                snackMeals.preference === 'yes' && styles.prefTextSelected,
              ]}
            >
              Evet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.prefButton,
              snackMeals.preference === 'no' && styles.prefSelected,
            ]}
            onPress={() => handleSetPreference('no')}
          >
            <Text
              style={[
                styles.prefText,
                snackMeals.preference === 'no' && styles.prefTextSelected,
              ]}
            >
              Hayır
            </Text>
          </TouchableOpacity>
        </View>
        {snackMeals.preference === 'yes' && (
          <View style={styles.countContainer}>
            <Text style={styles.countLabel}>Ara öğün sayınızı seçin:</Text>
            
            {/* Number selection buttons */}
            <View style={styles.numberButtonsContainer}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numberButton,
                    snackMeals.count === num && styles.selectedNumberButton
                  ]}
                  onPress={() => handleSetCount(num)}
                >
                  <Text 
                    style={[
                      styles.numberButtonText,
                      snackMeals.count === num && styles.selectedNumberButtonText
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {snackMeals.count !== null && renderSnackTimeInputs(snackMeals.count)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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
        <Text style={styles.sectionTitle}>Ara Öğünler</Text>
        <Text style={styles.mainTitle}>Ara Öğünlerinizi Belirleyin</Text>

        {/* Body */}
        <View style={styles.body}>
          {renderSnackSuggestion()}
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
      {isDatePickerVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Ara Öğün Saati</Text>
              
              <View style={styles.timePickerContainer}>
                {/* Hours */}
                <View style={styles.timePickerColumn}>
                  <TouchableOpacity 
                    style={styles.timeArrow}
                    onPress={() => {
                      const newDate = new Date(currentTime);
                      newDate.setHours((currentTime.getHours() + 23) % 24);
                      setCurrentTime(newDate);
                    }}
                  >
                    <Text style={styles.timeArrowText}>▲</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.timeValue}>
                    <Text style={styles.timeValueText}>
                      {currentTime.getHours().toString().padStart(2, '0')}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.timeArrow}
                    onPress={() => {
                      const newDate = new Date(currentTime);
                      newDate.setHours((currentTime.getHours() + 1) % 24);
                      setCurrentTime(newDate);
                    }}
                  >
                    <Text style={styles.timeArrowText}>▼</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.timeSeparator}>:</Text>
                
                {/* Minutes */}
                <View style={styles.timePickerColumn}>
                  <TouchableOpacity 
                    style={styles.timeArrow}
                    onPress={() => {
                      const newDate = new Date(currentTime);
                      // Get current minutes and find the previous 15-minute interval
                      let minutes = currentTime.getMinutes();
                      let newMinutes;
                      
                      // If current minutes is 0, go to 45
                      if (minutes === 0) {
                        newMinutes = 45;
                      }
                      // If current minutes is 15, go to 0
                      else if (minutes === 15) {
                        newMinutes = 0;
                      }
                      // If current minutes is 30, go to 15
                      else if (minutes === 30) {
                        newMinutes = 15;
                      }
                      // If current minutes is 45, go to 30
                      else if (minutes === 45) {
                        newMinutes = 30;
                      }
                      // If minutes is not exactly on a 15-min interval, round down to the previous one
                      else {
                        newMinutes = Math.floor(minutes / 15) * 15;
                      }
                      
                      newDate.setMinutes(newMinutes);
                      setCurrentTime(newDate);
                    }}
                  >
                    <Text style={styles.timeArrowText}>▲</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.timeValue}>
                    <Text style={styles.timeValueText}>
                      {currentTime.getMinutes().toString().padStart(2, '0')}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.timeArrow}
                    onPress={() => {
                      const newDate = new Date(currentTime);
                      // Get current minutes and find the next 15-minute interval
                      let minutes = currentTime.getMinutes();
                      let newMinutes;
                      
                      // If current minutes is 0, go to 15
                      if (minutes === 0) {
                        newMinutes = 15;
                      }
                      // If current minutes is 15, go to 30
                      else if (minutes === 15) {
                        newMinutes = 30;
                      }
                      // If current minutes is 30, go to 45
                      else if (minutes === 30) {
                        newMinutes = 45;
                      }
                      // If current minutes is 45, go to 0
                      else if (minutes === 45) {
                        newMinutes = 0;
                      }
                      // If minutes is not exactly on a 15-min interval, round up to the next one
                      else {
                        newMinutes = Math.ceil(minutes / 15) * 15 % 60;
                      }
                      
                      newDate.setMinutes(newMinutes);
                      setCurrentTime(newDate);
                    }}
                  >
                    <Text style={styles.timeArrowText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setDatePickerVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => handleTimeConfirm(currentTime)}
                >
                  <Text style={styles.confirmButtonText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default SnackMeals;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  /***** Header *****/
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
  suggestionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  preferenceContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  prefButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 5,
  },
  prefSelected: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  prefText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  prefTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  countContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  numberButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  numberButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 5,
  },
  selectedNumberButton: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  numberButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedNumberButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  snackTimesContainer: {
    marginTop: 10,
  },
  snackTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  snackTimeLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#468f5d',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
    width: '60%',
  },
  timeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  /***** Footer *****/
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
  /***** Modal Styles *****/
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#000035',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timePickerColumn: {
    alignItems: 'center',
  },
  timeArrow: {
    padding: 10,
  },
  timeArrowText: {
    fontSize: 18,
    color: '#fff',
  },
  timeValue: {
    marginVertical: 5,
  },
  timeValueText: {
    fontSize: 24,
    color: '#fff',
  },
  timeSeparator: {
    fontSize: 24,
    color: '#fff',
    marginHorizontal: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 10,
    backgroundColor: '#ccc',
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 10,
    backgroundColor: '#468f5d',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
