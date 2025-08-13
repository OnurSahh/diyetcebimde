import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../../types';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ipv4Data from '../../../assets/ipv4_address.json';

const { width, height } = Dimensions.get('window');

type SignInScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignInAuth'>;

const SignInScreen: React.FC = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  // Debug: Get the backend URL being used
  const backendUrl = `http://${ipv4Data.ipv4_address}:8000`;

  // Animation values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate everything in parallel for faster display
    Animated.parallel([
      // Title animations
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 100, // Reduced from 200
        useNativeDriver: true,
      }),
      Animated.spring(titleTranslateY, {
        toValue: 0,
        tension: 80, // Increased from 50
        friction: 5, // Reduced from 7
        useNativeDriver: true,
      }),
      
      // Form animations
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 100, // Reduced from 200
        useNativeDriver: true,
      }),
      Animated.spring(formTranslateY, {
        toValue: 0,
        tension: 80, // Increased from 50
        friction: 5, // Reduced from 7
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignIn = async () => {
    // Debug logging
    console.log('=== SIGNIN DEBUG INFO ===');
    console.log('Backend URL:', backendUrl);
    console.log('Login URL:', `${backendUrl}/api/auth/login/`);
    console.log('IP Config:', ipv4Data);
    console.log('========================');

    // Validate inputs first
    if (!email.trim()) {
      setErrorMessage('Lütfen e-posta adresinizi girin.');
      return;
    }
    
    if (!password.trim()) {
      setErrorMessage('Lütfen şifrenizi girin.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      
      console.log('About to call login with:', { email, password: '***' });
      await login(email, password);
      console.log('Login call completed successfully');
      
      // Login successful - no error handling needed here as navigation 
      // will be handled by AuthContext
    } catch (error: any) {
      console.log('=== LOGIN ERROR DEBUG ===');
      console.log('Error type:', typeof error);
      console.log('Error message:', error.message);
      console.log('Error response:', error.response);
      console.log('Error request:', error.request);
      console.log('Full error object:', error);
      console.log('========================');
      
      // Handle different error types with specific messages
      if (error.response) {
        // The request was made and the server responded with an error status
        console.log('Server responded with error status:', error.response.status);
        if (error.response.status === 401) {
          setErrorMessage('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
        } else if (error.response.status >= 500) {
          setErrorMessage('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        } else {
          setErrorMessage(`Giriş başarısız: ${error.response.data.detail || 'Beklenmeyen bir hata oluştu.'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.log('No response received from server');
        setErrorMessage(`Sunucuya bağlanılamadı (${backendUrl}). Lütfen internet bağlantınızı kontrol edin.`);
      } else {
        // Something happened in setting up the request
        console.log('Error setting up request');
        setErrorMessage('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = (input: string) => {
    setIsFocused(input);
  };

  const handleBlur = () => {
    setIsFocused(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Animated Title */}
            <Animated.View 
              style={[
                styles.titleContainer, 
                { 
                  opacity: titleOpacity,
                  transform: [{ translateY: titleTranslateY }] 
                }
              ]}
            >
              <Text style={styles.titlePrimary}>Diyet Cebimde</Text>
              <Text style={styles.titleSecondary}>Sağlıklı yaşamın cebinde</Text>
              {/* Debug info - showing backend URL */}
              <Text style={styles.debugText}>Backend: {backendUrl}</Text>
            </Animated.View>

            {/* Login Form */}
            <Animated.View 
              style={[
                styles.formContainer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }]
                }
              ]}
            >
              <Text style={styles.formTitle}>Giriş Yap</Text>
              
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={[
                styles.inputContainer,
                isFocused === 'email' && styles.inputContainerFocused
              ]}>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => handleFocus('email')}
                  onBlur={handleBlur}
                />
              </View>

              <View style={[
                styles.inputContainer,
                isFocused === 'password' && styles.inputContainerFocused
              ]}>
                <TextInput
                  placeholder="Şifre"
                  placeholderTextColor="#999"
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                />
              </View>

              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00734C', '#006039']}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Giriş Yap</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Ya da</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate('SignUpAuth')}
                disabled={isLoading}
              >
                <Text style={styles.registerLinkText}>
                  Hesabın yok mu? <Text style={styles.registerLinkTextBold}>Kayıt Ol</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  titleContainer: {
    marginTop: height * 0.08,
    alignItems: 'center',
  },
  titlePrimary: {
    fontSize: 32,
    fontWeight: '700',
    color: '#006039',
    letterSpacing: 0.5,
  },
  titleSecondary: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  debugText: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    height: 56,
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: '#006039',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
    width: '100%',
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#006039',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#006039',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDDDDD',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  registerLink: {
    padding: 8,
  },
  registerLinkText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  registerLinkTextBold: {
    color: '#006039',
    fontWeight: '600',
  },
});