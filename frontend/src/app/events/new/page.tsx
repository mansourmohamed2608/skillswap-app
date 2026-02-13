"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { useToast } from "@/hooks/use-toast";
import { createEvent } from "@/services/api";
import { db, isFirebaseConfigured, storage } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getErrorMessage } from "@/lib/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewEventPage() {
  const { user, loading } = useAuth();
  const { membership, active, loading: membershipLoading } = useMembership();
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [kycLoading, setKycLoading] = useState(false);

  const isBusiness = membership?.plan === "Business" && active;
  const kycVerified = kycStatus === "VERIFIED";

  useEffect(() => {
    let mounted = true;
    if (!user || !db || !isFirebaseConfigured()) {
      setKycStatus("PENDING");
      return () => undefined;
    }
    setKycLoading(true);
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!mounted) return;
        const data = snap.data();
        const status = String(data?.kyc?.status || "").toUpperCase();
        setKycStatus(status || "PENDING");
      })
      .catch(() => {
        if (mounted) setKycStatus("PENDING");
      })
      .finally(() => {
        if (mounted) setKycLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>{t("events.create.signInRequiredTitle")}</AlertTitle>
          <AlertDescription>{t("events.create.signInRequiredBody")}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild>
            <Link href="/auth/signin">{t("header.signIn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = kycVerified && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) {
      toast({ title: t("events.create.requiredTitle"), variant: "destructive" });
      return;
    }
    if (!kycVerified) {
      toast({ title: t("events.create.kycRequiredTitle"), description: t("events.create.kycRequiredBody"), variant: "destructive" });
      return;
    }

    const startDate = new Date(startsAt);
    if (Number.isNaN(startDate.getTime())) {
      toast({ title: t("events.create.requiredTitle"), variant: "destructive" });
      return;
    }
    const endDate = endsAt ? new Date(endsAt) : null;
    if (endsAt && Number.isNaN(endDate?.getTime() || NaN)) {
      toast({ title: t("events.create.requiredTitle"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let coverUrl: string | undefined;
      if (coverFile) {
        if (coverFile.size > 5 * 1024 * 1024) {
          toast({ title: t("events.create.failedTitle"), description: t("events.create.coverHelp"), variant: "destructive" });
          setSubmitting(false);
          return;
        }
        if (!storage) {
          throw new Error("Storage not configured");
        }
        if (!user) {
          throw new Error("User not authenticated");
        }
        const key = `events/${user.uid}/${Date.now()}_${coverFile.name.replace(/\s+/g, "_")}`;
        const coverRef = ref(storage, key);
        await uploadBytes(coverRef, coverFile);
        coverUrl = await getDownloadURL(coverRef);
      }

      const cap = capacity.trim() ? Number(capacity) : undefined;
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt: startDate.toISOString(),
        endsAt: endDate ? endDate.toISOString() : undefined,
        capacity: cap && cap > 0 ? cap : undefined,
        coverUrl,
      });

      toast({ title: t("events.create.successTitle"), description: t("events.create.successBody") });
      router.push("/events");
    } catch (err: any) {
      toast({
        title: t("events.create.failedTitle"),
        description: getErrorMessage(err, t("events.create.failedTitle")),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CalendarPlus className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">{t("events.create.title")}</CardTitle>
              <CardDescription>{t("events.create.subtitle")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!membershipLoading && !isBusiness && (
            <Alert>
              <AlertTitle>{t("events.create.businessRequiredTitle")}</AlertTitle>
              <AlertDescription>{t("events.create.businessRequiredBody")}</AlertDescription>
              <div className="mt-3">
                <Button size="sm" asChild variant="outline">
                  <Link href="/pricing">{t("header.pricing")}</Link>
                </Button>
              </div>
            </Alert>
          )}
          {!kycVerified && !kycLoading && (
            <Alert variant="destructive">
              <AlertTitle>{t("events.create.kycRequiredTitle")}</AlertTitle>
              <AlertDescription>{t("events.create.kycRequiredBody")}</AlertDescription>
              <div className="mt-3">
                <Button size="sm" asChild variant="outline">
                  <Link href="/profile/verify">{t("profile.verify.title")}</Link>
                </Button>
              </div>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">{t("events.create.titleLabel")}</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("events.create.titlePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">{t("events.create.descriptionLabel")}</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("events.create.descriptionPlaceholder")}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">{t("events.create.locationLabel")}</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("events.create.locationPlaceholder")}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">{t("events.create.startsLabel")}</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">{t("events.create.endsLabel")}</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-capacity">{t("events.create.capacityLabel")}</Label>
              <Input
                id="event-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={t("events.create.capacityPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-cover">{t("events.create.coverLabel")}</Label>
              <Input
                id="event-cover"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">{t("events.create.coverHelp")}</p>
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt={t("events.create.coverLabel")}
                  className="h-40 w-full rounded-lg object-cover"
                />
              )}
            </div>
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {submitting ? t("events.create.submitting") : t("events.create.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
