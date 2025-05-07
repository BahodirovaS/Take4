const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add this line to fix the Firebase auth issue
config.resolver.unstable_enablePackageExports = false;

module.exports = config;