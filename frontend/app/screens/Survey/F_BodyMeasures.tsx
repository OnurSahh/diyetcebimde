// app/screens/Auth/F_BodyMeasures.tsx
// If your route is named 'BodyMeasures' in your navigation config, then you must export this component as "BodyMeasures".

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../../types';
import { useUser } from '../../context/UserContext'; // Make sure path is correct
import { useMeasurements } from '../../context/MeasurementContext'; // Make sure path is correct
import { useNutrition } from '../../context/NutritionContext'; // Make sure path is correct

// ----- Constants -----
const totalSteps = 13;
const currentStep = 6;
const { width: screenWidth } = Dimensions.get('window');

// ----- Type Definitions -----
type BodyMeasuresNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BodyMeasures'
>;
type BodyMeasuresRouteProp = RouteProp<RootStackParamList, 'BodyMeasures'>;

type Props = {
  navigation: BodyMeasuresNavigationProp;
  route: BodyMeasuresRouteProp;
};

function BodyMeasures({ navigation }: Props) {
  // ----- Context State -----
  const { gender } = useUser();
  const { measurements, updateMeasurements, calculateBodyFat, getDefaultValueFor } = useMeasurements();
  const { bodyFatPercentage } = useNutrition();
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // ----- Local State -----
  // Set "Hayır" (false) as default selected value
  const [knowsBodyFat, setKnowsBodyFat] = useState<boolean>(false);
  const [entryMethod, setEntryMethod] = useState<'direct' | 'measurement' | null>(null);
  const [isNextEnabled, setIsNextEnabled] = useState(true); // Initially true since "Hayır" is selected
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [validationMessages, setValidationMessages] = useState<{[key: string]: string}>({});
  const [typingTimeouts, setTypingTimeouts] = useState<{[key: string]: NodeJS.Timeout}>({});

  // Fields that must be filled if user wants to provide measurements
  const measurementFields = [
    { key: 'neck_size', label: 'Boyun (cm)' },
    { key: 'shoulder_size', label: 'Omuz (cm)' },
    { key: 'upperArm_size', label: 'Üst Kol (cm)' },
    { key: 'chest_size', label: 'Göğüs (cm)' },
    { key: 'waist_size', label: 'Bel (cm)' },
    { key: 'leg_size', label: 'Bacak (cm)' },
  ];

  // ----- Logic to Enable/Disable Next Button -----
  useEffect(() => {
    // If "Hayır" is selected, always enable Next button
    if (knowsBodyFat === false) {
      setIsNextEnabled(true);
      return;
    }
    
    // If "Evet" but no entry method selected, disable Next
    if (entryMethod === null) {
      setIsNextEnabled(false);
      return;
    }
    
    // If direct entry, check body fat field
    if (entryMethod === 'direct') {
      setIsNextEnabled(measurements.bodyFat?.trim() !== '');
      return;
    }
    
    // If measurement entry, check all measurement fields
    if (entryMethod === 'measurement') {
      const allMeasurementsFilled = measurementFields.every(
        (field) => measurements[field.key as keyof typeof measurements]?.trim() !== ''
      );
      setIsNextEnabled(allMeasurementsFilled);
    }
  }, [knowsBodyFat, entryMethod, measurements]);

  // Cleanup for timeouts
  useEffect(() => {
    return () => {
      Object.values(typingTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [typingTimeouts]);

  // ----- Navigation Handlers -----
  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('GenderScreen');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    navigation.navigate('ActivityLevel');
  };

  // ----- Input Change Handler -----
  const validateMeasurement = (name: keyof typeof measurements, value: string) => {
    // Get body part name in Turkish
    const getBodyPartName = (key: string) => {
      const field = measurementFields.find(f => f.key === key);
      return field ? field.label.replace(' (cm)', '') : key;
    };
    
    // Define realistic ranges for each measurement
    const validRanges: {[key: string]: {min: number, max: number}} = {
      neck_size: { min: 25, max: 55 },
      shoulder_size: { min: 80, max: 160 },
      upperArm_size: { min: 20, max: 50 },
      chest_size: { min: 70, max: 160 },
      waist_size: { min: 50, max: 150 },
      leg_size: { min: 30, max: 90 },
      bodyFat: { min: 3, max: 50 }
    };
    
    // Clear any existing message
    setValidationMessages(prev => ({ ...prev, [name]: '' }));
    
    // Skip empty values
    if (!value.trim()) return true;
    
    const numValue = parseFloat(value);
    const range = validRanges[name];
    
    // Check if value is outside realistic range
    if (isNaN(numValue) || numValue < range.min || numValue > range.max) {
      const defaultValue = getDefaultValueFor(name as keyof typeof measurements);
      const bodyPart = getBodyPartName(name);
      
      // More concise Turkish message
      setValidationMessages(prev => ({ 
        ...prev, 
        [name]: `${bodyPart} için ${defaultValue} kullanıyoruz.`
      }));
      
      return false;
    }
    
    return true;
  };

  const handleInputChange = (name: keyof typeof measurements, value: string) => {
    // Always update the measurement value immediately
    updateMeasurements({ [name]: value });
    
    // Clear any existing validation message while typing
    setValidationMessages(prev => ({ ...prev, [name]: '' }));
    
    // Clear previous timeout if exists
    if (typingTimeouts[name]) {
      clearTimeout(typingTimeouts[name]);
    }
    
    // Set new timeout to validate after typing stops
    const newTimeout = setTimeout(() => {
      if (value.trim() !== '') {
        validateMeasurement(name, value);
      }
    }, 800);
    
    // Save the timeout reference
    setTypingTimeouts(prev => ({...prev, [name]: newTimeout}));
    
    // When entering any measurement, recalculate body fat (don't use directly entered value)
    if (name !== 'bodyFat' && value.trim() !== '') {
      updateMeasurements({ bodyFat: '' });
    }
  };

  // ----- Image Source -----
  const imageSource =
    gender === 'Erkek'
      ? require('@assets/images/male_icon.png')
      : require('@assets/images/female_icon.png');

  // ----- Modal Handlers -----
  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContainer}>
            {/* Header: Back Arrow + Progress Bar */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: progressWidth }]} />
              </View>
            </View>

            {/* Title Section */}
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Sizi Biraz Tanıyalım...</Text>
              <View style={styles.titleWithIcon}>
                <Text style={styles.mainTitle}>
                  Gelişme sürecini takip edebilmek için vücut ölçülerinizi alalım...
                </Text>
                <TouchableOpacity onPress={openModal} style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={24} color="#468f5d" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Body Content */}
            <View style={styles.body}>
              {/* Main Question with bold parts */}
              <Text style={styles.questionText}>
                <Text style={styles.boldText}>Vücut yağ oranınızı</Text> biliyor musunuz veya{' '}
                <Text style={styles.boldText}>ölçümlerinizi girerek</Text> hesaplamak ister misiniz?
              </Text>

              {/* Yes/No Options */}
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    knowsBodyFat === true && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setKnowsBodyFat(true);
                    setEntryMethod('direct'); // Automatically select direct entry method
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      knowsBodyFat === true && styles.selectedOptionText,
                    ]}
                  >
                    Evet
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    knowsBodyFat === false && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setKnowsBodyFat(false);
                    setEntryMethod(null);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      knowsBodyFat === false && styles.selectedOptionText,
                    ]}
                  >
                    Hayır
                  </Text>
                </TouchableOpacity>
              </View>

              {/* If user selects "Evet", show the two entry method boxes */}
              {knowsBodyFat === true && (
                <>
                  <Text style={styles.subQuestionText}>Nasıl girmek istersiniz?</Text>
                  <View style={styles.entryMethodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.entryMethodBox,
                        entryMethod === 'direct' && styles.selectedEntryMethod,
                      ]}
                      onPress={() => setEntryMethod('direct')}
                    >
                      <Ionicons 
                        name="calculator-outline" 
                        size={32} 
                        color={entryMethod === 'direct' ? '#fff' : '#468f5d'} 
                      />
                      <Text style={[
                        styles.entryMethodText,
                        entryMethod === 'direct' && styles.selectedEntryMethodText,
                      ]}>
                        Yağ Oranını Doğrudan Gir
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.entryMethodBox,
                        entryMethod === 'measurement' && styles.selectedEntryMethod,
                      ]}
                      onPress={() => setEntryMethod('measurement')}
                    >
                      <Ionicons 
                        name="body-outline" 
                        size={32} 
                        color={entryMethod === 'measurement' ? '#fff' : '#468f5d'} 
                      />
                      <Text style={[
                        styles.entryMethodText,
                        entryMethod === 'measurement' && styles.selectedEntryMethodText,
                      ]}>
                        Vücut Ölçülerini Gir
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Direct body fat entry */}
              {knowsBodyFat === true && entryMethod === 'direct' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Yağ Oranınızı Girin (%):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={measurements.bodyFat}
                    onChangeText={(text) => handleInputChange('bodyFat', text)}
                    placeholder="Örn: 20"
                    placeholderTextColor="#999"
                  />
                  {validationMessages['bodyFat'] && (
                    <Text style={styles.validationMessage}>{validationMessages['bodyFat']}</Text>
                  )}
                </View>
              )}

              {/* Measurement entry */}
              {knowsBodyFat === true && entryMethod === 'measurement' && (
                <>
                  <Text style={styles.questionText}>Lütfen vücut ölçülerinizi giriniz:</Text>
                  <View style={styles.workContainer}>
                    <Image source={imageSource} style={styles.image} />
                    <View style={styles.inputsContainer}>
                      {measurementFields.map((field) => (
                        <View key={field.key} style={styles.singleInputContainer}>
                          <Text style={styles.inputLabel}>{field.label}:</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={measurements[field.key as keyof typeof measurements]}
                            onChangeText={(text) =>
                              handleInputChange(field.key as keyof typeof measurements, text)
                            }
                            placeholder={`Örn: ${getDefaultValueFor(field.key as keyof typeof measurements)}`}
                            placeholderTextColor="#999"
                          />
                          {validationMessages[field.key] && (
                            <Text style={styles.validationMessage}>{validationMessages[field.key]}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Footer (Next Button) */}
          <View style={styles.footerContainer}>
            {knowsBodyFat === true && entryMethod === 'measurement' && bodyFatPercentage !== null && (
              <View style={styles.calculatedBodyFatContainer}>
                <Text style={styles.calculatedBodyFatLabel}>Hesaplanan Yağ Oranı:</Text>
                <Text style={styles.calculatedBodyFatValue}>
                  {bodyFatPercentage.toFixed(1)}%
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.nextButton, !isNextEnabled && styles.disabledNextButton]}
              onPress={handleNext}
              disabled={!isNextEnabled}
            >
              <Text style={styles.nextButtonText}>İleri</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Info Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={closeModal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Neden Bu Bilgiyi İstiyoruz?</Text>
              <Text style={styles.modalText}>
                Vücut ölçüleri, sağlık analizleri ve kişiselleştirilmiş diyet programları oluşturmak
                için önemlidir. Bu bilgiler, gelişme sürecinizi daha iyi takip etmemize ve size en
                uygun önerileri sunmamıza yardımcı olur.
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default BodyMeasures;

// ----- Styles -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
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

  /***** Title Area *****/
  titleContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    flexWrap: 'wrap',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    marginLeft: 8,
  },

  /***** Body Area *****/
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  subQuestionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  optionButton: {
    width: screenWidth * 0.4,
    paddingVertical: 15,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', // Default background
  },
  selectedOption: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  optionText: {
    fontSize: 18,
    color: '#000',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  entryMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 20,
  },
  entryMethodBox: {
    width: '48%',
    aspectRatio: 0.9,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#468f5d',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEntryMethod: {
    backgroundColor: '#468f5d',
  },
  entryMethodText: {
    marginTop: 10,
    fontSize: 15,
    textAlign: 'center',
    color: '#333',
  },
  selectedEntryMethodText: {
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '52%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  workContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  image: {
    width: '60%',
    height: screenWidth * 1.5,
    resizeMode: 'contain',
    marginRight: 10,
  },
  inputsContainer: {
    width: '60%',
  },
  singleInputContainer: {
    marginBottom: 20, // Increase from 15 to give more space for error messages
    width: '100%',
  },

  /***** Footer: İleri Button *****/
  footerContainer: {
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 20,
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
  disabledNextButton: {
    backgroundColor: '#a5d6a7', // Lighter green for disabled state
  },

  /***** Modal Styles *****/
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalCloseButton: {
    backgroundColor: '#468f5d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  /***** Calculated Body Fat Styles *****/
  calculatedBodyFatContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  calculatedBodyFatLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  calculatedBodyFatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#468f5d',
  },

  /***** Validation Message Styles *****/
  validationMessage: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 5,
    textAlign: 'left', // Change from 'center' to 'left'
    width: '100%',
    paddingHorizontal: 2,
    paddingLeft: 0, // Add some left padding
  },
});
