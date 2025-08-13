// app/screens/Survey/I_HealthStatues.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import { useHealth } from '../../context/HealthContext';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

type I_HealthStatuesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HealthStatues'>;
type I_HealthStatuesRouteProp = RouteProp<RootStackParamList, 'HealthStatues'>;

type Props = {
  navigation: I_HealthStatuesNavigationProp;
  route: I_HealthStatuesRouteProp;
};

const healthConditionsList = [
  'Spesifik bir rahatsızlığım yok',
  'Obezite',
  'Anoreksiya Nervoza',
  'Bulimia Nervoza',
  'Yeme Bağımlılığı',
  'Tip 1 Diyabet',
  'Tip 2 Diyabet',
  'Tiroid Bozuklukları (Hipotiroidizm, Hipertiroidizm)',
  'İrritabl Bağırsak Sendromu (IBS)',
  'Celiac Hastalığı',
  'Crohn Hastalığı',
  'Mide ve Bağırsak Ülserleri',
  'Yüksek Kolesterol',
  'Kalp Hastalıkları',
  'Hipertansiyon',
  'Kanser',
  'Depresyon',
  'Anksiyete',
  'Alkol Bağımlılığı',
  'Yetersiz Beslenme (Malnütrisyon)',
  'Uyku Bozuklukları',
];

const I_HealthStatues: React.FC<Props> = ({ navigation }) => {
  const { healthConditions, updateHealthConditions, setHealthConditions } = useHealth();
  const [isNextEnabled, setIsNextEnabled] = useState<boolean>(false);
  // For consistency, we use a fixed progress width here (step 9 of 13)
  const progressWidth = `${(9 / 13) * 100}%`;

  // Set default value when component mounts
  useEffect(() => {
    // Check if no condition is selected
    const anyConditionSelected = Object.values(healthConditions).some(value => value === true);
    
    // If no condition is selected, set "Spesifik bir rahatsızlığım yok" as default
    if (!anyConditionSelected) {
      const defaultConditions: { [key: string]: boolean } = {};
      healthConditionsList.forEach((condition) => {
        defaultConditions[condition] = condition === 'Spesifik bir rahatsızlığım yok';
      });
      setHealthConditions(defaultConditions);
    }
  }, []);

  // Existing code for handleBack, handleNext, etc.
  const handleBack = () => {
    navigation.navigate('Goal');
  };

  const handleNext = () => {
    navigation.navigate('Diet'); // This should be the DietaryTypeScreen
  };

  // When a condition is toggled, update the healthConditions object.
  const handleCheckboxChange = (condition: string) => {
    if (condition === 'Spesifik bir rahatsızlığım yok') {
      // If "Spesifik bir rahatsızlığım yok" is toggled, reset all other conditions.
      const isSelected = !healthConditions[condition];
      const newConditions: { [key: string]: boolean } = {};
      healthConditionsList.forEach((cond) => {
        newConditions[cond] = false;
      });
      newConditions[condition] = isSelected;
      setHealthConditions(newConditions);
    } else {
      // If any other condition is selected, make sure to disable "Spesifik bir rahatsızlığım yok"
      if (healthConditions['Spesifik bir rahatsızlığım yok']) {
        updateHealthConditions('Spesifik bir rahatsızlığım yok', false);
      }
      updateHealthConditions(condition, !healthConditions[condition]);
    }
  };

  useEffect(() => {
    // Enable the "İleri" button if any condition is selected.
    setIsNextEnabled(Object.values(healthConditions).includes(true));
  }, [healthConditions]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header: Back Arrow + Progress Bar */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
            <Text style={styles.backButtonText}>{"<"}</Text>
          </TouchableOpacity>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Sağlık</Text>
          <Text style={styles.mainTitle}>
            Yeme düzeninizi etkileyebilecek sağlık problemleriniz var mı?
          </Text>
        </View>

        {/* Body: Health Conditions Options */}
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.optionsContainer}>
            {healthConditionsList.map((condition, index) => (
              <TouchableOpacity
                key={index}
                style={styles.checkboxItem}
                onPress={() => handleCheckboxChange(condition)}
                activeOpacity={0.8}
              >
                <Text style={styles.checkboxText}>{condition}</Text>
                <View
                  style={[
                    styles.checkbox,
                    healthConditions[condition] && styles.selectedCheckbox,
                  ]}
                >
                  {healthConditions[condition] && (
                    <Text style={styles.checkmark}>✔</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer: Next Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !isNextEnabled && styles.disabledNextButton]}
            onPress={handleNext}
            disabled={!isNextEnabled}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default I_HealthStatues;

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
  /***** Body *****/
  body: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  optionsContainer: {
    marginTop: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  checkboxText: {
    flex: 1,
    fontSize: 20,
    color: '#333',
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
});
