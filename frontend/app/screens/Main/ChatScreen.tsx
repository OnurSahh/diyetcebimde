// app/screens/Main/ChatScreen.tsx

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  ActionSheetIOS,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  CompositeNavigationProp,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ChatStackParamList, MainTabParamList } from '../../navigation/MainNavigator';
import { AuthContext } from '../../context/AuthContext';
import ipv4Data from '../../../assets/ipv4_address.json';

const SERVER_IP = ipv4Data.ipv4_address;
const CHAT_HISTORY_KEY = 'chatHistory';
const WORD_REVEAL_SPEED_MS = 20; // delay (ms) between each word for reveal

// --- Message type ---
type Message = {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  replyTo?: Message;
  fullContent?: string; // For word-by-word reveal
};

// --- Photo purposes ---
const photoPurposes = [
  { key: 'analyze_food', label: 'Yemek Analizi (Kcal & Makro)', placeholder: '' },
  {
    key: 'prepare_meal',
    label: 'Malzemelerle Tarif Oluşturma',
    placeholder: 'Görünmeyen malzemeleri ekleyin (evdeki ek malzemeler)',
  },
  {
    key: 'menu_analysis',
    label: 'Menüde Sağlıklı Yiyecek Önerileri',
    placeholder: 'Size uygun menü seçeneklerini belirtin (örn. düşük yağlı, yüksek proteinli)',
  },
  {
    key: 'food_item_analysis',
    label: 'Gıda Öğesi Sağlık Değerlendirmesi',
    placeholder: '',
  },
];

// Navigation prop types
type ChatScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<ChatStackParamList, 'Chat'>,
  BottomTabNavigationProp<MainTabParamList>
