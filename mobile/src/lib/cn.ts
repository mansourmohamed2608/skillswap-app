// Comprehensive className to style converter for React Native
// Maps Tailwind-like class names to React Native styles - matches frontend exactly
// Comprehensive className to style converter for React Native
// Maps Tailwind-like class names to React Native styles - matches frontend exactly

import { TextStyle, ViewStyle } from 'react-native';

// HSL to HEX converter to match frontend colors exactly
function hslToHex(h: number, s: number, l: number): string {
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h <= 360) { r = c; g = 0; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Colors matching frontend globals.css exactly
const colors = {
  background: hslToHex(60, 56, 91),
  foreground: hslToHex(0, 0, 20),
  card: hslToHex(60, 50, 95),
  'card-foreground': hslToHex(0, 0, 20),
  primary: hslToHex(140, 28, 34),
  'primary-foreground': '#FFFFFF',
  secondary: hslToHex(140, 20, 50),
  'secondary-foreground': '#FFFFFF',
  muted: hslToHex(60, 30, 85),
  'muted-foreground': hslToHex(0, 0, 40),
  accent: hslToHex(20, 60, 50),
  'accent-foreground': '#FFFFFF',
  destructive: hslToHex(0, 84.2, 60.2),
  'destructive-foreground': hslToHex(0, 0, 98),
  border: hslToHex(140, 15, 75),
  input: hslToHex(60, 40, 93),
  ring: hslToHex(20, 60, 50),
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  // Gray scale
  'gray-50': '#F9FAFB',
  'gray-100': '#F3F4F6',
  'gray-200': '#E5E7EB',
  'gray-300': '#D1D5DB',
  'gray-400': '#9CA3AF',
  'gray-500': '#6B7280',
  'gray-600': '#4B5563',
  'gray-700': '#374151',
  'gray-800': '#1F2937',
  'gray-900': '#111827',
  // Red scale
  'red-50': '#FEF2F2',
  'red-100': '#FEE2E2',
  'red-200': '#FECACA',
  'red-300': '#FCA5A5',
  'red-400': '#F87171',
  'red-500': '#EF4444',
  'red-600': '#DC2626',
  'red-700': '#B91C1C',
  'red-800': '#991B1B',
  'red-900': '#7F1D1D',
  // Green scale
  'green-50': '#F0FDF4',
  'green-100': '#DCFCE7',
  'green-200': '#BBF7D0',
  'green-300': '#86EFAC',
  'green-400': '#4ADE80',
  'green-500': '#22C55E',
  'green-600': '#16A34A',
  'green-700': '#15803D',
  'green-800': '#166534',
  'green-900': '#14532D',
  // Blue scale
  'blue-50': '#EFF6FF',
  'blue-100': '#DBEAFE',
  'blue-200': '#BFDBFE',
  'blue-300': '#93C5FD',
  'blue-400': '#60A5FA',
  'blue-500': '#3B82F6',
  'blue-600': '#2563EB',
  'blue-700': '#1D4ED8',
  'blue-800': '#1E40AF',
  'blue-900': '#1E3A8A',
};

export function cn(...classNames: (string | undefined | false)[]): ViewStyle | TextStyle {
  const style: any = {};
  
  classNames.filter(Boolean).forEach((className) => {
    if (!className) return;
    
    const classes = className.split(' ');
    classes.forEach((cls) => {
      // Flex & Layout
      if (cls === 'flex') style.display = 'flex';
      if (cls === 'flex-1') style.flex = 1;
      if (cls === 'flex-row') style.flexDirection = 'row';
      if (cls === 'flex-col') style.flexDirection = 'column';
      if (cls === 'items-center') style.alignItems = 'center';
      if (cls === 'items-start') style.alignItems = 'flex-start';
      if (cls === 'items-end') style.alignItems = 'flex-end';
      if (cls === 'items-stretch') style.alignItems = 'stretch';
      if (cls === 'justify-center') style.justifyContent = 'center';
      if (cls === 'justify-between') style.justifyContent = 'space-between';
      if (cls === 'justify-around') style.justifyContent = 'space-around';
      if (cls === 'justify-start') style.justifyContent = 'flex-start';
      if (cls === 'justify-end') style.justifyContent = 'flex-end';
      if (cls === 'self-center') style.alignSelf = 'center';
      if (cls === 'self-start') style.alignSelf = 'flex-start';
      if (cls === 'self-end') style.alignSelf = 'flex-end';
      if (cls === 'self-stretch') style.alignSelf = 'stretch';
      if (cls === 'flex-wrap') style.flexWrap = 'wrap';
      if (cls === 'flex-nowrap') style.flexWrap = 'nowrap';
      
      // Position
      if (cls === 'absolute') style.position = 'absolute';
      if (cls === 'relative') style.position = 'relative';
      if (cls.startsWith('bottom-')) {
        const val = parseInt(cls.replace('bottom-', '')) * 4;
        style.bottom = val;
      }
      if (cls.startsWith('top-')) {
        const val = parseInt(cls.replace('top-', '')) * 4;
        style.top = val;
      }
      if (cls.startsWith('left-')) {
        const val = parseInt(cls.replace('left-', '')) * 4;
        style.left = val;
      }
      if (cls.startsWith('right-')) {
        const val = parseInt(cls.replace('right-', '')) * 4;
        style.right = val;
      }
      
      // Background colors
      if (cls.startsWith('bg-')) {
        const color = cls.replace('bg-', '');
        if (colors[color as keyof typeof colors]) {
          style.backgroundColor = colors[color as keyof typeof colors];
        } else if (color.startsWith('#')) {
          style.backgroundColor = color;
        }
      }
      
      // Text colors
      if (cls.startsWith('text-')) {
        const rest = cls.replace('text-', '');
        if (colors[rest as keyof typeof colors]) {
          style.color = colors[rest as keyof typeof colors];
        } else if (rest.startsWith('#')) {
          style.color = rest;
        }
      }
      
      // Border colors
      if (cls.startsWith('border-') && !cls.includes('border-t') && !cls.includes('border-b') && !cls.includes('border-l') && !cls.includes('border-r')) {
        const rest = cls.replace('border-', '');
        if (!rest.match(/^\d+$/)) { // Not a number (border width)
          if (colors[rest as keyof typeof colors]) {
            style.borderColor = colors[rest as keyof typeof colors];
          }
        }
      }
      
      // Padding
      if (cls.startsWith('p-')) {
        const val = parseInt(cls.replace('p-', '')) * 4;
        if (!isNaN(val)) style.padding = val;
      }
      if (cls.startsWith('px-')) {
        const val = parseInt(cls.replace('px-', '')) * 4;
        if (!isNaN(val)) style.paddingHorizontal = val;
      }
      if (cls.startsWith('py-')) {
        const val = parseInt(cls.replace('py-', '')) * 4;
        if (!isNaN(val)) style.paddingVertical = val;
      }
      if (cls.startsWith('pt-')) {
        const val = parseInt(cls.replace('pt-', '')) * 4;
        if (!isNaN(val)) style.paddingTop = val;
      }
      if (cls.startsWith('pb-')) {
        const val = parseInt(cls.replace('pb-', '')) * 4;
        if (!isNaN(val)) style.paddingBottom = val;
      }
      if (cls.startsWith('pl-')) {
        const val = parseInt(cls.replace('pl-', '')) * 4;
        if (!isNaN(val)) style.paddingLeft = val;
      }
      if (cls.startsWith('pr-')) {
        const val = parseInt(cls.replace('pr-', '')) * 4;
        if (!isNaN(val)) style.paddingRight = val;
      }
      
      // Margin
      if (cls.startsWith('m-') && !cls.startsWith('mt-') && !cls.startsWith('mb-')) {
        const val = parseInt(cls.replace('m-', '')) * 4;
        if (!isNaN(val)) style.margin = val;
      }
      if (cls.startsWith('mx-')) {
        const val = parseInt(cls.replace('mx-', '')) * 4;
        if (!isNaN(val)) style.marginHorizontal = val;
      }
      if (cls.startsWith('my-')) {
        const val = parseInt(cls.replace('my-', '')) * 4;
        if (!isNaN(val)) style.marginVertical = val;
      }
      if (cls.startsWith('mt-')) {
        const val = parseInt(cls.replace('mt-', '')) * 4;
        if (!isNaN(val)) style.marginTop = val;
      }
      if (cls.startsWith('mb-')) {
        const val = parseInt(cls.replace('mb-', '')) * 4;
        if (!isNaN(val)) style.marginBottom = val;
      }
      if (cls.startsWith('ml-')) {
        const val = parseInt(cls.replace('ml-', '')) * 4;
        if (!isNaN(val)) style.marginLeft = val;
      }
      if (cls.startsWith('mr-')) {
        const val = parseInt(cls.replace('mr-', '')) * 4;
        if (!isNaN(val)) style.marginRight = val;
      }
      
      // Gap
      if (cls.startsWith('gap-')) {
        const val = parseInt(cls.replace('gap-', '')) * 4;
        if (!isNaN(val)) style.gap = val;
      }
      
      // Width & Height
      if (cls.startsWith('w-')) {
        const val = cls.replace('w-', '');
        if (val === 'full') style.width = '100%';
        else if (val === 'screen') style.width = '100%';
        else {
          const num = parseInt(val) * 4;
          if (!isNaN(num)) style.width = num;
        }
      }
      if (cls.startsWith('h-')) {
        const val = cls.replace('h-', '');
        if (val === 'full') style.height = '100%';
        else if (val === 'screen') style.height = '100%';
        else {
          const num = parseInt(val) * 4;
          if (!isNaN(num)) style.height = num;
        }
      }
      
      // Border width
      if (cls === 'border') style.borderWidth = 1;
      if (cls === 'border-0') style.borderWidth = 0;
      if (cls === 'border-2') style.borderWidth = 2;
      if (cls === 'border-4') style.borderWidth = 4;
      if (cls === 'border-t') style.borderTopWidth = 1;
      if (cls === 'border-b') style.borderBottomWidth = 1;
      if (cls === 'border-l') style.borderLeftWidth = 1;
      if (cls === 'border-r') style.borderRightWidth = 1;
      
      // Border radius
      if (cls === 'rounded') style.borderRadius = 4;
      if (cls === 'rounded-sm') style.borderRadius = 2;
      if (cls === 'rounded-md') style.borderRadius = 6;
      if (cls === 'rounded-lg') style.borderRadius = 8;
      if (cls === 'rounded-xl') style.borderRadius = 12;
      if (cls === 'rounded-full') style.borderRadius = 9999;
      
      // Shadow
      if (cls === 'shadow-sm') {
        style.shadowColor = '#000';
        style.shadowOffset = { width: 0, height: 1 };
        style.shadowOpacity = 0.05;
        style.shadowRadius = 1;
        style.elevation = 1;
      }
      if (cls === 'shadow') {
        style.shadowColor = '#000';
        style.shadowOffset = { width: 0, height: 1 };
        style.shadowOpacity = 0.1;
        style.shadowRadius = 2;
        style.elevation = 2;
      }
      if (cls === 'shadow-md') {
        style.shadowColor = '#000';
        style.shadowOffset = { width: 0, height: 2 };
        style.shadowOpacity = 0.15;
        style.shadowRadius = 4;
        style.elevation = 4;
      }
      if (cls === 'shadow-lg') {
        style.shadowColor = '#000';
        style.shadowOffset = { width: 0, height: 4 };
        style.shadowOpacity = 0.2;
        style.shadowRadius = 8;
        style.elevation = 8;
      }
      if (cls === 'shadow-xl') {
        style.shadowColor = '#000';
        style.shadowOffset = { width: 0, height: 8 };
        style.shadowOpacity = 0.25;
        style.shadowRadius = 16;
        style.elevation = 12;
      }
      
      // Font weight
      if (cls === 'font-thin') style.fontWeight = '100';
      if (cls === 'font-extralight') style.fontWeight = '200';
      if (cls === 'font-light') style.fontWeight = '300';
      if (cls === 'font-normal') style.fontWeight = '400';
      if (cls === 'font-medium') style.fontWeight = '500';
      if (cls === 'font-semibold') style.fontWeight = '600';
      if (cls === 'font-bold') style.fontWeight = '700';
      if (cls === 'font-extrabold') style.fontWeight = '800';
      if (cls === 'font-black') style.fontWeight = '900';
      
      // Text align
      if (cls === 'text-center') style.textAlign = 'center';
      if (cls === 'text-left') style.textAlign = 'left';
      if (cls === 'text-right') style.textAlign = 'right';
      if (cls === 'text-justify') style.textAlign = 'justify';
      
      // Text decoration
      if (cls === 'underline') style.textDecorationLine = 'underline';
      if (cls === 'line-through') style.textDecorationLine = 'line-through';
      if (cls === 'no-underline') style.textDecorationLine = 'none';
      
      // Text transform
      if (cls === 'uppercase') style.textTransform = 'uppercase';
      if (cls === 'lowercase') style.textTransform = 'lowercase';
      if (cls === 'capitalize') style.textTransform = 'capitalize';
      
      // Text size
      if (cls === 'text-xs') style.fontSize = 12;
      if (cls === 'text-sm') style.fontSize = 14;
      if (cls === 'text-base') style.fontSize = 16;
      if (cls === 'text-lg') style.fontSize = 18;
      if (cls === 'text-xl') style.fontSize = 20;
      if (cls === 'text-2xl') style.fontSize = 24;
      if (cls === 'text-3xl') style.fontSize = 30;
      if (cls === 'text-4xl') style.fontSize = 36;
      if (cls === 'text-5xl') style.fontSize = 48;
      if (cls === 'text-6xl') style.fontSize = 60;
      
      // Opacity
      if (cls.startsWith('opacity-')) {
        const val = parseInt(cls.replace('opacity-', ''));
        if (!isNaN(val)) style.opacity = val / 100;
      }
      
      // Z-index
      if (cls.startsWith('z-')) {
        const val = parseInt(cls.replace('z-', ''));
        if (!isNaN(val)) style.zIndex = val;
      }
      
      // Overflow
      if (cls === 'overflow-hidden') style.overflow = 'hidden';
      if (cls === 'overflow-visible') style.overflow = 'visible';
      if (cls === 'overflow-scroll') style.overflow = 'scroll';
      
      // Min/Max width & height
      if (cls.startsWith('min-w-')) {
        const val = cls.replace('min-w-', '');
        if (val === 'full') style.minWidth = '100%';
        else {
          const num = parseInt(val) * 4;
          if (!isNaN(num)) style.minWidth = num;
        }
      }
      if (cls.startsWith('min-h-')) {
        const val = cls.replace('min-h-', '');
        if (val === 'full') style.minHeight = '100%';
        else if (val === 'screen') style.minHeight = '100%';
        else {
          const num = parseInt(val) * 4;
          if (!isNaN(num)) style.minHeight = num;
        }
      }
      if (cls.startsWith('max-w-')) {
        const val = cls.replace('max-w-', '');
        if (val === 'full') style.maxWidth = '100%';
        else if (val === 'screen') style.maxWidth = '100%';
        else if (val === 'xs') style.maxWidth = 320;
        else if (val === 'sm') style.maxWidth = 384;
        else if (val === 'md') style.maxWidth = 448;
        else if (val === 'lg') style.maxWidth = 512;
        else if (val === 'xl') style.maxWidth = 576;
        else if (val === '2xl') style.maxWidth = 672;
        else if (val === '3xl') style.maxWidth = 768;
        else if (val === '4xl') style.maxWidth = 896;
        else {
          const num = parseInt(val) * 4;
          if (!isNaN(num)) style.maxWidth = num;
        }
      }
      
      // Line height
      if (cls === 'leading-none') style.lineHeight = 1;
      if (cls === 'leading-tight') style.lineHeight = 1.25;
      if (cls === 'leading-snug') style.lineHeight = 1.375;
      if (cls === 'leading-normal') style.lineHeight = 1.5;
      if (cls === 'leading-relaxed') style.lineHeight = 1.625;
      if (cls === 'leading-loose') style.lineHeight = 2;
      
      // Letter spacing
      if (cls === 'tracking-tighter') style.letterSpacing = -0.8;
      if (cls === 'tracking-tight') style.letterSpacing = -0.4;
      if (cls === 'tracking-normal') style.letterSpacing = 0;
      if (cls === 'tracking-wide') style.letterSpacing = 0.4;
      if (cls === 'tracking-wider') style.letterSpacing = 0.8;
      if (cls === 'tracking-widest') style.letterSpacing = 1.6;
    });
  });
  
  return style;
}

export default cn;
