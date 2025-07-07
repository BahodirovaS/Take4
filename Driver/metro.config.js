const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['native', 'ios', 'android'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

//added these two lines to get rid of "component auth has not been registered yet, js engine: hermes error"
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;


module.exports = config;