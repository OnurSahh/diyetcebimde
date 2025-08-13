import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../assets/ipv4_address.json';

type GoalData = {
  daily_calorie: number;
  protein: number;
  carbs: number;
  fats: number;
  water_goal: number;
};

type GoalEditModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
};

const GoalEditModal: React.FC<GoalEditModalProps> = ({ visible, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recommendedGoals, setRecommendedGoals] = useState<GoalData | null>(null);
  const [customGoals, setCustomGoals] = useState<GoalData | null>(null);
  const [newGoals, setNewGoals] = useState<GoalData | null>(null);
  const [useRecommended, setUseRecommended] = useState<boolean>(true);

  // Fetch both recommended and custom goals
  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }

      const response = await axios.get(
        `http://${ipv4Data.ipv4_address}:8000/api/tracker/goals/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Set both goal sets
      setRecommendedGoals(response.data.recommended);
      setCustomGoals(response.data.custom);
      
      // Initialize new goals with current custom goals
      setNewGoals(response.data.custom);
      
      // Check if already using custom values
      setUseRecommended(!response.data.custom.is_custom);
    } catch (error) {
      console.error('Hedefler alınırken hata oluştu:', error);
      Alert.alert('Hata', 'Hedefler alınamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save the user's custom goals
  const saveCustomGoals = async () => {
    if (!newGoals) return;
    
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }

      // If using recommended, send the recommended values
      const goalsToSave = useRecommended ? recommendedGoals : newGoals;
      
      await axios.post(
        `http://${ipv4Data.ipv4_address}:8000/api/tracker/goals/update/`,
        {
          ...goalsToSave,
          is_custom: !useRecommended
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          }
        }
      );

      Alert.alert('Başarılı', 'Hedefleriniz güncellendi.');
      onSave();
      onClose();
    } catch (error) {
      console.error('Hedefler kaydedilirken hata oluştu:', error);
      Alert.alert('Hata', 'Hedefler kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load goals when modal opens
  useEffect(() => {
    if (visible) {
      fetchGoals();
    }
  }, [visible]);

  // Handle text input changes
  const handleInputChange = (field: keyof GoalData, value: string) => {
    if (!newGoals) return;
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setNewGoals({
        ...newGoals,
        [field]: numValue
      });
    }
  };

  if (isLoading) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#468f5d" />
            <Text style={styles.loadingText}>Hedefler yükleniyor...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Beslenme Hedeflerini Düzenle</Text>
          
          <ScrollView style={styles.scrollContainer}>
            {/* Option Selection */}
            <View style={styles.optionContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  useRecommended && styles.optionButtonActive
                ]}
                onPress={() => setUseRecommended(true)}
              >
                <Text style={styles.optionText}>Önerilen Hedefler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  !useRecommended && styles.optionButtonActive
                ]}
                onPress={() => setUseRecommended(false)}
              >
                <Text style={styles.optionText}>Özel Hedefler</Text>
              </TouchableOpacity>
            </View>
            
            {/* Recommended Values */}
            {useRecommended && recommendedGoals && (
              <View style={styles.goalsContainer}>
                <Text style={styles.sectionTitle}>Önerilen Değerler</Text>
                <Text style={styles.infoText}>
                  Hesaplanan değerler anketinizdeki bilgilere dayanır ve sağlıklı beslenmeniz için önerilir.
                </Text>
                
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Günlük Kalori:</Text>
                  <Text style={styles.goalValue}>{recommendedGoals.daily_calorie} kcal</Text>
                </View>
                
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Protein:</Text>
                  <Text style={styles.goalValue}>{recommendedGoals.protein} g</Text>
                </View>
                
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Karbonhidrat:</Text>
                  <Text style={styles.goalValue}>{recommendedGoals.carbs} g</Text>
                </View>
                
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Yağ:</Text>
                  <Text style={styles.goalValue}>{recommendedGoals.fats} g</Text>
                </View>
                
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Su Hedefi:</Text>
                  <Text style={styles.goalValue}>{recommendedGoals.water_goal} ml</Text>
                </View>
              </View>
            )}
            
            {/* Custom Values */}
            {!useRecommended && newGoals && (
              <View style={styles.goalsContainer}>
                <Text style={styles.sectionTitle}>Özel Hedefleriniz</Text>
                <Text style={styles.infoText}>
                  Beslenme hedeflerinizi kendiniz belirleyebilirsiniz. Sizin için hesaplanan değerler referans olarak gösterilmiştir.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Günlük Kalori (kcal):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newGoals.daily_calorie.toString()}
                      onChangeText={(value) => handleInputChange('daily_calorie', value)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.recommendedValue}>
                      Önerilen: {recommendedGoals?.daily_calorie || '?'} kcal
                    </Text>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Protein (g):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newGoals.protein.toString()}
                      onChangeText={(value) => handleInputChange('protein', value)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.recommendedValue}>
                      Önerilen: {recommendedGoals?.protein || '?'} g
                    </Text>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Karbonhidrat (g):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newGoals.carbs.toString()}
                      onChangeText={(value) => handleInputChange('carbs', value)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.recommendedValue}>
                      Önerilen: {recommendedGoals?.carbs || '?'} g
                    </Text>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Yağ (g):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newGoals.fats.toString()}
                      onChangeText={(value) => handleInputChange('fats', value)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.recommendedValue}>
                      Önerilen: {recommendedGoals?.fats || '?'} g
                    </Text>
                  </View>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Su Hedefi (ml):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={newGoals.water_goal.toString()}
                      onChangeText={(value) => handleInputChange('water_goal', value)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.recommendedValue}>
                      Önerilen: {recommendedGoals?.water_goal || '?'} ml
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={saveCustomGoals}
          >
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollContainer: {
    width: '100%',
    marginBottom: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#468f5d',
    borderColor: '#468f5d',
  },
  optionText: {
    fontWeight: 'bold',
    color: '#333',
  },
  goalsContainer: {
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  goalLabel: {
    fontSize: 16,
    color: '#333',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#468f5d',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: '40%',
    fontSize: 16,
  },
  recommendedValue: {
    fontSize: 14,
    color: '#777',
    width: '55%',
  },
  saveButton: {
    backgroundColor: '#468f5d',
    padding: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default GoalEditModal;