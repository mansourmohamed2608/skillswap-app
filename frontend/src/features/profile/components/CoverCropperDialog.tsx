"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The image to crop as a Data URL or object URL */
  imageSrc: string;
  /** Called with the cropped image as a File when user confirms */
  onCropped: (file: File) => void;
  /** Fixed aspect ratio to enforce (width / height). Default 4:1 */
  aspect?: number;
  /** Output width of the generated image. Default 1600. Height derived by aspect. */
  outputWidth?: number;
  /** Optional suggested filename for output result */
  outFileName?: string;
}

// Utility to create an HTMLImageElement from a src
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous"; // needed for cross-origin images on canvas
    img.src = src;
  });
}

async function getCroppedImage(
  imageSrc: string,
  cropPixels: Area,
  outputWidth: number,
  aspect: number
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const outputHeight = Math.round(outputWidth / aspect);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Scale factor between original and target crop size
  const scaleX = outputWidth / cropPixels.width;
  const scaleY = outputHeight / cropPixels.height;

  // Draw the cropped portion scaled to the canvas size
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    Math.round(cropPixels.width * scaleX),
    Math.round(cropPixels.height * scaleY)
  );

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.92);
  });
}

export default function CoverCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropped,
  aspect = 4 / 1,
  outputWidth = 1600,
  outFileName = "cover.jpg",
}: Props) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.2);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const zoomValue = useMemo(() => [zoom], [zoom]);

  const doConfirm = useCallback(async () => {
    if (!croppedArea) return;
    const blob = await getCroppedImage(imageSrc, croppedArea, outputWidth, aspect);
    const file = new File([blob], outFileName, { type: blob.type });
    onCropped(file);
    onOpenChange(false);
  }, [croppedArea, imageSrc, outputWidth, aspect, outFileName, onCropped, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('profile.cropper.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('profile.cropper.description', { defaultValue: 'Adjust and crop your image, then click save.' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="relative w-full h-[50vh] bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            objectFit="contain"
            restrictPosition={false}
          />
        </div>
        <div className="py-3">
          <label className="text-sm text-muted-foreground">{t('profile.cropper.zoom')}</label>
          <Slider
            value={zoomValue}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('profile.cropper.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={doConfirm}>{t('profile.cropper.save')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
