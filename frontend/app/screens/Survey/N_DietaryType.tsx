// app/screens/Survey/N_DietaryType.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import { useDietary } from '../../context/DietaryContext';

const totalSteps = 13;
const currentStep = 10;
const { width: screenWidth } = Dimensions.get('window');

type N_DietaryTypeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DietaryType'>;
type N_DietaryTypeRouteProp = RouteProp<RootStackParamList, 'DietaryType'>;

type Props = {
  navigation: N_DietaryTypeNavigationProp;
  route: N_DietaryTypeRouteProp;
};

const N_DietaryType: React.FC<Props> = ({ navigation }) => {
  const { selectedOption, otherDiet, setSelectedOption, setOtherDiet } = useDietary();
  const [isNextEnabled, setIsNextEnabled] = useState<boolean>(false);

  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  const options = [
    { title: 'Hepçil', info: 'Her türden gıdayı tüketirsiniz.' },
    { title: 'Vegan', info: 'Sadece bitkisel kaynaklı beslenirsiniz.' },
    { title: 'Vejetaryen', info: 'Hayvansal et ürünlerini tüketmezsiniz.' },
    { title: 'Pesketaryen', info: 'Et tüketmezsiniz, ancak balık tüketirsiniz.' },
    { title: 'Fleksiteryan', info: 'Çoğunlukla bitkisel beslenir, ara sıra et tüketirsiniz.' },
    { title: 'Ketojonik Diyet', info: 'Düşük karbonhidrat, yüksek yağ diyetidir.' },
    { title: 'Akdeniz Diyeti', info: 'Sağlıklı yağlar, sebze, balık ve tahıl ağırlıklıdır.' },
    { title: 'Dash Diyeti', info: 'Düşük tuz, tansiyon kontrol odaklı diyet.' },
    { title: 'Diğer', info: '' },
  ];

  // Set default value when component mounts
  useEffect(() => {
    // If no option is currently selected, set "Hepçil" as default
    if (!selectedOption) {
      setSelectedOption('Hepçil');
    }
  }, []);

  useEffect(() => {
    // Enable next if an option is selected and, for "Diğer", if the text is nonempty.
    setIsNextEnabled(!!selectedOption && (selectedOption !== 'Diğer' || otherDiet.trim() !== ''));
  }, [selectedOption, otherDiet]);


  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('HealthStatues');
  };

  const handleNext = () => {
    navigation.navigate('HMTEating');
  };

  const handleOptionPress = (option: string) => {
    setSelectedOption(option);
    if (option !== 'Diğer') {
      setOtherDiet('');
    }
  };

  const showInfo = (info: string) => {
    Alert.alert('Diyet Bilgisi', info);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header: Back Arrow + Progress Bar */}
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
              <Text style={styles.backButtonText}>{'<'}</Text>
            </TouchableOpacity>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>

          {/* Title Area */}
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>Alışkanlıklar</Text>
            <Text style={styles.mainTitle}>
              Hangisi beslenme tipinize daha çok hitap ediyor?
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.title}
                style={styles.optionRow}
                onPress={() => handleOptionPress(option.title)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionText}>{option.title}</Text>
                {option.info ? (
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => showInfo(option.info)}
                  >
                    <Text style={styles.infoButtonText}>ℹ️</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    selectedOption === option.title && styles.selectedCheckbox,
                  ]}
                  onPress={() => handleOptionPress(option.title)}
                  activeOpacity={0.8}
                >
                  {selectedOption === option.title && <Text style={styles.checkmark}>✔</Text>}
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {selectedOption === 'Diğer' && (
              <TextInput
                style={styles.textInput}
                placeholder="Lütfen belirtin"
                placeholderTextColor="#555"
                value={otherDiet}
                onChangeText={setOtherDiet}
              />
            )}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default N_DietaryType;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background
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
  /***** Title Area *****/
  titleContainer: {
    marginBottom: 30,
    alignItems: 'center',
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
  /***** Options *****/
  optionsContainer: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  infoButton: {
    marginHorizontal: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#faf3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckbox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    fontSize: 18,
    color: '#fff',
  },
  textInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
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
});
