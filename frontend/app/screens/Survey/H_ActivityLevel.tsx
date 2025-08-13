import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { useUser } from '../../context/UserContext';
import { useHabits } from '../../context/HabitContext';
import { useNutrition } from '../../context/NutritionContext';

const totalSteps = 13;
const currentStep = 7;
const { width: screenWidth } = Dimensions.get('window');

type H_ActivityLevelNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ActivityLevel'>;

interface H_ActivityLevelProps {
  navigation: H_ActivityLevelNavigationProp;
}

const H_ActivityLevel: React.FC<H_ActivityLevelProps> = ({ navigation }) => {
  const { activityLevel, setActivityLevel } = useUser();
  const { setActivityData } = useHabits();
  const { calculateNutrition } = useNutrition();
  
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;
  
  // Set default value when component mounts
  useEffect(() => {
    // If no activity level is currently selected, set "medium" as default
    if (!activityLevel) {
      handleActivityLevelChange('medium');
    }
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate('Goal');
  };

  // Unified function to update activity level and data
  const handleActivityLevelChange = (level: 'low' | 'medium' | 'high') => {
    console.log(`Setting activity level to: ${level}`);
    setActivityLevel(level);
    
    // Set default activity data based on selected level
    if (level === 'low') {
      console.log('Setting activity data for low activity level');
      setActivityData({
        resting: 14, // 14 hours resting/sleeping/sitting
        light_acts: 8, // 8 hours light activity (walking, cooking)
        medium_acts: 1.5, // 1.5 hours medium activity (brisk walking)
        heavy_acts: 0.5 // 0.5 hours heavy activity (running, sports)
      });
    } else if (level === 'medium') {
      console.log('Setting activity data for medium activity level');
      setActivityData({
        resting: 12, // 12 hours resting/sleeping/sitting
        light_acts: 8, // 8 hours light activity
        medium_acts: 3, // 3 hours medium activity
        heavy_acts: 1 // 1 hour heavy activity
      });
    } else if (level === 'high') {
      console.log('Setting activity data for high activity level');
      setActivityData({
        resting: 10, // 10 hours resting/sleeping/sitting
        light_acts: 8, // 8 hours light activity
        medium_acts: 4, // 4 hours medium activity
        heavy_acts: 2 // 2 hours heavy activity
      });
    }
    
    // Force recalculation of nutrition values
    setTimeout(() => {
      calculateNutrition();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
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

        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Alışkanlıklar</Text>
          <Text style={styles.mainTitle}>Fiziksel aktivite düzeyiniz nedir?</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              activityLevel === 'low' && styles.selectedOption
            ]}
            onPress={() => handleActivityLevelChange('low')}
          >
            <Text style={styles.optionTitle}>Düşük Aktivite</Text>
            <Text style={styles.optionDescription}>
              Çoğunlukla oturarak çalışıyorum, haftada 0-1 kez egzersiz yapıyorum
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              activityLevel === 'medium' && styles.selectedOption
            ]}
            onPress={() => handleActivityLevelChange('medium')}
          >
            <Text style={styles.optionTitle}>Orta Aktivite</Text>
            <Text style={styles.optionDescription}>
              Günlük hayatımda aktifim, haftada 2-3 kez egzersiz yapıyorum
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              activityLevel === 'high' && styles.selectedOption
            ]}
            onPress={() => handleActivityLevelChange('high')}
          >
            <Text style={styles.optionTitle}>Yüksek Aktivite</Text>
            <Text style={styles.optionDescription}>
              Aktif bir işte çalışıyorum veya haftada 4+ kez düzenli egzersiz yapıyorum
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer/Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={[
              styles.nextButton,
              !activityLevel && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!activityLevel}
          >
            <Text style={styles.nextButtonText}>Devam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea', // Beige background like other screens
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
    backgroundColor: '#468f5d', // Themed green consistent with other screens
    borderRadius: 5,
  },

  /***** Title Area *****/
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

  /***** Body Area *****/
  body: {
    flex: 1,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  selectedOption: {
    borderColor: '#468f5d',
    backgroundColor: '#f0f8f0',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  optionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
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
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default H_ActivityLevel;