>;
type ChatScreenRouteProp = RouteProp<{ params?: { openCamera?: boolean; photoPurpose?: string } }, 'params'>;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { user } = useContext(AuthContext);

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);

  const textInputRef = useRef<TextInput>(null);

  // For camera purpose selection
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedPurpose, setSelectedPurpose] = useState<{
    key: string;
    label: string;
    placeholder: string;
  } | null>(null);

  // For additional text input after taking a photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAdditionalInput, setPhotoAdditionalInput] = useState<string>('');
  const [photoAdditionalInputModalVisible, setPhotoAdditionalInputModalVisible] = useState<boolean>(false);

  // Keyboard tracking
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // --- SCROLL CONTROL ---
  const flatListRef = useRef<FlatList<Message>>(null);

  // Whether user is currently at or near bottom
  const [isNearBottom, setIsNearBottom] = useState<boolean>(true);

  // Helper function to scroll to the bottom if user was near the bottom.
  const scrollToBottomIfNeeded = useCallback(() => {
    if (isNearBottom) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [isNearBottom]);

  // Capture scrolling to detect if user is near bottom or has scrolled up
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    // Consider the user near the bottom if they're within ~20px of the bottom
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    setIsNearBottom(isCloseToBottom);
  };

  // This is triggered whenever the FlatList re-renders or its content changes
  const handleContentSizeChange = useCallback(() => {
    // Auto-scroll only if user is near bottom
    scrollToBottomIfNeeded();
  }, [scrollToBottomIfNeeded]);

  /* =============================
     Load & Save Chat History
  ============================= */
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          setChatMessages(parsedMessages);
        } else {
          // If no chat history, add welcome message
          const welcomeMessage: Message = {
            role: 'assistant',
            content: 'Merhaba! Ben Nobi. Nasıl yardımcı olabilirim?',
          };
          setChatMessages([welcomeMessage]);
        }
      } catch {
        // If error loading, still show welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content: 'Merhaba! Ben Nobi. Nasıl yardımcı olabilirim?',
        };
        setChatMessages([welcomeMessage]);
      }
    };
    loadHistory();
    setPlaceholders(selectRandomPlaceholders());
  }, []);

  useEffect(() => {
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatMessages));
      } catch {
        // ignore
      }
    };
    saveHistory();
  }, [chatMessages]);

  /* =============================
     Auto-open Camera if Param
  ============================= */
  useEffect(() => {
    if (route.params?.openCamera) {
      setTimeout(() => {
        // If a specific photoPurpose was provided, use that
        const purposeKey = route.params?.photoPurpose || 'analyze_food';
        const purpose = photoPurposes.find(p => p.key === purposeKey) || photoPurposes[0];
        
        setSelectedPurpose(purpose);
        handleTakeMealPhoto();
        navigation.setParams({ openCamera: false, photoPurpose: undefined } as any);
      }, 0);
    }
  }, [route.params]);

  /* =============================
     Keyboard Handling
  ============================= */
  useEffect(() => {
    const onKeyboardShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      // If user was at the bottom, stay pinned after keyboard shows
      if (isNearBottom) {
        scrollToBottomIfNeeded();
      }
    };
    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      // If user was at the bottom, stay pinned after keyboard hides
      if (isNearBottom) {
        scrollToBottomIfNeeded();
      }
    };
    const showSub = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isNearBottom, scrollToBottomIfNeeded]);

  /* =============================
     Word-by-Word Reveal
  ============================= */
  useEffect(() => {
    const revealAssistantMessages = async () => {
      for (let i = 0; i < chatMessages.length; i++) {
        const msg = chatMessages[i];
        if (msg.role === 'assistant' && msg.content === '' && msg.fullContent) {
          const words = msg.fullContent.split(' ');
          let revealed = '';
          for (let w = 0; w < words.length; w++) {
            revealed += (w === 0 ? '' : ' ') + words[w];
            setChatMessages((prev) => {
              const updated = [...prev];
              updated[i] = { ...updated[i], content: revealed };
              return updated;
            });
            // Scroll if user was near bottom
            scrollToBottomIfNeeded();
            // wait between each word
            await new Promise((resolve) => setTimeout(resolve, WORD_REVEAL_SPEED_MS));
          }
        }
      }
    };
    revealAssistantMessages();
  }, [chatMessages, scrollToBottomIfNeeded]);

  /* =============================
     Placeholder Helpers
  ============================= */
  const selectRandomPlaceholders = (): string[] => {
    const all: string[] = [
      'Elmalı turta nasıl yaparım?',
      'Diyet listemi nasıl oluşturmalıyım?',
      'Kilo vermek için en iyi egzersizler nelerdir?',
      'Sağlıklı atıştırmalık tarifleri verir misin?',
      'Protein alımımı artırmak için ne yapmalıyım?',
      'Günlük kalori ihtiyacımı nasıl hesaplarım?',
      'Sağlıklı kahvaltı önerilerin var mı?',
      'Keto diyeti hakkında bilgi verir misin?',
      'Vejetaryen beslenme planı nasıl oluşturulur?',
      'Aralıklı oruç uygulaması ne işe yarar?',
      'Sağlıklı kilo alımını nasıl gerçekleştirebilirim?',
      'İdeal vücut kitle indeksim nedir?',
      'Gluten intoleransım var, ne yemeliyim?',
      'Sağlıklı yemek tarifleri paylaşır mısın?',
      'Günde ne kadar su içmeliyim?',
      'Stres yönetimi için önerilerin var mı?',
      'Uyku düzenimi nasıl iyileştirebilirim?',
      'Kardiyo ve ağırlık antrenmanı arasında nasıl seçim yapmalıyım?',
      'Vitamin ve mineral takviyeleri almalı mıyım?',
      'Sağlıklı bir öğle yemeği nasıl olmalı?',
    ];
    return [...all].sort(() => 0.5 - Math.random()).slice(0, 4);
  };

  /* =============================
     Send Text Message
  ============================= */
  const handleSendMessage = async (quickText?: string) => {
    // If the assistant is typing, don't send new messages
    if (isTyping) return;

    const text = quickText ?? message.trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', content: text };
    if (replyTo) userMsg.replyTo = replyTo;

    setChatMessages((prev) => [...prev, userMsg]);
    // remove clicked placeholder if user taps on it
    if (quickText) {
      setPlaceholders((prev) => prev.filter((p) => p !== quickText));
    }
    if (!quickText) setMessage('');
    setReplyTo(null);

    // Create assistant placeholder
    setIsTyping(true);
    setChatMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', fullContent: '' } as Message,
    ]);

    // Scroll to bottom if user was near bottom
    scrollToBottomIfNeeded();

    try {
      const url = `https://${ipv4Data.ipv4_address}/chatbot/send_message/`;
      // We'll just slice the last 10 messages
      const last10 = [...chatMessages, userMsg].slice(-10);
      const response = await axios.post(url, { messages: last10 });
      const assistantMsg = response.data.message ?? '';

      setChatMessages((prev) => {
        const updated = [...prev];
        // Find the last assistant placeholder
        const lastIndex = updated
          .map((m, i) => (m.role === 'assistant' ? i : -1))
          .filter((i) => i !== -1)
          .pop();
        if (lastIndex !== undefined && lastIndex !== -1) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: '',
            fullContent: assistantMsg,
          };
        }
        return updated;
      });
    } catch {
      // set error
      setChatMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'assistant' && updated[i].content === '') {
            updated[i] = {
              ...updated[i],
              content: 'Hata: Sunucuya bağlanılamıyor.',
            };
            break;
          }
        }
        return updated;
      });
    }
    setIsTyping(false);

    // Keep keyboard open:
    textInputRef.current?.focus();
  };

  const handlePlaceholderPress = (txt: string) => {
    handleSendMessage(txt);
  };

  /* =============================
     Camera & Additional Input
  ============================= */
  const openPurposeMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...photoPurposes.map((p) => p.label), 'İptal'],
          cancelButtonIndex: photoPurposes.length,
          title: 'Fotoğraf Amacınızı Seçin',
        },
        (buttonIndex) => {
          if (buttonIndex !== photoPurposes.length) {
            const chosen = photoPurposes[buttonIndex];
            setSelectedPurpose(chosen);
            handleTakeMealPhoto();
          }
        }
      );
    } else {
      setModalVisible(true);
    }
  };

  const closePurposeModal = () => setModalVisible(false);

  const handlePurposeSelect = (purpose: { key: string; label: string; placeholder: string }) => {
    setSelectedPurpose(purpose);
    closePurposeModal();
    handleTakeMealPhoto();
  };

  const handlePurposeInfo = (purposeKey: string) => {
    let infoText = '';
    if (purposeKey === 'analyze_food') {
      infoText = 'Bu seçenek, fotoğrafınızdaki yemeğin kalori ve makro analizini yapar.';
    } else if (purposeKey === 'prepare_meal') {
      infoText =
        'Bu seçenek, fotoğrafınızdaki malzemelere ek olarak, evde bulunan diğer malzemelerle tarif önerisi sunar.';
    } else if (purposeKey === 'menu_analysis') {
      infoText =
        'Bu seçenek, restoran veya menüdeki seçenekleri analiz ederek sağlıklı tercihlerinizi ön plana çıkarır.';
    } else if (purposeKey === 'food_item_analysis') {
      infoText = 'Bu seçenek, fotoğrafınızdaki gıda öğesinin sağlıklı olup olmadığını değerlendirir.';
    }
    Alert.alert('Bilgi', infoText);
  };

  const handleTakeMealPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setPhotoUri(localUri);

        if (
          selectedPurpose?.key === 'analyze_food' ||
          selectedPurpose?.key === 'food_item_analysis'
        ) {
          await handleImmediateImageUpload(localUri);
        } else {
          setPhotoAdditionalInput('');
          setPhotoAdditionalInputModalVisible(true);
        }
      }
    } catch {
      Alert.alert('Hata', 'Kamera açılırken bir hata oluştu.');
    }
  }, [selectedPurpose]);

  // CHANGE #1: Store userInput in content so it appears below the image
  const handleImmediateImageUpload = async (uri: string, userInput?: string) => {
    const imgMessage: Message = {
      role: 'user',
      content: userInput || '',
      image: uri,
    };
    setChatMessages((prev) => [...prev, imgMessage]);

    // Create assistant placeholder
    setIsTyping(true);
    setChatMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', fullContent: '' } as Message,
    ]);

    // Scroll to bottom if needed
    scrollToBottomIfNeeded();

    await uploadImage(uri, userInput);
  };

  const uploadImage = useCallback(
    async (imageUri: string, additionalInput?: string) => {
      if (!imageUri || isUploading) return;
      setIsUploading(true);

      try {
        const token = await AsyncStorage.getItem('accessToken');
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: 'meal_photo.jpg',
          type: 'image/jpeg',
        } as any);

        const purposeToSend = selectedPurpose?.key ?? 'analyze_food';
        formData.append('purpose', purposeToSend);
        if (additionalInput) {
          formData.append('additional_input', additionalInput);
        }

        const url = `https://${ipv4Data.ipv4_address}/chatbot/send_photo/`;
        const headers: any = { 'Content-Type': 'multipart/form-data' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await axios.post(url, formData, { headers });
        const serverMsg = response.data.message ?? '';

        setChatMessages((prev) => {
          const updated = [...prev];
          // Find the last assistant placeholder
          const lastIndex = updated
            .map((m, i) => (m.role === 'assistant' ? i : -1))
            .filter((i) => i !== -1)
            .pop();
          if (lastIndex !== undefined && lastIndex !== -1) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: '',
              fullContent: serverMsg,
            };
          }
          return updated;
        });
      } catch {
        Alert.alert('Hata', 'Görsel yüklenirken bir hata oluştu.');
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated
            .map((m, i) => (m.role === 'assistant' ? i : -1))
            .filter((i) => i !== -1)
            .pop();
          if (lastIndex !== undefined && lastIndex !== -1) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: 'Hata: Görsel yüklenemedi.',
            };
          }
          return updated;
        });
      } finally {
        setIsUploading(false);
        setIsTyping(false);
      }
    },
    [isUploading, selectedPurpose, scrollToBottomIfNeeded]
  );

  /* =============================
     Long Press Handler
  ============================= */
  const handleLongPress = (item: Message) => {
    Alert.alert(
      'Seçenekler',
      'Bu mesajla ne yapmak istersiniz?',
      [
        { text: 'Yanıtla', onPress: () => setReplyTo(item) },
        {
          text: 'Paylaş',
          onPress: () => {
            const shareText = item.content || 'Görsel bir mesaj paylaşılıyor.';
            Share.share({ message: shareText }).catch(() => {});
          },
        },
        { text: 'İptal', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  /* =============================
     Render Each Chat Message
  ============================= */
  const renderItem = ({ item }: { item: Message }) => {
    let swipeableRow: Swipeable | null = null;
    return (
      <Swipeable
        ref={(ref) => (swipeableRow = ref)}
        renderLeftActions={() => (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              setReplyTo(item);
              swipeableRow?.close();
            }}
          >
            <Text style={styles.replyButtonText}>Yanıtla</Text>
          </TouchableOpacity>
        )}
        overshootLeft={false}
      >
        <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.7}>
          <View
            style={
              item.role === 'user' ? styles.userMessageContainer : styles.botMessageContainer
            }
          >
            <Text
              style={[
                styles.messageSenderLabel,
                { color: item.role === 'user' ? '#fff' : '#000' },
              ]}
            >
              {item.role === 'user' ? 'Kullanıcı' : 'Nobi'}
            </Text>

            {item.replyTo && (
              <View style={styles.replySnippetContainer}>
                <Text style={styles.replySnippetText} numberOfLines={2} ellipsizeMode="tail">
                  {item.replyTo.content}
                </Text>
              </View>
            )}

            {/* CHANGE #2: If there's an image, show image + text below it. Otherwise, show existing logic */}
            {item.image ? (
              <>
                <Image source={{ uri: item.image }} style={styles.messageImage} />
                {item.content ? (
                  <Text style={styles.imageDescription}>{item.content}</Text>
                ) : null}
              </>
            ) : (
              item.role === 'assistant' && item.content === '' && isTyping ? (
                <ActivityIndicator size="small" color="#000" style={styles.typingIndicator} />
              ) : (
                item.content !== '' && (
                  <Text style={item.role === 'user' ? styles.userText : styles.botText}>
                    {item.content}
                  </Text>
                )
              )
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  /* =============================
     Additional Info Modal
  ============================= */
  const renderAdditionalInfoModal = () => (
    <Modal
      visible={photoAdditionalInputModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPhotoAdditionalInputModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setPhotoAdditionalInputModalVisible(false)}>
        <View style={styles.additionalInfoModalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.additionalInfoModalContent}>
              <Text style={styles.additionalInfoModalTitle}>{selectedPurpose?.label}</Text>
              <Text style={styles.additionalInfoModalSubtitle}>{selectedPurpose?.placeholder}</Text>
              <TextInput
                style={styles.additionalInfoTextInput}
                value={photoAdditionalInput}
                onChangeText={setPhotoAdditionalInput}
                placeholder="Ek bilgi ekleyin (opsiyonel)"
                placeholderTextColor="#888"
              />
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.additionalInfoButton, { backgroundColor: '#999', marginRight: 10 }]}
                  onPress={() => setPhotoAdditionalInputModalVisible(false)}
                >
                  <Text style={styles.additionalInfoButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.additionalInfoButton}
                  onPress={async () => {
                    setPhotoAdditionalInputModalVisible(false);
                    if (photoUri) {
                      // Pass user’s typed text to handleImmediateImageUpload
                      await handleImmediateImageUpload(photoUri, photoAdditionalInput);
                      setPhotoUri(null);
                    }
                  }}
                >
                  <Text style={styles.additionalInfoButtonText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  /* =============================
     Render
  ============================= */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftIconContainer}>
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </View>
        <Text style={styles.headerText}>Sohbet</Text>
        <View style={styles.rightIconPlaceholder} />
      </View>
      <View style={styles.headerSeparator} />

      {/* Chat List */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
      />

      {/* "Jump to Latest" Button */}
      {!isNearBottom && (
        <TouchableOpacity
          style={[styles.scrollToBottomButton, { bottom: 120 }]}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            setIsNearBottom(true);
          }}
        >
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Placeholders */}
      {!isKeyboardVisible && placeholders.length > 0 && !replyTo && !isTyping && (
        <View style={styles.placeholdersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {placeholders.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.placeholderButton}
                onPress={() => handlePlaceholderPress(p)}
              >
                <Text style={styles.placeholderText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Container */}
      <View style={styles.inputAndReplyContainer}>
        {replyTo && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyIconContainer}>
              <Ionicons name="return-up-back" size={20} color="#468f5d" />
            </View>
            <View style={styles.replyTextContainer}>
              <Text style={styles.replyPreviewLabel}>Yanıtlanan mesaj:</Text>
              <Text style={styles.replyPreviewContent} numberOfLines={2} ellipsizeMode="tail">
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close-circle" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.chatInputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.chatInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Mesaj yazın..."
            placeholderTextColor="#000"
            editable={!isTyping}
          />
          <TouchableOpacity style={styles.cameraButton} onPress={openPurposeMenu} disabled={isTyping}>
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage()}
            disabled={isTyping}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Purpose Selection Modal (Android) */}
      {Platform.OS !== 'ios' && (
        <Modal
          transparent
          visible={modalVisible}
          animationType="slide"
          onRequestClose={closePurposeModal}
        >
          <TouchableWithoutFeedback onPress={closePurposeModal}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { marginTop: 'auto', marginBottom: 20 }]}>
                {photoPurposes.map((purpose) => (
                  <View key={purpose.key} style={styles.modalRow}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => handlePurposeSelect(purpose)}
                    >
                      <Text style={styles.modalButtonText}>{purpose.label}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handlePurposeInfo(purpose.key)}
                      style={styles.infoButton}
                    >
                      <Ionicons name="information-circle-outline" size={20} color="#468f5d" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={closePurposeModal}
                >
                  <Text style={[styles.modalButtonText, styles.modalCancelButtonText]}>
                    İptal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Additional Info Modal */}
      {renderAdditionalInfoModal()}
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf3ea',
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
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? 20 : 50,
    padding: 4,
  },
  rightIconPlaceholder: {
    position: 'absolute',
    right: 16,
    top: 0,
    width: 24,
    height: 24,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSeparator: {
    height: 2,
    backgroundColor: '#468f5d',
    width: '100%',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginBottom: 15,
    backgroundColor: '#468f5d',
    padding: 10,
    borderRadius: 20,
    maxWidth: '75%',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
    marginBottom: 15,
    backgroundColor: '#e5e5ea',
    padding: 10,
    borderRadius: 20,
    maxWidth: '75%',
  },
  messageSenderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  replySnippetContainer: {
    backgroundColor: '#dcdcdc',
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#468f5d',
    marginBottom: 5,
    borderRadius: 5,
  },
  replySnippetText: {
    fontSize: 14,
    color: '#555',
  },
  userText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  botText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 10,
    resizeMode: 'cover',
  },
  typingIndicator: {
    marginTop: 5,
  },
  imageDescription: {
    marginTop: 4,
    fontSize: 14,
    color: '#fff',
  },
  placeholdersContainer: {
    backgroundColor: '#faf3ea',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  placeholderButton: {
    backgroundColor: '#ABD1D1',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  placeholderText: {
    color: '#000',
    fontSize: 14,
  },
  inputAndReplyContainer: {
    backgroundColor: '#faf3ea',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  replyIconContainer: {
    marginRight: 10,
  },
  replyTextContainer: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  replyPreviewContent: {
    color: '#333',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginRight: 10,
    fontSize: 16,
    color: '#000',
  },
  cameraButton: {
    backgroundColor: '#468f5d',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#468f5d',
    borderRadius: 20,
    padding: 10,
  },
  replyButton: {
    backgroundColor: '#468f5d',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 10,
    marginVertical: 5,
  },
  replyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#468f5d',
    borderRadius: 25,
    padding: 8,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#468f5d',
  },
  infoButton: {
    padding: 4,
    marginLeft: 10,
  },
  modalCancelButton: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
  },
  modalCancelButtonText: {
    color: '#ff3b30',
  },
  additionalInfoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  additionalInfoModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  additionalInfoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#468f5d',
  },
  additionalInfoModalSubtitle: {
    fontSize: 14,
    marginBottom: 15,
    color: '#555',
  },
  additionalInfoTextInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  additionalInfoButton: {
    flex: 1,
    backgroundColor: '#468f5d',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  additionalInfoButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
