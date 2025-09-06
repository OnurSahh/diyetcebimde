import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-7309416658606873/5686973696';

const interstitial = InterstitialAd.createForAdUnitId(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

let isAdLoaded = false;
let messageCount = 0;

interstitial.addAdEventListener(AdEventType.LOADED, () => {
  isAdLoaded = true;
});

interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  isAdLoaded = false;
  loadAd();
});

interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
  console.log('Ad failed to load: ', error);
  isAdLoaded = false;
});

const loadAd = () => {
  if (!isAdLoaded) {
    interstitial.load();
  }
};

export const initializeAds = () => {
  loadAd();
};

export const showInterstitialAd = () => {
  if (isAdLoaded) {
    interstitial.show();
  } else {
    loadAd();
  }
};

export const shouldShowAd = (trigger: 'chat' | 'mealplan' | 'photo' | 'gpt') => {
  if (trigger === 'chat') {
    messageCount++;
    return messageCount % 3 === 0; // Show ad every 3 messages
  }
  if (trigger === 'mealplan') {
    return true; // Show ad when creating/regenerating meal plan
  }
  if (trigger === 'photo') {
    return true; // Show ad when taking photo
  }
  if (trigger === 'gpt') {
    return true; // Show ad when using Nobi (GPT)
  }
  return false;
};

export const resetMessageCount = () => {
  messageCount = 0;
};