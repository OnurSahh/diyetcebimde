// app/screens/Survey/M_AdditionalEating.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types';
import { useMeals } from '../../context/MealsContext';

const totalSteps = 13;
const currentStep = 13;
const { width: screenWidth } = Dimensions.get('window');

// Define each item with an emoji and a name.
const items = [
  { name: 'Gluten', emoji: '🍞' }, // Bread represents gluten
  { name: 'Kabuklular', emoji: '🦐' }, // Shrimp represents shellfish (Crustaceans)
  { name: 'Yumurta', emoji: '🥚' }, // Egg is correct
  { name: 'Süt', emoji: '🥛' }, // Milk is correct
  { name: 'Balık', emoji: '🐟' }, // Fish is correct
  { name: 'Hardal', emoji: '🌭' }, // Hotdog (with mustard) is more fitting than chili
  { name: 'Yer fıstığı', emoji: '🥜' }, // Peanut is correct
  { name: 'Soya fasulyesi', emoji: '🌱' }, // Soybean plant is okay, but 🌾 (grain) could also work
  { name: 'Kereviz', emoji: '🥬' }, // Leafy green, but 🥕 (carrot) could work too
  { name: 'Acı bakla', emoji: '🌰' }, // Lupin is a legume, so chestnut fits better
  { name: 'Sert kabuklu meyveler', emoji: '🌰' }, // Nuts, chestnut fits better than an apple
  { name: 'Sülfitler', emoji: '🍷' }, // Sulfites are found in wine
  { name: 'Yumuşak- çalar', emoji: '🦪' }, // Oyster is correct for mollusks
  { name: 'Susam', emoji: '🌿' }  // Sesame, 🌿 (herb) could work, but there is no perfect emoji for sesame seeds
];


type M_AdditionalEatingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdditionalEating'>;

type Props = {
  navigation: M_AdditionalEatingNavigationProp;
};

const M_AdditionalEating: React.FC<Props> = ({ navigation }) => {
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;
  const { excludedItems, setExcludedItems } = useMeals();

  const toggleItemSelection = (itemName: string) => {
    if (excludedItems.includes(itemName)) {
      setExcludedItems(excludedItems.filter((i) => i !== itemName));
    } else {
      setExcludedItems([...excludedItems, itemName]);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('SnackMeals');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    navigation.navigate('SurveyCompletion');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
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
          <Text style={styles.mainTitle}>Tüketmek İstemediğiniz Gıdalar</Text>
        </View>

        {/* Grid Items */}
        <View style={styles.gridContainer}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.gridItem,
                excludedItems.includes(item.name) && styles.selectedItem,
              ]}
              onPress={() => toggleItemSelection(item.name)}
              activeOpacity={0.8}
            >
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <Text style={styles.itemText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>İleri</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default M_AdditionalEating;

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
  /***** Grid *****/
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  gridItem: {
    width: screenWidth * 0.25 - 10,
    height: screenWidth * 0.25 - 10,
    backgroundColor: '#f0f0f0',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedItem: {
    backgroundColor: '#ffc107',
    borderColor: '#ffa000',
  },
  itemEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    textAlign: 'center',
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
  nextButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
