import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Image,
  Platform,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../../assets/ipv4_address.json';
import { HomeStackParamList, MainTabParamList } from '../../navigation/MainNavigator';

// Define the navigation prop types
type WaterTrackerNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'WaterTracker'>,
  BottomTabNavigationProp<MainTabParamList>
>;

// Define default settings
const DAILY_GOAL = 2500; // ml
const MAX_GOAL = 10000; // ml

const WaterTracker: React.FC = () => {
  const navigation = useNavigation<WaterTrackerNavigationProp>();
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(DAILY_GOAL);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [infoModalVisible, setInfoModalVisible] = useState<boolean>(false);
  
  // Animation value for water fill
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const percentageTextAnimation = useRef(new Animated.Value(0)).current;
  
  // Animate when water intake changes
  useEffect(() => {
    const progressPercentage = Math.min((waterIntake / waterGoal) * 100, 100);
    
    // Start animations
    Animated.parallel([
      Animated.timing(fillAnimation, {
        toValue: progressPercentage,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }),
      Animated.timing(percentageTextAnimation, {
        toValue: progressPercentage,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      })
    ]).start();
  }, [waterIntake, waterGoal]);
  
  // Format numbers to 1 decimal place
  const formatNumber = (num: number): string => {
    return (Math.round(num * 10) / 10).toFixed(1);
  };
  
  // Fetch water data from the server
  const fetchWaterData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }
      
      const response = await axios.get(
        `https://${ipv4Data.ipv4_address}/api/tracker/statistics/daily/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update state with server data
      setWaterIntake(response.data.totals.water.actual);
      setWaterGoal(response.data.totals.water.goal);
    } catch (error) {
      console.error('Su verisi alınırken hata oluştu:', error);
      Alert.alert('Hata', 'Su verisi alınamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Update water intake on the server
  const updateWaterIntake = async (amount: number) => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Update locally first for responsive UI
      setWaterIntake(amount);
      
      // Then sync with server
      await axios.post(
        `https://${ipv4Data.ipv4_address}/api/tracker/water/`,
        { amount: amount },
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          }
        }
      );
    } catch (error) {
      console.error('Su verisi güncellenirken hata oluştu:', error);
      Alert.alert('Hata', 'Su verisi güncellenemedi. Lütfen internet bağlantınızı kontrol edin.');
      
      // Rollback to previous value if server update fails
      await fetchWaterData();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Functions to add water in predefined increments
  const addWater = (ml: number) => {
    const newIntake = Math.min(waterIntake + ml, MAX_GOAL);
    updateWaterIntake(newIntake);
  };
  
  // Function to reset water intake
  const resetWater = () => {
    Alert.alert(
      'Sıfırla',
      'Su takibini sıfırlamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sıfırla', 
          style: 'destructive',
          onPress: () => updateWaterIntake(0)
        }
      ]
    );
  };
  
  // Load data when component mounts
  useEffect(() => {
    fetchWaterData();
  }, [fetchWaterData]);
  
  // Calculate progress percentage
  const progressPercentage = Math.min((waterIntake / waterGoal) * 100, 100);
  
  // Info modal component
  const InfoModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={infoModalVisible}
      onRequestClose={() => setInfoModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Su İçmenin Faydaları</Text>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.tipContainer}>
              <Ionicons name="thermometer-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Vücut sıcaklığını düzenler
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="body-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Eklemleri yağlar ve korur
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="medical-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Beyin fonksiyonlarını destekler
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="leaf-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Toksinlerin atılmasına yardımcı olur
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="sparkles-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Cilt sağlığını korur
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="fitness-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Fiziksel performansı artırır
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="water-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Sindirimi kolaylaştırır
              </Text>
            </View>
            
            <View style={styles.tipContainer}>
              <Ionicons name="heart-outline" size={24} color="#468f5d" />
              <Text style={styles.tipText}>
                Kalp sağlığını destekler
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
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.leftIconContainer}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Su Takibi</Text>
        <TouchableOpacity 
          style={styles.rightIconContainer}
          onPress={() => setInfoModalVisible(true)}
        >
          <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.headerSeparator} />

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Günlük Su Tüketimi</Text>
          
          <View style={styles.waterContainerWrapper}>
            <View style={styles.waterContainer}>
              <View style={styles.bottleWrapper}>
              <View style={styles.bottleOutline}>
                <Animated.View 
                style={[
                  styles.waterFill, 
                  { 
                  height: fillAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '88%']
                  }) 
                  }
                ]} 
                />
                <View style={styles.bottleNeck} />
                <View style={styles.bottleCap} />
              </View>
              </View>
              
              <View style={styles.statsContainer}>
              <Text style={styles.intakeText}>{formatNumber(waterIntake)} ml</Text>
              <Text style={styles.goalText}>Hedef: {formatNumber(waterGoal)} ml</Text>

              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Su Ekle</Text>
          
          <View style={styles.amountButtonsRow}>
            <TouchableOpacity 
              style={styles.amountButton}
              onPress={() => addWater(200)}
            >
              <Ionicons name="water-outline" size={24} color="#468f5d" />
              <Text style={styles.amountButtonText}>Su Bardağı</Text>
              <Text style={styles.amountButtonSubText}>200 ml</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.amountButton}
              onPress={() => addWater(330)}
            >
              <Ionicons name="cafe-outline" size={24} color="#468f5d" />
              <Text style={styles.amountButtonText}>Büyük Bardak</Text>
              <Text style={styles.amountButtonSubText}>330 ml</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountButtonsRow}>
            <TouchableOpacity 
              style={styles.amountButton}
              onPress={() => addWater(500)}
            >
              <Ionicons name="flask-outline" size={24} color="#468f5d" />
              <Text style={styles.amountButtonText}>Küçük Şişe</Text>
              <Text style={styles.amountButtonSubText}>500 ml</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.amountButton}
              onPress={() => addWater(1000)}
            >
              <Ionicons name="beaker-outline" size={24} color="#468f5d" />
              <Text style={styles.amountButtonText}>Büyük Şişe</Text>
              <Text style={styles.amountButtonSubText}>1 litre</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.smallButtonsRow}>
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => addWater(100)}
            >
              <Text style={styles.smallButtonText}>+100 ml</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => addWater(250)}
            >
              <Text style={styles.smallButtonText}>+250 ml</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => addWater(750)}
            >
              <Text style={styles.smallButtonText}>+750 ml</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetWater}
          >
            <Text style={styles.resetButtonText}>Sıfırla</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212529',
  },
  waterContainerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 15,
  },
  bottleWrapper: {
    width: 120,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bottleOutline: {
    width: 100,
    height: 200,
    borderRadius: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 3,
    borderColor: '#468f5d',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  bottleNeck: {
    position: 'absolute',
    top: -15,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 15,
    backgroundColor: '#468f5d',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    zIndex: 10,
  },
  bottleCap: {
    position: 'absolute',
    top: -25,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 10,
    backgroundColor: '#3d7d50',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    zIndex: 11,
  },
  waterFill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#7cccff',
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
  },
  statsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  intakeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#468f5d',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  percentageText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  percentSymbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  amountButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountButton: {
    flex: 1,
    backgroundColor: '#e9f5ee',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    height: 100,
    justifyContent: 'center',
  },
  amountButtonText: {
    color: '#468f5d',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  amountButtonSubText: {
    color: '#6c757d',
    fontSize: 14,
    marginTop: 4,
  },
  smallButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#f1f8f4',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  smallButtonText: {
    color: '#468f5d',
    fontWeight: '600',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resetButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 16,
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
  // Modal styles
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

export default WaterTracker;