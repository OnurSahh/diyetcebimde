// babel.config.js

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
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
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      ],
      // Other plugins can be added here
    ],
  };
};
