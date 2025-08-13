// app/screens/Main/SettingsScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState<boolean>(false);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState<boolean>(false);
  const [locationEnabled, setLocationEnabled] = React.useState<boolean>(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = React.useState<boolean>(false);
  const [soundsEnabled, setSoundsEnabled] = React.useState<boolean>(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerText}>Ayarlar</Text>
        {/* Placeholder for alignment */}
        <View style={{ width: 24 }} />
      </View>

      {/* Settings Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Notification Setting */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Bildirimler</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => setNotificationsEnabled(value)}
          />
        </View>

        {/* Dark Mode Setting */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Karanlık Mod</Text>
          <Switch
            value={darkModeEnabled}
            onValueChange={(value) => setDarkModeEnabled(value)}
          />
        </View>

        {/* Location Setting */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Konum Servisleri</Text>
          <Switch
            value={locationEnabled}
            onValueChange={(value) => setLocationEnabled(value)}
          />
        </View>

        {/* Auto Update Setting */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Otomatik Güncellemeler</Text>
          <Switch
            value={autoUpdateEnabled}
            onValueChange={(value) => setAutoUpdateEnabled(value)}
          />
        </View>

        {/* Sounds Setting */}
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Sesler</Text>
          <Switch
            value={soundsEnabled}
            onValueChange={(value) => setSoundsEnabled(value)}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 15,
    backgroundColor: '#006039',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 18,
    color: '#1C1C1E',
  },
});
