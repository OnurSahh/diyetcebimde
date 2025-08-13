// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.resolver = {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'cjs'],
    alias: {
      '@components': './app/components',
      '@screens': './app/screens',
      '@navigation': './app/navigation',
      '@context': './app/context',
      '@hooks': './app/hooks',
      '@assets': './assets',
      '@utils': './app/utils',
      '@constants': './app/constants',
    },
  };

  return config;
})();
