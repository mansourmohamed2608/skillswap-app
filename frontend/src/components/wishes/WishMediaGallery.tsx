"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle } from "lucide-react";

type WishMediaGalleryProps = {
  title?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  compact?: boolean;
};

function normalizeMediaUrl(input?: string | null): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return null;
}

function MediaFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="aspect-video w-full">{children}</div>
    </div>
  );
}

export function WishMediaGallery({ title, imageUrl, videoUrl, compact = false }: WishMediaGalleryProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const safeImageUrl = useMemo(() => normalizeMediaUrl(imageUrl), [imageUrl]);
  const safeVideoUrl = useMemo(() => normalizeMediaUrl(videoUrl), [videoUrl]);

  const showVideo = Boolean(safeVideoUrl) && !videoFailed;
  const showImage = Boolean(safeImageUrl);

  if (!showVideo && !showImage) return null;

  if (compact) {
    if (showVideo) {
      return (
        <MediaFrame>
          <video
            className="h-full w-full object-contain bg-black"
            src={safeVideoUrl || undefined}
            controls
            preload="metadata"
            playsInline
            onError={() => setVideoFailed(true)}
          />
        </MediaFrame>
      );
    }

    return (
      <MediaFrame>
        <Image
          src={safeImageUrl || ""}
          alt={title || "wish media"}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </MediaFrame>
    );
  }

  return (
    <div className="space-y-3">
      {showVideo ? (
        <MediaFrame>
          <video
            className="h-full w-full object-contain bg-black"
            src={safeVideoUrl || undefined}
            controls
            preload="metadata"
            playsInline
            onError={() => setVideoFailed(true)}
          />
        </MediaFrame>
      ) : null}

      {videoFailed ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          This video format could not be played in your browser.
        </div>
      ) : null}

      {showImage ? (
        <MediaFrame>
          <Image
            src={safeImageUrl || ""}
            alt={title || "wish media"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 960px"
          />
        </MediaFrame>
      ) : null}
    </div>
  );
}
