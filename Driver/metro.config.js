const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['native', 'ios', 'android'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;