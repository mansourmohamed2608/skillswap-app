declare module 'react-easy-crop' {
  import * as React from 'react';
  export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  type CropperProps = {
    image: string;
    crop: { x: number; y: number };
    zoom: number;
    aspect: number;
    onCropChange: (crop: { x: number; y: number }) => void;
    onZoomChange: (zoom: number) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
    showGrid?: boolean;
    objectFit?: 'contain' | 'horizontal-cover' | 'vertical-cover' | 'contain';
    restrictPosition?: boolean;
    classes?: Partial<Record<'container' | 'media' | 'cropArea', string>>;
  } & React.HTMLAttributes<HTMLDivElement>;

  const Cropper: React.FC<CropperProps>;
  export default Cropper;
}
