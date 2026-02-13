
"use client";
// src/app/wishes/request/page.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShieldAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { createWish } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";

export default function RequestWishPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [category, setCategory] = useState<string | undefined>();
  const [deadline, setDeadline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
          <CardTitle className="text-3xl font-bold text-primary">{t('wishes.request.title')}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {t('wishes.request.subtitle')}
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) {
              toast({ title: t('wishes.request.signInTitle'), description: t('wishes.request.signInDesc'), variant: 'destructive' });
              return;
            }
            if (!title.trim() || !description.trim() || !(goalAmount > 0)) {
              toast({ title: t('wishes.request.missingTitle'), description: t('wishes.request.missingDesc'), variant: 'destructive' });
              return;
            }
            setSubmitting(true);
            try {
              await createWish({
                title: title.trim(),
                description: description.trim(),
                goalAmount,
                currency: 'EGP',
                category,
                deadline: deadline || undefined,
                imageUrl: imageUrl.trim() || undefined,
                videoUrl: videoUrl.trim() || undefined,
              });
              toast({ title: t('wishes.request.submittedTitle'), description: t('wishes.request.submittedDesc') });
              setTitle('');
              setDescription('');
              setGoalAmount(0);
              setCategory(undefined);
              setDeadline('');
              setImageUrl('');
              setVideoUrl('');
            } catch (err: any) {
              toast({
                title: t('wishes.request.submitFailedTitle'),
                description: getErrorMessage(err, t('wishes.request.submitFailedDesc')),
                variant: 'destructive'
              });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wish-title">{t('wishes.request.wishTitleLabel')}</Label>
              <Input id="wish-title" name="wish-title" placeholder={t('wishes.request.wishTitlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-description">{t('wishes.request.wishDescriptionLabel')}</Label>
              <Textarea id="wish-description" name="wish-description" placeholder={t('wishes.request.wishDescriptionPlaceholder')} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">{t('wishes.request.goalLabel')}</Label>
              <Input id="goal" type="number" min={1} value={goalAmount || ''} onChange={(e) => setGoalAmount(Number(e.target.value))} placeholder={t('wishes.request.goalPlaceholder')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-category">{t('wishes.request.categoryLabel')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="wish-category">
                  <SelectValue placeholder={t('wishes.request.categoryPlaceholder')} />
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
              <Label htmlFor="wish-deadline">{t('wishes.request.deadlineLabel')}</Label>
              <Input id="wish-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-image">{t('wishes.request.imageLabel')}</Label>
              <Input id="wish-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder={t('wishes.request.imagePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wish-video">{t('wishes.request.videoLabel')}</Label>
              <Input id="wish-video" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t('wishes.request.videoPlaceholder')} />
            </div>
             <Alert variant="default" className="mt-4 bg-muted/50 border-primary/30">
                <ShieldAlertIcon className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary/90">{t('wishes.request.privacyTitle')}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                 {t('wishes.request.privacyBody')}
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6">
              <Star className="mr-2 h-5 w-5" />
              {submitting ? t('wishes.request.submitting') : t('wishes.request.submitButton')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
