// app/screens/Auth/E_GenderScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Keyboard,
  SafeAreaView,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../../types';
import { useUser } from '../../context/UserContext';

// ----- Constants -----
const totalSteps = 13;
const currentStep = 5;
const { width: screenWidth } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

// ----- Type Definitions -----
type E_GenderScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GenderScreen'
>;
type E_GenderScreenRouteProp = RouteProp<RootStackParamList, 'GenderScreen'>;

type Props = {
  navigation: E_GenderScreenNavigationProp;
  route: E_GenderScreenRouteProp;
};

const E_GenderScreen: React.FC<Props> = ({ navigation }) => {
  // ----- Context State -----
  const { gender, setGender } = useUser(); // UserContext'ten gender ve setGender'ı alın
  const progressWidth = `${(currentStep / totalSteps) * 100}%`;

  // ----- Local State for Modal -----
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  
  // Set default gender when component mounts
  useEffect(() => {
    if (!gender) {
      setGender('Erkek');
    }
  }, []);

  // ----- Navigation Handlers -----
  const handleBack = () => {
    Keyboard.dismiss();
    navigation.navigate('WeightScreen');
  };

  const handleNext = () => {
    Keyboard.dismiss();
    navigation.navigate('BodyMeasures');
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
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

        {/* Title Area */}
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>Sizi Biraz Tanıyalım...</Text>
          <View style={styles.titleWithIcon}>
            <Text style={styles.mainTitle}>
              Biyolojik olarak kendinizi nasıl tanımlarsınız?
            </Text>
            <TouchableOpacity onPress={openModal} style={styles.infoIcon}>
              <Ionicons name="information-circle-outline" size={24} color="#468f5d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Body Area */}
        <View style={styles.body}>
          {/* Gender Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                gender === 'Erkek' && styles.selectedOption,
              ]}
              onPress={() => setGender('Erkek')} // Gender bilgisini UserContext'te güncelle
            >
              <Text
                style={[
                  styles.optionText,
                  gender === 'Erkek' && styles.selectedOptionText,
                ]}
              >
                Erkek
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                gender === 'Kadın' && styles.selectedOption,
              ]}
              onPress={() => setGender('Kadın')} // Gender bilgisini UserContext'te güncelle
            >
              <Text
                style={[
                  styles.optionText,
                  gender === 'Kadın' && styles.selectedOptionText,
                ]}
              >
                Kadın
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer: İleri Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !gender && styles.disabledNextButton,
            ]}
            onPress={handleNext}
            disabled={!gender}
          >
            <Text style={styles.nextButtonText}>İleri</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for Information */}
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
              Biyolojik cinsiyet, sağlık analizleri ve diyet programları için önemli bir değişkendir. Bu nedenle, bu seçim biyolojik cinsiyeti ifade etmelidir.
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default E_GenderScreen;

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
    marginBottom:250
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
  disabledNextButton: {
    backgroundColor: '#a5d6a7', // Lighter green for disabled state
  },
  nextButtonText: {
    color: '#ffffff',
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
});
