import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type AppLogoProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Matches the SVG used by the web AppHeader
export function AppLogo({ size = 28, color = '#4A7C59', strokeWidth = 2 }: AppLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityRole="image"
    >
      <Path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <Path d="m18 2 4 4-4 4" />
      <Path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" />
      <Path d="m18 22 4-4-4-4" />
    </Svg>
  );
}

export default AppLogo;
