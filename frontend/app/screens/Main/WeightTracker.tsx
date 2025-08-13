import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../../assets/ipv4_address.json';
import { HomeStackParamList, MainTabParamList } from '../../navigation/MainNavigator';

type WeightTrackerNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'WeightTracker'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type WeightEntry = {
  date: string;
  weight: number;
  notes?: string;
};

const screenWidth = Dimensions.get('window').width;

const WeightTracker: React.FC = () => {
  const navigation = useNavigation<WeightTrackerNavigationProp>();
  const [weight, setWeight] = useState<string>('');
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
  const [weightChange, setWeightChange] = useState<{
    amount: number;
    percentage: number;
    isLoss: boolean;
  } | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [lastValidWeight, setLastValidWeight] = useState<number | null>(null);

const fetchWeightHistory = useCallback(async () => {
  try {
    setIsLoading(true);
    const token = await SecureStore.getItemAsync('accessToken');
    
    if (!token) {
      Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
      return;
    }
    
    const response = await axios.get(
      `http://${ipv4Data.ipv4_address}:8000/api/tracker/weight/history/`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    const sortedHistory = response.data.sort((a: WeightEntry, b: WeightEntry) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setWeightHistory(sortedHistory);
    
    // ONLY set initial weight once when the component first loads
    // Use a ref to track if we've initialized the weight
    if (!weightInitialized.current && sortedHistory.length > 0) {
      setWeight(sortedHistory[0].weight.toString());
      weightInitialized.current = true;
    }
    
  } catch (error) {
    console.error('Kilo geçmişi alınırken hata oluştu:', error);
    Alert.alert('Hata', 'Kilo geçmişi alınamadı. Lütfen internet bağlantınızı kontrol edin.');
  } finally {
    setIsLoading(false);
  }
}, []);

// Add this at the top of your component with other state declarations:
const weightInitialized = React.useRef(false);
  
  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenWeightInfo = await SecureStore.getItemAsync('hasSeenWeightInfo');
      if (!hasSeenWeightInfo) {
        setInfoModalVisible(true);
        await SecureStore.setItemAsync('hasSeenWeightInfo', 'true');
      }
    };
    
    checkFirstTime();
  }, []);
  
  const calculateWeightChange = (newWeight: number) => {
    if (weightHistory.length > 0) {
      const previousWeight = weightHistory[0].weight;
      const diff = newWeight - previousWeight;
      const percentChange = (diff / previousWeight) * 100;
      
      return {
        amount: Math.abs(diff),
        percentage: Math.abs(percentChange),
        isLoss: diff < 0
      };
    }
    return null;
  };
  
  const getMotivationalMessage = (change: { amount: number; percentage: number; isLoss: boolean } | null) => {
    if (!change) return "İlk kilonu kaydettin! Yolculuğun başlıyor! 🎯";
    
    if (change.isLoss) {
      if (change.percentage > 5) return "İnanılmaz ilerleme! Harikasın! 🔥🔥🔥";
      if (change.percentage > 2) return "Müthiş ilerleme kaydediyorsun! 💪🔥";
      if (change.percentage > 1) return "İlerleme kaydediyorsun! Devam et! 👏";
      return "Her adım önemli! Doğru yoldasın. ✨";
    } else {
      return "Kendine nazik ol, yolculuğun devam ediyor. 🌱";
    }
  };
  
  const adjustWeight = (amount: number) => {
    // If the field is empty and a last valid weight exists
    if ((weight === '' || weight === null) && lastValidWeight !== null) {
      // Restore last weight and apply increment
      const newVal = Math.max(0, Math.round((lastValidWeight + amount) * 10) / 10);
      setWeight(newVal.toFixed(1));
      return;
    }
    
    // If empty with no last weight, start from zero
    if (weight === '' || weight === null) {
      const newVal = Math.max(0, Math.round(amount * 10) / 10);
      setWeight(newVal.toFixed(1));
      return;
    }
    
    // Normal adjustment when there's a value
    const currentVal = parseFloat(weight.replace(',', '.')) || 0;
    const newVal = Math.max(0, Math.round((currentVal + amount) * 10) / 10);
    setWeight(newVal.toFixed(1));
    setLastValidWeight(newVal); // Update last valid value
  };
  
