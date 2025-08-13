// app/screens/Auth/D_WeightScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../../types';
import surveyStyles from '../../../styles/surveyStyles';
import { useUser } from '../../context/UserContext';

// ----- Constants -----
const totalSteps = 13;
const currentStep = 4;
const { width: screenWidth } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

// Weight Ranges
const MIN_KG = 20;
const MAX_KG = 160;
const MIN_LBS = Math.round(MIN_KG * 2.20462); // ~44
const MAX_LBS = Math.round(MAX_KG * 2.20462); // ~353

// Conversion Constants
const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;

// ----- Type Definitions -----
type D_WeightScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WeightScreen'
>;
type D_WeightScreenRouteProp = RouteProp<RootStackParamList, 'WeightScreen'>;

type Props = {
  navigation: D_WeightScreenNavigationProp;
  route: D_WeightScreenRouteProp;
};

const D_WeightScreen: React.FC<Props> = ({ navigation }) => {
  // ----- Context State -----
  const {
    weight,
    setWeight,
    selectedWeightUnit,
    setSelectedWeightUnit,
    lbs,
    setLbs,
  } = useUser();

  // ----- Local State -----
  const [localWeightKg, setLocalWeightKg] = useState<number>(weight || 60); // Default to 60 kg
  const [localWeightLbs, setLocalWeightLbs] = useState<number>(lbs || Math.round(60 * KG_TO_LBS)); // Default to ~132 lbs
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lbs'>(selectedWeightUnit || 'kg'); // Default to 'kg'

  // ----- Refs for FlatLists -----
  const scrollRefKg = useRef<FlatList<number>>(null);
  const scrollRefLbs = useRef<FlatList<number>>(null);

  // ----- Data Arrays -----
  const dataKg = Array.from({ length: MAX_KG - MIN_KG + 1 }, (_, i) => MIN_KG + i);
  const dataLbs = Array.from({ length: MAX_LBS - MIN_LBS + 1 }, (_, i) => MIN_LBS + i);

  // ----- Progress Bar Width -----
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // ----- Scroll to Default Values on Mount -----
  useEffect(() => {
    if (selectedUnit === 'kg') {
      const index = localWeightKg - MIN_KG;
      requestAnimationFrame(() => {
        scrollRefKg.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
      });
    } else {
      const index = localWeightLbs - MIN_LBS;
      requestAnimationFrame(() => {
        scrollRefLbs.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
      });
    }
  }, [selectedUnit]);

  // Add this useEffect to update context when local values change
  useEffect(() => {
    if (selectedUnit === 'kg' && localWeightKg) {
      setWeight(localWeightKg);
      // Also calculate and update lbs for completeness
      const weightLbs = Math.round(localWeightKg * KG_TO_LBS);
      setLbs(weightLbs);
    } else if (selectedUnit === 'lbs' && localWeightLbs) {
      // Calculate weight in kg from lbs
      const weightKg = Math.round(localWeightLbs * LBS_TO_KG);
      setWeight(weightKg);
      setLbs(localWeightLbs);
    }
  }, [localWeightKg, localWeightLbs, selectedUnit]);

  // ----- Scroll End Handlers -----
  const handleMomentumScrollEndKg = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = dataKg[index];
    if (value !== undefined) {
      setLocalWeightKg(value);
    }
  };

  const handleMomentumScrollEndLbs = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = dataLbs[index];
    if (value !== undefined) {
      setLocalWeightLbs(value);
    }
  };

  // ----- Render Picker Item -----
  const renderPickerItem = (itemValue: number, selectedValue: number) => {
    const isSelected = itemValue === selectedValue;
    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
          {itemValue}
        </Text>
      </View>
    );
  };

  // ----- Navigation Handlers -----
  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('HeightScreen');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    
    // Update context before navigating
    if (selectedUnit === 'kg') {
      setWeight(localWeightKg);
      setLbs(Math.round(localWeightKg * KG_TO_LBS));
    } else {
      setWeight(Math.round(localWeightLbs * LBS_TO_KG));
      setLbs(localWeightLbs);
    }
    
    navigation.navigate('GenderScreen');
  };

  // ----- Unit Switcher -----
  const handleUnitChange = (unit: 'kg' | 'lbs') => {
    setSelectedUnit(unit);
    setSelectedWeightUnit(unit);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header: Back Arrow + Progress Bar */}
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
          <Text style={styles.mainTitle}>Kilonuzu öğrenebilir miyiz?</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Unit Selector */}
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, selectedUnit === 'kg' && styles.selectedUnitButton]}
              onPress={() => handleUnitChange('kg')}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  selectedUnit === 'kg' && styles.selectedUnitText,
                ]}
              >
                KG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.unitButton, selectedUnit === 'lbs' && styles.selectedUnitButton]}
              onPress={() => handleUnitChange('lbs')}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  selectedUnit === 'lbs' && styles.selectedUnitText,
                ]}
              >
                LBS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Picker Area */}
          <View style={styles.pickerArea}>
            {selectedUnit === 'kg' ? (
              <FlatList
                ref={scrollRefKg}
                data={dataKg}
                keyExtractor={(item) => item.toString()}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEndKg}
                renderItem={({ item }) => renderPickerItem(item, localWeightKg)}
                initialScrollIndex={localWeightKg - MIN_KG}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{
                  paddingVertical: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2,
                }}
                style={styles.singlePicker}
              />
            ) : (
              <FlatList
                ref={scrollRefLbs}
                data={dataLbs}
                keyExtractor={(item) => item.toString()}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEndLbs}
                renderItem={({ item }) => renderPickerItem(item, localWeightLbs)}
                initialScrollIndex={dataLbs.indexOf(localWeightLbs)}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{
                  paddingVertical: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2,
                }}
                style={styles.singlePicker}
              />
            )}

            {/* Center Indicator Arrow */}
            <View
              style={[
                styles.centerIndicator,
                selectedUnit === 'kg' ? styles.centerIndicatorKg : styles.centerIndicatorLbs,
              ]}
            />
          </View>
        </View>

        {/* Footer: İleri Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                opacity:
                  (selectedUnit === 'kg' && localWeightKg) ||
                  (selectedUnit === 'lbs' && localWeightLbs)
                    ? 1
                    : 0.5,
              },
            ]}
            onPress={handleNext}
            disabled={
              (selectedUnit === 'kg' && !localWeightKg) ||
              (selectedUnit === 'lbs' && !localWeightLbs)
            }
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default D_WeightScreen;

// ----- Styles -----
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
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  unitSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    alignSelf: 'center',
  },
  unitButton: {
    width: screenWidth * 0.4,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedUnitButton: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  unitButtonText: {
    fontSize: 16,
    color: '#000',
  },
  selectedUnitText: {
    color: '#fff',
  },

  /***** Picker Area *****/
  pickerArea: {
    position: 'relative',
    width: '100%',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlePicker: {
    width: screenWidth * 0.3, // Adjust width as needed
  },

  /***** Picker Items *****/
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 0.5, // Faint horizontal line
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 20,
    color: '#888',
  },
  selectedItemText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },

  /***** Center Indicator Arrow *****/
  centerIndicator: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 8, // Top border size
    borderBottomWidth: 8, // Bottom border size
    borderLeftWidth: 12, // Left border size, creates the arrow
    borderTopColor: 'transparent', // Transparent top to form the triangle
    borderBottomColor: 'transparent', // Transparent bottom to form the triangle
    borderLeftColor: '#468f5d', // Green arrow color
    zIndex: 10,
  },
  centerIndicatorKg: {
    top: (ITEM_HEIGHT * VISIBLE_ITEMS) / 2 - 8, // Center vertically
    left: '35%', // Position to the right of kg picker
    marginLeft: 5, // Small gap
  },
  centerIndicatorLbs: {
    top: (ITEM_HEIGHT * VISIBLE_ITEMS) / 2 - 8, // Center vertically
    left: '35%', // Position to the right of lbs picker
    marginLeft: 5, // Small gap
  },

  /***** Footer: İleri Button *****/
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
});
