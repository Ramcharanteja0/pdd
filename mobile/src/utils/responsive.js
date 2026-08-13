import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base dimensions for scaling (standard phone size)
const baseWidth = 375;
const baseHeight = 812;

// Calculate scale factors
const widthScale = width / baseWidth;
const heightScale = height / baseHeight;

// Use the smaller scale to maintain aspect ratio
const scale = Math.min(widthScale, heightScale);

/**
 * Scale font sizes responsively
 * @param {number} fontSize - Base font size
 * @returns {number} Scaled font size
 */
export const scaleFont = (fontSize) => {
  return Math.round(fontSize * scale);
};

/**
 * Scale spacing/padding/margin responsively
 * @param {number} size - Base size
 * @returns {number} Scaled size
 */
export const scaleSize = (size) => {
  return Math.round(size * scale);
};

/**
 * Scale width responsively
 * @param {number} size - Base size
 * @returns {number} Scaled width
 */
export const scaleWidth = (size) => {
  return Math.round(size * widthScale);
};

/**
 * Scale height responsively
 * @param {number} size - Base size
 * @returns {number} Scaled height
 */
export const scaleHeight = (size) => {
  return Math.round(size * heightScale);
};

/**
 * Get responsive padding based on screen size
 */
export const responsivePadding = () => {
  if (width < 350) {
    return 12;
  } else if (width < 400) {
    return 16;
  } else {
    return 20;
  }
};

/**
 * Get responsive border radius
 */
export const responsiveBorderRadius = () => {
  return scaleSize(12);
};

/**
 * Get responsive icon size
 */
export const responsiveIconSize = (baseSize = 24) => {
  return scaleSize(baseSize);
};

/**
 * Dimensions
 */
export const screenWidth = width;
export const screenHeight = height;
export const isSmallScreen = width < 375;
export const isLargeScreen = width > 450;
export const isTablet = width > 600;

/**
 * Create scalable style values
 */
export const RFValue = (value) => {
  return scaleFont(value);
};

// Export scale factor for manual calculations if needed
export const getScale = () => scale;
