"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShieldAlertIcon, UploadCloudIcon, VideoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWish } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";
import { storage } from "@/services/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getWishPath } from "@/lib/public-ids";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export default function RequestWishPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [category, setCategory] = useState<string | undefined>();
  const [deadline, setDeadline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const wishCategories = [
    { value: "education", label: t("wishes.request.categories.education") },
    { value: "healthcare", label: t("wishes.request.categories.healthcare") },
    { value: "housing", label: t("wishes.request.categories.housing") },
    { value: "food", label: t("wishes.request.categories.food") },
    { value: "employment", label: t("wishes.request.categories.employment") },
    { value: "community", label: t("wishes.request.categories.community") },
    { value: "other", label: t("wishes.request.categories.other") },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <Star className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold text-primary">{t("wishes.request.title")}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {t("wishes.request.subtitle")}
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) {
              toast({ title: t("wishes.request.signInTitle"), description: t("wishes.request.signInDesc"), variant: "destructive" });
              return;
            }
            if (!title.trim() || !description.trim() || !(goalAmount > 0)) {
              toast({ title: t("wishes.request.missingTitle"), description: t("wishes.request.missingDesc"), variant: "destructive" });
              return;
            }
            if (imageFile && imageFile.size > MAX_IMAGE_BYTES) {
              toast({ title: t("wishes.request.submitFailedTitle"), description: "Image must be 5MB or less.", variant: "destructive" });
              return;
            }
            if (videoFile && videoFile.size > MAX_VIDEO_BYTES) {
              toast({ title: t("wishes.request.submitFailedTitle"), description: "Video must be 25MB or less.", variant: "destructive" });
              return;
            }
            if ((imageFile || videoFile) && !storage) {
              toast({ title: t("wishes.request.submitFailedTitle"), description: "Media upload is not available right now.", variant: "destructive" });
              return;
            }
            setSubmitting(true);
            try {
              let uploadedImageUrl = imageUrl.trim() || undefined;
              let uploadedVideoUrl = videoUrl.trim() || undefined;

              if (imageFile && storage) {
                const imageRef = ref(storage, `wishes/${user.uid}/images/${Date.now()}-${imageFile.name}`);
                await uploadBytes(imageRef, imageFile);
                uploadedImageUrl = await getDownloadURL(imageRef);
              }
              if (videoFile && storage) {
                const clipRef = ref(storage, `wishes/${user.uid}/videos/${Date.now()}-${videoFile.name}`);
                await uploadBytes(clipRef, videoFile);
                uploadedVideoUrl = await getDownloadURL(clipRef);
              }

              const created = await createWish({
                title: title.trim(),
                description: description.trim(),
                goalAmount,
                currency: "EGP",
                category,
                deadline: deadline || undefined,
                imageUrl: uploadedImageUrl,
                videoUrl: uploadedVideoUrl,
              });
              toast({ title: t("wishes.request.submittedTitle"), description: t("wishes.request.submittedDesc") });
              setTitle("");
              setDescription("");
              setGoalAmount(0);
              setCategory(undefined);
              setDeadline("");
              setImageUrl("");
              setVideoUrl("");
              setImageFile(null);
              setVideoFile(null);
              setImagePreview("");
              if (imageInputRef.current) imageInputRef.current.value = "";
              if (videoInputRef.current) videoInputRef.current.value = "";
              router.push(getWishPath({
                id: created.id,
                publicId: created.publicId || null,
                title: title.trim(),
              }));
            } catch (err: any) {
              toast({
                title: t("wishes.request.submitFailedTitle"),
                description: getErrorMessage(err, t("wishes.request.submitFailedDesc")),
                variant: "destructive",
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wish-title">{t("wishes.request.wishTitleLabel")}</Label>
              <Input id="wish-title" name="wish-title" placeholder={t("wishes.request.wishTitlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-description">{t("wishes.request.wishDescriptionLabel")}</Label>
              <Textarea id="wish-description" name="wish-description" placeholder={t("wishes.request.wishDescriptionPlaceholder")} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">{t("wishes.request.goalLabel")}</Label>
              <Input id="goal" type="number" min={1} value={goalAmount || ""} onChange={(e) => setGoalAmount(Number(e.target.value))} placeholder={t("wishes.request.goalPlaceholder")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-category">{t("wishes.request.categoryLabel")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="wish-category">
                  <SelectValue placeholder={t("wishes.request.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {wishCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-deadline">{t("wishes.request.deadlineLabel")}</Label>
              <Input id="wish-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div className="rounded-lg border border-dashed p-3 space-y-3">
              <Label htmlFor="wish-image-upload">{t("wishes.request.imageLabel")}</Label>
              <Input
                id="wish-image-upload"
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (!file) {
                    setImagePreview("");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => setImagePreview(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
              {imagePreview ? (
                <div className="relative h-44 w-full overflow-hidden rounded-md border">
                  <Image src={imagePreview} alt={t("wishes.request.imageLabel")} fill style={{ objectFit: "cover" }} />
                </div>
              ) : (
                <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <UploadCloudIcon className="h-4 w-4" />
                  JPG, PNG, WEBP (max 5MB)
                </div>
              )}
              <Input id="wish-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder={t("wishes.request.imagePlaceholder")} />
            </div>

            <div className="rounded-lg border border-dashed p-3 space-y-3">
              <Label htmlFor="wish-video-upload">{t("wishes.request.videoLabel")}</Label>
              <Input
                id="wish-video-upload"
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4" />
                  <span><strong>Recommended:</strong> MP4 (H.264) or WebM</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">⚠️ Avoid .MOV files from video editors (ProRes/DNxHD). Use MP4 instead.</p>
                <p className="text-xs text-muted-foreground ml-6">Max 25MB • Players may not support all codecs</p>
              </div>
              <Input id="wish-video" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t("wishes.request.videoPlaceholder")} />
            </div>

            <Alert variant="default" className="bg-muted/50 border-primary/30">
              <ShieldAlertIcon className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary/90">{t("wishes.request.privacyTitle")}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {t("wishes.request.privacyBody")}
              </AlertDescription>
            </Alert>
            <Alert variant="default" className="bg-amber-50 border-amber-300">
              <ShieldAlertIcon className="h-5 w-5 text-amber-700" />
              <AlertTitle className="text-amber-800">Important before submitting</AlertTitle>
              <AlertDescription className="text-amber-700">
                After you submit, this wish cannot be edited or deleted from the app. Please review details carefully.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6">
              <Star className="mr-2 h-5 w-5" />
              {submitting ? t("wishes.request.submitting") : t("wishes.request.submitButton")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
