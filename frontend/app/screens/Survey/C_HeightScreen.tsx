// app/screens/Auth/C_HeightScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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
import { useUser } from '../../context/UserContext';

// ----- Constants -----
const totalSteps = 13;
const currentStep = 3;

const { width: screenWidth } = Dimensions.get('window');

const ITEM_HEIGHT = 50; // Each item's height
const VISIBLE_ITEMS = 5; // Number of visible items in the picker

// Height Ranges
const MIN_CM = 100;
const MAX_CM = 200;
const MIN_FEET = 3;
const MAX_FEET = 6;
const MIN_INCHES = 0;
const MAX_INCHES = 11;

// Conversion Constants
const FEET_TO_CM = 30.48;
const INCH_TO_CM = 2.54;

// ----- Type Definitions -----
type C_HeightScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HeightScreen'
>;
type C_HeightScreenRouteProp = RouteProp<RootStackParamList, 'HeightScreen'>;

type Props = {
  navigation: C_HeightScreenNavigationProp;
  route: C_HeightScreenRouteProp;
};

const C_HeightScreen: React.FC<Props> = ({ navigation }) => {
  // ----- Context State -----
  const {
    height,
    setHeight,
    selectedHeightUnit,
    setSelectedHeightUnit,
    feet,
    setFeet,
    inches,
    setInches,
  } = useUser();

  // ----- Local State -----
  const [localHeightCm, setLocalHeightCm] = useState<number>(height || 160); // Default to 160 cm
  const [localFeet, setLocalFeet] = useState<number>(feet || 5); // Default to 5 feet
  const [localInches, setLocalInches] = useState<number>(inches || 0); // Default to 0 inches
  const [selectedUnit, setSelectedUnit] = useState<'cm' | 'ft'>(selectedHeightUnit || 'cm'); // Default to 'cm'

  // ----- Refs for FlatLists -----
  const scrollRefCm = useRef<FlatList<number>>(null);
  const scrollRefFeet = useRef<FlatList<number>>(null);
  const scrollRefInches = useRef<FlatList<number>>(null);

  // ----- Data Arrays -----
  const dataCm = Array.from({ length: MAX_CM - MIN_CM + 1 }, (_, i) => MIN_CM + i);
  const dataFeet = Array.from({ length: MAX_FEET - MIN_FEET + 1 }, (_, i) => MIN_FEET + i);
  const dataInches = Array.from({ length: MAX_INCHES - MIN_INCHES + 1 }, (_, i) => MIN_INCHES + i);

  // ----- Progress Bar Width -----
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // ----- Scroll to Default Values on Mount -----
  useEffect(() => {
    if (selectedUnit === 'cm') {
      const index = localHeightCm - MIN_CM;
      requestAnimationFrame(() => {
        scrollRefCm.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
      });
    } else {
      const feetIndex = localFeet - MIN_FEET;
      const inchesIndex = localInches - MIN_INCHES;
      requestAnimationFrame(() => {
        scrollRefFeet.current?.scrollToOffset({ offset: feetIndex * ITEM_HEIGHT, animated: false });
        scrollRefInches.current?.scrollToOffset({ offset: inchesIndex * ITEM_HEIGHT, animated: false });
      });
    }
  }, [selectedUnit]);

  // Add this useEffect to update context when local values change
  useEffect(() => {
    if (selectedUnit === 'cm' && localHeightCm) {
      setHeight(localHeightCm);
      // Also calculate and update feet and inches for completeness
      const feet = Math.floor(localHeightCm / FEET_TO_CM);
      const inches = Math.round((localHeightCm - (feet * FEET_TO_CM)) / INCH_TO_CM);
      setFeet(feet);
      setInches(inches);
    } else if (selectedUnit === 'ft' && localFeet !== null) {
      // Calculate height in cm from feet and inches
      const heightCm = Math.round((localFeet * FEET_TO_CM) + (localInches * INCH_TO_CM));
      setHeight(heightCm);
      setFeet(localFeet);
      setInches(localInches);
    }
  }, [localHeightCm, localFeet, localInches, selectedUnit]);

  // ----- Scroll End Handlers -----
  const handleMomentumScrollEndCm = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = dataCm[index];
    if (value !== undefined) {
      setLocalHeightCm(value);
    }
  };

  const handleMomentumScrollEndFeet = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = dataFeet[index];
    if (value !== undefined) {
      setLocalFeet(value);
    }
  };

  const handleMomentumScrollEndInches = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const value = dataInches[index];
    if (value !== undefined) {
      setLocalInches(value);
    }
  };

  // ----- Render Picker Item -----
  const renderPickerItem = (itemValue: number, selectedValue: number) => {
    const isSelected = itemValue === selectedValue;
    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>{itemValue}</Text>
      </View>
    );
  };

  // ----- Navigation Handlers -----
  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('BirthDateScreen');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    
    // Update context before navigating
    if (selectedUnit === 'cm') {
      setHeight(localHeightCm);
      const feet = Math.floor(localHeightCm / FEET_TO_CM);
      const inches = Math.round((localHeightCm - (feet * FEET_TO_CM)) / INCH_TO_CM);
      setFeet(feet);
      setInches(inches);
    } else {
      const heightCm = Math.round((localFeet * FEET_TO_CM) + (localInches * INCH_TO_CM));
      setHeight(heightCm);
      setFeet(localFeet);
      setInches(localInches);
    }
    
    navigation.navigate('WeightScreen');
  };

  // ----- Unit Switcher -----
  const handleUnitChange = (unit: 'cm' | 'ft') => {
    setSelectedUnit(unit);
    setSelectedHeightUnit(unit);
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
          <Text style={styles.mainTitle}>Şimdi sıra boyunuzda</Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Unit Selector */}
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, selectedUnit === 'cm' && styles.selectedUnitButton]}
              onPress={() => handleUnitChange('cm')}
            >
              <Text style={[styles.unitButtonText, selectedUnit === 'cm' && styles.selectedUnitText]}>
                CM
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.unitButton, selectedUnit === 'ft' && styles.selectedUnitButton]}
              onPress={() => handleUnitChange('ft')}
            >
              <Text style={[styles.unitButtonText, selectedUnit === 'ft' && styles.selectedUnitText]}>
                FT
              </Text>
            </TouchableOpacity>
          </View>

          {/* Picker Area */}
          <View style={styles.pickerArea}>
            {selectedUnit === 'cm' ? (
              <FlatList
                ref={scrollRefCm}
                data={dataCm}
                keyExtractor={(item) => item.toString()}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={handleMomentumScrollEndCm}
                renderItem={({ item }) => renderPickerItem(item, localHeightCm)}
                initialScrollIndex={localHeightCm - MIN_CM}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={{
                  paddingVertical: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2,
                }}
              />
            ) : (
              <View style={styles.pickerContainerFt}>
                {/* Feet Picker */}
                <FlatList
                  ref={scrollRefFeet}
                  data={dataFeet}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleMomentumScrollEndFeet}
                  renderItem={({ item }) => renderPickerItem(item, localFeet)}
                  initialScrollIndex={localFeet - MIN_FEET}
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

                {/* Inches Picker */}
                <FlatList
                  ref={scrollRefInches}
                  data={dataInches}
                  keyExtractor={(item) => item.toString()}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleMomentumScrollEndInches}
                  renderItem={({ item }) => renderPickerItem(item, localInches)}
                  initialScrollIndex={localInches - MIN_INCHES}
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
              </View>
            )}

            {/* Center Indicator Arrow(s) */}
            {selectedUnit === 'cm' ? (
              <View style={styles.centerIndicatorCm} />
            ) : (
              <View style={styles.centerIndicatorFt}>
                {/* Left Arrow for Feet */}
                <View style={styles.arrowLeftFt} />

                {/* Right Arrow for Inches */}
                <View style={styles.arrowRightFt} />
              </View>
            )}
          </View>
        </View>

        {/* Footer: İleri Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                opacity:
                  (selectedUnit === 'cm' && localHeightCm) ||
                  (selectedUnit === 'ft' && localFeet) ? 1 : 0.5,
              },
            ]}
            onPress={handleNext}
            disabled={
              (selectedUnit === 'cm' && !localHeightCm) ||
              (selectedUnit === 'ft' && !localFeet)
            }
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default C_HeightScreen;

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
  },
  unitButton: {
    width: 100,
    paddingVertical: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
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
  pickerContainerFt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singlePicker: {
    width: 100, // Fixed width for each picker
  },

  /***** Picker Items *****/
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100, // Fixed width to match singlePicker
    borderBottomWidth: 0.5, // Faint horizontal line
    borderBottomColor: '#ccc',
    marginLeft:35
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

  /***** Center Indicator Arrow for CM *****/
  centerIndicatorCm: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 8, // Top border size
    borderBottomWidth: 8, // Bottom border size
    borderLeftWidth: 12, // Left border size, creates the arrow
    borderTopColor: 'transparent', // Transparent top to form the triangle
    borderBottomColor: 'transparent', // Transparent bottom to form the triangle
    borderLeftColor: '#468f5d', // Green arrow color
    top: (ITEM_HEIGHT * VISIBLE_ITEMS) / 2 - 8, // Center vertically
    left: '35%', // Adjust as needed to point to the cm picker
    zIndex: 10,
  },

  /***** Center Indicator Arrows for FT/In *****/
  centerIndicatorFt: {
    position: 'absolute',
    width: '100%',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  arrowLeftFt: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#468f5d',
    marginRight: 50, // Space between arrow and feet picker
  },
  arrowRightFt: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#468f5d',
    marginLeft: 0, // Space between arrow and inches picker
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
