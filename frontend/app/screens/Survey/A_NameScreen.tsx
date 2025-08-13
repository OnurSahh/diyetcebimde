// app/screens/Auth/A_NameScreen.tsx

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types';
import { useUser } from '../../context/UserContext';

// Constants
const totalSteps = 13; // Reduced from 18 since we removed screens
const currentStep = 1;
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Props Type Definitions
type A_NameScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NameScreen'>;
type A_NameScreenRouteProp = RouteProp<RootStackParamList, 'NameScreen'>;

type Props = {
  navigation: A_NameScreenNavigationProp;
  route: A_NameScreenRouteProp;
};

const A_NameScreen: React.FC<Props> = ({ navigation }) => {
  const { firstName, setFirstName } = useUser();
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // Navigate to next
  const handleNext = () => {
    Keyboard.dismiss();
    navigation.navigate('BirthDateScreen');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <View style={styles.mainContainer}>
        {/* Header container */}
        <View style={styles.headerContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Middle content (scrollable) */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Sizi Biraz Tanıyalım...</Text>
          <Text style={styles.mainTitle}>İsminizi alarak başlayalım (Opsiyonel)</Text>

          <View style={styles.inputContainer}>
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>İsminiz:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="İsminiz (opsiyonel)"
                placeholderTextColor="#999"
                value={firstName}
                onChangeText={setFirstName}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer with Next Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default A_NameScreen;

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
  /******** SCROLL CONTENT ********/
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
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
    marginBottom: 30,
    textAlign: 'center',
  },
  /******** INPUTS ********/
  inputContainer: {
    // extra container for inputs if needed
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    width: '100%',
    height: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 18,
    color: '#333',
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
});