// Replace your current handleWeightChange function with this improved version
const handleWeightChange = (text: string) => {
  setWeight(text);
  
  // Only update lastValidWeight when a complete, valid weight is entered
  // We consider it complete if it's a valid number with at least 2 digits or ends with a decimal point
  const parsedValue = parseFloat(text.replace(',', '.'));
  if (!isNaN(parsedValue) && text.trim() !== '') {
    // Only store as lastValidWeight if it's a "complete" entry
    // This prevents storing partial edits like when "70" becomes "7" during deletion
    if (text.length >= 2 || text.includes('.') || text.includes(',')) {
      setLastValidWeight(parsedValue);
    }
  }
};
  
  const saveWeight = async () => {
    if (!weight.trim()) {
      Alert.alert('Uyarı', 'Lütfen kilonuzu girin.');
      return;
    }
    
    const weightValue = parseFloat(weight.replace(',', '.'));
    if (isNaN(weightValue)) {
      Alert.alert('Uyarı', 'Geçerli bir sayı girmelisiniz.');
      return;
    }
    
    if (weightValue <= 30) {
      Alert.alert(
        'Düşük Kilo',
        'Girdiğiniz kilo çok düşük görünüyor. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Devam Et', onPress: () => submitWeight(weightValue) }
        ]
      );
      return;
    } else if (weightValue >= 200) {
      Alert.alert(
        'Yüksek Kilo',
        'Girdiğiniz kilo çok yüksek görünüyor. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Devam Et', onPress: () => submitWeight(weightValue) }
        ]
      );
      return;
    } else {
      submitWeight(weightValue);
    }
  };
  
  const submitWeight = async (weightValue: number) => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const roundedWeight = Math.round(weightValue * 100) / 100;
      
      await axios.post(
        `http://${ipv4Data.ipv4_address}:8000/api/tracker/weight/`,
        {
          weight: roundedWeight,
          date: today
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const change = calculateWeightChange(roundedWeight);
      setWeightChange(change);
      
      setSuccessModalVisible(true);
      
      setWeight('');
      
      fetchWeightHistory();
    } catch (error) {
      console.error('Kilo kaydedilirken hata oluştu:', error);
      Alert.alert('Hata', 'Kilo kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartData = () => {
    const sortedHistory = [...weightHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const last7Entries = sortedHistory.slice(-7);
    
    if (last7Entries.length === 0) {
      return {
        labels: ['Veri Yok'],
        datasets: [{ data: [0], color: () => `rgba(70, 143, 93, 1)`, strokeWidth: 2 }]
      };
    }
    
    return {
      labels: last7Entries.map(entry => {
        const date = new Date(entry.date);
        return date.getDate() + '/' + (date.getMonth() + 1);
      }),
      datasets: [
        {
          data: last7Entries.map(entry => Math.round(entry.weight * 100) / 100),
          color: (opacity = 1) => `rgba(70, 143, 93, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };
  
  useEffect(() => {
    fetchWeightHistory();
  }, [fetchWeightHistory]);
  
  useEffect(() => {
    if (weightInitialized.current && weightHistory.length > 0) {
      setLastValidWeight(weightHistory[0].weight);
    }
  }, [weightHistory]);
  
  const chartData = prepareChartData();
  
  const SuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={successModalVisible}
      onRequestClose={() => setSuccessModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Ionicons 
            name={weightChange?.isLoss ? "trending-down" : "trending-up"} 
            size={48} 
            color={weightChange?.isLoss ? "#468f5d" : "#ffa500"} 
            style={{alignSelf: 'center', marginBottom: 10}}
          />
          
          <Text style={[styles.modalTitle, { color: weightChange?.isLoss ? "#468f5d" : "#333" }]}>
            Kilo Kaydedildi!
          </Text>
          
          {weightChange && (
            <View style={{alignItems: 'center', marginBottom: 15}}>
              <Text style={{fontSize: 18, color: weightChange.isLoss ? "#468f5d" : "#666", marginBottom: 5}}>
                {weightChange.isLoss ? "Tebrikler! " : ""}
                {weightChange.amount.toFixed(1)}kg {weightChange.isLoss ? "verdin" : "aldın"} 
                ({weightChange.percentage.toFixed(1)}%)
              </Text>
            </View>
          )}
          
          <Text style={{fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#333'}}>
            {getMotivationalMessage(weightChange)}
          </Text>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSuccessModalVisible(false)}
          >
            <Text style={styles.modalCloseButtonText}>Devam</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const InfoModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={infoModalVisible}
      onRequestClose={() => setInfoModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Doğru Kilo Ölçümü</Text>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.tipContainer}>
              <Ionicons name="time-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Her gün aynı saatte tartılın (ideal olarak sabah)
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="fast-food-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Kahvaltıdan önce, boş mideyle ölçüm yapın
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="water-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Tuvalete gittikten sonra tartılın
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="body-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Hafif kıyafetlerle veya çıplak olarak tartılın
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="fitness-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Yoğun egzersiz sonrası ölçüm yapmaktan kaçının
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="bed-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Günlük dalgalanmalara takılmayın, haftalık trend önemlidir
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="scale-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Hep aynı tartıyı kullanın ve düz bir zemine yerleştirin
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setInfoModalVisible(false)}
          >
            <Text style={styles.modalCloseButtonText}>Anladım</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <View style={styles.container}>
      <InfoModal />
      <SuccessModal />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.leftIconContainer}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Kilo Takibi</Text>
        <TouchableOpacity 
          style={styles.rightIconContainer}
          onPress={() => setInfoModalVisible(true)}
        >
          <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.headerSeparator} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kilonu Kaydet</Text>
            
            <View style={styles.rowContainer}>
                <TouchableOpacity
                style={styles.weightButton}
                onPress={() => adjustWeight(-1)}
                >
                <Text style={styles.weightButtonText}>-1</Text>
                </TouchableOpacity>
                
                <View style={{ width: 8 }} />
                
                <TouchableOpacity
                style={styles.weightButton}
                onPress={() => adjustWeight(-0.1)}
                >
                <Text style={styles.weightButtonText}>-0.1</Text>
                </TouchableOpacity>
              
              <TextInput
                style={styles.weightInput}
                placeholder="KG"
                keyboardType="numeric"
                value={weight}
                onChangeText={handleWeightChange}
                maxLength={5}
              />
              
              <TouchableOpacity
                style={styles.weightButton}
                onPress={() => adjustWeight(0.1)}
              >
                <Text style={styles.weightButtonText}>+0.1</Text>
              </TouchableOpacity>
              
              <View style={{ width: 8 }} />

              <TouchableOpacity
                style={styles.weightButton}
                onPress={() => adjustWeight(1)}
              >
                <Text style={styles.weightButtonText}>+1</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.fullWidthSaveButton}
              onPress={saveWeight}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Kaydet</Text>
              )}
            </TouchableOpacity>
            
            {weightHistory.length > 0 && (
              <View style={{marginTop: 10, alignItems: 'center'}}>
                <Text style={{fontSize: 14, color: '#666'}}>
                  Son kaydedilen: <Text style={{fontWeight: 'bold'}}>{weightHistory[0].weight.toFixed(1)} kg</Text> ({new Date(weightHistory[0].date).toLocaleDateString('tr-TR')})
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Son 7 Günlük Değişim</Text>
            
            {isLoading && weightHistory.length === 0 ? (
              <ActivityIndicator style={styles.loader} size="large" color="#468f5d" />
            ) : weightHistory.length > 0 ? (
              <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(70, 143, 93, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#468f5d'
                  }
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.noDataText}>Henüz kilo kaydı bulunmuyor.</Text>
            )}
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Son Kayıtlar</Text>
            
            {isLoading && weightHistory.length === 0 ? (
              <ActivityIndicator style={styles.loader} size="small" color="#468f5d" />
            ) : weightHistory.length > 0 ? (
              <View style={styles.historyList}>
                {weightHistory.slice(0, 5).map((entry, index) => {
                  const showChange = index < weightHistory.length - 1;
                  const prevEntry = showChange ? weightHistory[index + 1] : null;
                  const change = showChange ? entry.weight - prevEntry!.weight : 0;
                  const changePercent = showChange ? (change / prevEntry!.weight) * 100 : 0;
                  
                  return (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyDate}>
                          {new Date(entry.date).toLocaleDateString('tr-TR')}
                        </Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                          {showChange && (
                            <Text 
                              style={{
                                marginLeft: 6, 
                                fontSize: 14, 
                                color: change < 0 ? '#468f5d' : change > 0 ? '#ff9800' : '#666'
                              }}
                            >
                              {change < 0 ? '▼' : change > 0 ? '▲' : ''}
                              {Math.abs(change).toFixed(1)}kg
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      {entry.notes ? (
                        <Text style={styles.historyNotes}>"{entry.notes}"</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noDataText}>Henüz kilo kaydı bulunmuyor.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 50,
    paddingBottom: 10,
    backgroundColor: '#468f5d',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    padding: 4,
    borderRadius: 20,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    padding: 4,
    borderRadius: 20,
  },
  headerSeparator: {
    height: 2,
    backgroundColor: '#468f5d',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#212529',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weightInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  weightButton: {
    height: 40,
    backgroundColor: '#468f5d',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  weightButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    padding: 4,
  },
  fullWidthSaveButton: {
    backgroundColor: '#468f5d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 4,
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 16,
    color: '#495057',
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  historyNotes: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    padding: 20,
  },
  loader: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#468f5d',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 5,
  },
  tipText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#468f5d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default WeightTracker;