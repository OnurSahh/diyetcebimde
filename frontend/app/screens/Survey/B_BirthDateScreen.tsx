// app/screens/Auth/B_BirthDateScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import { RootStackParamList } from '../../../types';

// Constants
const totalSteps = 13;
const currentStep = 2;
const { width: screenWidth } = Dimensions.get('window');

type B_BirthDateScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BirthDateScreen'
>;
type B_BirthDateScreenRouteProp = RouteProp<RootStackParamList, 'BirthDateScreen'>;

type Props = {
  navigation: B_BirthDateScreenNavigationProp;
  route: B_BirthDateScreenRouteProp;
};

const B_BirthDateScreen: React.FC<Props> = ({ navigation }) => {
  const { birthDate, setBirthDate, setAge } = useUser();

  // Ensure birthDate is a valid Date object or default to Jan 1, 2000
  const initialDate = birthDate instanceof Date ? birthDate : new Date(2000, 0, 2);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [tempDate, setTempDate] = useState<Date>(initialDate);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add a useEffect to set the default birthDate in the context when component mounts
  useEffect(() => {
    // If birthDate is null or undefined, set it to the default Jan 1, 2000
    if (!birthDate) {
      const defaultDate = new Date(2000, 0, 1); // Jan 1, 2000
      setBirthDate(defaultDate);
      setSelectedDate(defaultDate);
    }
  }, []); // Empty dependency array means this runs only once when component mounts

  // Calculate progress fill
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // Age recalculation
  useEffect(() => {
    if (selectedDate) {
      const now = new Date();
      let ageCalculated = now.getFullYear() - selectedDate.getFullYear();
      const monthDiff = now.getMonth() - selectedDate.getMonth();
      const dayDiff = now.getDate() - selectedDate.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        ageCalculated -= 1;
      }
      setAge(ageCalculated);
    }
  }, [selectedDate, setAge]);

  const handleAgeChange = (newAge: number) => {
    // Set the age
    setAge(newAge);
    
    // Also set a corresponding birthDate if it's not already set
    if (!birthDate) {
      const today = new Date();
      const birthYear = today.getFullYear() - newAge;
      // Set to January 1st of birth year as an approximation
      setBirthDate(new Date(birthYear, 0, 1));
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('NameScreen');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    navigation.navigate('HeightScreen');
  };

  // Date picker handling
  const openPicker = () => {
    if (Platform.OS === 'ios') {
      setTempDate(selectedDate || new Date());
      setShowDatePickerModal(true);
    } else {
      // For Android, just show the native date picker
      setShowDatePicker(true);
    }
  };

  const closePickerModal = () => {
    setShowDatePickerModal(false);
  };

  const handleDateChange = (event: any, date?: Date) => {
    // On Android, closing the picker produces an undefined date
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
        setBirthDate(date);
      }
    } else {
      // iOS handling
      if (date) {
        setTempDate(date);
      }
    }
  };

  const handleConfirmDate = () => {
    setSelectedDate(tempDate);
    setBirthDate(tempDate);
    setShowDatePickerModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>

        {/* Header container */}
        <View style={styles.headerContainer}>
          {/* Back Arrow */}
          <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Sizi Biraz Tanıyalım...</Text>
          <Text style={styles.mainTitle}>Doğum gününüzü öğrenebilir miyiz?</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.selectedDateText}>
            {selectedDate.toLocaleDateString()}
          </Text>

          <TouchableOpacity style={styles.dateButton} onPress={openPicker}>
            <Ionicons name="calendar" size={24} color="#fff" />
            <Text style={styles.dateButtonText}>Tarih Seç</Text>
          </TouchableOpacity>
        </View>

        {/* Footer (Next) */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.nextButton, { opacity: selectedDate ? 1 : 0.5 }]}
            onPress={handleNext}
            disabled={!selectedDate}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* For Android, show the native date picker directly */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Modal for iOS DatePicker only */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePickerModal}
          transparent
          animationType="fade"
          onRequestClose={closePickerModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  onChange={handleDateChange}
                  maximumDate={new Date()} // Prevent future dates
                  minimumDate={new Date(1900, 0, 1)} // Set a reasonable minimum date
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  style={styles.datePicker}
                  textColor="#ffffff"
                />
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closePickerModal}>
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDate}>
                  <Text style={styles.confirmButtonText}>Onayla</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default B_BirthDateScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
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
  progressBarBackground: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#468f5d', // Themed green
    borderRadius: 5,
  },
  /******** TITLE AREA ********/
  titleContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  /******** BODY ********/
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#468f5d',
    marginBottom: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#468f5d',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 8,
  },
  /******** FOOTER ********/
  footerContainer: {
    paddingVertical: 10,
  },
  nextButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  /******** MODAL ********/
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#000035', // Full Blue
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  datePickerWrapper: {
    backgroundColor: '#000035',
    borderRadius: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  datePicker: {
    width: '100%',
    ...(Platform.OS === 'ios' ? { height: 200 } : {}),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
