/* eslint-disable @typescript-eslint/no-require-imports -- Metro's config loader uses CommonJS. */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../../src')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, '../../node_modules')];
config.resolver.disableHierarchicalLookup = true;
module.exports = config;
