/**
 * Type shim for react-native to support `tsc --noEmit` checks.
 * Expo's bundled react-native module lacks a package.json, which prevents
 * TypeScript from resolving module types when running tsc standalone.
 *
 * This file re-exports from @types/react-native (installed as devDependency),
 * allowing IDE and CI type checks to work without requiring Metro bundler.
 *
 * NOTE: At runtime Expo/Metro handles the real react-native resolution.
 */
export * from '@types/react-native';
